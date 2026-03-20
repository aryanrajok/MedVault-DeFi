import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useWallet } from '../context/WalletContext';
import { uploadRecord, listDoctors, requestVerification } from '../services/api';

export default function UploadRecord() {
  const { wallet, isConnected } = useWallet();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('Lab Report');
  const [description, setDescription] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(0); // 0=idle, 1-5=progress steps
  const [dragover, setDragover] = useState(false);

  useEffect(() => {
    if (!isConnected) { navigate('/'); return; }
    loadDoctors();
  }, [isConnected]);

  const loadDoctors = async () => {
    try {
      const res = await listDoctors();
      setDoctors(res.data.doctors || []);
    } catch (e) {
      // Demo doctors
      setDoctors([
        { walletAddress: '0xdoc1', name: 'Dr. Sarah Chen', specialty: 'Cardiology', trustScore: 92, verificationFee: 5, totalVerifications: 142 },
        { walletAddress: '0xdoc2', name: 'Dr. James Wilson', specialty: 'Radiology', trustScore: 85, verificationFee: 8, totalVerifications: 98 },
        { walletAddress: '0xdoc3', name: 'Dr. Priya Patel', specialty: 'Pathology', trustScore: 78, verificationFee: 3, totalVerifications: 64 },
      ]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleUpload = async () => {
    if (!file || !selectedDoctor) return;
    setUploading(true);

    const steps = ['Encrypting...', 'Uploading to IPFS...', 'Anchoring on HCS...', 'Locking Escrow...', 'Complete ✓'];

    for (let i = 0; i < steps.length; i++) {
      setStep(i + 1);
      await new Promise((r) => setTimeout(r, 800));
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('walletAddress', wallet.address);
      formData.append('documentType', docType);
      formData.append('description', description);

      await uploadRecord(formData);

      // Request verification
      await requestVerification({
        patientWallet: wallet.address,
        doctorWallet: selectedDoctor.walletAddress,
        recordId: 'latest',
        escrowAmount: selectedDoctor.verificationFee,
      });
    } catch (error) {
      console.error('Upload error:', error);
    }

    setTimeout(() => navigate('/patient'), 1500);
  };

  const fee = selectedDoctor?.verificationFee || 0;
  const platformFee = (fee * 0.02).toFixed(2);
  const totalEscrow = (fee * 1.02).toFixed(2);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Upload Medical Record" />

        <div className="page-header animate-in">
          <h1>📤 Upload & Verify</h1>
          <p>Encrypt your medical record and request doctor verification</p>
        </div>

        <div className="grid-2" style={{ gap: 24 }}>
          {/* Left: Upload + Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Drop Zone */}
            <div
              className={`upload-zone animate-in animate-delay-1 ${dragover ? 'dragover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
              onDragLeave={() => setDragover(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files[0])}
              />
              <div className="icon">📁</div>
              {file ? (
                <>
                  <p style={{ fontWeight: 600, color: 'var(--accent-teal)' }}>{file.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {(file.size / 1024).toFixed(1)} KB — Click to change
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontWeight: 600 }}>Drag & drop your PDF or PNG here</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    or click to browse files (Max 20MB)
                  </p>
                </>
              )}
            </div>

            {/* Form */}
            <div className="glass-card-static animate-in animate-delay-2">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Document Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Document Type</label>
                  <select className="select" value={docType} onChange={(e) => setDocType(e.target.value)}>
                    <option>Lab Report</option>
                    <option>Imaging Study</option>
                    <option>Family History</option>
                    <option>Vaccination Record</option>
                    <option>Allergy Record</option>
                    <option>Prescription</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="textarea"
                    placeholder="Any additional notes about this document..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ minHeight: 80 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Doctor Selection + Escrow */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-card-static animate-in animate-delay-2">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                👨‍⚕️ Select Verifying Doctor
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {doctors.map((doc) => (
                  <div
                    key={doc.walletAddress}
                    className="glass-card"
                    style={{
                      cursor: 'pointer',
                      padding: 16,
                      borderColor: selectedDoctor?.walletAddress === doc.walletAddress
                        ? 'var(--accent-teal)' : undefined,
                      background: selectedDoctor?.walletAddress === doc.walletAddress
                        ? 'var(--accent-teal-dim)' : undefined,
                    }}
                    onClick={() => setSelectedDoctor(doc)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{doc.name}</div>
                        <span className="badge badge-teal">{doc.specialty}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--accent-teal)', fontWeight: 700, fontSize: 18 }}>
                          {doc.verificationFee} HBAR
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Trust: {doc.trustScore}/100 · {doc.totalVerifications} verified
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fee Summary */}
            {selectedDoctor && (
              <div className="glass-card-static animate-in" style={{ borderColor: 'var(--accent-teal)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>💰 Fee Summary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Doctor Fee</span>
                    <span>{fee} HBAR</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Platform Fee (2%)</span>
                    <span>{platformFee} HBAR</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total Escrow</span>
                    <span style={{ color: 'var(--accent-teal)' }}>{totalEscrow} HBAR</span>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              className="btn btn-primary btn-lg glow-pulse"
              style={{ width: '100%' }}
              disabled={!file || !selectedDoctor || uploading}
              onClick={handleUpload}
            >
              {uploading ? '⏳ Processing...' : '🔐 Encrypt & Upload to IPFS'}
            </button>

            {/* Progress Steps */}
            {step > 0 && (
              <div className="glass-card-static animate-in">
                {['Encrypting', 'Uploading to IPFS', 'Anchoring on HCS', 'Locking Escrow', 'Complete'].map((label, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '6px 0',
                    color: step > i ? 'var(--accent-teal)' : step === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}>
                    <span>{step > i ? '✅' : step === i + 1 ? '⏳' : '⬜'}</span>
                    <span style={{ fontSize: 13 }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
