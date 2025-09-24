// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MojoNFT_Template.sol";

/**
 * @title NFTFactory
 * @dev Factory contract for deploying whitelabel NFT collections
 * Allows anyone to deploy their own NFT contract with custom parameters
 */
contract NFTFactory {
    
    // Events
    event CollectionDeployed(
        address indexed creator,
        address indexed contractAddress,
        string collectionName,
        string symbol
    );
    
    // Track deployed collections
    mapping(address => address[]) public creatorToContracts;
    address[] public allContracts;
    
    // Factory fee (optional)
    uint256 public deploymentFee = 0.01 ether; // Adjust as needed
    address public feeRecipient;
    
    constructor() {
        feeRecipient = msg.sender;
    }
    
    /**
     * @dev Deploy a new NFT collection contract
     * @param collectionName Name of the NFT collection
     * @param symbol Symbol for the NFT collection
     * @param mintPrice Price per NFT mint (in wei)
     * @param maxSupply Maximum number of NFTs in collection
     * @param royaltyReceiver Address to receive royalties
     * @param royaltyPercent Royalty percentage (in basis points, e.g., 750 = 7.5%)
     */
    function deployCollection(
        string memory collectionName,
        string memory symbol,
        uint256 mintPrice,
        uint256 maxSupply,
        address royaltyReceiver,
        uint96 royaltyPercent
    ) external payable returns (address) {
        
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(bytes(collectionName).length > 0, "Collection name required");
        require(bytes(symbol).length > 0, "Symbol required");
        require(royaltyReceiver != address(0), "Invalid royalty receiver");
        require(maxSupply > 0 && maxSupply <= 100000, "Invalid max supply");
        
        // Deploy new NFT contract
        MojoNFT_Template newContract = new MojoNFT_Template(
            collectionName,
            symbol,
            mintPrice,
            maxSupply,
            royaltyReceiver,
            royaltyPercent
        );
        
        // Transfer ownership to creator
        newContract.transferOwnership(msg.sender);
        
        // Track the deployment
        address contractAddress = address(newContract);
        creatorToContracts[msg.sender].push(contractAddress);
        allContracts.push(contractAddress);
        
        // Transfer deployment fee
        if (deploymentFee > 0) {
            payable(feeRecipient).transfer(deploymentFee);
        }
        
        emit CollectionDeployed(
            msg.sender,
            contractAddress,
            collectionName,
            symbol
        );
        
        return contractAddress;
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get all contracts deployed by a creator
     */
    function getCreatorContracts(address creator) external view returns (address[] memory) {
        return creatorToContracts[creator];
    }
    
    /**
     * @dev Get total number of deployed contracts
     */
    function getTotalContracts() external view returns (uint256) {
        return allContracts.length;
    }
    
    /**
     * @dev Get contract at specific index
     */
    function getContractAtIndex(uint256 index) external view returns (address) {
        require(index < allContracts.length, "Index out of bounds");
        return allContracts[index];
    }
    
    // ========== OWNER FUNCTIONS ==========
    
    /**
     * @dev Update deployment fee (factory owner only)
     */
    function setDeploymentFee(uint256 newFee) external {
        require(msg.sender == feeRecipient, "Not authorized");
        deploymentFee = newFee;
    }
    
    /**
     * @dev Update fee recipient (factory owner only)
     */
    function setFeeRecipient(address newRecipient) external {
        require(msg.sender == feeRecipient, "Not authorized");
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
    }
    
    /**
     * @dev Withdraw accumulated fees
     */
    function withdrawFees() external {
        require(msg.sender == feeRecipient, "Not authorized");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(feeRecipient).transfer(balance);
    }
}
