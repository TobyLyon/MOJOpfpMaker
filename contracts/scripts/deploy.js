const hre = require("hardhat");

async function main() {
  console.log("Deploying MOJO NFT Contract...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Contract parameters
  const CONTRACT_NAME = "MOJO PFP Collection";
  const CONTRACT_SYMBOL = "MOJO";
  const UNREVEALED_URI = "ipfs://QmUnrevealedMetadataHashHere/hidden.json";
  const ROYALTY_RECEIVER = deployer.address; // Change to your royalty address
  
  // Choose which contract to deploy
  const useOptimized = process.env.USE_OPTIMIZED === "true";
  
  if (useOptimized) {
    console.log("Deploying optimized ERC721A contract...");
    
    // Deploy the optimized contract
    const MojoNFTOptimized = await hre.ethers.getContractFactory("MojoNFT_Optimized");
    const mojoNFT = await MojoNFTOptimized.deploy(
      CONTRACT_NAME,
      CONTRACT_SYMBOL,
      UNREVEALED_URI,
      ROYALTY_RECEIVER
    );

    await mojoNFT.deployed();
    console.log("MojoNFT_Optimized deployed to:", mojoNFT.address);
    
    // Set initial configuration
    console.log("Setting initial configuration...");
    
    // Set pricing (example: 0.01 ETH public, 0.008 ETH whitelist)
    await mojoNFT.setPricing(
      hre.ethers.utils.parseEther("0.01"),
      hre.ethers.utils.parseEther("0.008")
    );
    
    console.log("Initial configuration set!");
    
  } else {
    console.log("Deploying basic ERC721 contract...");
    
    // Deploy the basic contract
    const BASE_TOKEN_URI = "ipfs://QmYourBaseMetadataHashHere/";
    
    const MojoNFT = await hre.ethers.getContractFactory("MojoNFT");
    const mojoNFT = await MojoNFT.deploy(
      CONTRACT_NAME,
      CONTRACT_SYMBOL,
      BASE_TOKEN_URI
    );

    await mojoNFT.deployed();
    console.log("MojoNFT deployed to:", mojoNFT.address);
    
    // Set initial mint price
    console.log("Setting mint price...");
    await mojoNFT.setMintPrice(hre.ethers.utils.parseEther("0.01"));
    
    console.log("Initial configuration set!");
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("Contract Name:", CONTRACT_NAME);
  console.log("Contract Symbol:", CONTRACT_SYMBOL);
  console.log("Deployer:", deployer.address);
  console.log("Contract Type:", useOptimized ? "ERC721A (Optimized)" : "ERC721 (Basic)");
  
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⚠️  Don't forget to:");
    console.log("1. Update the contract address in your frontend (script.js)");
    console.log("2. Set up your IPFS metadata");
    console.log("3. Configure whitelist merkle root (if using optimized version)");
    console.log("4. Verify the contract on Etherscan");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
