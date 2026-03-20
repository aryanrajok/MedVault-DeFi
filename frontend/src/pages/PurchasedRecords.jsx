import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DEMO_PURCHASES = [
  {
    id: 'p1', documentType: 'Lab Report', category: 'Diagnostic Lab Results',
    purchaseDate: '2025-03-15', hbarPaid: 12, patientPseudonym: 'Patient-xA3f',
    attestingDoctor: 'Dr. Chen', hcsTopicId: '0.0.48723', transactionId: '0.0.48723@1710512345',
    annotation: '',
  },
  {
    id: 'p2', documentType: 'Chest X-Ray', category: 'Imaging Study',
    purchaseDate: '2025-03-12', hbarPaid: 25, patientPseudonym: 'Patient-k9Bc',
    attestingDoctor: 'Dr. Wilson', hcsTopicId: '0.0.48756', transactionId: '0.0.48756@1710352345',
    annotation: 'No abnormalities detected. Clear lungs.',
  },
  {
    id: 'p3', documentType: 'Family History', category: 'Family History Report',
    purchaseDate: '2025-03-08', hbarPaid: 18, patientPseudonym: 'Patient-mZ7d',
    attestingDoctor: 'Dr. Patel', hcsTopicId: '0.0.48790', transactionId: '0.0.48790@1710192345',
    annotation: 'Notable cardiovascular risk factors in paternal lineage.',
  },
];

export default function PurchasedRecords() {
  const [records] = useState(DEMO_PURCHASES);
  const [viewing, setViewing] = useState(null);
  const [annotations, setAnnotations] = useState(
    Object.fromEntries(DEMO_PURCHASES.map((r) => [r.id, r.annotation]))
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Purchased Records" />

        <div className="page-header animate-in">
          <h1>📚 Purchased Records Library</h1>
          <p>View and annotate records you've purchased from the marketplace</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {records.map((record, i) => (
            <div key={record.id} className={`glass-card-static animate-in animate-delay-${(i % 4) + 1}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{record.documentType}</h3>
                    <span className="badge badge-teal">{record.category}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Patient</div>
                      <div style={{ fontWeight: 500 }}>{record.patientPseudonym}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Purchased</div>
                      <div>{new Date(record.purchaseDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>HBAR Paid</div>
                      <div style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>{record.hbarPaid} HBAR</div>
                    </div>
                  </div>

                  {/* Provenance Badge */}
                  <div style={{
                    padding: 12,
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 12,
                    fontSize: 11,
                  }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>HCS Topic ID</div>
                      <div style={{ fontFamily: 'monospace', color: 'var(--accent-teal)' }}>{record.hcsTopicId}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Attesting Doctor</div>
                      <div>{record.attestingDoctor} 🏅</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Transaction ID</div>
                      <div style={{ fontFamily: 'monospace' }}>{record.transactionId.slice(0, 20)}...</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 16 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setViewing(viewing === record.id ? null : record.id)}
                  >
                    {viewing === record.id ? '🔒 Close Viewer' : '👁️ Open Secure Viewer'}
                  </button>
                </div>
              </div>

              {/* Secure Viewer */}
              {viewing === record.id && (
                <div style={{
                  marginTop: 16,
                  padding: 24,
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-glass)',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    padding: '4px 10px',
                    background: 'rgba(232, 85, 90, 0.15)',
                    border: '1px solid rgba(232, 85, 90, 0.3)',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 10, color: 'var(--accent-coral)', fontWeight: 600,
                  }}>
                    🔒 No Download
                  </div>
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <div style={{ fontSize: 48, marginBottom: 8, opacity: 0.4 }}>📄</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      Secure sandboxed viewer — document rendered in iframe
                    </p>
                  </div>
                </div>
              )}

              {/* Private Annotations */}
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  🔏 Private Clinical Notes (encrypted, only visible to you)
                </label>
                <textarea
                  className="textarea"
                  style={{ marginTop: 6, minHeight: 60 }}
                  placeholder="Add your private annotations..."
                  value={annotations[record.id] || ''}
                  onChange={(e) => setAnnotations({ ...annotations, [record.id]: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

        {records.length === 0 && (
          <div className="empty-state glass-card-static">
            <div className="icon">📚</div>
            <p>No purchased records yet. Visit the marketplace to browse.</p>
          </div>
        )}
      </div>
    </div>
  );
}
