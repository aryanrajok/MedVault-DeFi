// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DoctorRegistry
 * @notice Manages doctor registration, credential approval, trust scores, and fee schedules
 * @dev Part of the MedVault DeFi platform on Hedera Hashgraph
 */
contract DoctorRegistry {
    address public admin;
    address public platformTreasury;

    uint256 public constant MIN_FEE = 0.5 ether;       // 0.5 HBAR (in tinybars via ether unit)
    uint256 public constant MAX_FEE_STANDARD = 50 ether;
    uint256 public constant MAX_FEE_PREMIUM = 200 ether;
    uint256 public constant PREMIUM_TRUST_THRESHOLD = 80;

    struct Doctor {
        string name;
        string licenceNumber;
        string specialty;
        string jurisdiction;
        uint256 verificationFee;
        uint256 trustScore;        // 0-100
        uint256 totalVerifications;
        uint256 totalDisputes;
        bool isApproved;
        bool isRegistered;
        uint256 registeredAt;
        uint256 approvedAt;
    }

    mapping(address => Doctor) public doctors;
    address[] public doctorAddresses;

    event DoctorRegistered(address indexed doctor, string name, string specialty);
    event DoctorApproved(address indexed doctor, uint256 timestamp);
    event DoctorRevoked(address indexed doctor);
    event VerificationFeeUpdated(address indexed doctor, uint256 newFee);
    event TrustScoreUpdated(address indexed doctor, uint256 newScore);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyRegistered() {
        require(doctors[msg.sender].isRegistered, "Not registered");
        _;
    }

    modifier onlyApproved(address _doctor) {
        require(doctors[_doctor].isApproved, "Doctor not approved");
        _;
    }

    constructor(address _platformTreasury) {
        admin = msg.sender;
        platformTreasury = _platformTreasury;
    }

    /**
     * @notice Doctor registers themselves with credentials
     */
    function registerDoctor(
        string calldata _name,
        string calldata _licenceNumber,
        string calldata _specialty,
        string calldata _jurisdiction
    ) external {
        require(!doctors[msg.sender].isRegistered, "Already registered");
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_licenceNumber).length > 0, "Licence required");

        doctors[msg.sender] = Doctor({
            name: _name,
            licenceNumber: _licenceNumber,
            specialty: _specialty,
            jurisdiction: _jurisdiction,
            verificationFee: MIN_FEE,
            trustScore: 50,
            totalVerifications: 0,
            totalDisputes: 0,
            isApproved: false,
            isRegistered: true,
            registeredAt: block.timestamp,
            approvedAt: 0
        });

        doctorAddresses.push(msg.sender);
        emit DoctorRegistered(msg.sender, _name, _specialty);
    }

    /**
     * @notice Admin approves a registered doctor
     */
    function approveDoctor(address _doctor) external onlyAdmin {
        require(doctors[_doctor].isRegistered, "Not registered");
        require(!doctors[_doctor].isApproved, "Already approved");

        doctors[_doctor].isApproved = true;
        doctors[_doctor].approvedAt = block.timestamp;

        emit DoctorApproved(_doctor, block.timestamp);
    }

    /**
     * @notice Admin revokes a doctor's approval
     */
    function revokeDoctor(address _doctor) external onlyAdmin {
        require(doctors[_doctor].isApproved, "Not approved");
        doctors[_doctor].isApproved = false;
        emit DoctorRevoked(_doctor);
    }

    /**
     * @notice Doctor sets their verification fee
     */
    function setVerificationFee(uint256 _fee) external onlyRegistered {
        require(doctors[msg.sender].isApproved, "Not approved");
        require(_fee >= MIN_FEE, "Below minimum fee");

        uint256 maxFee = doctors[msg.sender].trustScore >= PREMIUM_TRUST_THRESHOLD
            ? MAX_FEE_PREMIUM
            : MAX_FEE_STANDARD;
        require(_fee <= maxFee, "Exceeds max fee");

        doctors[msg.sender].verificationFee = _fee;
        emit VerificationFeeUpdated(msg.sender, _fee);
    }

    /**
     * @notice Update trust score (called by admin or escrow contract)
     */
    function updateTrustScore(address _doctor, uint256 _score) external onlyAdmin {
        require(doctors[_doctor].isRegistered, "Not registered");
        require(_score <= 100, "Score max 100");

        doctors[_doctor].trustScore = _score;
        emit TrustScoreUpdated(_doctor, _score);
    }

    /**
     * @notice Increment verification count (called by escrow contract)
     */
    function incrementVerifications(address _doctor) external {
        require(doctors[_doctor].isApproved, "Not approved");
        doctors[_doctor].totalVerifications++;
    }

    /**
     * @notice Increment dispute count
     */
    function incrementDisputes(address _doctor) external {
        require(doctors[_doctor].isRegistered, "Not registered");
        doctors[_doctor].totalDisputes++;
    }

    // ── View Functions ──

    function getDoctorInfo(address _doctor) external view returns (Doctor memory) {
        return doctors[_doctor];
    }

    function isApprovedDoctor(address _doctor) external view returns (bool) {
        return doctors[_doctor].isApproved;
    }

    function getDoctorFee(address _doctor) external view returns (uint256) {
        return doctors[_doctor].verificationFee;
    }

    function getDoctorCount() external view returns (uint256) {
        return doctorAddresses.length;
    }

    function getAllDoctors() external view returns (address[] memory) {
        return doctorAddresses;
    }
}
