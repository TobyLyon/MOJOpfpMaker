// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MojoNFT_Abstract
 * @dev Simplified NFT contract optimized for Abstract blockchain
 * Features minimal gas usage and straightforward minting
 */

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IERC721Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract MojoNFT_Abstract is IERC165, IERC721, IERC721Metadata {
    
    // Token data
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string) private _tokenURIs;
    
    // Collection info
    string private _name;
    string private _symbol;
    uint256 private _currentIndex = 1;
    
    // Contract settings
    address public owner;
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public mintPrice = 0.001 ether; // Low price for Abstract
    bool public mintingActive = true;
    
    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    // ========== MINTING ==========
    
    function mint(address to, string memory tokenURI) external payable returns (uint256) {
        require(mintingActive, "Minting inactive");
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_currentIndex <= MAX_SUPPLY, "Max supply reached");
        require(to != address(0), "Invalid address");
        
        uint256 tokenId = _currentIndex++;
        
        _balances[to] += 1;
        _owners[tokenId] = to;
        _tokenURIs[tokenId] = tokenURI;
        
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }
    
    function ownerMint(address to, string memory tokenURI) external onlyOwner returns (uint256) {
        require(_currentIndex <= MAX_SUPPLY, "Max supply reached");
        require(to != address(0), "Invalid address");
        
        uint256 tokenId = _currentIndex++;
        
        _balances[to] += 1;
        _owners[tokenId] = to;
        _tokenURIs[tokenId] = tokenURI;
        
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }
    
    // ========== OWNER FUNCTIONS ==========
    
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }
    
    function toggleMinting() external onlyOwner {
        mintingActive = !mintingActive;
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    function totalSupply() external view returns (uint256) {
        return _currentIndex - 1;
    }
    
    function exists(uint256 tokenId) external view returns (bool) {
        return _owners[tokenId] != address(0);
    }
    
    function tokensOfOwner(address ownerAddr) external view returns (uint256[] memory) {
        uint256 tokenCount = _balances[ownerAddr];
        if (tokenCount == 0) return new uint256[](0);
        
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _currentIndex; i++) {
            if (_owners[i] == ownerAddr) {
                tokenIds[index++] = i;
                if (index == tokenCount) break;
            }
        }
        
        return tokenIds;
    }
    
    // ========== ERC721 IMPLEMENTATION ==========
    
    function name() external view override returns (string memory) {
        return _name;
    }
    
    function symbol() external view override returns (string memory) {
        return _symbol;
    }
    
    function balanceOf(address ownerAddr) external view override returns (uint256) {
        require(ownerAddr != address(0), "Invalid address");
        return _balances[ownerAddr];
    }
    
    function ownerOf(uint256 tokenId) public view override returns (address) {
        address ownerAddr = _owners[tokenId];
        require(ownerAddr != address(0), "Token doesn't exist");
        return ownerAddr;
    }
    
    function tokenURI(uint256 tokenId) external view override returns (string memory) {
        require(_owners[tokenId] != address(0), "Token doesn't exist");
        return _tokenURIs[tokenId];
    }
    
    function approve(address to, uint256 tokenId) external override {
        address ownerAddr = ownerOf(tokenId);
        require(to != ownerAddr, "Cannot approve to owner");
        require(
            msg.sender == ownerAddr || isApprovedForAll(ownerAddr, msg.sender),
            "Not approved"
        );
        
        _approve(to, tokenId);
    }
    
    function getApproved(uint256 tokenId) external view override returns (address) {
        require(_owners[tokenId] != address(0), "Token doesn't exist");
        return _tokenApprovals[tokenId];
    }
    
    function setApprovalForAll(address operator, bool approved) external override {
        require(operator != msg.sender, "Cannot approve self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function isApprovedForAll(address ownerAddr, address operator) public view override returns (bool) {
        return _operatorApprovals[ownerAddr][operator];
    }
    
    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not approved");
        _transfer(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId) external override {
        safeTransferFrom(from, to, tokenId, "");
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not approved");
        _safeTransfer(from, to, tokenId, data);
    }
    
    // ========== INTERNAL FUNCTIONS ==========
    
    function _approve(address to, uint256 tokenId) internal {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }
    
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        require(_owners[tokenId] != address(0), "Token doesn't exist");
        address ownerAddr = ownerOf(tokenId);
        return (spender == ownerAddr || getApproved(tokenId) == spender || isApprovedForAll(ownerAddr, spender));
    }
    
    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "Not owner");
        require(to != address(0), "Invalid address");
        
        _approve(address(0), tokenId);
        
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        
        emit Transfer(from, to, tokenId);
    }
    
    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "Transfer to non ERC721Receiver");
    }
    
    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("Transfer to non ERC721Receiver");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }
    
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}
