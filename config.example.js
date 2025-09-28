// ===== MOJO NFT GENERATOR CONFIGURATION EXAMPLE =====
// Copy this file to config.js and fill in your actual values

const CONFIG = {
    // Platform Configuration
    PLATFORM_FEE_RATE: 0.05, // 5% platform fee
    PACO_FEE_WALLET: 'YOUR_PACO_WALLET_ADDRESS_HERE', // Replace with actual Paco wallet address
    
    // NFT Contract Configuration
    NFT_CONTRACT_ADDRESS: 'YOUR_NFT_CONTRACT_ADDRESS_HERE', // Replace with deployed contract address
    
    // Network Configuration
    NETWORK_NAME: 'abstract',
    CHAIN_ID: 11124, // Abstract testnet (change for mainnet)
    
    // IPFS Configuration
    IPFS_GATEWAY: 'https://ipfs.io/ipfs/',
    
    // UI Configuration
    BRAND_NAME: 'MOJO',
    COLLECTION_NAME: 'MOJO PFP Collection'
    // Supabase (frontend safe placeholders only; fill via env at runtime)
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: ''
};

// Export for use in main application
window.APP_CONFIG = CONFIG;
