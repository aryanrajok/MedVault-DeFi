const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Use deployer as platform treasury for MVP
  const platformTreasury = deployer.address;

  // 1. Deploy DoctorRegistry
  console.log("\n--- Deploying DoctorRegistry ---");
  const DoctorRegistry = await hre.ethers.getContractFactory("DoctorRegistry");
  const doctorRegistry = await DoctorRegistry.deploy(platformTreasury);
  await doctorRegistry.waitForDeployment();
  const doctorRegistryAddress = await doctorRegistry.getAddress();
  console.log("DoctorRegistry deployed to:", doctorRegistryAddress);

  // 2. Deploy VerificationEscrow
  console.log("\n--- Deploying VerificationEscrow ---");
  const VerificationEscrow = await hre.ethers.getContractFactory("VerificationEscrow");
  const verificationEscrow = await VerificationEscrow.deploy(platformTreasury);
  await verificationEscrow.waitForDeployment();
  const verificationEscrowAddress = await verificationEscrow.getAddress();
  console.log("VerificationEscrow deployed to:", verificationEscrowAddress);

  // 3. Deploy DataMarketplace
  console.log("\n--- Deploying DataMarketplace ---");
  const DataMarketplace = await hre.ethers.getContractFactory("DataMarketplace");
  const dataMarketplace = await DataMarketplace.deploy(platformTreasury);
  await dataMarketplace.waitForDeployment();
  const dataMarketplaceAddress = await dataMarketplace.getAddress();
  console.log("DataMarketplace deployed to:", dataMarketplaceAddress);

  // 4. Deploy PatientConsent
  console.log("\n--- Deploying PatientConsent ---");
  const PatientConsent = await hre.ethers.getContractFactory("PatientConsent");
  const patientConsent = await PatientConsent.deploy();
  await patientConsent.waitForDeployment();
  const patientConsentAddress = await patientConsent.getAddress();
  console.log("PatientConsent deployed to:", patientConsentAddress);

  // Summary
  console.log("\n========================================");
  console.log("  MedVault DeFi — Deployment Summary");
  console.log("========================================");
  console.log(`  DoctorRegistry:      ${doctorRegistryAddress}`);
  console.log(`  VerificationEscrow:  ${verificationEscrowAddress}`);
  console.log(`  DataMarketplace:     ${dataMarketplaceAddress}`);
  console.log(`  PatientConsent:      ${patientConsentAddress}`);
  console.log(`  Platform Treasury:   ${platformTreasury}`);
  console.log("========================================\n");

  // Write addresses to .env-compatible format
  console.log("Add these to your .env file:");
  console.log(`DOCTOR_REGISTRY_ADDRESS=${doctorRegistryAddress}`);
  console.log(`VERIFICATION_ESCROW_ADDRESS=${verificationEscrowAddress}`);
  console.log(`DATA_MARKETPLACE_ADDRESS=${dataMarketplaceAddress}`);
  console.log(`PATIENT_CONSENT_ADDRESS=${patientConsentAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
