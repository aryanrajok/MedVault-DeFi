const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { submitMessage } = require("../config/hedera");

const router = express.Router();

// In-memory doctor store (use PostgreSQL in production)
const doctors = new Map();
const verificationRequests = new Map();

/**
 * POST /api/doctor/register
 * Register a new doctor
 */
router.post("/register", async (req, res) => {
  try {
    const { walletAddress, name, licenceNumber, specialty, jurisdiction } = req.body;

    if (!walletAddress || !name || !licenceNumber || !specialty) {
      return res.status(400).json({
        error: "Wallet address, name, licence number, and specialty are required",
      });
    }

    if (doctors.has(walletAddress.toLowerCase())) {
      return res.status(409).json({ error: "Doctor already registered" });
    }

    const doctor = {
      id: uuidv4(),
      walletAddress: walletAddress.toLowerCase(),
      name,
      licenceNumber,
      specialty,
      jurisdiction: jurisdiction || "Global",
      verificationFee: 5, // default 5 HBAR
      trustScore: 50,
      totalVerifications: 0,
      totalDisputes: 0,
      isApproved: false,
      credentialNftId: null,
      earnings: 0,
      pendingRequests: [],
      completedAttestations: [],
      registeredAt: new Date().toISOString(),
      approvedAt: null,
    };

    doctors.set(walletAddress.toLowerCase(), doctor);

    res.status(201).json({
      id: doctor.id,
      walletAddress: doctor.walletAddress,
      name: doctor.name,
      specialty: doctor.specialty,
      trustScore: doctor.trustScore,
      isApproved: false,
      message: "Doctor registered. Awaiting admin approval.",
    });
  } catch (error) {
    console.error("Doctor registration error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/doctor/approve/:walletAddress
 * Admin approves a doctor
 */
router.post("/approve/:walletAddress", (req, res) => {
  const doctor = doctors.get(req.params.walletAddress.toLowerCase());
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  doctor.isApproved = true;
  doctor.approvedAt = new Date().toISOString();
  doctor.credentialNftId = `MVDC-${Date.now()}`; // Mock NFT mint

  res.json({
    walletAddress: doctor.walletAddress,
    name: doctor.name,
    isApproved: true,
    credentialNftId: doctor.credentialNftId,
    message: "Doctor approved. Soulbound NFT credential minted.",
  });
});

/**
 * POST /api/doctor/request-verification
 * Patient requests doctor to verify a record
 */
router.post("/request-verification", async (req, res) => {
  try {
    const { patientWallet, doctorWallet, recordId, escrowAmount } = req.body;

    if (!patientWallet || !doctorWallet || !recordId) {
      return res.status(400).json({ error: "Patient, doctor, and record ID required" });
    }

    const doctor = doctors.get(doctorWallet.toLowerCase());
    if (!doctor || !doctor.isApproved) {
      return res.status(400).json({ error: "Doctor not found or not approved" });
    }

    const request = {
      id: uuidv4(),
      patientWallet: patientWallet.toLowerCase(),
      doctorWallet: doctorWallet.toLowerCase(),
      recordId,
      escrowAmount: escrowAmount || doctor.verificationFee,
      status: "pending",
      attestationResult: null,
      attestationNotes: "",
      hcsTopicId: null,
      createdAt: new Date().toISOString(),
      attestedAt: null,
    };

    verificationRequests.set(request.id, request);
    doctor.pendingRequests.push(request.id);

    res.status(201).json({
      requestId: request.id,
      doctorName: doctor.name,
      escrowAmount: request.escrowAmount,
      status: "pending",
      message: "Verification request submitted. HBAR escrow locked.",
    });
  } catch (error) {
    console.error("Verification request error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/doctor/attest
 * Doctor submits attestation
 */
router.post("/attest", async (req, res) => {
  try {
    const { requestId, doctorWallet, result, notes } = req.body;

    if (!requestId || !doctorWallet || !result) {
      return res.status(400).json({ error: "Request ID, doctor wallet, and result required" });
    }

    const request = verificationRequests.get(requestId);
    if (!request) {
      return res.status(404).json({ error: "Verification request not found" });
    }
    if (request.doctorWallet !== doctorWallet.toLowerCase()) {
      return res.status(403).json({ error: "Not assigned to this request" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request is not pending" });
    }

    const doctor = doctors.get(doctorWallet.toLowerCase());

    // Submit attestation to HCS
    const hcsResult = await submitMessage(`mock-topic-attestation`, {
      type: "ATTESTATION",
      requestId,
      doctorWallet,
      result,
      notes: notes || "",
      timestamp: new Date().toISOString(),
    });

    request.status = "attested";
    request.attestationResult = result;
    request.attestationNotes = notes || "";
    request.attestedAt = new Date().toISOString();
    request.hcsTopicId = `attestation-${hcsResult.sequenceNumber}`;

    // Update doctor stats
    doctor.totalVerifications++;
    doctor.earnings += request.escrowAmount * 0.98; // minus 2% platform fee
    doctor.pendingRequests = doctor.pendingRequests.filter((id) => id !== requestId);
    doctor.completedAttestations.push(requestId);

    res.json({
      requestId,
      result,
      hcsTopicId: request.hcsTopicId,
      doctorEarnings: request.escrowAmount * 0.98,
      platformFee: request.escrowAmount * 0.02,
      message: "Attestation submitted and anchored on Hedera.",
    });
  } catch (error) {
    console.error("Attestation error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/doctor/pending/:walletAddress
 * Get pending verification requests for a doctor
 */
router.get("/pending/:walletAddress", (req, res) => {
  const doctor = doctors.get(req.params.walletAddress.toLowerCase());
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  const pending = doctor.pendingRequests
    .map((id) => verificationRequests.get(id))
    .filter((r) => r && r.status === "pending");

  res.json({ doctor: doctor.name, pendingRequests: pending });
});

/**
 * GET /api/doctor/profile/:walletAddress
 */
router.get("/profile/:walletAddress", (req, res) => {
  const doctor = doctors.get(req.params.walletAddress.toLowerCase());
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  res.json({
    id: doctor.id,
    walletAddress: doctor.walletAddress,
    name: doctor.name,
    specialty: doctor.specialty,
    jurisdiction: doctor.jurisdiction,
    licenceNumber: doctor.licenceNumber,
    verificationFee: doctor.verificationFee,
    trustScore: doctor.trustScore,
    totalVerifications: doctor.totalVerifications,
    isApproved: doctor.isApproved,
    credentialNftId: doctor.credentialNftId,
    earnings: doctor.earnings,
    registeredAt: doctor.registeredAt,
  });
});

/**
 * GET /api/doctor/list
 * List all approved doctors
 */
router.get("/list", (req, res) => {
  const approvedDoctors = [];
  for (const [, doctor] of doctors) {
    if (doctor.isApproved) {
      approvedDoctors.push({
        walletAddress: doctor.walletAddress,
        name: doctor.name,
        specialty: doctor.specialty,
        trustScore: doctor.trustScore,
        verificationFee: doctor.verificationFee,
        totalVerifications: doctor.totalVerifications,
      });
    }
  }
  res.json({ doctors: approvedDoctors });
});

// Export for other routes
router.doctors = doctors;
router.verificationRequests = verificationRequests;

module.exports = router;
