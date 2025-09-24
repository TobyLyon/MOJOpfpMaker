# IPFS Integration for MOJO NFT Generator

## 🌐 How IPFS Works with Your NFT Generator

IPFS (InterPlanetary File System) stores your NFT images and metadata in a decentralized way. Here's how it integrates with your MOJO generator:

## 🔄 The Complete Flow

```
User Creates NFT → Upload to IPFS → Mint on Blockchain
     ↓                    ↓              ↓
1. Select traits    2. Get IPFS hash   3. Store hash in NFT
2. Generate image   3. Create metadata  4. User owns NFT
3. Preview result   4. Upload metadata  5. Tradeable on OpenSea
```

## 🛠 IPFS Service Options

### **Option 1: Pinata (Recommended)**
- ✅ Reliable and fast
- ✅ 1GB free tier
- ✅ Easy API integration
- ✅ Pin management dashboard

### **Option 2: NFT.Storage**
- ✅ Free for NFTs
- ✅ Built for NFT use cases
- ✅ Automatic pinning
- ❌ Less control over files

### **Option 3: Infura IPFS**
- ✅ Enterprise-grade
- ✅ Same company as Ethereum RPC
- ❌ More expensive
- ❌ Complex setup

## 🔧 Pinata Integration (Step-by-Step)

### **Step 1: Set up Pinata Account**
1. Go to [pinata.cloud](https://pinata.cloud)
2. Create account
3. Go to API Keys section
4. Create new API key with permissions:
   - `pinFileToIPFS`
   - `pinJSONToIPFS`
   - `unpin` (optional)

### **Step 2: Update Your Frontend Code**

Replace the placeholder IPFS functions in `script.js`:

```javascript
// Add your Pinata credentials
const PINATA_API_KEY = "your_pinata_api_key";
const PINATA_SECRET_KEY = "your_pinata_secret_key";
const PINATA_JWT = "your_pinata_jwt_token"; // Recommended

// Upload image to IPFS via Pinata
async function uploadToIPFS(canvas) {
    try {
        showNotification('📤 Uploading image to IPFS...', 'info');
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png', 1.0);
        });
        
        // Create form data
        const formData = new FormData();
        formData.append('file', blob, `mojo-nft-${Date.now()}.png`);
        
        // Optional: Add metadata for organization
        const metadata = JSON.stringify({
            name: `MOJO NFT Image ${Date.now()}`,
            description: 'Generated MOJO PFP image'
        });
        formData.append('pinataMetadata', metadata);
        
        // Upload to Pinata
        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Image uploaded to IPFS:', result.IpfsHash);
        
        return result.IpfsHash;
        
    } catch (error) {
        console.error('IPFS image upload error:', error);
        throw new Error('Failed to upload image to IPFS');
    }
}

// Upload metadata to IPFS via Pinata
async function uploadMetadataToIPFS(metadata) {
    try {
        showNotification('📤 Uploading metadata to IPFS...', 'info');
        
        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PINATA_JWT}`
            },
            body: JSON.stringify({
                pinataContent: metadata,
                pinataMetadata: {
                    name: `MOJO NFT Metadata ${Date.now()}`,
                    description: 'MOJO PFP NFT metadata'
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Metadata upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Metadata uploaded to IPFS:', result.IpfsHash);
        
        return result.IpfsHash;
        
    } catch (error) {
        console.error('IPFS metadata upload error:', error);
        throw new Error('Failed to upload metadata to IPFS');
    }
}
```

### **Step 3: Environment Configuration**

For security, store your API keys properly:

#### **Option A: Environment Variables (Node.js backend)**
```javascript
// If you have a backend server
const PINATA_JWT = process.env.PINATA_JWT;
```

#### **Option B: Frontend Configuration (Less Secure)**
```javascript
// config.js - Don't commit this file to Git!
const CONFIG = {
    PINATA_JWT: "your_jwt_here",
    PINATA_API_KEY: "your_api_key_here"
};
```

### **Step 4: Test IPFS Integration**

Add a test function to verify everything works:

```javascript
// Test IPFS upload (call from browser console)
window.testIPFS = async function() {
    try {
        console.log('Testing IPFS upload...');
        
        // Test metadata upload
        const testMetadata = {
            name: "Test MOJO NFT",
            description: "Test upload to IPFS",
            image: "ipfs://test",
            attributes: [
                { trait_type: "Test", value: "Success" }
            ]
        };
        
        const metadataHash = await uploadMetadataToIPFS(testMetadata);
        console.log('✅ Metadata uploaded:', `ipfs://${metadataHash}`);
        console.log('🌐 View at:', `https://gateway.pinata.cloud/ipfs/${metadataHash}`);
        
        return metadataHash;
    } catch (error) {
        console.error('❌ IPFS test failed:', error);
    }
};
```

## 🎯 Production Setup

### **Step 1: Security Best Practices**

```javascript
// Use JWT tokens instead of API keys
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// Validate uploads
function validateImageUpload(blob) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/png', 'image/jpeg'];
    
    if (blob.size > maxSize) {
        throw new Error('Image too large (max 10MB)');
    }
    
    if (!allowedTypes.includes(blob.type)) {
        throw new Error('Invalid image type (PNG/JPEG only)');
    }
    
    return true;
}
```

### **Step 2: Error Handling**

```javascript
async function uploadWithRetry(uploadFunction, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await uploadFunction();
        } catch (error) {
            console.warn(`Upload attempt ${i + 1} failed:`, error.message);
            
            if (i === maxRetries - 1) {
                throw error; // Last attempt failed
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
}
```

### **Step 3: Cost Management**

```javascript
// Track upload costs
let uploadStats = {
    imagesUploaded: 0,
    totalSize: 0,
    estimatedCost: 0
};

function trackUpload(sizeBytes) {
    uploadStats.imagesUploaded++;
    uploadStats.totalSize += sizeBytes;
    uploadStats.estimatedCost = (uploadStats.totalSize / (1024 * 1024 * 1024)) * 0.15; // ~$0.15/GB
    
    console.log('Upload stats:', uploadStats);
}
```

## 🌐 IPFS Gateways

Your NFTs will be accessible through multiple gateways:

```javascript
const IPFS_GATEWAYS = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/'
];

function getIPFSUrl(hash, gatewayIndex = 0) {
    return `${IPFS_GATEWAYS[gatewayIndex]}${hash}`;
}
```

## 🧪 Testing Checklist

Before going live:

- [ ] Test image upload with real canvas data
- [ ] Test metadata upload with proper structure
- [ ] Verify IPFS hashes are valid
- [ ] Check images load in OpenSea
- [ ] Test with different image sizes
- [ ] Verify metadata displays correctly
- [ ] Test error handling scenarios
- [ ] Check upload speed and reliability

## 💰 Cost Estimates

### **Pinata Pricing:**
- Free tier: 1GB storage, 100 requests/month
- Pro: $20/month for 100GB
- Business: $200/month for 1TB

### **Per NFT Costs:**
- Image (1600x1600 PNG): ~200-500KB
- Metadata JSON: ~1-2KB
- Total per NFT: ~500KB
- 1000 NFTs ≈ 500MB ≈ $0.50-2.00

## 🚀 Going Live

1. **Set up Pinata account** with payment method
2. **Generate JWT token** for production
3. **Update frontend code** with real credentials
4. **Test thoroughly** on testnet first
5. **Monitor usage** and costs
6. **Set up backup** IPFS pinning service

Your MOJO NFTs will be permanently stored on IPFS and accessible worldwide! 🌍
