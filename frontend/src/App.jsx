import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import WalletModal from './components/WalletModal';
import LandingPage from './pages/LandingPage';
import PatientDashboard from './pages/PatientDashboard';
import UploadRecord from './pages/UploadRecord';
import DoctorDashboard from './pages/DoctorDashboard';
import VerificationView from './pages/VerificationView';
import Marketplace from './pages/Marketplace';
import PurchasedRecords from './pages/PurchasedRecords';
import './index.css';

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <WalletModal />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/patient" element={<PatientDashboard />} />
          <Route path="/patient/upload" element={<UploadRecord />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/doctor/verify/:requestId" element={<VerificationView />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/doctor/purchased" element={<PurchasedRecords />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
