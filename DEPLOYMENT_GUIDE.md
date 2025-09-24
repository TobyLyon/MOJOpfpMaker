# MOJO NFT Contract Deployment Guide

This guide will help you deploy the MOJO NFT smart contract and integrate it with your PFP maker.

## Contract Options

We've provided three contract templates:

### 1. **MojoNFT.sol** - Basic ERC721
- ✅ Simple and straightforward
- ✅ Lower deployment cost
- ✅ Individual minting with metadata
- ❌ Higher gas costs for users

### 2. **MojoNFT_Optimized.sol** - ERC721A
- ✅ Ultra-efficient batch minting
- ✅ Whitelist functionality with Merkle proofs
- ✅ Reveal mechanism
- ✅ Royalty support (EIP-2981)
- ❌ More complex deployment

### 3. **MojoNFT_Abstract.sol** - Simplified for Abstract
- ✅ Minimal gas usage
- ✅ Optimized for Abstract blockchain
- ✅ Lightweight implementation
- ❌ Fewer advanced features

## Quick Start Deployment

### Option 1: Using Remix IDE (Recommended for Beginners)

1. **Go to [Remix IDE](https://remix.ethereum.org/)**

2. **Create a new file** and paste one of the contract codes

3. **Compile the contract:**
   - Select Solidity version 0.8.19
   - Click "Compile"

4. **Deploy:**
   - Switch to "Deploy & Run" tab
   - Select your wallet (MetaMask)
   - Choose the network (Ethereum, Polygon, etc.)
   - Enter constructor parameters:
     - Name: "MOJO PFP Collection"
     - Symbol: "MOJO"
     - Base URI: "ipfs://your-metadata-hash/"
   - Click "Deploy"

5. **Copy the contract address** and update your frontend

### Option 2: Using Hardhat (Recommended for Production)

1. **Set up the project:**
   ```bash
   cd contracts
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env-example.txt .env
   # Edit .env with your private key and RPC URLs
   ```

3. **Deploy to testnet:**
   ```bash
   # For basic contract
   npx hardhat run scripts/deploy.js --network goerli
   
   # For optimized contract
   USE_OPTIMIZED=true npx hardhat run scripts/deploy.js --network goerli
   ```

4. **Deploy to mainnet:**
   ```bash
   npx hardhat run scripts/deploy.js --network mainnet
   ```

## Frontend Integration

After deployment, update your frontend:

1. **Update contract address in `script.js`:**
   ```javascript
   const NFT_CONTRACT_ADDRESS = "0xYourActualContractAddress";
   ```

2. **Test the integration:**
   - Connect your wallet
   - Try minting an NFT
   - Verify on blockchain explorer

## IPFS Setup for Metadata

### Option 1: Pinata (Recommended)

1. **Sign up at [Pinata](https://pinata.cloud/)**
2. **Get API keys**
3. **Update the upload functions in `script.js`:**

```javascript
async function uploadToIPFS(canvas) {
    const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
    });
    
    const formData = new FormData();
    formData.append('file', blob, 'nft-image.png');
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${YOUR_PINATA_JWT}`
        },
        body: formData
    });
    
    const result = await response.json();
    return result.IpfsHash;
}
```

### Option 2: NFT.Storage (Free)

1. **Sign up at [NFT.Storage](https://nft.storage/)**
2. **Get API key**
3. **Use their JavaScript client**

## Network Configuration

### Ethereum Mainnet
- RPC: `https://mainnet.infura.io/v3/YOUR_KEY`
- Chain ID: 1
- Gas: High cost, high security

### Polygon
- RPC: `https://polygon-rpc.com/`
- Chain ID: 137
- Gas: Low cost, good for testing

### Abstract (if available)
- RPC: `https://api.testnet.abs.xyz`
- Chain ID: 11124
- Gas: Ultra-low cost

## Testing Checklist

Before mainnet deployment:

- [ ] Deploy to testnet first
- [ ] Test wallet connection
- [ ] Test NFT minting
- [ ] Verify metadata on IPFS
- [ ] Test image generation
- [ ] Check contract on explorer
- [ ] Test all user flows

## Post-Deployment Steps

1. **Verify contract on Etherscan:**
   ```bash
   npx hardhat verify --network mainnet CONTRACT_ADDRESS "Constructor" "Args"
   ```

2. **Set up OpenSea collection:**
   - Import contract address
   - Set collection metadata
   - Configure royalties

3. **Update frontend:**
   - Replace placeholder contract address
   - Test on production domain
   - Monitor for errors

## Security Considerations

- ✅ Use established libraries (OpenZeppelin)
- ✅ Test thoroughly on testnets
- ✅ Implement proper access controls
- ✅ Set reasonable gas limits
- ✅ Use secure IPFS pinning services

## Cost Estimates

### Deployment Costs (Ethereum):
- Basic contract: ~0.02-0.05 ETH
- Optimized contract: ~0.03-0.07 ETH

### Minting Costs (per NFT):
- Basic ERC721: ~0.005-0.01 ETH
- ERC721A (batch): ~0.002-0.005 ETH per NFT

## Support

If you encounter issues:
1. Check the transaction on a blockchain explorer
2. Verify your contract ABI matches the deployed contract
3. Ensure sufficient gas limits
4. Test on testnet first

## Example Contract Addresses (Update These!)

```javascript
// Update these in your script.js
const CONTRACTS = {
    ethereum: "0xYourEthereumContractAddress",
    polygon: "0xYourPolygonContractAddress", 
    abstract: "0xYourAbstractContractAddress"
};
```

Ready to mint some NFTs! 🎨
