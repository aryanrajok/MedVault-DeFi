import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useWallet } from '../context/WalletContext';

export default function VerificationView() {
  const { requestId } = useParams();
  const { wallet } = useWallet();
  const navigate = useNavigate();
  const [result, setResult] = useState('authentic');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    // Simulate attestation submission
    await new Promise((r) => setTimeout(r, 2000));
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => navigate('/doctor'), 2000);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Verification Review" />

        <div className="split-layout">
          {/* Left: Secure Document Viewer */}
          <div className="glass-card-static secure-viewer animate-in">
            <div className="watermark">🔒 SECURE VIEWER — No Download</div>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 80, marginBottom: 16, opacity: 0.3 }}>📄</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                Medical Document Preview
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 300, margin: '0 auto' }}>
                Document rendered in sandboxed viewer. No download, copy, or print permitted.
              </p>
              <div style={{
                marginTop: 24,
                padding: 20,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}>
                <div>📋 Document Type: Lab Report</div>
                <div>📅 Date: March 2025</div>
                <div>🏥 Category: Blood Panel</div>
                <div>👤 Patient: Anonymous</div>
                <div style={{ marginTop: 8, color: 'var(--accent-teal)', fontWeight: 600 }}>
                  ✓ File decrypted successfully via ECDH key exchange
                </div>
              </div>
            </div>
          </div>

          {/* Right: Attestation Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-card-static animate-in animate-delay-1">
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
                ✍️ Submit Attestation
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Document Authenticity</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { value: 'authentic', label: '✅ Authentic', desc: 'Document is genuine and clinically accurate' },
                      { value: 'suspicious', label: '⚠️ Suspicious', desc: 'Document may be altered or inconsistent' },
                      { value: 'unable', label: '❓ Unable to Verify', desc: 'Cannot determine document authenticity' },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className="glass-card"
                        style={{
                          padding: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          borderColor: result === opt.value ? 'var(--accent-teal)' : undefined,
                          background: result === opt.value ? 'var(--accent-teal-dim)' : undefined,
                        }}
                      >
                        <input
                          type="radio"
                          name="result"
                          value={opt.value}
                          checked={result === opt.value}
                          onChange={(e) => setResult(e.target.value)}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Notes (Optional)</label>
                  <textarea
                    className="textarea"
                    placeholder="Add any clinical observations or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {submitted ? (
                  <div style={{
                    padding: 16,
                    textAlign: 'center',
                    background: 'rgba(34,197,94,0.1)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                      Attestation Submitted!
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Anchored on Hedera HCS. Redirecting...
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary btn-lg glow-pulse"
                    style={{ width: '100%' }}
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? '⏳ Submitting to Hedera...' : '🔗 Submit Attestation to Hedera'}
                  </button>
                )}
              </div>
            </div>

            {/* Info Bar */}
            <div className="glass-card-static animate-in animate-delay-2" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Request ID</div>
                  <div style={{ fontFamily: 'monospace' }}>{requestId || 'req-001'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Escrow</div>
                  <div style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>15 HBAR</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Your Earnings (after 2% fee)</div>
                  <div style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>14.70 HBAR</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Patient DID</div>
                  <div style={{ fontFamily: 'monospace' }}>did:hedera:0x3f1...a8c</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
