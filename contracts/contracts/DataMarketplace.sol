// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DataMarketplace
 * @notice Decentralized marketplace for verified medical data records
 * @dev Handles record listings, purchases with atomic HBAR revenue splits
 */
contract DataMarketplace {
    address public admin;
    address public platformTreasury;
    uint256 public constant PLATFORM_FEE_BPS = 800; // 8% = 800 basis points

    enum ListingStatus { Active, Sold, Delisted }
    enum LicenceType { Research, Commercial, Educational }

    struct Listing {
        address patient;
        string recordHash;         // IPFS CID
        string category;           // Lab Results, Imaging, Family History, etc.
        string description;        // anonymised description
        uint256 price;             // in HBAR (wei units)
        ListingStatus status;
        uint256 createdAt;
        uint256 totalSales;
    }

    struct Purchase {
        uint256 listingId;
        address buyer;
        uint256 pricePaid;
        uint256 patientShare;
        uint256 platformShare;
        LicenceType licence;
        uint256 purchasedAt;
        string transactionMemo;
    }

    uint256 public listingCount;
    uint256 public purchaseCount;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Purchase) public purchases;
    mapping(address => uint256[]) public patientListings;
    mapping(address => uint256[]) public buyerPurchases;
    // buyer => listingId => purchased
    mapping(address => mapping(uint256 => bool)) public hasPurchased;

    event RecordListed(
        uint256 indexed listingId,
        address indexed patient,
        string category,
        uint256 price
    );

    event RecordPurchased(
        uint256 indexed purchaseId,
        uint256 indexed listingId,
        address indexed buyer,
        address patient,
        uint256 pricePaid,
        uint256 patientShare
    );

    event RecordDelisted(uint256 indexed listingId);
    event PriceUpdated(uint256 indexed listingId, uint256 newPrice);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address _platformTreasury) {
        admin = msg.sender;
        platformTreasury = _platformTreasury;
    }

    /**
     * @notice Patient lists a verified record on the marketplace
     */
    function listRecord(
        string calldata _recordHash,
        string calldata _category,
        string calldata _description,
        uint256 _price
    ) external returns (uint256) {
        require(bytes(_recordHash).length > 0, "Record hash required");
        require(_price > 0, "Price must be > 0");

        uint256 listingId = listingCount++;

        listings[listingId] = Listing({
            patient: msg.sender,
            recordHash: _recordHash,
            category: _category,
            description: _description,
            price: _price,
            status: ListingStatus.Active,
            createdAt: block.timestamp,
            totalSales: 0
        });

        patientListings[msg.sender].push(listingId);
        emit RecordListed(listingId, msg.sender, _category, _price);
        return listingId;
    }

    /**
     * @notice Buy a record — 92% goes to patient, 8% to platform (atomic)
     */
    function purchaseRecord(
        uint256 _listingId,
        LicenceType _licence
    ) external payable returns (uint256) {
        Listing storage listing = listings[_listingId];

        require(listing.status == ListingStatus.Active, "Not active");
        require(msg.value == listing.price, "Incorrect payment");
        require(msg.sender != listing.patient, "Cannot buy own record");
        require(!hasPurchased[msg.sender][_listingId], "Already purchased");

        uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / 10000;
        uint256 patientShare = msg.value - platformFee;

        // Atomic transfers
        (bool sentPatient, ) = payable(listing.patient).call{value: patientShare}("");
        require(sentPatient, "Patient payment failed");

        (bool sentPlatform, ) = payable(platformTreasury).call{value: platformFee}("");
        require(sentPlatform, "Platform payment failed");

        uint256 purchaseId = purchaseCount++;

        purchases[purchaseId] = Purchase({
            listingId: _listingId,
            buyer: msg.sender,
            pricePaid: msg.value,
            patientShare: patientShare,
            platformShare: platformFee,
            licence: _licence,
            purchasedAt: block.timestamp,
            transactionMemo: ""
        });

        listing.totalSales++;
        hasPurchased[msg.sender][_listingId] = true;
        buyerPurchases[msg.sender].push(purchaseId);

        emit RecordPurchased(
            purchaseId,
            _listingId,
            msg.sender,
            listing.patient,
            msg.value,
            patientShare
        );

        return purchaseId;
    }

    /**
     * @notice Patient delists their record
     */
    function delistRecord(uint256 _listingId) external {
        Listing storage listing = listings[_listingId];
        require(msg.sender == listing.patient, "Not owner");
        require(listing.status == ListingStatus.Active, "Not active");

        listing.status = ListingStatus.Delisted;
        emit RecordDelisted(_listingId);
    }

    /**
     * @notice Patient updates listing price
     */
    function updatePrice(uint256 _listingId, uint256 _newPrice) external {
        Listing storage listing = listings[_listingId];
        require(msg.sender == listing.patient, "Not owner");
        require(listing.status == ListingStatus.Active, "Not active");
        require(_newPrice > 0, "Price must be > 0");

        listing.price = _newPrice;
        emit PriceUpdated(_listingId, _newPrice);
    }

    // ── View Functions ──

    function getListing(uint256 _listingId) external view returns (Listing memory) {
        return listings[_listingId];
    }

    function getPurchase(uint256 _purchaseId) external view returns (Purchase memory) {
        return purchases[_purchaseId];
    }

    function getPatientListings(address _patient) external view returns (uint256[] memory) {
        return patientListings[_patient];
    }

    function getBuyerPurchases(address _buyer) external view returns (uint256[] memory) {
        return buyerPurchases[_buyer];
    }

    function getActiveListings(uint256 _offset, uint256 _limit) external view returns (Listing[] memory) {
        uint256 count = 0;
        uint256 end = _offset + _limit > listingCount ? listingCount : _offset + _limit;

        // First pass: count active
        for (uint256 i = _offset; i < end; i++) {
            if (listings[i].status == ListingStatus.Active) count++;
        }

        Listing[] memory result = new Listing[](count);
        uint256 idx = 0;
        for (uint256 i = _offset; i < end; i++) {
            if (listings[i].status == ListingStatus.Active) {
                result[idx++] = listings[i];
            }
        }
        return result;
    }
}
