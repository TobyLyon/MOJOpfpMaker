# MOJO Asset Setup Guide

## 📁 Asset Organization

Your MOJO assets should be organized exactly like this:

```
assets/
├── base/
│   └── MOJO.png          # Base character (1600x1600px)
├── hat/                  # Headwear traits
│   ├── none.png         # Transparent/empty
│   ├── crown.png        # Royal crown
│   ├── cap.png          # Baseball cap
│   ├── helmet.png       # Space helmet
│   └── [more-hats].png
└── item/                 # Accessory traits
    ├── none.png         # Transparent/empty
    ├── sword.png        # Magic sword
    ├── wand.png         # Wizard wand
    ├── coin.png         # Gold coin
    └── [more-items].png
```

## 🎨 Asset Requirements

### **Image Specifications:**
- **Size**: 1600x1600 pixels (matches canvas)
- **Format**: PNG with transparency
- **Background**: Transparent for traits
- **Quality**: High resolution for crisp NFTs

### **Base Character (MOJO.png):**
- Full character design
- Solid background or transparent
- This is the foundation layer

### **Trait Layers (hats/items):**
- **Transparent background** (very important!)
- Positioned to align with base character
- Should overlay perfectly on base

### **"None" Options:**
- `hat/none.png` - Completely transparent 1600x1600 image
- `item/none.png` - Completely transparent 1600x1600 image
- These represent "no trait selected"

## 🖼 Creating Transparent PNGs

### Using Photoshop:
1. Create 1600x1600 canvas
2. Design your trait
3. Delete background layer
4. Save as PNG with transparency

### Using GIMP (Free):
1. File → New → 1600x1600
2. Layer → Transparency → Add Alpha Channel
3. Design your trait
4. Export as PNG

### Using Online Tools:
- [Remove.bg](https://remove.bg) for background removal
- [Canva](https://canva.com) for design
- [GIMP](https://gimp.org) free alternative

## 📝 Naming Convention

Use descriptive, lowercase names with hyphens:
```
hat/
├── baseball-cap.png
├── wizard-hat.png
├── space-helmet.png
├── crown-gold.png
└── none.png

item/
├── magic-sword.png
├── wizard-wand.png
├── gold-coin.png
├── laser-gun.png
└── none.png
```

## 🔧 Integration with Code

After adding your assets, update the trait names in `script.js`:

```javascript
const menuItems = {
    hats: [
        { id: '', name: 'No Headwear', description: 'Clean look', price: 0.00, emoji: '🚫' },
        { id: 'baseball-cap', name: 'Baseball Cap', description: 'Sporty style', price: 0.50, emoji: '🧢' },
        { id: 'wizard-hat', name: 'Wizard Hat', description: 'Magical powers', price: 0.50, emoji: '🧙' },
        { id: 'space-helmet', name: 'Space Helmet', description: 'Cosmic explorer', price: 0.50, emoji: '🚀' },
        { id: 'crown-gold', name: 'Golden Crown', description: 'Royal status', price: 0.50, emoji: '👑' }
    ],
    items: [
        { id: '', name: 'No Accessory', description: 'Pure simplicity', price: 0.00, emoji: '🚫' },
        { id: 'magic-sword', name: 'Magic Sword', description: 'Legendary weapon', price: 1.00, emoji: '⚔️' },
        { id: 'wizard-wand', name: 'Wizard Wand', description: 'Spell casting tool', price: 1.00, emoji: '🪄' },
        { id: 'gold-coin', name: 'Gold Coin', description: 'Lucky charm', price: 1.00, emoji: '🪙' },
        { id: 'laser-gun', name: 'Laser Gun', description: 'Futuristic weapon', price: 1.00, emoji: '🔫' }
    ]
};
```

## ✅ Testing Your Assets

1. **Replace placeholder assets** with your MOJO artwork
2. **Open the web app** in browser
3. **Test trait combinations** - make sure they align properly
4. **Check transparency** - traits should overlay cleanly
5. **Test generation** - create a few test NFTs

## 📊 Rarity Planning

Plan your trait distribution for rarity:

```javascript
// Example rarity distribution
const rarityWeights = {
    hats: {
        'none': 40,           // 40% no hat (common)
        'baseball-cap': 25,   // 25% cap (common)
        'wizard-hat': 20,     // 20% wizard (uncommon)
        'space-helmet': 10,   // 10% space (rare)
        'crown-gold': 5       // 5% crown (legendary)
    },
    items: {
        'none': 30,           // 30% no item
        'gold-coin': 25,      // 25% coin
        'wizard-wand': 20,    // 20% wand
        'magic-sword': 15,    // 15% sword
        'laser-gun': 10       // 10% laser (rare)
    }
};
```

## 🎯 Pro Tips

### **Asset Creation:**
- Design traits to work together visually
- Consider lighting/shadows for consistency
- Test combinations before finalizing
- Keep file sizes reasonable (< 1MB each)

### **Organization:**
- Use consistent naming
- Group similar traits together
- Document your trait system
- Keep backups of source files

### **Quality Control:**
- Preview all combinations
- Check alignment on different traits
- Test on mobile devices
- Verify transparency works

## 🚀 Ready to Launch?

Once your assets are ready:
1. ✅ All images are 1600x1600 PNG with transparency
2. ✅ Traits align properly with base character
3. ✅ "None" options are transparent
4. ✅ File names match code references
5. ✅ All combinations look good together
6. ✅ Tested in the web app

Your MOJO NFT generator is ready for users! 🎨
