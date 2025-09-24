// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MojoNFT_Template
 * @dev Template NFT contract for whitelabel deployments
 * Optimized for PFP generators with customizable parameters
 */
contract MojoNFT_Template is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    // Collection settings - set at deployment
    uint256 public immutable MAX_SUPPLY;
    uint256 public mintPrice;
    bool public mintingActive = true;
    
    // Royalty settings
    address public royaltyReceiver;
    uint96 public royaltyFeeNumerator; // In basis points (e.g., 750 = 7.5%)
    
    // Events
    event MintPriceUpdated(uint256 newPrice);
    event MintingToggled(bool isActive);
    event RoyaltyUpdated(address receiver, uint96 feeNumerator);
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 _mintPrice,
        uint256 _maxSupply,
        address _royaltyReceiver,
        uint96 _royaltyFeeNumerator
    ) ERC721(name, symbol) {
        mintPrice = _mintPrice;
        MAX_SUPPLY = _maxSupply;
        royaltyReceiver = _royaltyReceiver;
        royaltyFeeNumerator = _royaltyFeeNumerator;
        
        // Start token IDs at 1
        _tokenIdCounter.increment();
    }
    
    /**
     * @dev Public mint function - the main minting endpoint
     * @param to Address to mint the NFT to
     * @param tokenURI Metadata URI for the NFT (IPFS hash)
     */
    function mint(address to, string memory tokenURI) 
        public 
        payable 
        nonReentrant 
        returns (uint256) 
    {
        require(mintingActive, "Minting is not active");
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_tokenIdCounter.current() <= MAX_SUPPLY, "Max supply exceeded");
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(tokenURI).length > 0, "Token URI required");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        return tokenId;
    }
    
    /**
     * @dev Batch mint function for efficiency
     */
    function batchMint(
        address[] memory recipients,
        string[] memory tokenURIs
    ) public payable nonReentrant {
        require(mintingActive, "Minting is not active");
        require(recipients.length == tokenURIs.length, "Arrays length mismatch");
        require(recipients.length > 0, "No recipients provided");
        require(msg.value >= mintPrice * recipients.length, "Insufficient payment");
        require(
            _tokenIdCounter.current() + recipients.length <= MAX_SUPPLY,
            "Would exceed max supply"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Cannot mint to zero address");
            require(bytes(tokenURIs[i]).length > 0, "Token URI required");
            
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            
            _safeMint(recipients[i], tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
        }
    }
    
    // ========== OWNER FUNCTIONS ==========
    
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
    function setRoyaltyInfo(
        address receiver,
        uint96 feeNumerator
    ) public onlyOwner {
        require(receiver != address(0), "Invalid receiver");
        require(feeNumerator <= 1000, "Royalty too high"); // Max 10%
        
        royaltyReceiver = receiver;
        royaltyFeeNumerator = feeNumerator;
        
        emit RoyaltyUpdated(receiver, feeNumerator);
    }
    
    /**
     * @dev Owner mint (for airdrops, team allocation, etc.)
     */
    function ownerMint(address to, string memory tokenURI) 
        public 
        onlyOwner 
        returns (uint256) 
    {
        require(_tokenIdCounter.current() <= MAX_SUPPLY, "Max supply exceeded");
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(tokenURI).length > 0, "Token URI required");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        return tokenId;
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
    
    /**
     * @dev Emergency withdrawal to specific address (owner only)
     */
    function emergencyWithdraw(address to) public onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(to).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get current total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }
    
    /**
     * @dev Get next token ID to be minted
     */
    function nextTokenId() public view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    /**
     * @dev Check if a token exists
     */
    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }
    
    /**
     * @dev Get all tokens owned by an address
     */
    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        if (tokenCount == 0) {
            return new uint256[](0);
        }
        
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 index = 0;
        
        for (uint256 tokenId = 1; tokenId < _tokenIdCounter.current(); tokenId++) {
            if (_exists(tokenId) && ownerOf(tokenId) == owner) {
                tokenIds[index] = tokenId;
                index++;
                if (index == tokenCount) break;
            }
        }
        
        return tokenIds;
    }
    
    // ========== ROYALTIES (EIP-2981) ==========
    
    /**
     * @dev Returns royalty info for a token
     */
    function royaltyInfo(uint256, uint256 salePrice) 
        external 
        view 
        returns (address receiver, uint256 royaltyAmount) 
    {
        receiver = royaltyReceiver;
        royaltyAmount = (salePrice * royaltyFeeNumerator) / 10000;
    }
    
    // ========== OVERRIDES ==========
    
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
        override(ERC721, ERC721URIStorage) 
        returns (bool) 
    {
        return interfaceId == 0x2a55205a || // ERC-2981 Royalties
               super.supportsInterface(interfaceId);
    }
}
