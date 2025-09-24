// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MojoNFT
 * @dev ERC721 NFT contract for MOJO PFP collection
 * Features:
 * - Public minting with configurable price
 * - Owner-only functions for collection management
 * - Metadata URI storage for each token
 * - Reentrancy protection
 * - Withdrawal functionality
 */
contract MojoNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    // Collection settings
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public mintPrice = 0.01 ether; // Adjust as needed
    bool public mintingActive = true;
    string private _baseTokenURI;
    
    // Events
    event MintPriceUpdated(uint256 newPrice);
    event MintingToggled(bool isActive);
    event BaseURIUpdated(string newBaseURI);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) {
        _baseTokenURI = baseTokenURI;
        // Start token IDs at 1
        _tokenIdCounter.increment();
    }
    
    /**
     * @dev Public mint function - callable by anyone
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
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        return tokenId;
    }
    
    /**
     * @dev Owner-only mint function (for airdrops, etc.)
     */
    function ownerMint(address to, string memory tokenURI) 
        public 
        onlyOwner 
        returns (uint256) 
    {
        require(_tokenIdCounter.current() <= MAX_SUPPLY, "Max supply exceeded");
        require(to != address(0), "Cannot mint to zero address");
        
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
     * @dev Set base URI for metadata (owner only)
     */
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
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
            }
        }
        
        return tokenIds;
    }
    
    // ========== OVERRIDES ==========
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
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
        override(ERC721, ERC721URIStorage) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
