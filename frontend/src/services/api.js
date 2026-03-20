import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medvault_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const getChallenge = (walletAddress) =>
  api.post('/auth/challenge', { walletAddress });

export const verifySignature = (walletAddress, signature, role) =>
  api.post('/auth/verify', { walletAddress, signature, role });

// Patient
export const registerPatient = (data) => api.post('/patient/register', data);
export const uploadRecord = (formData) =>
  api.post('/patient/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getPatientRecords = (wallet) => api.get(`/patient/records/${wallet}`);
export const getPatientProfile = (wallet) => api.get(`/patient/profile/${wallet}`);

// Doctor
export const registerDoctor = (data) => api.post('/doctor/register', data);
export const approveDoctor = (wallet) => api.post(`/doctor/approve/${wallet}`);
export const getDoctorProfile = (wallet) => api.get(`/doctor/profile/${wallet}`);
export const getDoctorPending = (wallet) => api.get(`/doctor/pending/${wallet}`);
export const listDoctors = () => api.get('/doctor/list');
export const requestVerification = (data) => api.post('/doctor/request-verification', data);
export const submitAttestation = (data) => api.post('/doctor/attest', data);

// Marketplace
export const getMarketListings = (params) => api.get('/marketplace/listings', { params });
export const listOnMarketplace = (data) => api.post('/marketplace/list', data);
export const purchaseRecord = (data) => api.post('/marketplace/purchase', data);
export const getBuyerPurchases = (wallet) => api.get(`/marketplace/purchases/${wallet}`);

export default api;
