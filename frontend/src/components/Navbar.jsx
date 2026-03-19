import { useWallet } from '../context/WalletContext';

export default function Navbar({ title }) {
  const { wallet, connecting, error, initiateConnect, shortenAddress, isHederaTestnet } = useWallet();

  return (
    <div className="top-navbar">
      <div className="navbar-left">
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title || 'Dashboard'}</h2>
      </div>
      <div className="navbar-right">
        {/* Network Badge */}
        <div className="network-badge" style={
          isHederaTestnet
            ? {}
            : wallet
              ? { background: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.3)', color: 'var(--accent-yellow)' }
              : {}
        }>
          <span className="pulse" style={
            !isHederaTestnet && wallet
              ? { background: 'var(--accent-yellow)' }
              : {}
          }></span>
          {wallet
            ? isHederaTestnet
              ? 'Hedera Testnet'
              : `⚠️ ${wallet.network}`
            : 'Not Connected'
          }
        </div>

        {/* Wallet Button */}
        {wallet ? (
          <div className="wallet-btn" title={wallet.address}>
            {wallet.walletType === 'metamask' ? '🦊' : '🟣'}{' '}
            {wallet.balance} HBAR &nbsp;|&nbsp; {shortenAddress(wallet.address)}
          </div>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => initiateConnect()}
            disabled={connecting}
            style={connecting ? { opacity: 0.7 } : {}}
          >
            {connecting ? '⏳ Connecting...' : '🔗 Connect Wallet'}
          </button>
        )}
      </div>
    </div>
  );
}
