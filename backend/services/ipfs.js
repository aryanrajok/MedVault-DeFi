const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

// For MVP: simulated IPFS storage using local file system
// In production, use Web3.Storage or Pinata
const STORAGE_DIR = path.join(__dirname, "..", "storage", "ipfs");

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Upload encrypted data to IPFS (or local mock)
 * @param {Buffer|string} data - encrypted file data
 * @param {string} filename - original filename
 * @returns {{ cid: string, size: number, mock: boolean }}
 */
async function uploadToIPFS(data, filename) {
  const apiKey = process.env.IPFS_API_KEY;

  if (apiKey && apiKey !== "your_ipfs_api_key_here") {
    // Real IPFS upload via Web3.Storage API
    try {
      const response = await fetch("https://api.web3.storage/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/octet-stream",
          "X-Name": filename,
        },
        body: data,
      });

      if (!response.ok) throw new Error(`IPFS upload failed: ${response.status}`);
      const result = await response.json();
      return { cid: result.cid, size: data.length, mock: false };
    } catch (error) {
      console.warn("⚠️  IPFS upload failed, falling back to local:", error.message);
    }
  }

  // Mock: store locally
  const cid = `Qm${uuidv4().replace(/-/g, "")}`;
  const filePath = path.join(STORAGE_DIR, cid);

  const content = typeof data === "string" ? data : data.toString("base64");
  fs.writeFileSync(filePath, content);

  console.log(`📦 Mock IPFS: stored ${filename} as ${cid}`);
  return { cid, size: content.length, mock: true };
}

/**
 * Retrieve data from IPFS (or local mock)
 */
async function retrieveFromIPFS(cid) {
  // Try local first (mock mode)
  const filePath = path.join(STORAGE_DIR, cid);
  if (fs.existsSync(filePath)) {
    return { data: fs.readFileSync(filePath, "utf8"), mock: true };
  }

  // Try real IPFS gateway
  try {
    const response = await fetch(`https://w3s.link/ipfs/${cid}`);
    if (response.ok) {
      const data = await response.text();
      return { data, mock: false };
    }
  } catch (error) {
    console.warn("⚠️  IPFS retrieval failed:", error.message);
  }

  throw new Error(`File not found: ${cid}`);
}

module.exports = { uploadToIPFS, retrieveFromIPFS };
