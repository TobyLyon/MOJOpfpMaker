const hre = require("hardhat");

async function main() {
  console.log("🏭 Deploying NFT Factory for Whitelabel System...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the NFT Factory
  console.log("\n📦 Deploying NFTFactory contract...");
  const NFTFactory = await hre.ethers.getContractFactory("NFTFactory");
  const factory = await NFTFactory.deploy();

  await factory.deployed();
  console.log("✅ NFTFactory deployed to:", factory.address);

  // Set initial configuration
  console.log("\n⚙️ Setting up factory configuration...");
  
  // Set deployment fee (0.01 ETH - adjust as needed)
  const deploymentFee = hre.ethers.utils.parseEther("0.01");
  await factory.setDeploymentFee(deploymentFee);
  console.log(`💰 Deployment fee set to: ${hre.ethers.utils.formatEther(deploymentFee)} ETH`);

  // Test factory functionality
  console.log("\n🧪 Testing factory functionality...");
  const currentFee = await factory.deploymentFee();
  const feeRecipient = await factory.feeRecipient();
  
  console.log(`Current deployment fee: ${hre.ethers.utils.formatEther(currentFee)} ETH`);
  console.log(`Fee recipient: ${feeRecipient}`);

  console.log("\n=== 🎉 DEPLOYMENT SUMMARY ===");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Factory Address: ${factory.address}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Deployment Fee: ${hre.ethers.utils.formatEther(deploymentFee)} ETH`);
  
  console.log("\n=== 📋 NEXT STEPS ===");
  console.log("1. Update admin.html with the factory address:");
  console.log(`   const FACTORY_ADDRESSES = {`);
  console.log(`     ${hre.network.name}: "${factory.address}"`);
  console.log(`   };`);
  
  console.log("\n2. Verify the contract on Etherscan:");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${factory.address}`);
  
  console.log("\n3. Test deployment through admin.html");
  console.log("4. Deploy to mainnet when ready!");
  
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⚠️  IMPORTANT:");
    console.log("- Test the factory on testnet first");
    console.log("- Deploy a test NFT collection");
    console.log("- Verify everything works before mainnet");
    console.log("- Keep your private key secure");
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    factoryAddress: factory.address,
    deploymentFee: hre.ethers.utils.formatEther(deploymentFee),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  console.log("\n💾 Deployment info saved for records:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
