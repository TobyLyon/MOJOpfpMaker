const hre = require("hardhat");

async function main() {
  console.log("Deploying MOJO NFT Contract...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Canonical contract parameters for MojoNFT_Template
  const CONTRACT_NAME = "MOJO PFP Collection";
  const CONTRACT_SYMBOL = "MOJO";
  const INITIAL_MINT_PRICE = hre.ethers.utils.parseEther("0.01");
  const MAX_SUPPLY = 10000;
  const ROYALTY_RECEIVER = deployer.address; // Update as needed
  const ROYALTY_BPS = 750; // 7.5%

  console.log("Deploying MojoNFT_Template (canonical contract)...");

  const MojoNFTTemplate = await hre.ethers.getContractFactory("MojoNFT_Template");
  const mojoNFT = await MojoNFTTemplate.deploy(
    CONTRACT_NAME,
    CONTRACT_SYMBOL,
    INITIAL_MINT_PRICE,
    MAX_SUPPLY,
    ROYALTY_RECEIVER,
    ROYALTY_BPS
  );

  await mojoNFT.deployed();
  console.log("MojoNFT_Template deployed to:", mojoNFT.address);

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("Contract Name:", CONTRACT_NAME);
  console.log("Contract Symbol:", CONTRACT_SYMBOL);
  console.log("Deployer:", deployer.address);
  console.log("Contract Type:", "MojoNFT_Template (ERC721)");
  console.log("Address:", mojoNFT.address);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⚠️  Don't forget to:");
    console.log("1. Update NFT_CONTRACT_ADDRESS in frontend config.js");
    console.log("2. Set IPFS base URIs and test minting on testnet");
    console.log("3. Verify the contract on the block explorer");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
