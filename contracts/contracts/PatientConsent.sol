// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PatientConsent
 * @notice Manages granular consent grants and revocations for medical data access
 * @dev All consent changes are logged as events for HCS anchoring
 */
contract PatientConsent {
    struct ConsentRecord {
        bool isGranted;
        uint256 grantedAt;
        uint256 revokedAt;
        string purpose;        // e.g., "verification", "marketplace", "research"
    }

    // patient => doctor/buyer => recordHash => ConsentRecord
    mapping(address => mapping(address => mapping(string => ConsentRecord))) public consents;

    // patient => list of (grantee, recordHash) pairs for enumeration
    mapping(address => ConsentEntry[]) public patientConsentLog;

    struct ConsentEntry {
        address grantee;
        string recordHash;
        bool isActive;
    }

    event ConsentGranted(
        address indexed patient,
        address indexed grantee,
        string recordHash,
        string purpose,
        uint256 timestamp
    );

    event ConsentRevoked(
        address indexed patient,
        address indexed grantee,
        string recordHash,
        uint256 timestamp
    );

    /**
     * @notice Patient grants consent for a grantee to access a specific record
     */
    function grantConsent(
        address _grantee,
        string calldata _recordHash,
        string calldata _purpose
    ) external {
        require(_grantee != address(0), "Invalid grantee");
        require(_grantee != msg.sender, "Cannot grant to self");
        require(bytes(_recordHash).length > 0, "Record hash required");

        ConsentRecord storage consent = consents[msg.sender][_grantee][_recordHash];

        consent.isGranted = true;
        consent.grantedAt = block.timestamp;
        consent.revokedAt = 0;
        consent.purpose = _purpose;

        patientConsentLog[msg.sender].push(ConsentEntry({
            grantee: _grantee,
            recordHash: _recordHash,
            isActive: true
        }));

        emit ConsentGranted(msg.sender, _grantee, _recordHash, _purpose, block.timestamp);
    }

    /**
     * @notice Patient revokes consent for a grantee
     */
    function revokeConsent(
        address _grantee,
        string calldata _recordHash
    ) external {
        ConsentRecord storage consent = consents[msg.sender][_grantee][_recordHash];
        require(consent.isGranted, "No active consent");

        consent.isGranted = false;
        consent.revokedAt = block.timestamp;

        // Update log entries
        ConsentEntry[] storage logs = patientConsentLog[msg.sender];
        for (uint256 i = 0; i < logs.length; i++) {
            if (
                logs[i].grantee == _grantee &&
                keccak256(bytes(logs[i].recordHash)) == keccak256(bytes(_recordHash)) &&
                logs[i].isActive
            ) {
                logs[i].isActive = false;
                break;
            }
        }

        emit ConsentRevoked(msg.sender, _grantee, _recordHash, block.timestamp);
    }

    /**
     * @notice Check if consent is currently active
     */
    function checkConsent(
        address _patient,
        address _grantee,
        string calldata _recordHash
    ) external view returns (bool) {
        return consents[_patient][_grantee][_recordHash].isGranted;
    }

    /**
     * @notice Get consent details
     */
    function getConsentDetails(
        address _patient,
        address _grantee,
        string calldata _recordHash
    ) external view returns (ConsentRecord memory) {
        return consents[_patient][_grantee][_recordHash];
    }

    /**
     * @notice Get all consent log entries for a patient
     */
    function getPatientConsentLog(address _patient) external view returns (ConsentEntry[] memory) {
        return patientConsentLog[_patient];
    }

    /**
     * @notice Batch revoke all consents for a specific record
     */
    function revokeAllForRecord(string calldata _recordHash) external {
        ConsentEntry[] storage logs = patientConsentLog[msg.sender];

        for (uint256 i = 0; i < logs.length; i++) {
            if (
                keccak256(bytes(logs[i].recordHash)) == keccak256(bytes(_recordHash)) &&
                logs[i].isActive
            ) {
                logs[i].isActive = false;
                consents[msg.sender][logs[i].grantee][_recordHash].isGranted = false;
                consents[msg.sender][logs[i].grantee][_recordHash].revokedAt = block.timestamp;

                emit ConsentRevoked(msg.sender, logs[i].grantee, _recordHash, block.timestamp);
            }
        }
    }
}
