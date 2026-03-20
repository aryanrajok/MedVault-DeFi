import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useWallet } from '../context/WalletContext';
import { getMarketListings, purchaseRecord } from '../services/api';

const DEMO_LISTINGS = [
  { id: 'l1', category: 'Diagnostic Lab Results', description: 'Complete blood panel, patient age 30-40, no critical findings', price: 12, totalSales: 34, verifiedBy: 'Dr. Chen (TS: 92)' },
  { id: 'l2', category: 'Imaging Study', description: 'Chest X-ray, patient age 50-60, routine screening, no abnormalities', price: 25, totalSales: 12, verifiedBy: 'Dr. Wilson (TS: 85)' },
  { id: 'l3', category: 'Family History Report', description: 'Three-generation family history, cardiovascular risk factors documented', price: 18, totalSales: 8, verifiedBy: 'Dr. Patel (TS: 78)' },
  { id: 'l4', category: 'Vaccination Record', description: 'Complete vaccination history 2015-2025, including COVID-19 boosters', price: 5, totalSales: 56, verifiedBy: 'Dr. Kim (TS: 90)' },
  { id: 'l5', category: 'Longitudinal Health Record', description: '5-year patient timeline with lab results, prescriptions, and diagnoses', price: 45, totalSales: 3, verifiedBy: 'Dr. Chen (TS: 92)' },
  { id: 'l6', category: 'Diagnostic Lab Results', description: 'Pathology report, tissue biopsy, patient age 40-50', price: 30, totalSales: 7, verifiedBy: 'Dr. Wilson (TS: 85)' },
];

const CATEGORIES = ['All', 'Diagnostic Lab Results', 'Imaging Study', 'Family History Report', 'Vaccination Record', 'Longitudinal Health Record'];

const categoryIcons = {
  'Diagnostic Lab Results': '🔬',
  'Imaging Study': '📷',
  'Family History Report': '🧬',
  'Vaccination Record': '💉',
  'Longitudinal Health Record': '📊',
};

export default function Marketplace() {
  const { wallet, isConnected } = useWallet();
  const [listings, setListings] = useState([]);
  const [filter, setFilter] = useState('All');
  const [priceRange, setPriceRange] = useState(200);
  const [purchaseModal, setPurchaseModal] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const res = await getMarketListings();
      setListings(res.data.listings?.length ? res.data.listings : DEMO_LISTINGS);
    } catch {
      setListings(DEMO_LISTINGS);
    }
  };

  const filtered = listings.filter((l) => {
    if (filter !== 'All' && l.category !== filter) return false;
    if (l.price > priceRange) return false;
    return true;
  });

  const handlePurchase = async (listing) => {
    setPurchasing(true);
    try {
      await purchaseRecord({
        listingId: listing.id,
        buyerWallet: wallet?.address,
        licenceType: 'research',
      });
    } catch (e) { /* demo mode */ }
    await new Promise((r) => setTimeout(r, 1500));
    setPurchasing(false);
    setPurchaseModal(null);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Data Marketplace" />

        <div className="page-header animate-in">
          <h1>🏪 Medical Data Marketplace</h1>
          <p>Browse and purchase verified, anonymised medical records</p>
        </div>

        {/* Filters */}
        <div className="glass-card-static animate-in animate-delay-1" style={{ marginBottom: 24, padding: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Category</label>
              <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Max Price: {priceRange} HBAR</label>
              <input
                type="range" min="1" max="200" value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-teal)' }}
              />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: 4 }}>
              Showing {filtered.length} of {listings.length} listings
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="grid-3">
          {filtered.map((listing, i) => (
            <div key={listing.id} className={`glass-card animate-in animate-delay-${(i % 4) + 1}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{categoryIcons[listing.category] || '📄'}</span>
                <span className="badge badge-verified">✓ Verified</span>
              </div>

              <div className="badge badge-teal" style={{ marginBottom: 8 }}>
                {listing.category}
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12, minHeight: 40 }}>
                {listing.description}
              </p>

              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                Verified by: {listing.verifiedBy || 'Verified Doctor'} · {listing.totalSales} sales
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-teal)' }}>
                  {listing.price} <span style={{ fontSize: 13, fontWeight: 500 }}>HBAR</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setPurchaseModal(listing)}>
                  Purchase
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state glass-card-static" style={{ marginTop: 24 }}>
            <div className="icon">🔍</div>
            <p>No listings match your filters</p>
          </div>
        )}

        {/* Purchase Modal */}
        {purchaseModal && (
          <div className="modal-overlay" onClick={() => !purchasing && setPurchaseModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>💰 Confirm Purchase</h2>

              <div style={{ marginBottom: 20 }}>
                <span className="badge badge-teal">{purchaseModal.category}</span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                  {purchaseModal.description}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Record Price</span>
                  <span>{purchaseModal.price} HBAR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>To Patient (92%)</span>
                  <span style={{ color: 'var(--accent-green)' }}>{(purchaseModal.price * 0.92).toFixed(2)} HBAR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Platform Fee (8%)</span>
                  <span>{(purchaseModal.price * 0.08).toFixed(2)} HBAR</span>
                </div>
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  fontSize: 16,
                }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--accent-teal)' }}>{purchaseModal.price} HBAR</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Licence Type</label>
                <select className="select">
                  <option>Research Only</option>
                  <option>Commercial</option>
                  <option>Educational</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => setPurchaseModal(null)}
                  disabled={purchasing}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => handlePurchase(purchaseModal)}
                  disabled={purchasing}
                >
                  {purchasing ? '⏳ Processing...' : '✅ Confirm & Pay HBAR'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
