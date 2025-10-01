// ===== MOJO NFT PFP MAKER - WEB3 SCRIPT =====

// === SUPABASE INTEGRATION ===
// Load Supabase client dynamically for live order tracking
let orderTracker = null;

async function loadSupabaseClient() {
    try {
        const module = await import('./supabase-client.js');
        orderTracker = module.default;
        return true;
    } catch (error) {
        console.warn('⚠️ Supabase client not available:', error);
        return false;
    }
}

// === GLOBAL VARIABLES ===

// Restaurant state
let ordersServed = 0;
let audioEnabled = true;
window.audioEnabled = true; // Make available globally for game
let isLoaded = false;

// Current NFT configuration - Updated for new asset structure
const currentOrder = {
    base: 'MOJO BODY',
    background: '',
    backgroundName: 'No Background',
    clothes: '',
    clothesName: 'No Clothes',
    eyes: 'NORMAL',
    eyesName: 'Normal Eyes',
    head: '',
    headName: 'No Headwear',
    mouth: 'NORMAL',
    mouthName: 'Normal Mouth'
};

// Web3 and NFT state
let web3Provider = null;
let signer = null;
let userAddress = null;
let nftContract = null;
let connectedWalletType = 'abstract'; // 'abstract' or 'metamask'

// NFT Contract Configuration (loaded from config.js)
const NFT_CONTRACT_ADDRESS = window.APP_CONFIG?.NFT_CONTRACT_ADDRESS || "0xYourMojoNFTContractAddress";
const MOJO_FEE_WALLET = window.APP_CONFIG?.MOJO_FEE_WALLET || ""; // Mojo platform fee wallet (set in config.js)
const PLATFORM_FEE_RATE = window.APP_CONFIG?.PLATFORM_FEE_RATE || 0.05; // 5% platform fee
const NFT_CONTRACT_ABI = [
    // Basic ERC721 + minting functions
    "function mint(address to, string memory tokenURI) public payable returns (uint256)",
    "function totalSupply() public view returns (uint256)",
    "function balanceOf(address owner) public view returns (uint256)",
    "function tokenURI(uint256 tokenId) public view returns (string memory)",
    "function ownerOf(uint256 tokenId) public view returns (address)",
    "function tokensOfOwner(address owner) public view returns (uint256[] memory)",
    "function mintPrice() public view returns (uint256)",
    "function mintingActive() public view returns (bool)"
];

// Konami code state
let konamiCode = [];
let clickCount = 0;
let orderNumber = 1;

// Easter egg state
let easterEggFound = false;

// Audio context and audio enabled state
let audioContext;

// Constants
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

// Menu Items updated for MOJO asset structure
const menuItems = {
    backgrounds: [
        { id: '', name: 'None', description: 'No background', price: 0.00, emoji: '🚫' },
        { id: 'BLUE', name: 'Blue', description: 'Blue atmosphere', price: 0.25, emoji: '🌌' },
        { id: 'CAVE', name: 'Cave', description: 'Underground setting', price: 0.25, emoji: '🕳️' },
        { id: 'CLIFF', name: 'Cliff', description: 'Mountain cliff', price: 0.25, emoji: '🏔️' },
        { id: 'GREEN ', name: 'Green', description: 'Forest vibes', price: 0.25, emoji: '🌲' },
        { id: 'RED', name: 'Red', description: 'Fiery atmosphere', price: 0.25, emoji: '🔥' },
        { id: 'SHRINE', name: 'Shrine', description: 'Temple grounds', price: 0.25, emoji: '⛩️' },
        { id: 'TRAIN', name: 'Train', description: 'Moving train', price: 0.25, emoji: '🚂' }
    ],
    clothes: [
        { id: 'NONE', name: 'None', description: 'No clothing', price: 0, mojoPrice: 0, emoji: '🚫' },
        { id: 'ABSTRACT KIMONO', name: 'Abstract Kimono', description: 'Artistic wear', price: 1.00, mojoPrice: 1000, emoji: '👘' },
        { id: 'ABSTRACT SHIRT', name: 'Abstract Shirt', description: 'Modern design', price: 0.75, mojoPrice: 750, emoji: '👕' },
        { id: 'APRON BLACK', name: 'Black Apron', description: 'Chef style', price: 0.50, mojoPrice: 500, emoji: '👨‍🍳' },
        { id: 'APRON BLUE', name: 'Blue Apron', description: 'Kitchen pro', price: 0.50, mojoPrice: 500, emoji: '👩‍🍳' },
        { id: 'BLACK BOWTIE SUIT', name: 'Black Suit', description: 'Formal wear', price: 1.50, mojoPrice: 1500, emoji: '🤵' },
        { id: 'BLUE SUIT', name: 'Blue Suit', description: 'Business style', price: 1.25, mojoPrice: 1250, emoji: '💼' },
        { id: 'KIMONO BLACK', name: 'Black Kimono', description: 'Traditional Japanese elegance', price: 1.25, mojoPrice: 1250, emoji: '👘' },
        { id: 'KIMONO BLUE', name: 'Blue Kimono', description: 'Serene traditional wear', price: 1.25, mojoPrice: 1250, emoji: '👘' },
        { id: 'KIMONO PINK', name: 'Pink Kimono', description: 'Cherry blossom style', price: 1.25, mojoPrice: 1250, emoji: '👘' },
        { id: 'KIMONO YELLOW', name: 'Yellow Kimono', description: 'Golden sunrise style', price: 1.25, mojoPrice: 1250, emoji: '👘' },
        { id: 'PUDGY SHIRT', name: 'Pudgy Shirt', description: 'Cute and comfy', price: 0.75, mojoPrice: 750, emoji: '👕' },
        { id: 'SCARF BLACK', name: 'Black Scarf', description: 'Cozy winter accessory', price: 0.50, mojoPrice: 500, emoji: '🧣' },
        { id: 'SCARF GRAY', name: 'Gray Scarf', description: 'Neutral warmth', price: 0.50, mojoPrice: 500, emoji: '🧣' },
        { id: 'SCARF GREEN', name: 'Green Scarf', description: 'Forest fresh style', price: 0.50, mojoPrice: 500, emoji: '🧣' },
        { id: 'SCARF RED', name: 'Red Scarf', description: 'Bold winter fashion', price: 0.50, mojoPrice: 500, emoji: '🧣' },
        { id: 'SCARF YELLOW', name: 'Yellow Scarf', description: 'Sunny winter vibes', price: 0.50, mojoPrice: 500, emoji: '🧣' },
        { id: 'SHIRT BLACK', name: 'Black Shirt', description: 'Classic casual wear', price: 0.50, mojoPrice: 500, emoji: '👕' },
        { id: 'SHIRT GRAY', name: 'Gray Shirt', description: 'Comfortable everyday', price: 0.50, mojoPrice: 500, emoji: '👕' },
        { id: 'SHIRT RED', name: 'Red Shirt', description: 'Bold statement piece', price: 0.50, mojoPrice: 500, emoji: '👕' },
        { id: 'SHIRT WHITE GREEN', name: 'White Green Shirt', description: 'Fresh color combo', price: 0.60, mojoPrice: 600, emoji: '👕' },
        { id: 'SHIRT WHITE ORANGE', name: 'White Orange Shirt', description: 'Vibrant design', price: 0.60, mojoPrice: 600, emoji: '👕' },
        { id: 'SOLANA SHIRT', name: 'Solana Shirt', description: 'Crypto enthusiast gear', price: 0.75, mojoPrice: 750, emoji: '☀️' },
        { id: 'SUIT', name: 'Formal Suit', description: 'Classic business attire', price: 1.00, mojoPrice: 1000, emoji: '🕴️' },
        { id: 'TACTICAL SUIT BLACK', name: 'Black Tactical Suit', description: 'Military precision', price: 1.75, mojoPrice: 1750, emoji: '🥷' },
        { id: 'TACTICAL SUIT BLUE', name: 'Blue Tactical Suit', description: 'Professional operations', price: 1.75, mojoPrice: 1750, emoji: '👮' },
        { id: 'TACTICAL SUIT CAMO', name: 'Camo Tactical Suit', description: 'Stealth operations', price: 1.75, mojoPrice: 1750, emoji: '🪖' },
        { id: 'TACTICAL SUIT GREEN', name: 'Green Tactical Suit', description: 'Field operations', price: 1.75, mojoPrice: 1750, emoji: '🎖️' },
        { id: 'TURTLE NECK BLACK', name: 'Black Turtleneck', description: 'Sleek modern style', price: 0.75, mojoPrice: 750, emoji: '🐢' },
        { id: 'TURTLE NECK GRAY', name: 'Gray Turtleneck', description: 'Sophisticated comfort', price: 0.75, mojoPrice: 750, emoji: '🐢' },
        { id: 'TURTLE NECK GREEN', name: 'Green Turtleneck', description: 'Nature-inspired style', price: 0.75, mojoPrice: 750, emoji: '🐢' },
        { id: 'TURTLE NECK RED', name: 'Red Turtleneck', description: 'Bold fashion choice', price: 0.75, mojoPrice: 750, emoji: '🐢' },
        { id: 'TURTLE NECK WHITE', name: 'White Turtleneck', description: 'Clean minimalist look', price: 0.75, mojoPrice: 750, emoji: '🐢' }
    ],
    eyes: [
        { id: 'NORMAL', name: 'Normal Eyes', description: 'Standard friendly look', price: 0, mojoPrice: 0, emoji: '👀' },
        { id: 'ANGRY', name: 'Angry Eyes', description: 'Fierce and determined', price: 0.50, mojoPrice: 500, emoji: '😠' },
        { id: 'BORED', name: 'Bored Eyes', description: 'Unimpressed expression', price: 0.50, mojoPrice: 500, emoji: '😑' },
        { id: 'CLEAR GLASS', name: 'Clear Glasses', description: 'Intellectual vibes', price: 0.75, mojoPrice: 750, emoji: '🤓' },
        { id: 'CLOSE', name: 'Closed Eyes', description: 'Peaceful meditation', price: 0.50, mojoPrice: 500, emoji: '😌' },
        { id: 'EYE SHINE', name: 'Eye Shine', description: 'Bright and alert', price: 0.75, mojoPrice: 750, emoji: '✨' },
        { id: 'GLASSES BLACK', name: 'Black Glasses', description: 'Cool and smart', price: 0.75, mojoPrice: 750, emoji: '😎' },
        { id: 'GLASSES BLUE', name: 'Blue Glasses', description: 'Stylish blue frames', price: 0.75, mojoPrice: 750, emoji: '🔵' },
        { id: 'GLASSES GREEN', name: 'Green Glasses', description: 'Nature-inspired frames', price: 0.75, mojoPrice: 750, emoji: '🟢' },
        { id: 'GLASSES ORANGE', name: 'Orange Glasses', description: 'Bold orange style', price: 0.75, mojoPrice: 750, emoji: '🟠' },
        { id: 'GLASSES YELLOW', name: 'Yellow Glasses', description: 'Sunny yellow frames', price: 0.75, mojoPrice: 750, emoji: '🟡' },
        { id: 'HUH', name: 'Confused Eyes', description: 'Puzzled expression', price: 0.50, mojoPrice: 500, emoji: '🤔' },
        { id: 'LOWE LID', name: 'Lower Lid', description: 'Sleepy expression', price: 0.50, mojoPrice: 500, emoji: '😪' },
        { id: 'SAD', name: 'Sad Eyes', description: 'Melancholy mood', price: 0.50, mojoPrice: 500, emoji: '😢' },
        { id: 'SQUINT', name: 'Squinting Eyes', description: 'Focused concentration', price: 0.50, mojoPrice: 500, emoji: '😤' },
        { id: 'STAR SHINE', name: 'Star Shine', description: 'Magical sparkle', price: 1.00, mojoPrice: 1000, emoji: '✨' },
        { id: 'SURPRISED', name: 'Surprised Eyes', description: 'Wide-eyed wonder', price: 0.50, mojoPrice: 500, emoji: '😲' },
        { id: 'TEARY', name: 'Teary Eyes', description: 'Emotional moment', price: 0.50, mojoPrice: 500, emoji: '🥺' },
        { id: 'WINK', name: 'Winking Eye', description: 'Playful charm', price: 0.50, mojoPrice: 500, emoji: '😉' }
    ],
    heads: [
        { id: '', name: 'No Headwear', description: 'Clean and minimal look', price: 0, mojoPrice: 0, emoji: '🚫' },
        { id: 'Beanie Black', name: 'Black Beanie', description: 'Cozy winter warmth', price: 0.50, mojoPrice: 500, emoji: '🧣' },
        { id: 'Beanie Blue', name: 'Blue Beanie', description: 'Cool arctic style', price: 0.50, mojoPrice: 500, emoji: '🧣' },
        { id: 'Beanie Green', name: 'Green Beanie', description: 'Forest fresh style', price: 0.50, mojoPrice: 500, emoji: '🧣' },
        { id: 'Beanie Orange', name: 'Orange Beanie', description: 'Vibrant autumn vibes', price: 0.50, mojoPrice: 500, emoji: '🧣' },
        { id: 'Beanie Red', name: 'Red Beanie', description: 'Bold winter style', price: 0.50, mojoPrice: 500, emoji: '🧣' },
        { id: 'BIKER HELMET', name: 'Biker Helmet', description: 'Road warrior protection', price: 1.25, mojoPrice: 1250, emoji: '🏍️' },
        { id: 'Cap Black', name: 'Black Cap', description: 'Classic street style', price: 0.75, mojoPrice: 750, emoji: '🧢' },
        { id: 'Cap Blue', name: 'Blue Cap', description: 'Casual blue style', price: 0.75, mojoPrice: 750, emoji: '🧢' },
        { id: 'Cap Red', name: 'Red Cap', description: 'Bold statement piece', price: 0.75, mojoPrice: 750, emoji: '🧢' },
        { id: 'CROWN GOLD', name: 'Golden Crown', description: 'Royal MOJO status', price: 2.00, mojoPrice: 2000, emoji: '👑' },
        { id: 'CROWN GREEN', name: 'Emerald Crown', description: 'Mystical royalty', price: 2.00, mojoPrice: 2000, emoji: '👑' },
        { id: 'CROWN RED', name: 'Ruby Crown', description: 'Fiery leadership', price: 2.00, mojoPrice: 2000, emoji: '👑' },
        { id: 'FISH', name: 'Fish Hat', description: 'Aquatic adventure', price: 1.00, mojoPrice: 1000, emoji: '🐟' },
        { id: 'FISHERMAN HAT', name: 'Fisherman Hat', description: 'Deep sea explorer', price: 0.75, mojoPrice: 750, emoji: '🎣' },
        { id: 'MOJI', name: 'MOJI Special', description: 'Signature MOJO style', price: 1.50, mojoPrice: 1500, emoji: '🎯' },
        { id: 'Newsboy Black', name: 'Black Newsboy', description: 'Vintage newspaper style', price: 0.75, mojoPrice: 750, emoji: '📰' },
        { id: 'Newsboy Brown', name: 'Brown Newsboy', description: 'Classic brown leather', price: 0.75, mojoPrice: 750, emoji: '📰' },
        { id: 'Party Hat Green', name: 'Green Party Hat', description: 'Celebration time', price: 0.60, mojoPrice: 600, emoji: '🎉' },
        { id: 'Party Hat Orange', name: 'Orange Party Hat', description: 'Festive orange style', price: 0.60, mojoPrice: 600, emoji: '🎉' },
        { id: 'Party Hat Red', name: 'Red Party Hat', description: 'Bold party vibes', price: 0.60, mojoPrice: 600, emoji: '🎉' },
        { id: 'Snapback Black', name: 'Black Snapback', description: 'Urban street style', price: 0.75, mojoPrice: 750, emoji: '🧢' },
        { id: 'Snapback Blue', name: 'Blue Snapback', description: 'Urban arctic style', price: 0.75, mojoPrice: 750, emoji: '🧢' },
        { id: 'Snapback Gray', name: 'Gray Snapback', description: 'Neutral urban style', price: 0.75, mojoPrice: 750, emoji: '🧢' },
        { id: 'Snapback Red', name: 'Red Snapback', description: 'Bold urban statement', price: 0.75, mojoPrice: 750, emoji: '🧢' },
        { id: 'SNOW', name: 'Snow Hat', description: 'Winter wonderland style', price: 0.60, mojoPrice: 600, emoji: '❄️' },
        { id: 'SUSHI', name: 'Sushi Hat', description: 'Japanese delicacy', price: 1.25, mojoPrice: 1250, emoji: '🍣' },
        { id: 'THREAD BLACK', name: 'Black Thread', description: 'Minimalist thread style', price: 0.40, mojoPrice: 400, emoji: '🧵' },
        { id: 'THREAD GREEN', name: 'Green Thread', description: 'Nature thread style', price: 0.40, mojoPrice: 400, emoji: '🧵' },
        { id: 'THREAD RED', name: 'Red Thread', description: 'Bold thread accent', price: 0.40, mojoPrice: 400, emoji: '🧵' },
        { id: 'THREAD YELLOW', name: 'Yellow Thread', description: 'Bright thread style', price: 0.40, mojoPrice: 400, emoji: '🧵' },
        { id: 'VIKING HELMET BLACK', name: 'Black Viking Helmet', description: 'Nordic warrior', price: 1.75, mojoPrice: 1750, emoji: '⚔️' },
        { id: 'VIKING HELMET BROWN', name: 'Brown Viking Helmet', description: 'Ancient warrior', price: 1.75, mojoPrice: 1750, emoji: '⚔️' }
    ],
    mouths: [
        { id: 'NORMAL', name: 'Normal Mouth', description: 'Friendly expression', price: 0, mojoPrice: 0, emoji: '😊' },
        { id: 'GRIN', name: 'Big Grin', description: 'Happy and excited', price: 0.25, mojoPrice: 250, emoji: '😁' },
        { id: 'MEH', name: 'Meh Expression', description: 'Unimpressed look', price: 0.25, mojoPrice: 250, emoji: '😐' },
        { id: 'OOHH', name: 'Surprised Ooh', description: 'Amazed reaction', price: 0.50, mojoPrice: 500, emoji: '😮' },
        { id: 'OPEN MOUTH', name: 'Open Mouth', description: 'Shocked expression', price: 0.50, mojoPrice: 500, emoji: '😲' },
        { id: 'POUT', name: 'Pouty Lips', description: 'Cute disappointed look', price: 0.50, mojoPrice: 500, emoji: '😤' },
        { id: 'SAD', name: 'Sad Mouth', description: 'Melancholy mood', price: 0.25, mojoPrice: 250, emoji: '😢' },
        { id: 'SIDE GRIN', name: 'Side Grin', description: 'Mischievous smile', price: 0.50, mojoPrice: 500, emoji: '😏' },
        { id: 'TOOTHPICK', name: 'Toothpick', description: 'Cool and casual', price: 0.75, mojoPrice: 750, emoji: '😎' },
        { id: 'TOUNGE', name: 'Tongue Out', description: 'Playful and silly', price: 0.50, mojoPrice: 500, emoji: '😛' }
    ]
};

// Canvas and layer management - initialized after DOM load
let canvas = null;
let ctx = null;
let exportCanvas = null;
let exportCtx = null;
const EXPORT_SIZE = 1600; // full-res export size

// Layer images storage for all MOJO traits
const layers = {
    background: null,
    base: null,
    clothes: null,
    eyes: null,
    head: null,
    mouth: null
};

// === LOADING SYSTEM ===

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// Update order number dynamically in HTML
function updateOrderNumber() {
    try {
        const orderNumberElement = document.querySelector('.order-number');
        if (orderNumberElement) {
            orderNumberElement.textContent = `#${String(orderNumber).padStart(4, '0')}`;
        }
    } catch (error) {
        console.error('Error updating order number:', error);
    }
}

// Initialize order number on page load
function initializeOrderNumber() {
    try {
        // Generate order number based on orders served
        orderNumber = ordersServed + 1;
        updateOrderNumber();
    } catch (error) {
        console.error('Error initializing order number:', error);
    }
}

function updateOrdersServed() {
    const orderCounter = document.getElementById('ordersServed');
    if (orderCounter) {
        orderCounter.textContent = ordersServed.toLocaleString();
    }
}

// === RESTAURANT AUDIO SYSTEM ===

function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio not supported in this browser');
            audioEnabled = false;
            window.audioEnabled = false; // Sync with global
        }
    }
}

function playTone(frequency, duration, type = 'sine', volume = 0.1) {
    if (!audioEnabled) return;
    initAudio();
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

// Make playTone globally available for game
window.playTone = playTone;

// Restaurant-themed sound effects
function playChickenSound() {
    if (!audioEnabled) return;
    playTone(400, 0.15);
    setTimeout(() => playTone(450, 0.1), 150);
    setTimeout(() => playTone(380, 0.1), 300);
}

function playOrderSound() {
    if (!audioEnabled) return;
    playTone(523, 0.2);
    setTimeout(() => playTone(659, 0.3), 200);
}

function playCompleteOrderSound() {
    if (!audioEnabled) return;
    // Cash register sound
    playTone(800, 0.1);
    setTimeout(() => playTone(600, 0.1), 100);
    setTimeout(() => playTone(400, 0.2), 200);
}

function playKitchenSound() {
    if (!audioEnabled) return;
    // Sizzling sound
    playTone(300, 0.3, 'sawtooth', 0.05);
}

function playPartySound() {
    if (!audioEnabled) return;
    playTone(523, 0.2);
    setTimeout(() => playTone(659, 0.2), 100);
    setTimeout(() => playTone(784, 0.2), 200);
    setTimeout(() => playTone(1047, 0.3), 300);
}

// === MOJO TOKEN PRICE INTEGRATION ===

// MOJO Token Configuration
const MOJO_TOKEN = {
    address: '0xYourMojoTokenAddress', // Replace with actual MOJO token address
    currentPrice: 0.001, // Default price in USD
    priceLastUpdated: 0
};

// Fetch MOJO token price from DexScreener API
async function fetchMojoPrice() {
    try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MOJO_TOKEN.address}`);
        const data = await response.json();
        
        if (data.pairs && data.pairs.length > 0) {
            // Get the first pair (usually the most liquid)
            const pair = data.pairs[0];
            MOJO_TOKEN.currentPrice = parseFloat(pair.priceUsd) || 0.001;
            MOJO_TOKEN.priceLastUpdated = Date.now();
            
            
            // Update pricing display
            updatePricingDisplay();
            
            return MOJO_TOKEN.currentPrice;
        }
    } catch (error) {
        console.warn('⚠️ Failed to fetch MOJO price, using fallback:', error);
        MOJO_TOKEN.currentPrice = 0.001; // Fallback price
    }
    
    return MOJO_TOKEN.currentPrice;
}

// Convert USD price to MOJO tokens
function convertToMojoPrice(usdPrice) {
    if (usdPrice === 0) return 0;
    return Math.round(usdPrice / MOJO_TOKEN.currentPrice);
}

// Format MOJO price display
function formatMojoPrice(mojoAmount) {
    if (mojoAmount === 0) return 'Free';
    return `${mojoAmount.toLocaleString()} MOJO`;
}

// Update all pricing displays to show MOJO tokens
function updatePricingDisplay() {
    // Update menu items display
    document.querySelectorAll('.menu-item').forEach(item => {
        const itemId = item.getAttribute('data-value');
        const category = item.getAttribute('data-category');
        
        if (category && itemId !== undefined) {
            const menuItem = findMenuItem(itemId, category);
            if (menuItem) {
                const priceElement = item.querySelector('.item-price');
                if (priceElement) {
                    const mojoPrice = convertToMojoPrice(menuItem.price);
                    priceElement.textContent = formatMojoPrice(mojoPrice);
                    priceElement.style.color = 'var(--mojo-ice-blue)';
                    priceElement.style.fontWeight = '600';
                }
            }
        }
    });
    
    // Update order summary
    updateOrderSummary();
}

// Find menu item by ID and category
function findMenuItem(itemId, category) {
    switch(category) {
        case 'backgrounds': return menuItems.backgrounds.find(item => item.id === itemId);
        case 'clothes': return menuItems.clothes.find(item => item.id === itemId);
        case 'eyes': return menuItems.eyes.find(item => item.id === itemId);
        case 'heads': return menuItems.heads.find(item => item.id === itemId);
        case 'mouths': return menuItems.mouths?.find(item => item.id === itemId);
        default: return null;
    }
}

// Initialize MOJO pricing
async function initializeMojoPricing() {
    await fetchMojoPrice();
    
    // Update price every 5 minutes
    setInterval(fetchMojoPrice, 5 * 60 * 1000);
}

// === WEB3 WALLET CONNECTION ===

// Show wallet selection or disconnect if already connected
async function connectWallet() {
    // Check if already connected
    if (userAddress) {
        disconnectWallet();
        return;
    }
    
    showWalletModal();
}

// Show wallet selection modal
function showWalletModal() {
    // Create modal HTML
    const modalHTML = `
        <div id="walletModal" class="wallet-modal">
            <div class="wallet-modal-content">
                <div class="wallet-modal-header">
                    <h3>Connect Your Wallet</h3>
                    <button class="wallet-modal-close" onclick="closeWalletModal()">&times;</button>
                </div>
                <div class="wallet-options">
                    <button class="wallet-option primary" onclick="connectAbstract()">
                        <img src="abstract.png" alt="Abstract" class="wallet-option-logo" />
                        <div class="wallet-option-info">
                            <div class="wallet-option-name">Abstract</div>
                            <div class="wallet-option-desc">Recommended • Fast & Low Fees</div>
                        </div>
                    </button>
                    <button class="wallet-option" onclick="connectMetaMask()">
                        <img src="metamask-logo.png" alt="MetaMask" class="wallet-option-logo" />
                        <div class="wallet-option-info">
                            <div class="wallet-option-name">MetaMask</div>
                            <div class="wallet-option-desc">Popular Web3 Wallet</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Close modal when clicking outside
    document.getElementById('walletModal').addEventListener('click', (e) => {
        if (e.target.id === 'walletModal') {
            closeWalletModal();
        }
    });
}

// Close wallet modal
function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.remove();
    }
}

// Connect to Abstract (primary option)
async function connectAbstract() {
    closeWalletModal();
    return await connectToWallet('abstract');
}

// Connect to MetaMask (secondary option)
async function connectMetaMask() {
    closeWalletModal();
    return await connectToWallet('metamask');
}

// Generic wallet connection function
async function connectToWallet(walletType = 'abstract') {
    try {
        if (typeof window.ethereum === 'undefined') {
            const walletName = walletType === 'abstract' ? 'Abstract Wallet or MetaMask' : 'MetaMask';
            showNotification(`🦊 Please install ${walletName} to mint NFTs!`, 'error');
            return false;
        }

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length === 0) {
            showNotification('❌ No wallet accounts found', 'error');
            return false;
        }

        // Initialize ethers provider
        web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = web3Provider.getSigner();
        userAddress = accounts[0];
        connectedWalletType = walletType;

        // Initialize NFT contract
        nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, signer);

        // Update UI
        updateWalletUI(true);
        
        const walletName = walletType === 'abstract' ? 'Abstract' : 'MetaMask';
        showNotification(`🎉 ${walletName} connected: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`, 'success');
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
        return true;
    } catch (error) {
        console.error('Wallet connection error:', error);
        showNotification('❌ Failed to connect wallet', 'error');
        return false;
    }
}

// Disconnect wallet
function disconnectWallet() {
    web3Provider = null;
    signer = null;
    userAddress = null;
    nftContract = null;
    connectedWalletType = 'abstract';
    updateWalletUI(false);
    showNotification('👋 Wallet disconnected', 'info');
}

// Handle account changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected
        disconnectWallet();
    } else {
        // Account changed
        userAddress = accounts[0];
        updateWalletUI(true);
        showNotification(`🔄 Switched to: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`, 'info');
    }
}

// Handle chain changes
function handleChainChanged(chainId) {
    // Reload the page to reset the dapp state
    window.location.reload();
}

// Update wallet UI
function updateWalletUI(connected) {
    const walletBtn = document.getElementById('walletBtn');
    const mintBtn = document.getElementById('mintBtn');
    const walletLogo = walletBtn.querySelector('.wallet-logo');
    
    if (connected && userAddress) {
        // Update logo based on connected wallet type
        if (connectedWalletType === 'metamask') {
            walletLogo.src = 'metamask-logo.png';
            walletLogo.alt = 'MetaMask';
        } else {
            walletLogo.src = 'abstract.png';
            walletLogo.alt = 'Abstract';
        }
        
        walletBtn.innerHTML = `<img src="${walletLogo.src}" alt="${walletLogo.alt}" class="wallet-logo" /> 🟢 ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
        walletBtn.classList.add('connected');
        mintBtn.disabled = false;
        mintBtn.textContent = '🎨 MINT NFT';
    } else {
        // Default to Abstract logo when disconnected
        walletBtn.innerHTML = '<img src="abstract.png" alt="Abstract" class="wallet-logo" /> Connect Wallet';
        walletBtn.classList.remove('connected');
        mintBtn.disabled = true;
        mintBtn.textContent = '🔒 Connect Wallet First';
    }
}

// === NFT MINTING FUNCTIONALITY ===

// Generate NFT metadata
function generateNFTMetadata() {
    const traits = [];
    
    // Add all trait categories from the enhanced system
    const traitCategories = {
        'background': 'Background',
        'base': 'Base',
        'clothes': 'Clothing',
        'eyes': 'Eyes',
        'head': 'Headwear',
        'mouth': 'Expression',
        'hat': 'Hat', // Legacy support
        'item': 'Accessory' // Legacy support
    };
    
    // Process all current traits
    Object.entries(currentOrder).forEach(([category, itemId]) => {
        if (itemId && itemId !== 'none' && itemId !== 'normal' && itemId !== 'NONE' && itemId !== 'NORMAL' && itemId !== '') {
            const traitName = traitCategories[category] || category.charAt(0).toUpperCase() + category.slice(1);
            const traitValue = currentOrder[category + 'Name'] || itemId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            traits.push({
                trait_type: traitName,
                value: traitValue
            });
        }
    });
    
    // Calculate enhanced rarity score
    const rarityScore = calculateRarityScore(traits);
    
    const metadata = {
        name: `MOJO PFP #${Date.now()}`,
        description: "A unique MOJO PFP created with custom traits. Part of the exclusive MOJO collection featuring hand-crafted combinations on Abstract blockchain.",
        image: "", // Will be set to IPFS hash after upload
        external_url: "https://mojotheyeti.com/",
        attributes: [
            ...traits,
            {
                trait_type: "Generation Date",
                value: new Date().toISOString().split('T')[0]
            },
            {
                trait_type: "Rarity Score",
                value: rarityScore,
                display_type: "number"
            },
            {
                trait_type: "Trait Count",
                value: traits.length,
                display_type: "number"
            }
        ],
        properties: {
            created_with: "MOJO PFP Maker",
            timestamp: new Date().toISOString(),
            blockchain: "Abstract",
            collection: "MOJO PFP Collection"
        },
        // Collection-level metadata for OpenSea
        collection: {
            name: "MOJO PFP Collection",
            family: "MOJO"
        }
    };
    
    return metadata;
}

// Generate unique trait hash for duplicate prevention
function generateTraitHash() {
    const traits = [];
    Object.entries(currentOrder).forEach(([category, itemId]) => {
        if (itemId && itemId !== 'none' && itemId !== 'normal' && itemId !== 'NONE' && itemId !== 'NORMAL' && itemId !== '') {
            traits.push(`${category}:${itemId}`);
        }
    });
    
    // Sort traits for consistent hashing
    traits.sort();
    const traitString = traits.join('|');
    
    // Generate hash
    let hash = 0;
    for (let i = 0; i < traitString.length; i++) {
        const char = traitString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `trait_${Math.abs(hash).toString(16)}_${Date.now()}`;
}

// Calculate enhanced rarity score
function calculateRarityScore(traits) {
    let score = 30; // Base score
    
    // Trait count bonus
    score += traits.length * 8;
    
    // Rare trait bonuses
    const rareTraits = {
        'CROWN': 15,
        'VIKING': 12,
        'ABSTRACT': 20,
        'TACTICAL': 10,
        'KIMONO': 8,
        'HELMET': 7
    };
    
    traits.forEach(trait => {
        Object.entries(rareTraits).forEach(([rareTrait, bonus]) => {
            if (trait.value.toUpperCase().includes(rareTrait)) {
                score += bonus;
            }
        });
    });
    
    // Combination bonuses
    const traitValues = traits.map(t => t.value.toUpperCase());
    if (traitValues.some(v => v.includes('CROWN')) && traitValues.some(v => v.includes('SUIT'))) {
        score += 25; // Royal combination
    }
    
    // Random component for uniqueness
    score += Math.floor(Math.random() * 15);
    
    return Math.min(100, Math.max(1, score));
}

// Upload image to IPFS with retry logic and validation
async function uploadToIPFS(canvas, maxRetries = 3) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            attempt++;
            console.log(`🔄 IPFS image upload attempt ${attempt}/${maxRetries}`);
            
            showNotification(`📤 Uploading image to IPFS... (attempt ${attempt})`, 'info');
            
            // Convert canvas to blob with high quality
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png', 1.0);
            });
            
            if (!blob || blob.size === 0) {
                throw new Error('Failed to generate image blob from canvas');
            }
            
            console.log(`📊 Image blob size: ${(blob.size / 1024).toFixed(2)} KB`);
            
            // CRITICAL: Check if IPFS service is configured
            if (!window.APP_CONFIG?.PINATA_JWT && !window.APP_CONFIG?.PINATA_API_KEY) {
                console.error('❌ IPFS service not configured! Add PINATA_JWT to config.js');
                throw new Error('IPFS service not configured. Please contact support.');
            }
            
            // Create form data for Pinata
            const formData = new FormData();
            formData.append('file', blob, `mojo-nft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`);
            
            // Add metadata for organization
            const pinataMetadata = JSON.stringify({
                name: `MOJO NFT Image ${Date.now()}`,
                description: 'Generated MOJO PFP image',
                keyvalues: {
                    collection: 'MOJO',
                    type: 'pfp-image',
                    timestamp: Date.now().toString()
                }
            });
            formData.append('pinataMetadata', pinataMetadata);
            
            // Upload to Pinata with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.APP_CONFIG.PINATA_JWT || window.APP_CONFIG.PINATA_API_KEY}`
                },
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Pinata upload failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const result = await response.json();
            
            if (!result.IpfsHash || !result.IpfsHash.startsWith('Qm')) {
                throw new Error(`Invalid IPFS hash received: ${result.IpfsHash}`);
            }
            
            console.log('✅ Image uploaded to IPFS:', result.IpfsHash);
            console.log('📊 Upload details:', {
                hash: result.IpfsHash,
                size: result.PinSize,
                timestamp: result.Timestamp
            });
            
            // CRITICAL: Verify the upload by trying to access it
            await verifyIPFSUpload(result.IpfsHash, 'image');
            
            showNotification('✅ Image uploaded to IPFS successfully!', 'success');
            return result.IpfsHash;
            
        } catch (error) {
            console.error(`❌ IPFS upload attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
                console.error('❌ All IPFS upload attempts failed');
                showNotification('❌ Failed to upload image to IPFS. Please try again.', 'error');
                throw new Error(`IPFS upload failed after ${maxRetries} attempts: ${error.message}`);
            }
            
            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`⏳ Waiting ${delay/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Upload metadata to IPFS with retry logic and validation
async function uploadMetadataToIPFS(metadata, maxRetries = 3) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            attempt++;
            console.log(`🔄 IPFS metadata upload attempt ${attempt}/${maxRetries}`);
            
            showNotification(`📤 Uploading metadata to IPFS... (attempt ${attempt})`, 'info');
            
            // CRITICAL: Validate metadata structure
            if (!metadata || typeof metadata !== 'object') {
                throw new Error('Invalid metadata object');
            }
            
            if (!metadata.name || !metadata.description || !metadata.image) {
                throw new Error('Missing required metadata fields (name, description, image)');
            }
            
            console.log('📋 Metadata to upload:', JSON.stringify(metadata, null, 2));
            
            // CRITICAL: Check if IPFS service is configured
            if (!window.APP_CONFIG?.PINATA_JWT && !window.APP_CONFIG?.PINATA_API_KEY) {
                console.error('❌ IPFS service not configured! Add PINATA_JWT to config.js');
                throw new Error('IPFS service not configured. Please contact support.');
            }
            
            // Upload metadata JSON to Pinata
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.APP_CONFIG.PINATA_JWT || window.APP_CONFIG.PINATA_API_KEY}`
                },
                body: JSON.stringify({
                    pinataContent: metadata,
                    pinataMetadata: {
                        name: `MOJO NFT Metadata ${Date.now()}`,
                        description: 'MOJO PFP NFT metadata',
                        keyvalues: {
                            collection: 'MOJO',
                            type: 'nft-metadata',
                            timestamp: Date.now().toString()
                        }
                    }
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Pinata metadata upload failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const result = await response.json();
            
            if (!result.IpfsHash || !result.IpfsHash.startsWith('Qm')) {
                throw new Error(`Invalid metadata IPFS hash received: ${result.IpfsHash}`);
            }
            
            console.log('✅ Metadata uploaded to IPFS:', result.IpfsHash);
            console.log('📊 Metadata upload details:', {
                hash: result.IpfsHash,
                size: result.PinSize,
                timestamp: result.Timestamp
            });
            
            // CRITICAL: Verify the metadata upload
            await verifyIPFSUpload(result.IpfsHash, 'metadata');
            
            showNotification('✅ Metadata uploaded to IPFS successfully!', 'success');
            return result.IpfsHash;
            
        } catch (error) {
            console.error(`❌ IPFS metadata upload attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
                console.error('❌ All IPFS metadata upload attempts failed');
                showNotification('❌ Failed to upload metadata to IPFS. Please try again.', 'error');
                throw new Error(`IPFS metadata upload failed after ${maxRetries} attempts: ${error.message}`);
            }
            
            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`⏳ Waiting ${delay/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// CRITICAL: Verify IPFS upload by attempting to read it back
async function verifyIPFSUpload(ipfsHash, type = 'unknown') {
    try {
        console.log(`🔍 Verifying IPFS upload: ${ipfsHash} (${type})`);
        
        // Try multiple IPFS gateways for reliability
        const gateways = [
            'https://ipfs.io/ipfs/',
            'https://gateway.pinata.cloud/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/',
            'https://dweb.link/ipfs/'
        ];
        
        let verified = false;
        let lastError = null;
        
        for (const gateway of gateways) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per gateway
                
                const response = await fetch(`${gateway}${ipfsHash}`, {
                    method: 'HEAD', // Just check if it exists
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    console.log(`✅ IPFS verification successful via ${gateway}`);
                    verified = true;
                    break;
                }
            } catch (gatewayError) {
                lastError = gatewayError;
                console.warn(`⚠️ Gateway ${gateway} failed:`, gatewayError.message);
            }
        }
        
        if (!verified) {
            console.warn(`⚠️ Could not verify IPFS upload ${ipfsHash} via any gateway`);
            console.warn('Last error:', lastError?.message);
            // Don't throw error - IPFS propagation can take time
        }
        
        return verified;
        
    } catch (error) {
        console.warn(`⚠️ IPFS verification failed for ${ipfsHash}:`, error.message);
        // Don't throw error - verification is best effort
        return false;
    }
}

// Main NFT minting function
async function mintNFT() {
    try {
        if (!web3Provider || !signer || !userAddress) {
            showNotification('🔒 Please connect your wallet first!', 'error');
            return;
        }
        
        if (!nftContract) {
            showNotification('❌ NFT contract not initialized', 'error');
            return;
        }
        
        const canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            showNotification('❌ Canvas not found', 'error');
            return;
        }
        
        showNotification('🎨 Starting NFT minting process...', 'info');
        
        // Step 1: Upload image to IPFS
        const imageHash = await uploadToIPFS(canvas);
        
        // Step 2: Generate and upload metadata
        const metadata = generateNFTMetadata();
        metadata.image = `ipfs://${imageHash}`;
        
        const metadataHash = await uploadMetadataToIPFS(metadata);
        const tokenURI = `ipfs://${metadataHash}`;
        
        // Step 3: Get mint price and calculate fee structure
        const mintPrice = await nftContract.mintPrice();
        const silentFeeRate = PLATFORM_FEE_RATE; // 5% from config
        
        // FIXED: Proper BigNumber calculation
        const silentFeeAmount = mintPrice.mul(5).div(100); // 5% of mint price
        const contractPayment = mintPrice.sub(silentFeeAmount); // Contract gets 95% of mint price
        
        // Step 4: Send silent fee first (using proven pattern)
        if (MOJO_FEE_WALLET && ethers.utils.isAddress(MOJO_FEE_WALLET)) {
            try {
                showNotification('💰 Processing payment...', 'info');
                
                // Use proven transaction format
                const feeTransaction = {
                    from: userAddress,
                    to: MOJO_FEE_WALLET,
                    value: '0x' + silentFeeAmount.toHexString().slice(2),
                    data: '0x'
                    // NO gas parameters - let MetaMask handle gas estimation
                };
                
                console.log('📡 Sending platform fee via MetaMask:', feeTransaction);
                const feeTxHash = await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [feeTransaction]
                });
                
                console.log('✅ Platform fee sent:', feeTxHash);
                
                // Wait for fee transaction to confirm
                await web3Provider.waitForTransaction(feeTxHash);
                
            } catch (feeError) {
                console.warn('Silent fee transfer failed:', feeError);
                // Continue with mint regardless
            }
        }
        
        // Step 5: Check for trait uniqueness before minting
        const traitHash = generateTraitHash();
        console.log('🔍 Generated trait hash:', traitHash);
        
        // Check if this trait combination already exists
        try {
            const traitExists = await nftContract.traitExists(traitHash);
            if (traitExists) {
                showNotification('❌ This exact trait combination already exists! Please modify your selection.', 'error');
                return;
            }
        } catch (error) {
            console.warn('Could not check trait uniqueness:', error);
            // Continue with minting - uniqueness check is optional
        }
        
        // Step 6: Mint NFT to escrow (using proven pattern)
        showNotification('⛓️ Minting NFT to secure escrow...', 'info');
        
        // Use escrow minting function instead of direct mint
        const mintData = nftContract.interface.encodeFunctionData('mintToEscrow', [userAddress, tokenURI, traitHash]);
        const mintTransaction = {
            from: userAddress,
            to: nftContract.address,
            value: '0x' + contractPayment.toHexString().slice(2),
            data: mintData
            // NO gas parameters - let MetaMask handle gas estimation
        };
        
        console.log('📡 Sending escrow mint transaction via MetaMask:', mintTransaction);
        const mintTxHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [mintTransaction]
        });
        showNotification('⏳ NFT mint transaction submitted. Waiting for confirmation...', 'info');
        
        // Wait for transaction confirmation (using proven pattern)
        const receipt = await web3Provider.waitForTransaction(mintTxHash);
        
        // Success! Parse token ID from receipt logs
        let tokenId = 'Unknown';
        if (receipt.logs && receipt.logs.length > 0) {
            try {
                const transferLog = receipt.logs.find(log => log.topics[0] === ethers.utils.id('Transfer(address,address,uint256)'));
                if (transferLog) {
                    tokenId = ethers.BigNumber.from(transferLog.topics[3]).toString();
                }
            } catch (parseError) {
                console.warn('Could not parse token ID from receipt:', parseError);
            }
        }
        
        showNotification(`🎉 NFT Minted to Secure Escrow! Token ID: ${tokenId}`, 'success');
        showNotification('🔒 Your NFT is safely held in escrow and will be released by the collection creator.', 'info', 8000);
        
        // Update statistics
        ordersServed++;
        orderNumber++;
        updateOrdersServed();
        updateOrderNumber();
        
        // Record the mint in database
        recordGlobalOrder({
            hat: currentOrder.hat,
            hatName: currentOrder.hatName,
            item: currentOrder.item,
            itemName: currentOrder.itemName,
            total: 0, // NFT minting
            tokenId: tokenId,
            txHash: receipt.transactionHash
        });
        
        console.log('✅ NFT minted successfully:', {
            tokenId,
            txHash: receipt.transactionHash,
            tokenURI
        });
        
    } catch (error) {
        console.error('NFT minting error:', error);
        
        // Use proven error handling patterns
        if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
            showNotification('❌ Transaction rejected by user', 'error');
        } else if (error.code === 'INSUFFICIENT_FUNDS' || error.code === -32000) {
            showNotification('❌ Insufficient funds for gas fees', 'error');
        } else if (error.message?.includes('Internal JSON-RPC error') || 
                   error.message?.includes('execution reverted') ||
                   error.code === -32603) {
            console.log('🚨 Abstract network error detected:', error.message);
            showNotification('❌ Network error. Please try again in a moment.', 'error');
        } else if (error.message?.includes('gas') || error.message?.includes('execution reverted')) {
            console.log('💡 Gas or contract execution issue');
            showNotification('❌ Transaction failed. Check your balance and try again.', 'error');
        } else {
            showNotification('❌ NFT minting failed. Please try again.', 'error');
        }
    }
}

// === SUPABASE ORDER TRACKING ===

// Record order globally in Supabase
async function recordGlobalOrder(orderData) {
    try {
        
        if (!orderTracker) {
            return { success: false, reason: 'Supabase not available' };
        }

        const result = await orderTracker.recordOrder(orderData);
        if (result.success) {
            // Update global stats after successful recording
            updateGlobalStats();
            return { success: true };
        } else {
            console.error('❌ Failed to record global order:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Exception recording global order:', error);
        return { success: false, error: error.message };
    }
}

// Update global statistics in navbar
async function updateGlobalStats() {
    try {
        if (!orderTracker) {
            // Update with local stats only
            const ordersServedElement = document.getElementById('ordersServed');
            if (ordersServedElement) {
                ordersServedElement.textContent = ordersServed.toLocaleString();
            }
            return;
        }

        const globalCount = await orderTracker.getGlobalOrderCount();
        if (globalCount.success) {
            ordersServed = globalCount.count;
            // Update the orders served stat in navbar
            const ordersServedElement = document.getElementById('ordersServed');
            if (ordersServedElement) {
                ordersServedElement.textContent = globalCount.count.toLocaleString();
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not update global stats:', error);
    }
}

// Initialize global stats on page load (with timeout protection)
async function initializeGlobalStats() {
    try {
        // First try to load Supabase client
        const supabaseLoaded = await loadSupabaseClient();
        if (!supabaseLoaded || !orderTracker) {
            console.warn('⚠️ Supabase client not available, using local stats only');
            return;
        }

        // Test connection with timeout
        const connectionPromise = orderTracker.testConnection();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 3000)
        );
        
        const connectionTest = await Promise.race([connectionPromise, timeoutPromise]);
        
        if (connectionTest.success) {
            await updateGlobalStats();
            
            // Start real-time subscription for live updates
            setupLiveOrderTracking();
        }
    } catch (error) {
        // Supabase unavailable, using local stats only
    }
}

// Set up real-time order tracking
function setupLiveOrderTracking() {
    try {
        if (!orderTracker) {
            return;
        }

        orderTracker.subscribeToLiveOrders(
            // When someone else places an order
            (newOrder) => {
                handleLiveOrderNotification(newOrder);
                updateGlobalStats(); // Refresh the navbar count
            },
            // When an order is updated (less common)
            (updatedOrder) => {
            }
        );
    } catch (error) {
        console.warn('⚠️ Could not set up live order tracking:', error);
    }
}

// Handle live order notifications from other users
function handleLiveOrderNotification(order) {
    // Don't show notification for our own orders (avoid duplicate notifications)
    const isOwnOrder = Date.now() - new Date(order.created_at).getTime() < 5000; // Within 5 seconds
    
    if (!isOwnOrder) {
        // Show live order notification
        const hatName = order.hat_name || 'No Topping';
        const itemName = order.item_name || 'No Side';
        
        showLiveOrderNotification(hatName, itemName);
        
        // Add subtle visual effect
        pulseOrderCounter();
    }
}

// Show live order notification for other users' orders
function showLiveOrderNotification(hatName, itemName) {
    const messages = [
        `🔴 LIVE: Someone ordered ${hatName} with ${itemName}!`,
        `👨‍🍳 Fresh order: ${hatName} + ${itemName}`,
        `🍗 Another customer chose ${hatName} with ${itemName}`,
        `🎉 Live order: ${hatName} & ${itemName}`,
        `👥 Someone else is enjoying ${hatName} + ${itemName}`
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    showNotification(randomMessage, 3000);
}

// Pulse the order counter when live orders come in
function pulseOrderCounter() {
    const orderCountElement = document.querySelector('.stat-item .stat-number');
    if (orderCountElement) {
        orderCountElement.style.animation = 'none';
        setTimeout(() => {
            orderCountElement.style.animation = 'pulse 0.5s ease-in-out';
        }, 10);
    }
}

// === NOTIFICATION SYSTEM ===

// Global notification timeout variable
let notificationTimeout = null;

function showNotification(message, duration = 1500) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    // Clear any existing notification timeout to prevent overlapping
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
    
    // Immediately update and show the new notification
    notification.textContent = message;
    notification.classList.remove('show');
    
    // Force reflow to ensure CSS transition resets
    notification.offsetHeight;
    
    // Show the new notification
    notification.classList.add('show');
    
    // Set new timeout to hide this notification
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
        notificationTimeout = null;
    }, duration);
}

// === MENU GENERATION ===

function createMenuItem(category, item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'trait-card';
    menuItem.setAttribute('data-category', category);
    menuItem.setAttribute('data-value', item.id);
    menuItem.setAttribute('data-item-id', item.id);
    menuItem.setAttribute('role', 'button');
    menuItem.setAttribute('tabindex', '0');
    menuItem.setAttribute('aria-label', `Select ${item.name} for your MOJO`);
    
    // Calculate MOJO price dynamically
    const mojoPrice = convertToMojoPrice(item.price);
    
    // Thumbnail support (show actual asset preview where available)
    const folderMapByCategory = {
        backgrounds: 'BACKGROUND',
        clothes: 'CLOTHES',
        eyes: 'EYES',
        heads: 'HEAD',
        mouths: 'MOUTH'
    };
    const folderForCategory = folderMapByCategory[category];
    const hasThumb = !!(item.id && folderForCategory);
    const thumbSrc = hasThumb ? `assets/${folderForCategory}/${item.id}.png` : '';
    
    menuItem.innerHTML = `
        <div class="trait-content">
            ${hasThumb ? `<img class=\"trait-thumb\" src=\"${thumbSrc}\" alt=\"${item.name}\">` : ''}
            <div class="trait-name">${item.name}</div>
            <div class="trait-price">${formatMojoPrice(mojoPrice)} MOJO</div>
        </div>
    `;
    
    menuItem.onclick = () => selectMenuItem(category, item.id, menuItem);
    menuItem.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectMenuItem(category, item.id, menuItem);
        }
    };
    
    return menuItem;
}

// Create and populate menu items for all MOJO trait categories
function createMenuItems() {
    
    // Initialize background menu items
    const backgroundContainer = document.getElementById('backgroundMenuItems');
    
    if (backgroundContainer) {
        backgroundContainer.innerHTML = '';
        
        // Create background menu items
        menuItems.backgrounds.forEach(background => {
            const item = createMenuItem('backgrounds', background);
            backgroundContainer.appendChild(item);
            console.log('✅ Added background item:', background.name);
        });
        
        console.log('🎯 Background container final HTML:', backgroundContainer.innerHTML.substring(0, 200));
    }
    
    // Initialize clothes menu items
    const clothesContainer = document.getElementById('clothesMenuItems');
    console.log('🔍 Clothes container found:', !!clothesContainer);
    if (clothesContainer) {
        clothesContainer.innerHTML = '';
        console.log('🎨 Creating', menuItems.clothes.length, 'clothes items');
        
        console.log('🧪 Added test clothes element');
        
        // Try adding real items
        menuItems.clothes.forEach((clothes, index) => {
            try {
                const item = createMenuItem('clothes', clothes);
                clothesContainer.appendChild(item);
                console.log(`✅ Added clothes item ${index + 1}:`, clothes.name);
            } catch (error) {
                console.error(`❌ Error creating clothes item ${index + 1}:`, error);
            }
        });
    }
    
    // Initialize eyes menu items
    const eyesContainer = document.getElementById('eyesMenuItems');
    console.log('🔍 Eyes container found:', !!eyesContainer);
    if (eyesContainer) {
        eyesContainer.innerHTML = '';
        console.log('🎨 Creating', menuItems.eyes.length, 'eyes items');
        menuItems.eyes.forEach(eyes => {
            eyesContainer.appendChild(createMenuItem('eyes', eyes));
        });
    }
    
    // Initialize head menu items
    const headContainer = document.getElementById('headMenuItems');
    console.log('🔍 Head container found:', !!headContainer);
    if (headContainer) {
        headContainer.innerHTML = '';
        console.log('🎨 Creating', menuItems.heads.length, 'head items');
        menuItems.heads.forEach(head => {
            headContainer.appendChild(createMenuItem('heads', head));
        });
    }
    
    // Initialize mouth menu items
    const mouthContainer = document.getElementById('mouthMenuItems');
    console.log('🔍 Mouth container found:', !!mouthContainer);
    if (mouthContainer) {
        mouthContainer.innerHTML = '';
        console.log('🎨 Creating', menuItems.mouths.length, 'mouth items');
        menuItems.mouths.forEach(mouth => {
            mouthContainer.appendChild(createMenuItem('mouths', mouth));
        });
    }
    
    console.log('✅ All MOJO trait menu items created');
}

// Initialize menu system
function initializeMenu() {
    console.log('🍽️ Setting up menu...');
    
    // Create menu items
    createMenuItems();
    
    // Set up menu interactions
    setupMenuInteractions();
    
    console.log('✅ Menu setup complete');
}

// Set up menu interaction handlers
function setupMenuInteractions() {
    // Add keyboard navigation for menu items
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const focusedElement = document.activeElement;
            if (focusedElement && focusedElement.classList.contains('menu-item')) {
                e.preventDefault();
                focusedElement.click();
            }
        }
    });
}

// === ORDER MANAGEMENT ===

// Select menu item function
function selectMenuItem(category, itemId, element) {
    try {
        console.log(`Selecting ${category}: ${itemId}`);
        
        // Remove previous selection in this category
        document.querySelectorAll(`[data-category="${category}"]`).forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selected class to current item
        element.classList.add('selected');
        
        // Update current order for all MOJO trait categories
        switch(category) {
            case 'backgrounds':
                currentOrder.background = itemId;
                currentOrder.backgroundName = getMenuItemName(itemId, category) || 'No Background';
                break;
            case 'clothes':
                currentOrder.clothes = itemId;
                currentOrder.clothesName = getMenuItemName(itemId, category) || 'No Clothes';
                break;
            case 'eyes':
                currentOrder.eyes = itemId;
                currentOrder.eyesName = getMenuItemName(itemId, category) || 'Normal Eyes';
                break;
            case 'heads':
                currentOrder.head = itemId;
                currentOrder.headName = getMenuItemName(itemId, category) || 'No Headwear';
                break;
            case 'mouths':
                currentOrder.mouth = itemId;
                currentOrder.mouthName = getMenuItemName(itemId, category) || 'Normal Mouth';
                break;
        }
        
        // Ensure base layer is always loaded before loading other traits
        ensureBaseLayerLoaded(() => {
            // Update PFP and order summary
            const layerType = category === 'backgrounds' ? 'background' :
                              category === 'clothes' ? 'clothes' :
                              category === 'eyes' ? 'eyes' :
                              category === 'heads' ? 'head' :
                              category === 'mouths' ? 'mouth' : category;
            
            loadLayer(layerType, itemId);
            updateOrderSummary();
            updatePremiumPriceSummary();
        });
        
        // Play selection sound
        playSound('select');
        
        // Show notification
        const itemName = getMenuItemName(itemId, category) || itemId || 'None';
        showNotification(`Selected: ${itemName}`, 'success');
        
        console.log(`✅ Selected ${itemName}`);
    } catch (error) {
        console.error('Error in selectMenuItem:', error);
    }
}

function loadLayer(type, value) {
    if (value === '' || value === 'NORMAL') {
        // For empty values or default "NORMAL" selections
        if (type === 'eyes' && value === 'NORMAL') {
            // Load the normal eyes
            layers[type] = new Image();
            layers[type].onload = () => drawPFP();
            layers[type].onerror = () => {
                console.error(`Failed to load ${type} image:`, value);
                showNotification(`❌ Error loading ${type}`);
            };
            layers[type].src = `assets/${type.toUpperCase()}/${value}.png`;
        } else if (type === 'mouth' && value === 'NORMAL') {
            // Load the normal mouth
            layers[type] = new Image();
            layers[type].onload = () => drawPFP();
            layers[type].onerror = () => {
                console.error(`Failed to load ${type} image:`, value);
                showNotification(`❌ Error loading ${type}`);
            };
            layers[type].src = `assets/${type.toUpperCase()}/${value}.png`;
        } else {
            // No layer selected
        layers[type] = null;
        drawPFP();
        }
    } else {
        layers[type] = new Image();
        layers[type].onload = () => drawPFP();
        layers[type].onerror = () => {
            console.error(`Failed to load ${type} image:`, value);
            showNotification(`❌ Error loading ${type}`);
        };
        
        // Map to correct folder names (case-sensitive)
        const folderMap = {
            background: 'BACKGROUND',
            base: 'BASE',
            clothes: 'CLOTHES',
            eyes: 'EYES',
            head: 'HEAD',
            mouth: 'MOUTH'
        };
        const folderName = folderMap[type];
        layers[type].src = `assets/${folderName}/${value}.png`;
    }
}

// Generate random price between min and max
function getRandomPrice(min = 0.10, max = 15.99) {
    return Math.random() * (max - min) + min;
}

// Parse user amount from string (e.g., "$12.34" -> 12.34)
function parseUserAmount(amountString) {
    if (!amountString) return 0;
    const cleanString = amountString.toString().replace(/[$,]/g, '');
    const parsed = parseFloat(cleanString);
    return isNaN(parsed) ? 0 : parsed;
}

// Calculate current order total from DOM elements
function calculateOrderTotal() {
    const totalElement = document.querySelector('.total-amount');
    if (!totalElement) return 0;
    return parseUserAmount(totalElement.textContent);
}

// Update the premium price summary display with 5% platform fee
function updatePremiumPriceSummary() {
    const totalMojoElement = document.getElementById('totalMojoPrice');
    const totalUsdElement = document.getElementById('totalUsdPrice');
    
    if (!totalMojoElement || !totalUsdElement) {
        console.log('Premium price summary elements not found');
        return;
    }
    
    let baseMojoPrice = 500; // Base MOJO price for the NFT
    let baseUsdPrice = 0.10; // Base USD price
    
    // Add selected traits
    Object.entries(currentOrder).forEach(([category, itemId]) => {
        if (itemId && itemId !== 'none' && itemId !== 'normal' && itemId !== 'NONE' && itemId !== 'NORMAL' && itemId !== '') {
            const item = findMenuItem(category, itemId);
            if (item) {
                baseMojoPrice += item.mojoPrice || 0;
                baseUsdPrice += item.price || 0;
            }
        }
    });
    
    // Add gas fee estimate
    baseMojoPrice += 100;
    baseUsdPrice += 0.02;
    
    // Calculate final pricing
    const totalMojoPrice = baseMojoPrice;
    const totalUsdPrice = baseUsdPrice;
    
    // Update total display
    totalMojoElement.textContent = `${formatMojoPrice(totalMojoPrice)} MOJO`;
    totalUsdElement.textContent = `≈ $${totalUsdPrice.toFixed(2)} USD`;
    
    console.log(`Premium order total: ${totalMojoPrice} MOJO (≈ $${totalUsdPrice.toFixed(2)} USD)`);
}

// Update the order summary display with MOJO token prices
function updateOrderSummary() {
    const orderItemsContainer = document.querySelector('.order-items');
    const subtotalElement = document.querySelector('.subtotal-amount');
    const totalElement = document.querySelector('.total-amount');
    
    // Check if elements exist (they might not in the new single-page layout)
    if (!orderItemsContainer) {
        console.log('Order summary elements not found - skipping update');
        return;
    }
    
    // Clear current items
    orderItemsContainer.innerHTML = '';
    
    let subtotalUSD = 0;
    let subtotalMOJO = 0;
    
    // Add base MOJO
    if (currentOrder.base) {
        // Hide base price in USD; show MOJO only when mintPrice is fetched from contract
        const baseMojoPrice = 0;
        const baseItem = document.createElement('div');
        baseItem.className = 'order-item';
        baseItem.innerHTML = `
            <div class="order-item-left">
                <div class="item-qty">1</div>
                <div class="item-name">MOJO Base</div>
            </div>
            <div class="item-price">${formatMojoPrice(baseMojoPrice)}</div>
        `;
        orderItemsContainer.appendChild(baseItem);
        subtotalUSD += basePrice;
        subtotalMOJO += baseMojoPrice;
    }
    
    // Add hat/topping
    if (currentOrder.hat) {
        const hatName = currentOrder.hatName || getMenuItemName(currentOrder.hat, 'hats');
        if (hatName && hatName !== 'No Topping') {
            const hatPrice = getRandomPrice(0.50, 4.99);
            const hatItem = document.createElement('div');
            hatItem.className = 'order-item';
            hatItem.innerHTML = `
                <div class="order-item-left">
                    <div class="item-qty">1</div>
                    <div class="item-name">${hatName}</div>
                </div>
                <div class="item-price">$${hatPrice.toFixed(2)}</div>
            `;
            orderItemsContainer.appendChild(hatItem);
            subtotal += hatPrice;
        }
    }
    
    // Add item/side
    if (currentOrder.item) {
        const itemName = currentOrder.itemName || getMenuItemName(currentOrder.item, 'items');
        if (itemName && itemName !== 'No Side') {
            const itemPrice = getRandomPrice(1.99, 6.99);
            const sideItem = document.createElement('div');
            sideItem.className = 'order-item';
            sideItem.innerHTML = `
                <div class="order-item-left">
                    <div class="item-qty">1</div>
                    <div class="item-name">${itemName}</div>
                </div>
                <div class="item-price">$${itemPrice.toFixed(2)}</div>
            `;
            orderItemsContainer.appendChild(sideItem);
            subtotal += itemPrice;
        }
    }
    
    // Show "No Topping" if no hat selected
    if (!currentOrder.hat || currentOrder.hatName === 'No Topping') {
        const noToppingPrice = getRandomPrice(0.25, 2.50);
        const noToppingItem = document.createElement('div');
        noToppingItem.className = 'order-item';
        noToppingItem.innerHTML = `
            <div class="order-item-left">
                <div class="item-qty">1</div>
                <div class="item-name">No Topping</div>
            </div>
            <div class="item-price">$${noToppingPrice.toFixed(2)}</div>
        `;
        orderItemsContainer.appendChild(noToppingItem);
        subtotal += noToppingPrice;
    }
    
    // Show "No Side" if no item selected
    if (!currentOrder.item || currentOrder.itemName === 'No Side') {
        const noSidePrice = getRandomPrice(0.10, 1.99);
        const noSideItem = document.createElement('div');
        noSideItem.className = 'order-item';
        noSideItem.innerHTML = `
            <div class="order-item-left">
                <div class="item-qty">1</div>
                <div class="item-name">No Side</div>
            </div>
            <div class="item-price">$${noSidePrice.toFixed(2)}</div>
        `;
        orderItemsContainer.appendChild(noSideItem);
        subtotal += noSidePrice;
    }
    
    // Update totals with gas fee in MOJO
    const gasFeeMOJO = 0;
    const totalUSD = subtotalUSD;
    const totalMOJO = subtotalMOJO;
    
    // Add gas fee to display
    if (subtotalMOJO > 0) {
        const gasItem = document.createElement('div');
        gasItem.className = 'order-item';
        gasItem.innerHTML = `
            <div class="order-item-left">
                <div class="item-qty">1</div>
                <div class="item-name">Gas Fee</div>
            </div>
            <div class="item-price">${formatMojoPrice(gasFeeMOJO)}</div>
        `;
        orderItemsContainer.appendChild(gasItem);
    }
    
    if (subtotalElement) subtotalElement.textContent = formatMojoPrice(subtotalMOJO);
    if (totalElement) totalElement.textContent = formatMojoPrice(totalMOJO);
    
    // Update order count
    updateOrdersServed();
}

function updateOrderTotal() {
    let subtotal = 0;
    
    // Add hat price
    if (currentOrder.hat) {
        const hatItem = menuItems.hats.find(h => h.id === currentOrder.hat);
        if (hatItem) subtotal += hatItem.price;
    }
    
    // Add item price
    if (currentOrder.item) {
        const itemItem = menuItems.items.find(i => i.id === currentOrder.item);
        if (itemItem) subtotal += itemItem.price;
    }
    
    const blockchainFee = 0.01;
    const total = subtotal + blockchainFee;
    
    // Update display
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('finalTotal');
    
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

// === PFP GENERATION ===

function loadBaseImage() {
    if (!canvas) return;
    
    layers.base = new Image();
    layers.base.onload = () => {
        drawPFP();
    };
    layers.base.onerror = () => {
        showNotification('❌ Error loading base MOJO');
    };
    layers.base.src = 'assets/BASE/MOJO BODY.png';
}

// Ensure base layer is always loaded before other operations
function ensureBaseLayerLoaded(callback) {
    if (layers.base && layers.base.complete) {
        // Base layer already loaded, execute callback
        callback();
    } else {
        // Load base layer first
        if (!layers.base) {
            layers.base = new Image();
            layers.base.onload = () => {
                callback();
            };
            layers.base.onerror = () => {
                showNotification('❌ Error loading base MOJO');
                callback(); // Still execute callback to prevent hanging
            };
            layers.base.src = 'assets/BASE/MOJO BODY.png';
        } else {
            // Base layer is loading, wait for it
            layers.base.onload = () => {
                callback();
            };
        }
    }
}

function drawPFP() {
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw layers in proper order (background to foreground)
    
    // 1. Background layer (if selected)
    if (layers.background && layers.background.complete) {
        ctx.drawImage(layers.background, 0, 0, canvas.width, canvas.height);
    }
    
    // 2. Base MOJO character
    if (layers.base && layers.base.complete) {
        ctx.drawImage(layers.base, 0, 0, canvas.width, canvas.height);
    }
    
    // 3. Clothes layer
    if (layers.clothes && layers.clothes.complete) {
        ctx.drawImage(layers.clothes, 0, 0, canvas.width, canvas.height);
    }
    
    // 4. Eyes layer
    if (layers.eyes && layers.eyes.complete) {
        ctx.drawImage(layers.eyes, 0, 0, canvas.width, canvas.height);
    }
    
    // 5. Mouth layer
    if (layers.mouth && layers.mouth.complete) {
        ctx.drawImage(layers.mouth, 0, 0, canvas.width, canvas.height);
    }
    
    // 6. Head/headwear layer (drawn last so it's on top)
    if (layers.head && layers.head.complete) {
        ctx.drawImage(layers.head, 0, 0, canvas.width, canvas.height);
    }
    
    // Also render a full-resolution version to an offscreen export canvas
    if (exportCanvas && exportCtx) {
        exportCtx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
        if (layers.background && layers.background.complete) exportCtx.drawImage(layers.background, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
        if (layers.base && layers.base.complete) exportCtx.drawImage(layers.base, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
        if (layers.clothes && layers.clothes.complete) exportCtx.drawImage(layers.clothes, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
        if (layers.eyes && layers.eyes.complete) exportCtx.drawImage(layers.eyes, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
        if (layers.mouth && layers.mouth.complete) exportCtx.drawImage(layers.mouth, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
        if (layers.head && layers.head.complete) exportCtx.drawImage(layers.head, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
    }

    // Update canvas aria-label
    const background = currentOrder.backgroundName || 'no background';
    const clothes = currentOrder.clothesName || 'no clothes';
    const eyes = currentOrder.eyesName || 'normal eyes';
    const head = currentOrder.headName || 'no headwear';
    const mouth = currentOrder.mouthName || 'normal mouth';
    
    if (canvas) {
        canvas.setAttribute('aria-label', 
            `Your custom MOJO with ${background}, ${clothes}, ${eyes}, ${head}, and ${mouth}`
        );
    }
}

// === QUICK ORDERS ===

function quickOrder(hatId, itemId) {
    playChickenSound();
    
    // Find the menu items
    const hatItem = menuItems.hats.find(h => h.id === hatId);
    const itemItem = menuItems.items.find(i => i.id === itemId);
    
    // Clear current selections
    document.querySelectorAll('.menu-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Update order state immediately
    if (hatItem) {
        const hatElement = document.querySelector(`[data-category="hats"][data-value="${hatId}"]`);
        if (hatElement) {
            hatElement.classList.add('selected');
            currentOrder.hat = hatId;
            currentOrder.hatName = hatItem.name;
        }
    }
    
    if (itemItem) {
        const itemElement = document.querySelector(`[data-category="items"][data-value="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
            currentOrder.item = itemId;
            currentOrder.itemName = itemItem.name;
        }
    }
    
    // Load base layer first, then load traits after base is ready
    if (!canvas) return;
    
    layers.base = new Image();
    layers.base.onload = () => {
        // Base loaded, now load the selected traits
        if (hatItem) {
            loadLayer('hat', hatId);
        }
        if (itemItem) {
            loadLayer('item', itemId);
        }
        drawPFP();
        console.log('✅ Quick combo loaded with base + traits');
    };
    layers.base.onerror = () => {
        console.error('Failed to load base image for quick combo');
        showNotification('❌ Error loading base MOJO');
    };
    layers.base.src = 'assets/BASE/MOJO BODY.png';
    
    updateOrderSummary();
    updateOrderTotal();
    
    showNotification(`🍽️ Quick order prepared! ${hatItem?.name} with ${itemItem?.name}`);
}

function randomizePFP() {
    try {
        playPartySound();
        
        // Random selections for MOJO traits
        const randomBackground = menuItems.backgrounds[Math.floor(Math.random() * menuItems.backgrounds.length)];
        const randomClothes = menuItems.clothes[Math.floor(Math.random() * menuItems.clothes.length)];
        const randomEyes = menuItems.eyes[Math.floor(Math.random() * menuItems.eyes.length)];
        const randomHead = menuItems.heads[Math.floor(Math.random() * menuItems.heads.length)];
        const randomMouth = menuItems.mouths[Math.floor(Math.random() * menuItems.mouths.length)];
        
        // Update current order
        currentOrder.background = randomBackground.id;
        currentOrder.backgroundName = randomBackground.name;
        currentOrder.clothes = randomClothes.id;
        currentOrder.clothesName = randomClothes.name;
        currentOrder.eyes = randomEyes.id;
        currentOrder.eyesName = randomEyes.name;
        currentOrder.head = randomHead.id;
        currentOrder.headName = randomHead.name;
        currentOrder.mouth = randomMouth.id;
        currentOrder.mouthName = randomMouth.name;
        
        // Update UI
        document.querySelectorAll('.trait-card.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Select the random items in UI
        const bgElement = document.querySelector(`[data-category="backgrounds"][data-value="${randomBackground.id}"]`);
        if (bgElement) bgElement.classList.add('selected');
        
        const clothesElement = document.querySelector(`[data-category="clothes"][data-value="${randomClothes.id}"]`);
        if (clothesElement) clothesElement.classList.add('selected');
        
        const eyesElement = document.querySelector(`[data-category="eyes"][data-value="${randomEyes.id}"]`);
        if (eyesElement) eyesElement.classList.add('selected');
        
        const headElement = document.querySelector(`[data-category="heads"][data-value="${randomHead.id}"]`);
        if (headElement) headElement.classList.add('selected');
        
        const mouthElement = document.querySelector(`[data-category="mouths"][data-value="${randomMouth.id}"]`);
        if (mouthElement) mouthElement.classList.add('selected');
        
        // Ensure base layer is loaded, then update display
        ensureBaseLayerLoaded(() => {
            loadLayer('background', randomBackground.id);
            loadLayer('clothes', randomClothes.id);
            loadLayer('eyes', randomEyes.id);
            loadLayer('head', randomHead.id);
            loadLayer('mouth', randomMouth.id);
            updateOrderSummary();
            updatePremiumPriceSummary();
        });
        showNotification(`🎲 Random MOJO created!`);
        
    } catch (error) {
        console.error('Error in randomizePFP:', error);
        showNotification('❌ Error creating random MOJO');
    }
}

// Clear order and reset to defaults
function clearOrder() {
    try {
        // Reset current order to defaults
        currentOrder.background = '';
        currentOrder.backgroundName = 'No Background';
        currentOrder.clothes = '';
        currentOrder.clothesName = 'No Clothes';
        currentOrder.eyes = 'NORMAL';
        currentOrder.eyesName = 'Normal Eyes';
        currentOrder.head = '';
        currentOrder.headName = 'No Headwear';
        currentOrder.mouth = 'NORMAL';
        currentOrder.mouthName = 'Normal Mouth';
        
        // Clear UI selections
        document.querySelectorAll('.trait-card.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Update display
        // Ensure base layer is loaded and redraw
        ensureBaseLayerLoaded(() => {
            drawPFP();
            updateOrderSummary();
        });
        showNotification('🗑️ MOJO reset to default');
        
    } catch (error) {
        console.error('Error clearing order:', error);
    }
}

// === ORDER COMPLETION ===

function downloadPFP() {
    if (!canvas) return;
    
    try {
        // Play success sound
        playSound('success');
        
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const head = currentOrder.head || 'nohead';
        const clothes = currentOrder.clothes || 'noclothes';
        const bg = currentOrder.background || 'nobg';
        
        // Export full-resolution from offscreen canvas
        const source = (exportCanvas && exportCanvas.width === EXPORT_SIZE) ? exportCanvas : canvas;
        link.download = `mojo-pfp-${orderNumber.toString().padStart(4, '0')}-${bg}-${clothes}-${head}-${timestamp}.png`;
        link.href = source.toDataURL('image/png', 1.0);
        link.click();
        
        // Update statistics
        ordersServed++;
        orderNumber++;
        updateOrdersServed();
        updateOrderNumber();
        
        showNotification('🎉 Order complete! Enjoy your MOJO NFT!');
        
        // Analytics
        console.log(`Order completed: ${hat} + ${item}`);
        
        // Track orders locally
        const orders = JSON.parse(localStorage.getItem('mojoOrders') || '[]');
        orders.push({
            orderNumber: orderNumber - 1,
            hat: currentOrder.hat,
            item: currentOrder.item,
            hatName: currentOrder.hatName,
            itemName: currentOrder.itemName,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('mojoOrders', JSON.stringify(orders));
        
        // Track order globally with Supabase
        console.log('📊 Recording place order to Supabase...');
        recordGlobalOrder({
            hat: currentOrder.hat,
            hatName: currentOrder.hatName,
            item: currentOrder.item,
            itemName: currentOrder.itemName,
            total: calculateOrderTotal()
        }).then(result => {
            if (result && result.success) {
                console.log('✅ Place order recorded successfully');
            } else {
                console.warn('⚠️ Place order recording failed:', result?.error || 'Unknown error');
            }
        }).catch(error => {
            console.error('❌ Place order recording error:', error);
        });
        
        // Easter eggs
        if (ordersServed === 5) {
            setTimeout(() => {
                showNotification('🏆 5 orders served! You\'re a loyal customer!', 4000);
            }, 2000);
        } else if (ordersServed === 10) {
            setTimeout(() => {
                showNotification('🔥 10 orders! You\'ve discovered all our secrets!', 4000);
                enterPartyMode();
            }, 2000);
        }
        
    } catch (error) {
        console.error('Order failed:', error);
        showNotification('❌ Order failed - please try again');
    }
}

// Clear order function
function clearOrder() {
    console.log('🗑️ Clearing order...');
    
    // Reset selections
    document.querySelectorAll('.menu-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Reset current order to defaults
    currentOrder.base = 'MOJO BODY';
    currentOrder.background = '';
    currentOrder.backgroundName = 'No Background';
    currentOrder.clothes = '';
    currentOrder.clothesName = 'No Clothes';
    currentOrder.eyes = 'NORMAL';
    currentOrder.eyesName = 'Normal Eyes';
    currentOrder.head = '';
    currentOrder.headName = 'No Headwear';
    currentOrder.mouth = 'NORMAL';
    currentOrder.mouthName = 'Normal Mouth';
    
    // Select default "none" options
    setTimeout(() => {
        const noToppingElement = document.querySelector('[data-item-id=""][data-category="hats"]');
        if (noToppingElement) {
            noToppingElement.classList.add('selected');
        }
        
        const noSideElement = document.querySelector('[data-item-id=""][data-category="items"]');
        if (noSideElement) {
            noSideElement.classList.add('selected');
        }
        
        // Update PFP and order summary
        loadBaseImage();
        updateOrderSummary();
    }, 50);
    
            playKitchenSound();
    
    // Show notification
    showNotification('Order cleared! Back to basics 🐔', 'info');
    
    console.log('✅ Order cleared successfully');
}

// === INTERACTIVE ELEMENTS ===

function canvasClicked() {
    playKitchenSound();
    if (canvas) {
        canvas.style.transform = 'scale(1.05) rotate(5deg)';
        setTimeout(() => {
            canvas.style.transform = '';
        }, 300);
    }
    
    clickCount++;
    if (clickCount === 3) {
        showNotification('🐔 Your chicken loves the attention!');
        createParticleBurst(10);
        clickCount = 0;
    }
    
    setTimeout(() => {
        if (clickCount > 0) clickCount--;
    }, 1000);
}

function logoClicked() {
    playKitchenSound();
    const logo = document.querySelector('.header-logo');
    if (logo) {
        logo.style.transform = 'scale(1.2) rotate(360deg)';
        setTimeout(() => {
            logo.style.transform = '';
        }, 500);
    }
    
    createParticleBurst(5);
}

function enterPartyMode() {
    playPartySound();
    showNotification('🎉 RESTAURANT PARTY MODE!', 4000);
    
    const logo = document.querySelector('.header-logo');
    const title = document.querySelector('.palace-title');
    
    if (logo) logo.style.animation = 'float 1s ease-in-out infinite';
    if (title) title.style.animation = 'pulse 1s ease-in-out infinite';
    
    // Spawn flying chickens
    for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnFlyingChicken(), i * 800);
    }
    
    createParticleBurst(20);
    
    const originalTitle = document.title;
    document.title = '🎉 PARTY AT MOJO\'S! 🎉 ' + originalTitle;
    
    setTimeout(() => {
        if (logo) logo.style.animation = '';
        if (title) title.style.animation = '';
        document.title = originalTitle;
    }, 10000);
}

function spawnFlyingChicken() {
    const chicken = document.createElement('div');
    chicken.textContent = '🍗';
    chicken.className = 'flying-chicken';
    chicken.style.top = Math.random() * 50 + 20 + '%';
    chicken.style.fontSize = Math.random() * 20 + 30 + 'px';
    chicken.style.animationDuration = (Math.random() * 2 + 3) + 's';
    
    document.body.appendChild(chicken);
    
    setTimeout(() => {
        if (document.body.contains(chicken)) {
            document.body.removeChild(chicken);
        }
    }, 5000);
}

// === PARTICLE SYSTEM ===

function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + 'vw';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
    
    const colors = ['#dc2626', '#fbbf24', '#f97316'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    const size = Math.random() * 8 + 4;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
        if (document.body.contains(particle)) {
            document.body.removeChild(particle);
        }
    }, 6000);
}

function createParticleBurst(count = 10) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => createParticle(), i * 100);
    }
}

// === KONAMI CODE ===

function setupKonamiCode() {
    document.addEventListener('keydown', function(e) {
        konamiCode.push(e.code);
        if (konamiCode.length > konamiSequence.length) {
            konamiCode.shift();
        }
        
        if (konamiCode.length === konamiSequence.length && 
            konamiCode.every((key, i) => key === konamiSequence[i])) {
            enterPartyMode();
            showNotification('🎮 Secret restaurant code activated!', 5000);
            konamiCode = [];
            
            setTimeout(() => {
                showNotification('🏆 You found the secret menu!', 4000);
            }, 2000);
        }
    });
}

// === BUTTON FUNCTIONS ===

function buyMojo() {
    playKitchenSound();
    showNotification('🚀 Redirecting to franchise opportunities...');
    setTimeout(() => {
        showNotification('💡 Add your DEX link in the buyMojo() function');
    }, 2000);
}

function copyContract() {
    const contractAddress = NFT_CONTRACT_ADDRESS;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(contractAddress).then(() => {
            playKitchenSound();
            showNotification('📋 NFT contract address copied!');
        }).catch(() => {
            showNotification('❌ Failed to copy contract');
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = contractAddress;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            playKitchenSound();
            showNotification('📋 NFT contract address copied!');
        } catch (err) {
            showNotification('❌ Failed to copy contract');
        }
        
        document.body.removeChild(textArea);
    }
}

function openDiscord() {
    try {
        window.open('https://discord.gg/zFq3xPHb6a', '_blank');
        playKitchenSound();
        showNotification('💬 Opening Discord Kitchen...', 'info');
    } catch (error) {
        console.error('Error opening Discord:', error);
    }
}

function openTwitter() {
    try {
        window.open('https://x.com/mojodotfun', '_blank');
        playKitchenSound();
        showNotification('🐦 Opening Twitter Updates...', 'info');
    } catch (error) {
        console.error('Error opening Twitter:', error);
    }
}

function openDexScreener() {
    try {
        window.open('https://dexscreener.com/abstract/0x98dc57db2a2db5bfa58370fc063a2d50a20b2528', '_blank');
        playKitchenSound();
        showNotification('📊 Opening DexScreener Chart...', 'info');
    } catch (error) {
        console.error('Error opening DexScreener:', error);
    }
}

function openTelegram() {
    try {
        window.open('https://t.me/+WH78IRYSeBhiMGIx', '_blank');
        playKitchenSound();
        showNotification('📱 Opening Telegram Channel...', 'info');
    } catch (error) {
        console.error('Error opening Telegram:', error);
    }
}

function openDEX() {
    try {
        // Placeholder URL - can be updated with actual DEX link later
        window.open('https://app.uniswap.org/#/swap', '_blank');
        playKitchenSound();
        showNotification('💱 Opening franchise opportunities...', 'info');
    } catch (error) {
        console.error('Error opening DEX:', error);
    }
}

// === UTILITY FUNCTIONS ===

function savePreferences() {
    const prefs = {

        ordersServed,
        easterEggFound,
        orderNumber,
        timestamp: Date.now()
    };
    localStorage.setItem('mojoRestaurantPrefs', JSON.stringify(prefs));
}

function loadPreferences() {
    try {
        const saved = localStorage.getItem('mojoRestaurantPrefs');
        if (saved) {
            const prefs = JSON.parse(saved);
        
            ordersServed = prefs.ordersServed || 0;
            easterEggFound = prefs.easterEggFound || false;
            orderNumber = prefs.orderNumber || 1;
            updateOrdersServed();
            updateOrderNumber();
        }
    } catch (e) {
        console.warn('Failed to load preferences:', e);
    }
}

// Error handling - avoid showing errors for authentication flows
window.addEventListener('error', function(e) {
    console.error('Restaurant error:', e.error);
    
    // Don't show kitchen hiccup for authentication-related errors
    const errorMessage = e.error?.message || e.message || '';
    const isAuthError = errorMessage.toLowerCase().includes('twitter') || 
                       errorMessage.toLowerCase().includes('auth') ||
                       errorMessage.toLowerCase().includes('token') ||
                       window.location.pathname.includes('callback');
    
    if (!isAuthError) {
        showNotification('⚠️ Kitchen hiccup, but we\'re still cooking!');
    }
});

// Handle visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        savePreferences();
    }
});

// === PAGE INITIALIZATION ===

// Simple loading screen fix - hide after 3 seconds no matter what
setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}, 3000);

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing MOJO generator...');
    try {
        initializeRestaurant();
    } catch (e) {
        console.error('Init error, using minimal boot path:', e);
        try {
            // Minimal fallback to ensure trait UI appears
            createMenuItems();
            initializeCanvas();
            loadBaseImage();
        } catch (e2) {
            console.error('Fallback init failed:', e2);
        }
    }
});



// === MAIN INITIALIZATION ===

function initializeRestaurant() {
    console.log('🏪 Initializing Mojo\'s NFT Gallery...');
    
    try {
        // Set initial base selection
        currentOrder.base = 'MOJO';
        
        // Initialize menu sections
        createMenuItems();
        
        // Initialize order number
        initializeOrderNumber();
        
        // Set default selections for all MOJO trait categories
        setTimeout(() => {
            try {
                // Set default background (none)
                const noBackgroundElement = document.querySelector('[data-item-id=""][data-category="backgrounds"]');
                if (noBackgroundElement) {
                    noBackgroundElement.classList.add('selected');
                    currentOrder.background = '';
                    currentOrder.backgroundName = 'No Background';
                }
                
                // Set default clothes (none)
                const noClothesElement = document.querySelector('[data-item-id=""][data-category="clothes"]');
                if (noClothesElement) {
                    noClothesElement.classList.add('selected');
                    currentOrder.clothes = '';
                    currentOrder.clothesName = 'No Clothes';
                }
                
                // Set default eyes (normal)
                const normalEyesElement = document.querySelector('[data-item-id="NORMAL"][data-category="eyes"]');
                if (normalEyesElement) {
                    normalEyesElement.classList.add('selected');
                    currentOrder.eyes = 'NORMAL';
                    currentOrder.eyesName = 'Normal Eyes';
                }
                
                // Set default head (none)
                const noHeadElement = document.querySelector('[data-item-id=""][data-category="heads"]');
                if (noHeadElement) {
                    noHeadElement.classList.add('selected');
                    currentOrder.head = '';
                    currentOrder.headName = 'No Headwear';
                }
                
                // Set default mouth (normal)
                const normalMouthElement = document.querySelector('[data-item-id="NORMAL"][data-category="mouths"]');
                if (normalMouthElement) {
                    normalMouthElement.classList.add('selected');
                    currentOrder.mouth = 'NORMAL';
                    currentOrder.mouthName = 'Normal Mouth';
                }
                
                // Initial PFP generation and order summary update
                loadBaseImage();
                updateOrderSummary();
                updatePremiumPriceSummary();
            } catch (error) {
                console.error('Error setting default selections:', error);
            }
        }, 100);
        
        // Initialize canvas
        initializeCanvas();
        
        // Load saved preferences
        loadPreferences();
        
        // Setup Konami code if function exists
        if (typeof setupKonamiCode === 'function') {
            setupKonamiCode();
        }
        
        // Initialize tab system
        initializeTabSystem();
        
        // Initialize mobile-specific UI adjustments
        initializeMobileUI();
        
        // Initialize global stats from Supabase (non-blocking)
        initializeGlobalStats().catch(error => {
            console.warn('⚠️ Supabase initialization failed silently:', error);
        });
        
        // Initialize Web3 wallet connection UI
        updateWalletUI(false);
        
        // Initialize MOJO token pricing
        initializeMojoPricing();
        
        console.log('✅ MOJO PFP Maker initialized successfully!');
        
        // Hide loading screen after successful initialization
        setTimeout(() => {
            hideLoadingScreen();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error in initializeRestaurant:', error);
        // Ensure we still update the order summary even if other things fail
        try {
            updateOrderSummary();
            updatePremiumPriceSummary();
        } catch (e) {
            console.error('❌ Error updating order summary:', e);
        }
        
        // Hide loading screen even if initialization fails
        setTimeout(() => {
            hideLoadingScreen();
        }, 1000);
    }
}

// Save preferences before page unload
window.addEventListener('beforeunload', savePreferences);

// === TAB SYSTEM MANAGEMENT ===

// Initialize tab system
function initializeTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            switchTab(targetTab);
            
            // Play navigation sound
            playKitchenSound();
        });
        
        // Keyboard support
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                button.click();
            }
        });
    });
    
    console.log('✅ Tab system initialized');
}

// Initialize mobile-specific UI adjustments - RESTORED ORIGINAL SYSTEM
function initializeMobileUI() {
    if (isMobileDevice()) {
        console.log('📱 Mobile device detected, applying original optimizations...');
        
        // Apply mobile-optimized body class for CSS targeting
        document.body.classList.add('mobile-optimized');
        
        // Update copy button for mobile users
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            // Add mobile indicator to copy button
            copyBtn.innerHTML = '📋 COPY <small style="opacity: 0.8; font-size: 0.7em; display: block; margin-top: 2px;">May not work on all browsers</small>';
            
            // Add mobile-specific styling
            copyBtn.style.fontSize = '0.85em';
            copyBtn.style.padding = '8px 12px';
            copyBtn.style.lineHeight = '1.2';
        }
        
        // Emphasize download button for mobile
        const downloadBtn = document.querySelector('.place-order-btn');
        if (downloadBtn) {
            downloadBtn.innerHTML = '📥 DOWNLOAD <small style="opacity: 0.9; font-size: 0.8em; display: block; margin-top: 1px;">Recommended for mobile</small>';
        }
        
        // Hide elements that waste space on mobile
        const elementsToHide = [
            '.combo-buttons', // Quick combos take too much space
            '.item-name', // Item names are redundant with emojis
            '.palace-tagline', // Extra text in header
            '.abstract-text' // Text next to logo
        ];
        
        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
            });
        });
        
        // Optimize mobile game instructions
        const gameInstructions = document.querySelector('.mobile-instructions p');
        if (gameInstructions) {
            gameInstructions.textContent = '📱 Tap left/right to move • Jump higher for more points!';
        }
        
        // Add mobile orientation optimization
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                console.log('📱 Orientation changed, adjusting layout...');
                // Force layout recalculation after orientation change
                window.dispatchEvent(new Event('resize'));
            }, 100);
        });
        
        console.log('✅ Original mobile optimizations restored and applied');
    }
}

function switchTab(targetTab) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    // Update button states
    tabButtons.forEach(button => {
        const isActive = button.getAttribute('data-tab') === targetTab;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive.toString());
    });
    
    // Update panel visibility
    tabPanels.forEach(panel => {
        const isActive = panel.id === `${targetTab}-panel`;
        panel.classList.toggle('active', isActive);
    });
    
    // Handle game-specific initialization
    if (targetTab === 'game') {
        // Initialize game when switching to game tab
        setTimeout(() => {
            if (typeof initializeGame === 'function') {
                initializeGame();
            }
        }, 100);
    }
    
    console.log(`🔄 Switched to ${targetTab} tab`);
}

// Note: Main initialization is handled by the DOMContentLoaded event listener above
// This redundant initialization block has been removed to prevent conflicts 

// === ESSENTIAL MISSING FUNCTIONS ===

// Get menu item name by ID and category
function getMenuItemName(itemId, category) {
    try {
        if (!itemId) return null;
        
        let items;
        switch(category) {
            case 'backgrounds': items = menuItems.backgrounds; break;
            case 'clothes': items = menuItems.clothes; break;
            case 'eyes': items = menuItems.eyes; break;
            case 'heads': items = menuItems.heads; break;
            case 'mouths': items = menuItems.mouths; break;
            default: return null;
        }
        
        const item = items.find(item => item.id === itemId);
        return item ? item.name : null;
    } catch (error) {
        console.error('Error getting menu item name:', error);
        return null;
    }
}

// Initialize canvas for PFP generation
function initializeCanvas() {
    try {
        canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return false;
        }
        
        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Canvas context not available');
            return false;
        }
        
        // Preview canvas stays small to prevent blowing out layout
        canvas.width = 400;
        canvas.height = 400;
        
        // Prepare offscreen export canvas for full-res output
        exportCanvas = document.createElement('canvas');
        exportCanvas.width = EXPORT_SIZE;
        exportCanvas.height = EXPORT_SIZE;
        exportCtx = exportCanvas.getContext('2d');
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        console.log('✅ Canvas initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing canvas:', error);
        return false;
    }
}

// Show notification (simple fallback if advanced version doesn't exist)
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Try to show visual notification if container exists
    try {
        // Create simple notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Trigger show animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    } catch (e) {
        // Notification failed, just log
        console.log('Visual notification failed:', e);
    }
}

// Play sound - maps to specific restaurant sounds
function playSound(soundType) {
    if (!audioEnabled) return;
    
    try {
        switch(soundType) {
            case 'select':
                playChickenSound(); // Trait selection gets chicken sound
                break;
            case 'clear':
                playKitchenSound(); // Clear order gets kitchen sound
                break;
            case 'click':
                playOrderSound(); // Button clicks get order sound
                break;
            case 'success':
                playCompleteOrderSound(); // Success gets cash register sound
                break;
            case 'welcome':
                playCompleteOrderSound(); // Welcome gets cash register sound
                break;
            default:
                playChickenSound(); // Default to chicken sound
                break;
        }
    } catch (e) {
        console.log('Audio playback failed:', e);
    }
}

// This duplicate function has been removed - using the main loadBaseImage function above

// Load selected hat and item layers
function loadSelectedLayers() {
    try {
        const canvas = document.getElementById('pfpCanvas');
        const ctx = canvas.getContext('2d');
        
        // Load hat layer if selected
        if (currentOrder.hat && currentOrder.hat !== '') {
            const hatImg = new Image();
            hatImg.crossOrigin = 'anonymous';
            hatImg.onload = function() {
                ctx.drawImage(hatImg, 0, 0, canvas.width, canvas.height);
            };
            hatImg.src = `assets/HEAD/${currentOrder.head}.png`;
        }
        
        // Load item layer if selected
        if (currentOrder.item && currentOrder.item !== '') {
            const itemImg = new Image();
            itemImg.crossOrigin = 'anonymous';
            itemImg.onload = function() {
                ctx.drawImage(itemImg, 0, 0, canvas.width, canvas.height);
            };
            itemImg.src = `assets/CLOTHES/${currentOrder.clothes}.png`;
        }
    } catch (error) {
        console.error('Error loading layers:', error);
    }
}

// Draw fallback image if base image fails to load
function drawFallbackImage(ctx, canvas) {
    try {
        // Draw a simple fallback
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw chicken emoji as text
        ctx.fillStyle = '#000';
        ctx.font = '100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐔', canvas.width / 2, canvas.height / 2);
        
        console.log('✅ Fallback image drawn');
    } catch (error) {
        console.error('Error drawing fallback:', error);
    }
} 

// === DOWNLOAD & ORDER FUNCTIONS ===

// Download PFP function (called by place order button)
async function downloadPFP() {
    try {
        console.log('📋 Processing order...');
        
        const canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            showNotification('Canvas not found!', 'error');
            return;
        }
        
        // Create download link
        const link = document.createElement('a');
        link.download = `mojo-nft-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Record order in Supabase database for global tracking
        console.log('📊 Recording download order to Supabase...');
        const orderResult = await recordGlobalOrder({
            hat: currentOrder.hat,
            hatName: currentOrder.hatName,
            item: currentOrder.item,
            itemName: currentOrder.itemName,
            total: calculateOrderTotal()
        });
        
        if (orderResult && orderResult.success) {
            console.log('✅ Download order recorded successfully');
        } else {
            console.warn('⚠️ Download order recording failed:', orderResult?.error || 'Unknown error');
        }
        
        // Update local orders served count
        ordersServed++;
        localStorage.setItem('ordersServed', ordersServed.toString());
        
        // Update order number for next order
        orderNumber++;
        updateOrderNumber();
        
        playKitchenSound();
        
        // Show success message
        showNotification('🎉 Order complete! Your Mojo has been downloaded!', 'success');
        
        console.log('✅ Order processed successfully');
    } catch (error) {
        console.error('Error downloading PFP:', error);
        showNotification('Download failed. Please try again.', 'error');
    }
}

// Detect if device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
}

// Check if clipboard image support is available
async function hasClipboardImageSupport() {
    try {
        // Check basic clipboard support
        if (!navigator.clipboard || !navigator.clipboard.write) {
            return false;
        }
        
        // Test if ClipboardItem is available and works
        if (typeof ClipboardItem === 'undefined') {
            return false;
        }
        
        // Additional check for mobile browsers
        if (isMobileDevice()) {
            // Many mobile browsers have limited ClipboardItem support
            // We'll attempt the operation but with better error handling
            return 'limited';
        }
        
        return true;
    } catch (error) {
        console.warn('Clipboard image support check failed:', error);
        return false;
    }
}

// === TRADES TAB FUNCTIONALITY ===

function openTradesApp() {
    // Check if trades are enabled on the main server
    fetch('/config')
        .then(response => response.json())
        .then(config => {
            if (config.trades) {
                // Redirect to the trades route on the same port
                window.location.href = '/trades';
            } else {
                // Fallback to game app
                window.open('http://localhost:3001/trades', '_blank');
                showNotification('🔄 Opening Mojo Trades in new window...', 'info');
            }
        })
        .catch(() => {
            // If config fails, try game app
            window.open('http://localhost:3001/trades', '_blank');
            showNotification('🔄 Opening Mojo Trades in new window...', 'info');
        });
}

function learnMoreTrades() {
    showNotification('📖 Trades feature documentation coming soon!', 'info');
    // Could open a modal or navigate to documentation
}

// Copy PFP to clipboard function
async function copyPFPToClipboard() {
    try {
        console.log('📋 Copying to clipboard...');
        
        const canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            showNotification('Canvas not found!', 'error');
            return;
        }
        
        // Check clipboard support first
        const clipboardSupport = await hasClipboardImageSupport();
        
        if (clipboardSupport === false) {
            showNotification('📋 Clipboard images not supported on this device. Use Download instead.', 'error');
            return;
        }
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
        
        if (!blob) {
            showNotification('Failed to create image', 'error');
            return;
        }
        
        // Try to copy to clipboard
        try {
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
            
            // Success! Record the order and update UI
            await recordOrderAndUpdateUI();
            
            // Show success message
            const message = clipboardSupport === 'limited' 
                ? '📋 Mojo copied! (Note: Some mobile browsers may not paste images correctly)'
                : '📋 Mojo copied to clipboard!';
            showNotification(message, 'success');
            console.log('✅ PFP copied to clipboard successfully');
            
        } catch (clipboardError) {
            console.warn('Clipboard write failed:', clipboardError);
            
            // On mobile, offer alternative
            if (isMobileDevice()) {
                showNotification('📋 Mobile clipboard limitations detected. Use Download or try again.', 'warning');
            } else {
                throw clipboardError; // Re-throw for desktop error handling
            }
        }
        
    } catch (error) {
        console.error('Error copying PFP to clipboard:', error);
        
        // Check if it's a permission error
        if (error.name === 'NotAllowedError') {
            showNotification('📋 Clipboard permission denied. Use Download instead.', 'error');
        } else if (error.name === 'NotSupportedError') {
            showNotification('📋 Clipboard images not supported. Use Download instead.', 'error');
        } else {
            const message = isMobileDevice() 
                ? '📋 Mobile copy failed. Use Download instead.'
                : 'Copy failed. Use Download instead.';
            showNotification(message, 'error');
        }
    }
}

// Helper function to record order and update UI
async function recordOrderAndUpdateUI() {
    // Record order in Supabase database for global tracking
    console.log('📊 Recording copy order to Supabase...');
    const orderResult = await recordGlobalOrder({
        hat: currentOrder.hat,
        hatName: currentOrder.hatName,
        item: currentOrder.item,
        itemName: currentOrder.itemName,
        total: calculateOrderTotal()
    });
    
    if (orderResult && orderResult.success) {
        console.log('✅ Copy order recorded successfully');
    } else {
        console.warn('⚠️ Copy order recording failed:', orderResult?.error || 'Unknown error');
    }
    
    // Update local orders served count
    ordersServed++;
    localStorage.setItem('ordersServed', ordersServed.toString());
    updateOrdersServed();
    
    // Update order number for next order
    orderNumber++;
    updateOrderNumber();
    
    // Play success sound
    playSound('success');
}

// Note: Duplicate functions have been removed - original implementations are above

