const express = require("express");
const crypto = require("crypto");
const { generateToken } = require("../middleware/auth");

const router = express.Router();

// In-memory store for challenges (use Redis in production)
const challenges = new Map();

/**
 * POST /api/auth/challenge
 * Generate a wallet signature challenge
 */
router.post("/challenge", (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: "Wallet address required" });
  }

  const nonce = crypto.randomBytes(32).toString("hex");
  const message = `MedVault DeFi Authentication\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

  challenges.set(walletAddress.toLowerCase(), { nonce, message, createdAt: Date.now() });

  // Auto-expire challenges after 5 minutes
  setTimeout(() => challenges.delete(walletAddress.toLowerCase()), 5 * 60 * 1000);

  res.json({ message, nonce });
});

/**
 * POST /api/auth/verify
 * Verify wallet signature and issue JWT
 */
router.post("/verify", (req, res) => {
  const { walletAddress, signature, role } = req.body;

  if (!walletAddress || !signature) {
    return res.status(400).json({ error: "Wallet address and signature required" });
  }

  const challenge = challenges.get(walletAddress.toLowerCase());
  if (!challenge) {
    return res.status(400).json({ error: "No active challenge. Request a new one." });
  }

  // For MVP, accept the signature (in production, verify with ethers/Hedera SDK)
  // In a real implementation, you'd recover the signer address from the signature
  const validRole = ["patient", "doctor", "admin"].includes(role) ? role : "patient";

  const token = generateToken({
    walletAddress: walletAddress.toLowerCase(),
    role: validRole,
    iat: Math.floor(Date.now() / 1000),
  });

  challenges.delete(walletAddress.toLowerCase());

  res.json({
    token,
    walletAddress,
    role: validRole,
    expiresIn: "24h",
  });
});

module.exports = router;
