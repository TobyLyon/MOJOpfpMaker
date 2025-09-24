// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title MojoNFT_Optimized
 * @dev Gas-optimized ERC721A NFT contract for MOJO PFP collection
 * Features:
 * - ERC721A for ultra-efficient batch minting
 * - Whitelist minting with Merkle proofs
 * - Public minting with configurable limits
 * - Reveal mechanism for metadata
 * - Royalty support (EIP-2981)
 */
contract MojoNFT_Optimized is ERC721A, Ownable, ReentrancyGuard {
    
    // Collection Configuration
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MAX_PER_WALLET = 10;
    uint256 public constant MAX_PER_TX = 5;
    
    // Pricing
    uint256 public publicPrice = 0.01 ether;
    uint256 public whitelistPrice = 0.008 ether;
    
    // Sale States
    bool public whitelistActive = false;
    bool public publicActive = false;
    bool public revealed = false;
    
    // Metadata
    string private _baseTokenURI;
    string private _unrevealedURI;
    
    // Whitelist
    bytes32 public merkleRoot;
    mapping(address => uint256) public whitelistClaimed;
    
    // Royalties
    address public royaltyReceiver;
    uint96 public royaltyFeeNumerator = 750; // 7.5%
    
    // Events
    event WhitelistMint(address indexed minter, uint256 quantity);
    event PublicMint(address indexed minter, uint256 quantity);
    event PriceUpdated(uint256 publicPrice, uint256 whitelistPrice);
    event SaleStateUpdated(bool whitelistActive, bool publicActive);
    event Revealed(string baseURI);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory unrevealedURI,
        address _royaltyReceiver
    ) ERC721A(name, symbol) {
        _unrevealedURI = unrevealedURI;
        royaltyReceiver = _royaltyReceiver;
    }
    
    // ========== MINTING FUNCTIONS ==========
    
    /**
     * @dev Whitelist mint with Merkle proof verification
     */
    function whitelistMint(
        uint256 quantity,
        uint256 maxAllowed,
        bytes32[] calldata merkleProof
    ) external payable nonReentrant {
        require(whitelistActive, "Whitelist sale not active");
        require(quantity > 0 && quantity <= MAX_PER_TX, "Invalid quantity");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(msg.value >= whitelistPrice * quantity, "Insufficient payment");
        
        // Verify merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, maxAllowed));
        require(
            MerkleProof.verify(merkleProof, merkleRoot, leaf),
            "Invalid merkle proof"
        );
        
        // Check whitelist limits
        require(
            whitelistClaimed[msg.sender] + quantity <= maxAllowed,
            "Exceeds whitelist allocation"
        );
        
        whitelistClaimed[msg.sender] += quantity;
        _mint(msg.sender, quantity);
        
        emit WhitelistMint(msg.sender, quantity);
    }
    
    /**
     * @dev Public mint function
     */
    function publicMint(uint256 quantity) external payable nonReentrant {
        require(publicActive, "Public sale not active");
        require(quantity > 0 && quantity <= MAX_PER_TX, "Invalid quantity");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(msg.value >= publicPrice * quantity, "Insufficient payment");
        require(
            _numberMinted(msg.sender) + quantity <= MAX_PER_WALLET,
            "Exceeds wallet limit"
        );
        
        _mint(msg.sender, quantity);
        
        emit PublicMint(msg.sender, quantity);
    }
    
    /**
     * @dev Owner mint for team/partnerships
     */
    function ownerMint(address to, uint256 quantity) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(to, quantity);
    }
    
    /**
     * @dev Airdrop to multiple addresses
     */
    function airdrop(
        address[] calldata recipients,
        uint256[] calldata quantities
    ) external onlyOwner {
        require(recipients.length == quantities.length, "Arrays length mismatch");
        
        uint256 totalQuantity = 0;
        for (uint256 i = 0; i < quantities.length; i++) {
            totalQuantity += quantities[i];
        }
        
        require(totalSupply() + totalQuantity <= MAX_SUPPLY, "Exceeds max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], quantities[i]);
        }
    }
    
    // ========== OWNER FUNCTIONS ==========
    
    /**
     * @dev Set sale states
     */
    function setSaleState(
        bool _whitelistActive,
        bool _publicActive
    ) external onlyOwner {
        whitelistActive = _whitelistActive;
        publicActive = _publicActive;
        emit SaleStateUpdated(_whitelistActive, _publicActive);
    }
    
    /**
     * @dev Set pricing
     */
    function setPricing(
        uint256 _publicPrice,
        uint256 _whitelistPrice
    ) external onlyOwner {
        publicPrice = _publicPrice;
        whitelistPrice = _whitelistPrice;
        emit PriceUpdated(_publicPrice, _whitelistPrice);
    }
    
    /**
     * @dev Set merkle root for whitelist
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }
    
    /**
     * @dev Set base URI and reveal collection
     */
    function reveal(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        revealed = true;
        emit Revealed(baseURI);
    }
    
    /**
     * @dev Set unrevealed URI
     */
    function setUnrevealedURI(string calldata unrevealedURI) external onlyOwner {
        _unrevealedURI = unrevealedURI;
    }
    
    /**
     * @dev Set royalty info
     */
    function setRoyaltyInfo(
        address receiver,
        uint96 feeNumerator
    ) external onlyOwner {
        royaltyReceiver = receiver;
        royaltyFeeNumerator = feeNumerator;
    }
    
    /**
     * @dev Withdraw contract funds
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get number of tokens minted by address
     */
    function numberMinted(address owner) external view returns (uint256) {
        return _numberMinted(owner);
    }
    
    /**
     * @dev Get tokens owned by address
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        unchecked {
            uint256 tokenIdsIdx;
            address currOwnershipAddr;
            uint256 tokenIdsLength = balanceOf(owner);
            uint256[] memory tokenIds = new uint256[](tokenIdsLength);
            TokenOwnership memory ownership;
            
            for (uint256 i = _startTokenId(); tokenIdsIdx != tokenIdsLength; ++i) {
                ownership = _ownershipAt(i);
                if (ownership.burned) {
                    continue;
                }
                if (ownership.addr != address(0)) {
                    currOwnershipAddr = ownership.addr;
                }
                if (currOwnershipAddr == owner) {
                    tokenIds[tokenIdsIdx++] = i;
                }
            }
            
            return tokenIds;
        }
    }
    
    /**
     * @dev Check if address is whitelisted
     */
    function isWhitelisted(
        address account,
        uint256 maxAllowed,
        bytes32[] calldata merkleProof
    ) external view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(account, maxAllowed));
        return MerkleProof.verify(merkleProof, merkleRoot, leaf);
    }
    
    // ========== METADATA ==========
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        
        if (!revealed) {
            return _unrevealedURI;
        }
        
        string memory baseURI = _baseURI();
        return bytes(baseURI).length != 0 
            ? string(abi.encodePacked(baseURI, _toString(tokenId), ".json"))
            : "";
    }
    
    function _startTokenId() internal pure override returns (uint256) {
        return 1;
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
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721A) 
        returns (bool) 
    {
        return interfaceId == 0x2a55205a || // ERC-2981
               super.supportsInterface(interfaceId);
    }
}
