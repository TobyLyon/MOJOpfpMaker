# MOJO NFT PFP Maker

A whitelabeled NFT PFP (Profile Picture) generator that allows users to create and mint unique NFTs on the blockchain.

## Features

- 🎨 Interactive PFP generator with customizable traits
- 🦊 MetaMask wallet integration
- ⛓️ NFT minting directly to blockchain
- 📱 Mobile-responsive design
- 🎯 IPFS metadata and image storage
- 📊 Real-time minting statistics

## Setup Instructions

### 1. Install Dependencies

This is a client-side application that requires:
- Modern web browser with MetaMask extension
- Web server to serve files (due to CORS restrictions)

### 2. Configure NFT Contract

Update the contract configuration in `script.js`:

```javascript
const NFT_CONTRACT_ADDRESS = "0xYourActualContractAddress";
```

### 3. Replace Artwork

Replace the placeholder assets in the `assets/` folder:
- `assets/base/MOJO.png` - Base character image
- `assets/hat/` - Headwear trait images  
- `assets/item/` - Accessory trait images
- `MOJO-LOGO.png` - Header logo
- `MOJO-pfp.png` - Favicon

### 4. Configure IPFS Upload

The current implementation uses placeholder IPFS hashes. For production:

1. Set up IPFS service (Pinata, Infura, etc.)
2. Update `uploadToIPFS()` and `uploadMetadataToIPFS()` functions
3. Add your API keys to environment variables

### 5. Deploy Smart Contract

Deploy an ERC-721 NFT contract with a `mint` function:

```solidity
function mint(address to, string memory tokenURI) public returns (uint256)
```

### 6. Run Local Server

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Visit `http://localhost:8000` to access the application.

## Usage

1. **Connect Wallet**: Click "Connect Wallet" to link MetaMask
2. **Customize PFP**: Select traits from headwear and accessories
3. **Preview**: View your custom NFT in real-time
4. **Mint NFT**: Click "MINT NFT" to create on blockchain
5. **Download**: Save image locally with "DOWNLOAD" button

## Customization

### Menu Items
Edit trait names and descriptions in `script.js`:

```javascript
const menuItems = {
    hats: [
        { id: 'crown', name: 'Royal Crown', description: '...', emoji: '👑' }
    ],
    items: [
        { id: 'sword', name: 'Magic Sword', description: '...', emoji: '⚔️' }
    ]
};
```

### Styling
Modify colors and layout in `styles.css`:

```css
:root {
    --restaurant-red: #dc2626;
    --restaurant-orange: #f97316;
    /* ... */
}
```

## File Structure

```
MOJO-PFP-Maker/
├── assets/
│   ├── base/MOJO.png
│   ├── hat/[trait-images]
│   └── item/[trait-images]
├── index.html          # Main application
├── script.js           # Core functionality
├── styles.css          # Styling
├── mobile-fix.css      # Mobile optimizations
└── README.md
```

## Technical Notes

- Uses Ethers.js v5 for Web3 interactions
- Canvas-based image composition
- Supabase integration for statistics (optional)
- Responsive design with mobile optimizations

## Production Checklist

- [ ] Deploy NFT smart contract
- [ ] Set up IPFS storage service
- [ ] Replace all placeholder artwork
- [ ] Update contract address in code
- [ ] Configure proper domain/hosting
- [ ] Test minting process end-to-end
- [ ] Set up analytics and monitoring

## License

This project is provided as-is for whitelabeling purposes.
