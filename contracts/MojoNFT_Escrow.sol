// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MojoNFT_Escrow
 * @dev Enhanced NFT contract with escrow system for PFP generators
 * Features: Collection management, escrow system, batch operations, advanced admin controls
 */
contract MojoNFT_Escrow is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    // Collection settings
    uint256 public immutable MAX_SUPPLY;
    uint256 public mintPrice;
    bool public mintingActive = true;
    string public baseTokenURI;
    string public collectionDescription;
    
    // Royalty settings (EIP-2981)
    address public royaltyReceiver;
    uint96 public royaltyFeeNumerator; // In basis points (e.g., 750 = 7.5%)
    
    // Escrow system
    mapping(uint256 => address) public pendingClaims; // tokenId => intended recipient
    mapping(address => uint256[]) public userPendingTokens; // user => pending token IDs
    mapping(uint256 => bool) public tokenClaimed; // tokenId => claimed status
    uint256 public totalPendingTokens;
    
    // Collection metadata
    struct CollectionInfo {
        string name;
        string symbol;
        string description;
        string externalUrl;
        string imageUrl;
        uint256 totalSupply;
        uint256 maxSupply;
        address creator;
        uint256 createdAt;
    }
    
    CollectionInfo public collectionInfo;
    
    // Trait tracking for uniqueness
    mapping(string => bool) public traitCombinationExists;
    mapping(uint256 => string) public tokenTraitHash;
    
    // Events
    event MintPriceUpdated(uint256 newPrice);
    event MintingToggled(bool isActive);
    event RoyaltyUpdated(address receiver, uint96 feeNumerator);
    event TokenMintedToEscrow(uint256 indexed tokenId, address indexed intendedRecipient, string tokenURI);
    event TokenClaimedFromEscrow(uint256 indexed tokenId, address indexed recipient);
    event BatchTokensClaimed(address indexed recipient, uint256[] tokenIds);
    event CollectionMetadataUpdated();
    
    constructor(
        string memory name,
        string memory symbol,
        string memory description,
        uint256 _mintPrice,
        uint256 _maxSupply,
        address _royaltyReceiver,
        uint96 _royaltyFeeNumerator,
        string memory _baseTokenURI
    ) ERC721(name, symbol) {
        mintPrice = _mintPrice;
        MAX_SUPPLY = _maxSupply;
        royaltyReceiver = _royaltyReceiver;
        royaltyFeeNumerator = _royaltyFeeNumerator;
        baseTokenURI = _baseTokenURI;
        collectionDescription = description;
        
        // Initialize collection info
        collectionInfo = CollectionInfo({
            name: name,
            symbol: symbol,
            description: description,
            externalUrl: "",
            imageUrl: "",
            totalSupply: 0,
            maxSupply: _maxSupply,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        // Start token IDs at 1
        _tokenIdCounter.increment();
    }
    
    // ========== ESCROW MINTING SYSTEM ==========
    
    /**
     * @dev Mint NFT to escrow (not directly to user)
     * @param intendedRecipient Address that will be able to claim the NFT
     * @param tokenURI Metadata URI for the NFT (IPFS hash)
     * @param traitHash Unique hash of trait combination for duplicate prevention
     */
    function mintToEscrow(
        address intendedRecipient, 
        string memory tokenURI,
        string memory traitHash
    ) public payable nonReentrant returns (uint256) {
        require(mintingActive, "Minting is not active");
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_tokenIdCounter.current() <= MAX_SUPPLY, "Max supply exceeded");
        require(intendedRecipient != address(0), "Cannot mint to zero address");
        require(bytes(tokenURI).length > 0, "Token URI required");
        require(bytes(traitHash).length > 0, "Trait hash required");
        require(!traitCombinationExists[traitHash], "This trait combination already exists");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // Mint to contract (escrow)
        _safeMint(address(this), tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Set up escrow
        pendingClaims[tokenId] = intendedRecipient;
        userPendingTokens[intendedRecipient].push(tokenId);
        tokenTraitHash[tokenId] = traitHash;
        traitCombinationExists[traitHash] = true;
        totalPendingTokens++;
        
        // Update collection info
        collectionInfo.totalSupply++;
        
        emit TokenMintedToEscrow(tokenId, intendedRecipient, tokenURI);
        return tokenId;
    }
    
    /**
     * @dev Claim a single NFT from escrow (admin only)
     * @param tokenId Token ID to claim
     */
    function claimToken(uint256 tokenId) public onlyOwner nonReentrant {
        require(pendingClaims[tokenId] != address(0), "Token not in escrow");
        require(!tokenClaimed[tokenId], "Token already claimed");
        
        address recipient = pendingClaims[tokenId];
        
        // Transfer from contract to recipient
        _transfer(address(this), recipient, tokenId);
        
        // Update escrow state
        tokenClaimed[tokenId] = true;
        totalPendingTokens--;
        
        // Remove from user's pending list
        _removeFromPendingList(recipient, tokenId);
        
        emit TokenClaimedFromEscrow(tokenId, recipient);
    }
    
    /**
     * @dev Claim multiple NFTs from escrow (admin only)
     * @param tokenIds Array of token IDs to claim
     */
    function claimTokensBatch(uint256[] memory tokenIds) public onlyOwner nonReentrant {
        require(tokenIds.length > 0, "No tokens to claim");
        require(tokenIds.length <= 50, "Too many tokens in batch"); // Gas limit protection
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            if (pendingClaims[tokenId] != address(0) && !tokenClaimed[tokenId]) {
                address recipient = pendingClaims[tokenId];
                
                // Transfer from contract to recipient
                _transfer(address(this), recipient, tokenId);
                
                // Update escrow state
                tokenClaimed[tokenId] = true;
                totalPendingTokens--;
                
                // Remove from user's pending list
                _removeFromPendingList(recipient, tokenId);
                
                emit TokenClaimedFromEscrow(tokenId, recipient);
            }
        }
        
        emit BatchTokensClaimed(msg.sender, tokenIds);
    }
    
    /**
     * @dev Claim all pending NFTs for a specific user (admin only)
     * @param user Address to claim all pending tokens for
     */
    function claimAllUserTokens(address user) public onlyOwner nonReentrant {
        uint256[] memory userTokens = userPendingTokens[user];
        require(userTokens.length > 0, "No pending tokens for user");
        
        uint256[] memory claimedTokens = new uint256[](userTokens.length);
        uint256 claimedCount = 0;
        
        for (uint256 i = 0; i < userTokens.length; i++) {
            uint256 tokenId = userTokens[i];
            
            if (!tokenClaimed[tokenId]) {
                // Transfer from contract to user
                _transfer(address(this), user, tokenId);
                
                // Update escrow state
                tokenClaimed[tokenId] = true;
                totalPendingTokens--;
                
                claimedTokens[claimedCount] = tokenId;
                claimedCount++;
                
                emit TokenClaimedFromEscrow(tokenId, user);
            }
        }
        
        // Clear user's pending list
        delete userPendingTokens[user];
        
        emit BatchTokensClaimed(user, claimedTokens);
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @dev Update mint price (owner only)
     */
    function setMintPrice(uint256 newPrice) public onlyOwner {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }
    
    /**
     * @dev Toggle minting active state (owner only)
     */
    function toggleMinting() public onlyOwner {
        mintingActive = !mintingActive;
        emit MintingToggled(mintingActive);
    }
    
    /**
     * @dev Update royalty settings (owner only)
     */
    function setRoyaltyInfo(address receiver, uint96 feeNumerator) public onlyOwner {
        require(receiver != address(0), "Invalid receiver");
        require(feeNumerator <= 1000, "Royalty too high"); // Max 10%
        
        royaltyReceiver = receiver;
        royaltyFeeNumerator = feeNumerator;
        
        emit RoyaltyUpdated(receiver, feeNumerator);
    }
    
    /**
     * @dev Update collection metadata (owner only)
     */
    function updateCollectionInfo(
        string memory description,
        string memory externalUrl,
        string memory imageUrl
    ) public onlyOwner {
        collectionInfo.description = description;
        collectionInfo.externalUrl = externalUrl;
        collectionInfo.imageUrl = imageUrl;
        collectionDescription = description;
        
        emit CollectionMetadataUpdated();
    }
    
    /**
     * @dev Emergency function to transfer any NFT from escrow (owner only)
     */
    function emergencyTransfer(uint256 tokenId, address to) public onlyOwner {
        require(ownerOf(tokenId) == address(this), "Token not in escrow");
        require(to != address(0), "Cannot transfer to zero address");
        
        _transfer(address(this), to, tokenId);
        
        // Update escrow state if it was pending
        if (pendingClaims[tokenId] != address(0) && !tokenClaimed[tokenId]) {
            tokenClaimed[tokenId] = true;
            totalPendingTokens--;
            _removeFromPendingList(pendingClaims[tokenId], tokenId);
        }
    }
    
    /**
     * @dev Withdraw contract funds (owner only)
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get user's pending token IDs
     */
    function getUserPendingTokens(address user) public view returns (uint256[] memory) {
        return userPendingTokens[user];
    }
    
    /**
     * @dev Get all pending token IDs (admin view)
     */
    function getAllPendingTokens() public view onlyOwner returns (uint256[] memory) {
        uint256[] memory allPending = new uint256[](totalPendingTokens);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _tokenIdCounter.current(); i++) {
            if (pendingClaims[i] != address(0) && !tokenClaimed[i]) {
                allPending[index] = i;
                index++;
            }
        }
        
        return allPending;
    }
    
    /**
     * @dev Check if trait combination exists
     */
    function traitExists(string memory traitHash) public view returns (bool) {
        return traitCombinationExists[traitHash];
    }
    
    /**
     * @dev Get collection statistics
     */
    function getCollectionStats() public view returns (
        uint256 totalMinted,
        uint256 totalClaimed,
        uint256 totalPending,
        uint256 maxSupply
    ) {
        return (
            _tokenIdCounter.current() - 1,
            (_tokenIdCounter.current() - 1) - totalPendingTokens,
            totalPendingTokens,
            MAX_SUPPLY
        );
    }
    
    // ========== INTERNAL FUNCTIONS ==========
    
    function _removeFromPendingList(address user, uint256 tokenId) internal {
        uint256[] storage userTokens = userPendingTokens[user];
        for (uint256 i = 0; i < userTokens.length; i++) {
            if (userTokens[i] == tokenId) {
                userTokens[i] = userTokens[userTokens.length - 1];
                userTokens.pop();
                break;
            }
        }
    }
    
    // ========== ROYALTIES (EIP-2981) ==========
    
    function royaltyInfo(uint256, uint256 salePrice) 
        external 
        view 
        returns (address receiver, uint256 royaltyAmount) 
    {
        receiver = royaltyReceiver;
        royaltyAmount = (salePrice * royaltyFeeNumerator) / 10000;
    }
    
    // ========== OVERRIDES ==========
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function _burn(uint256 tokenId) 
        internal 
        override(ERC721, ERC721URIStorage) 
    {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721Enumerable, ERC721URIStorage) 
        returns (bool) 
    {
        return interfaceId == 0x2a55205a || // ERC-2981 Royalties
               super.supportsInterface(interfaceId);
    }
}
