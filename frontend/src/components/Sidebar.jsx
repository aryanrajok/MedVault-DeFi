import { NavLink, useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';

const patientLinks = [
  { path: '/patient', icon: '📊', label: 'Dashboard' },
  { path: '/patient/upload', icon: '📤', label: 'Upload Record' },
  { path: '/marketplace', icon: '🏪', label: 'Marketplace' },
];

const doctorLinks = [
  { path: '/doctor', icon: '📊', label: 'Dashboard' },
  { path: '/marketplace', icon: '🏪', label: 'Marketplace' },
  { path: '/doctor/purchased', icon: '📚', label: 'Purchased Records' },
];

export default function Sidebar() {
  const { role, wallet, disconnectWallet, shortenAddress, isHederaTestnet, connectWallet, isConnected } = useWallet();
  const navigate = useNavigate();
  const links = role === 'doctor' ? doctorLinks : patientLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <h2>
          <span className="med">Med</span>
          <span className="vault">Vault</span>
          <span className="defi"> DeFi</span>
        </h2>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Hedera Hashgraph
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            end={link.path === '/patient' || link.path === '/doctor'}
          >
            <span className="icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      {wallet && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            Connected as {role}
          </div>
          <div style={{ fontSize: 13, color: 'var(--accent-teal)', fontWeight: 600 }}>
            {shortenAddress(wallet.address)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 8px' }}>
            {wallet.balance} HBAR
          </div>
          <button className="btn btn-sm" onClick={disconnectWallet} style={{ width: '100%' }}>
            Disconnect
          </button>
        </div>
      )}
    </aside>
  );
}
