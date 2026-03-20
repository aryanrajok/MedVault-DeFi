import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const WalletContext = createContext();

// Hedera Testnet network config
const HEDERA_TESTNET = {
  chainId: '0x128', // 296 in hex
  chainName: 'Hedera Testnet',
  nativeCurrency: { name: 'HBAR', symbol: 'HBAR', decimals: 18 },
  rpcUrls: ['https://testnet.hashio.io/api'],
  blockExplorerUrls: ['https://hashscan.io/testnet'],
};

/**
 * Check if HashPack extension is installed — comprehensive detection
 * HashPack can inject itself via multiple globals depending on version.
 */
function isHashPackInstalled() {
  try {
    // 1. Check direct HashPack globals
    if (typeof window.hashpack !== 'undefined') return true;
    if (typeof window.HashpackProvider !== 'undefined') return true;
    if (typeof window.hederaWallets !== 'undefined') return true;

    // 2. Check EIP-6963 announced providers (modern standard)
    if (window.__hashpackAnnounced) return true;

    // 3. Check the ethereum providers array
    if (typeof window.ethereum !== 'undefined') {
      const providers = window.ethereum.providers || [];
      for (const p of providers) {
        if (p.isHashPack) return true;
      }
      // Check main ethereum object
      if (window.ethereum.isHashPack) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check if MetaMask is installed (excluding Phantom imposters)
 */
function isMetaMaskInstalled() {
  try {
    if (typeof window.ethereum === 'undefined') return false;
    const providers = window.ethereum.providers || [];
    if (providers.find((p) => p.isMetaMask && !p.isPhantom)) return true;
    return window.ethereum.isMetaMask && !window.ethereum.isPhantom;
  } catch {
    return false;
  }
}

/**
 * Run a wallet detection snapshot — returns current status
 */
function snapshotWalletStatus() {
  return {
    metamask: isMetaMaskInstalled(),
    hashpack: isHashPackInstalled(),
  };
}

/**
 * Find the correct EVM provider — avoids Phantom hijack
 */
function getProvider(preferredWallet) {
  if (typeof window.ethereum === 'undefined') return null;

  const providers = window.ethereum.providers || [];

  if (preferredWallet === 'metamask') {
    const mm = providers.find((p) => p.isMetaMask && !p.isPhantom);
    if (mm) return mm;
    if (window.ethereum.isMetaMask && !window.ethereum.isPhantom) return window.ethereum;
    return null;
  }

  if (preferredWallet === 'hashpack') {
    // 1. Try HashPack-specific provider in providers array
    const hp = providers.find((p) => p.isHashPack);
    if (hp) return hp;

    // 2. Check main window.ethereum
    if (window.ethereum.isHashPack) return window.ethereum;

    // 3. Check EIP-6963 discovered providers
    if (window.__hashpackEIP6963Provider) return window.__hashpackEIP6963Provider;

    // 4. Try any non-MetaMask, non-Phantom, non-BraveWallet, non-Coinbase provider
    const other = providers.find((p) =>
      !p.isPhantom && !p.isMetaMask && !p.isBraveWallet && !p.isCoinbaseWallet
    );
    if (other) return other;

    // 5. If main ethereum isn't MetaMask or Phantom, it might be HashPack
    if (!window.ethereum.isMetaMask && !window.ethereum.isPhantom) return window.ethereum;

    // We do NOT fallback to MetaMask. If the user clicked HashPack, they want HashPack.
    return null;
  }

  // Default: any non-Phantom provider
  const nonPhantom = providers.find((p) => !p.isPhantom);
  if (nonPhantom) return nonPhantom;
  if (!window.ethereum.isPhantom) return window.ethereum;
  return null;
}

/**
 * Wait briefly for a provider to become available (extensions inject async)
 */
function waitForProvider(walletId, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const provider = getProvider(walletId);
    if (provider) {
      resolve(provider);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const p = getProvider(walletId);
      if (p || Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        resolve(p || null);
      }
    }, 200);
  });
}

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(() => {
    const saved = localStorage.getItem('medvault_wallet');
    return saved ? JSON.parse(saved) : null;
  });
  const [role, setRole] = useState(() => localStorage.getItem('medvault_role') || 'patient');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);

  // ── Real-time wallet detection state ──
  const [walletStatus, setWalletStatus] = useState(() => snapshotWalletStatus());
  const pollRef = useRef(null);

  // Poll for wallet extension injection (extensions load asynchronously)
  useEffect(() => {
    // Immediately take a snapshot
    setWalletStatus(snapshotWalletStatus());

    // Poll every 500ms for the first 10 seconds, then every 2 seconds
    let elapsed = 0;
    const tick = () => {
      const newStatus = snapshotWalletStatus();
      setWalletStatus((prev) => {
        // Only update state if something changed (avoids unnecessary re-renders)
        if (prev.metamask !== newStatus.metamask || prev.hashpack !== newStatus.hashpack) {
          return newStatus;
        }
        return prev;
      });
      elapsed += elapsed < 10000 ? 500 : 2000;
    };

    // Fast polling phase (0–10s) — extensions may take a moment to inject
    pollRef.current = setInterval(tick, 500);

    // After 10s, slow down to every 2s
    const slowdownTimeout = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(tick, 2000);
    }, 10000);

    // Stop polling after 60s — if wallets haven't loaded by then, they're not installed
    const stopTimeout = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
    }, 60000);

    // Listen for EIP-6963 wallet announcements (modern standard)
    const handleEIP6963 = (event) => {
      const info = event?.detail?.info;
      const provider = event?.detail?.provider;
      if (info && provider) {
        const rdns = (info.rdns || '').toLowerCase();
        const name = (info.name || '').toLowerCase();
        if (rdns.includes('hashpack') || name.includes('hashpack')) {
          window.__hashpackAnnounced = true;
          window.__hashpackEIP6963Provider = provider;
          setWalletStatus((prev) => (prev.hashpack ? prev : { ...prev, hashpack: true }));
        }
        if (rdns.includes('metamask') || name.includes('metamask')) {
          setWalletStatus((prev) => (prev.metamask ? prev : { ...prev, metamask: true }));
        }
      }
    };

    window.addEventListener('eip6963:announceProvider', handleEIP6963);

    // Also dispatch a request for announcements (triggers wallets to announce)
    try {
      window.dispatchEvent(new Event('eip6963:requestProvider'));
    } catch { /* ignore */ }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearTimeout(slowdownTimeout);
      clearTimeout(stopTimeout);
      window.removeEventListener('eip6963:announceProvider', handleEIP6963);
    };
  }, []);

  // Build the detectWallets array from reactive state
  const detectedWallets = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊', installed: walletStatus.metamask },
    { id: 'hashpack', name: 'HashPack', icon: '🟣', installed: walletStatus.hashpack },
  ];

  // Keep detectWallets as a function for backward compatibility, but use reactive state
  const detectWallets = useCallback(() => detectedWallets, [walletStatus]);

  // Persist
  useEffect(() => {
    if (wallet) {
      localStorage.setItem('medvault_wallet', JSON.stringify(wallet));
    } else {
      localStorage.removeItem('medvault_wallet');
    }
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem('medvault_role', role);
  }, [role]);

  // Listen for account/chain changes
  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (wallet) {
        updateBalance(accounts[0], provider);
      }
    };

    const handleChainChanged = () => window.location.reload();

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
    };
  }, [wallet]);

  const updateBalance = async (address, provider) => {
    try {
      const p = provider || getProvider();
      if (!p) return;
      const balance = await p.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      const hbarBalance = (parseInt(balance, 16) / 1e18).toFixed(4);
      setWallet((prev) => ({ ...prev, address, balance: hbarBalance }));
    } catch (err) {
      console.error('Balance fetch failed:', err);
    }
  };

  /**
   * Open wallet selector modal
   */
  const initiateConnect = useCallback((selectedRole) => {
    setError(null);
    setConnecting(false);
    setPendingRole(selectedRole || null);

    // Refresh wallet detection when modal opens
    setWalletStatus(snapshotWalletStatus());

    // Always show wallet picker modal — let the user choose
    setShowWalletModal(true);
  }, []);

  /**
   * Connect with a specific wallet provider
   */
  const connectWithProvider = async (walletId, selectedRole) => {
    setConnecting(true);
    setError(null);

    // Wait for the provider to become available (handles late injection)
    const provider = await waitForProvider(walletId, 3000);

    if (!provider) {
      setError(
        walletId === 'metamask'
          ? 'MetaMask not detected. Please install MetaMask and refresh.'
          : walletId === 'hashpack'
          ? 'HashPack not detected. Please install HashPack and refresh.'
          : 'No compatible wallet found. Install MetaMask or HashPack.'
      );
      setConnecting(false);
      return null;
    }

    try {
      // Step 1: Request accounts — this triggers the wallet popup (HashPack or MetaMask)
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned. Unlock your wallet and try again.');
      }

      // Step 2: Switch to Hedera Testnet (only for MetaMask)
      // HashPack is Hedera-native — it doesn't need/support wallet_switchEthereumChain
      // and calling it can cause errors or unexpected popups
      if (walletId !== 'hashpack') {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: HEDERA_TESTNET.chainId }],
          });
        } catch (switchError) {
          if (switchError.code === 4902 || switchError.code === -32603) {
            try {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [HEDERA_TESTNET],
              });
            } catch (addError) {
              console.warn('Could not add Hedera Testnet chain:', addError);
            }
          } else if (switchError.code === 4001) {
            throw new Error('You rejected switching to Hedera Testnet.');
          }
          // Other errors: ignore and continue (wallet may already be on correct chain)
        }
      }

      const address = accounts[0];

      // Step 3: Get balance
      let hbarBalance = '0.0000';
      try {
        const balance = await provider.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
        hbarBalance = (parseInt(balance, 16) / 1e18).toFixed(4);
      } catch (e) {
        console.warn('Could not fetch balance:', e);
      }

      // Step 4: Get chain ID
      let chainId = HEDERA_TESTNET.chainId;
      let isHederaTestnet = true;
      try {
        chainId = await provider.request({ method: 'eth_chainId' });
        isHederaTestnet = chainId === HEDERA_TESTNET.chainId;
      } catch (e) {
        // HashPack may not support eth_chainId — default to Hedera Testnet
        console.warn('Could not fetch chainId:', e);
      }

      const walletData = {
        address,
        balance: hbarBalance,
        chainId,
        walletType: walletId,
        network: isHederaTestnet ? 'Hedera Testnet' : `Chain ${parseInt(chainId, 16)}`,
        isHederaTestnet,
        connectedAt: new Date().toISOString(),
      };

      if (selectedRole || pendingRole) {
        setRole(selectedRole || pendingRole);
      }

      setWallet(walletData);
      setConnecting(false);
      setShowWalletModal(false);
      setPendingRole(null);
      return walletData;

    } catch (err) {
      console.error('Connection failed:', err);
      if (err.code === 4001) {
        setError('Connection rejected. Approve the request in your wallet.');
      } else if (err.code === -32002) {
        setError('Request pending. Check your wallet popup.');
      } else {
        setError(err.message || 'Connection failed.');
      }
      setConnecting(false);
      return null;
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setError(null);
    setConnecting(false);
    localStorage.removeItem('medvault_token');
    localStorage.removeItem('medvault_wallet');
  };

  const signMessage = async (message) => {
    if (!wallet) throw new Error('Wallet not connected');
    const provider = getProvider(wallet.walletType);
    if (!provider) throw new Error('Wallet provider not found');

    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, wallet.address],
    });
    return signature;
  };

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <WalletContext.Provider value={{
      wallet,
      role,
      setRole,
      connecting,
      error,
      showWalletModal,
      setShowWalletModal,
      pendingRole,
      initiateConnect,
      connectWithProvider,
      disconnectWallet,
      signMessage,
      shortenAddress,
      updateBalance,
      detectWallets,
      detectedWallets,
      walletStatus,
      isConnected: !!wallet,
      isHederaTestnet: wallet?.isHederaTestnet || false,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
