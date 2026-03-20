import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useWallet } from '../context/WalletContext';
import { getPatientRecords, registerPatient } from '../services/api';

export default function PatientDashboard() {
  const { wallet, isConnected } = useWallet();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) { navigate('/'); return; }
    loadData();
  }, [isConnected]);

  const loadData = async () => {
    try {
      // Try to register first (idempotent)
      try {
        await registerPatient({
          walletAddress: wallet.address,
          name: 'Patient User',
          country: 'Global',
        });
      } catch (e) { /* already registered */ }

      const res = await getPatientRecords(wallet.address);
      setRecords(res.data.records || []);
      setProfile(res.data.patient || {});
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const verified = records.filter((r) => r.verificationStatus === 'verified').length;
  const pending = records.filter((r) => r.verificationStatus === 'pending').length;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Patient Dashboard" />

        {/* Welcome Card */}
        <div className="glass-card-static animate-in" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                Welcome back, {profile?.name || 'Patient'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                DID: {profile?.did || `did:hedera:testnet:${wallet?.address?.slice(0, 12)}...`}
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/patient/upload')}>
              📤 Upload New Record
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            { value: records.length, label: 'Total Records', icon: '📄' },
            { value: verified, label: 'Verified', icon: '✅' },
            { value: pending, label: 'Pending', icon: '⏳' },
            { value: `${profile?.earnings || 0} HBAR`, label: 'Earned', icon: '💎' },
          ].map((stat, i) => (
            <div key={i} className={`glass-card stat-card animate-in animate-delay-${i + 1}`}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{stat.icon}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Records Table */}
        <div className="glass-card-static animate-in animate-delay-2">
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📋 My Records</h3>
          {records.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📂</div>
              <p>No records yet. Upload your first medical record!</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/patient/upload')}
              >
                Upload Record
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>IPFS CID</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {record.fileName}
                      </td>
                      <td>
                        <span className="badge badge-teal">{record.documentType}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${record.verificationStatus}`}>
                          {record.verificationStatus === 'verified' && '✓ '}
                          {record.verificationStatus === 'pending' && '⏳ '}
                          {record.verificationStatus}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {record.ipfsCid?.slice(0, 12)}...
                      </td>
                      <td>{new Date(record.uploadedAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {record.verificationStatus === 'unverified' && (
                            <button className="btn btn-sm btn-primary">Verify</button>
                          )}
                          {record.verificationStatus === 'verified' && !record.isListed && (
                            <button className="btn btn-sm">List on Market</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
