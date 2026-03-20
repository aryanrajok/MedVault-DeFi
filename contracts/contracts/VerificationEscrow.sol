// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VerificationEscrow
 * @notice Manages HBAR escrow for medical record verification: lock, attest, release, dispute
 * @dev Core verification engine for MedVault DeFi
 */
contract VerificationEscrow {
    address public admin;
    address public platformTreasury;
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2% = 200 basis points
    uint256 public constant DISPUTE_WINDOW = 48 hours;

    enum RequestStatus {
        Pending,      // escrow locked, waiting for doctor
        Attested,     // doctor submitted attestation
        Released,     // fee released to doctor
        Disputed,     // patient disputed within 48 hours
        Resolved,     // dispute resolved by admin
        Refunded      // escrow refunded to patient
    }

    enum AttestationResult {
        None,
        Authentic,
        Suspicious,
        UnableToVerify
    }

    struct VerificationRequest {
        address patient;
        address doctor;
        string documentHash;       // IPFS CID
        string documentType;
        uint256 escrowAmount;
        uint256 doctorFee;
        uint256 platformFee;
        uint256 createdAt;
        uint256 attestedAt;
        RequestStatus status;
        AttestationResult result;
        string attestationNotes;
        string hcsTopicId;
    }

    uint256 public requestCount;
    mapping(uint256 => VerificationRequest) public requests;
    mapping(address => uint256[]) public patientRequests;
    mapping(address => uint256[]) public doctorRequests;

    event VerificationRequested(
        uint256 indexed requestId,
        address indexed patient,
        address indexed doctor,
        string documentHash,
        uint256 escrowAmount
    );

    event AttestationSubmitted(
        uint256 indexed requestId,
        address indexed doctor,
        AttestationResult result,
        string hcsTopicId
    );

    event FeeReleased(
        uint256 indexed requestId,
        address indexed doctor,
        uint256 doctorAmount,
        uint256 platformAmount
    );

    event DisputeRaised(uint256 indexed requestId, address indexed patient);
    event DisputeResolved(uint256 indexed requestId, bool refunded);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address _platformTreasury) {
        admin = msg.sender;
        platformTreasury = _platformTreasury;
    }

    /**
     * @notice Patient requests verification, locking HBAR in escrow
     * @param _doctor Doctor to verify the record
     * @param _documentHash IPFS CID of the encrypted document
     * @param _documentType Type of document (Lab Report, Imaging, etc.)
     */
    function requestVerification(
        address _doctor,
        string calldata _documentHash,
        string calldata _documentType
    ) external payable returns (uint256) {
        require(msg.value > 0, "Must send HBAR for escrow");
        require(_doctor != address(0), "Invalid doctor");
        require(_doctor != msg.sender, "Cannot verify own records");
        require(bytes(_documentHash).length > 0, "Document hash required");

        uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / 10000;
        uint256 doctorFee = msg.value - platformFee;

        uint256 requestId = requestCount++;

        requests[requestId] = VerificationRequest({
            patient: msg.sender,
            doctor: _doctor,
            documentHash: _documentHash,
            documentType: _documentType,
            escrowAmount: msg.value,
            doctorFee: doctorFee,
            platformFee: platformFee,
            createdAt: block.timestamp,
            attestedAt: 0,
            status: RequestStatus.Pending,
            result: AttestationResult.None,
            attestationNotes: "",
            hcsTopicId: ""
        });

        patientRequests[msg.sender].push(requestId);
        doctorRequests[_doctor].push(requestId);

        emit VerificationRequested(requestId, msg.sender, _doctor, _documentHash, msg.value);
        return requestId;
    }

    /**
     * @notice Doctor submits attestation for a verification request
     */
    function submitAttestation(
        uint256 _requestId,
        AttestationResult _result,
        string calldata _notes,
        string calldata _hcsTopicId
    ) external {
        VerificationRequest storage req = requests[_requestId];

        require(msg.sender == req.doctor, "Not assigned doctor");
        require(req.status == RequestStatus.Pending, "Not pending");
        require(_result != AttestationResult.None, "Must provide result");

        req.status = RequestStatus.Attested;
        req.result = _result;
        req.attestationNotes = _notes;
        req.hcsTopicId = _hcsTopicId;
        req.attestedAt = block.timestamp;

        emit AttestationSubmitted(_requestId, msg.sender, _result, _hcsTopicId);
    }

    /**
     * @notice Release escrow to doctor after dispute window (or immediately if no dispute)
     * @dev Can be called by patient, doctor, or admin after attestation
     */
    function releaseFee(uint256 _requestId) external {
        VerificationRequest storage req = requests[_requestId];

        require(req.status == RequestStatus.Attested, "Not attested");
        require(
            block.timestamp >= req.attestedAt + DISPUTE_WINDOW ||
            msg.sender == req.patient,
            "Dispute window active"
        );

        req.status = RequestStatus.Released;

        // Transfer doctor fee
        (bool sentDoctor, ) = payable(req.doctor).call{value: req.doctorFee}("");
        require(sentDoctor, "Doctor payment failed");

        // Transfer platform fee
        (bool sentPlatform, ) = payable(platformTreasury).call{value: req.platformFee}("");
        require(sentPlatform, "Platform payment failed");

        emit FeeReleased(_requestId, req.doctor, req.doctorFee, req.platformFee);
    }

    /**
     * @notice Patient disputes a verification within the 48-hour window
     */
    function disputeVerification(uint256 _requestId) external {
        VerificationRequest storage req = requests[_requestId];

        require(msg.sender == req.patient, "Only patient");
        require(req.status == RequestStatus.Attested, "Not attested");
        require(block.timestamp < req.attestedAt + DISPUTE_WINDOW, "Dispute window closed");

        req.status = RequestStatus.Disputed;
        emit DisputeRaised(_requestId, msg.sender);
    }

    /**
     * @notice Admin resolves dispute — either refund patient or release to doctor
     */
    function resolveDispute(uint256 _requestId, bool _refundPatient) external onlyAdmin {
        VerificationRequest storage req = requests[_requestId];
        require(req.status == RequestStatus.Disputed, "Not disputed");

        if (_refundPatient) {
            req.status = RequestStatus.Refunded;
            (bool sent, ) = payable(req.patient).call{value: req.escrowAmount}("");
            require(sent, "Refund failed");
        } else {
            req.status = RequestStatus.Released;
            (bool sentDoctor, ) = payable(req.doctor).call{value: req.doctorFee}("");
            require(sentDoctor, "Doctor payment failed");
            (bool sentPlatform, ) = payable(platformTreasury).call{value: req.platformFee}("");
            require(sentPlatform, "Platform payment failed");
        }

        emit DisputeResolved(_requestId, _refundPatient);
    }

    // ── View Functions ──

    function getRequest(uint256 _requestId) external view returns (VerificationRequest memory) {
        return requests[_requestId];
    }

    function getPatientRequests(address _patient) external view returns (uint256[] memory) {
        return patientRequests[_patient];
    }

    function getDoctorRequests(address _doctor) external view returns (uint256[] memory) {
        return doctorRequests[_doctor];
    }

    function getRequestCount() external view returns (uint256) {
        return requestCount;
    }
}
