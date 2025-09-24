# 🔒 MOJO NFT Generator - Security & Deployment Guide

## 🚨 IMPORTANT SECURITY NOTES

### ⚠️ Wallet Address Protection
- **NEVER** commit the actual Paco wallet address to version control
- **NEVER** expose sensitive wallet addresses in frontend code
- **ALWAYS** use the configuration system for sensitive data

## 📋 Deployment Checklist

### 1. Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd MOJOpfpMaker

# Copy configuration template
cp config.example.js config.js
```

### 2. Configure Wallet Addresses
Edit `config.js` and replace placeholder values:

```javascript
const CONFIG = {
    PLATFORM_FEE_RATE: 0.05, // 5% platform fee
    PACO_FEE_WALLET: '0x6Dc7277Da5842041f4af527Fe6f6A209EF03BED4', // ✅ Real address
    NFT_CONTRACT_ADDRESS: 'YOUR_DEPLOYED_CONTRACT_ADDRESS', // ✅ Replace this
    // ... other config
};
```

### 3. Deploy NFT Contract
1. Use `admin.html` to deploy your NFT contract
2. Copy the deployed contract address
3. Update `NFT_CONTRACT_ADDRESS` in `config.js`

### 4. Security Verification
- [ ] `config.js` is in `.gitignore`
- [ ] No wallet addresses in `script.js` or `index.html`
- [ ] Configuration loads properly in browser console
- [ ] Platform fee calculations work correctly

### 5. Test Deployment
```bash
# Start local server
python -m http.server 8080

# Test in browser
# 1. Check console for "APP_CONFIG loaded"
# 2. Verify wallet connection works
# 3. Test trait selection and pricing
# 4. Confirm fee calculations include 5%
```

## 🔧 Configuration Options

### Platform Settings
- `PLATFORM_FEE_RATE`: Percentage fee (0.05 = 5%)
- `PACO_FEE_WALLET`: Destination for platform fees

### Contract Settings
- `NFT_CONTRACT_ADDRESS`: Your deployed ERC-721 contract
- `CHAIN_ID`: Blockchain network ID

### Network Settings
- `NETWORK_NAME`: Display name for network
- `IPFS_GATEWAY`: IPFS gateway URL

## 🚫 What NOT to Do

❌ **DON'T** put wallet addresses directly in JavaScript files  
❌ **DON'T** commit `config.js` to version control  
❌ **DON'T** expose private keys anywhere  
❌ **DON'T** hardcode sensitive data in frontend code  

## ✅ What TO Do

✅ **DO** use the configuration system  
✅ **DO** keep `config.js` private and secure  
✅ **DO** test thoroughly before production  
✅ **DO** verify fee calculations are correct  

## 🔍 Troubleshooting

### Configuration Not Loading
- Check browser console for errors
- Ensure `config.js` is loaded before `script.js`
- Verify `window.APP_CONFIG` exists in console

### Wallet Connection Issues
- Ensure `PACO_FEE_WALLET` is set in config
- Check network configuration matches MetaMask
- Verify contract address is correct

### Fee Calculation Problems
- Check `PLATFORM_FEE_RATE` in config
- Verify fee wallet address is valid
- Test with small amounts first

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify all configuration values
3. Test with a clean browser session
4. Contact development team if problems persist
