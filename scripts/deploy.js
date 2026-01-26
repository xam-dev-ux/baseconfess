const hre = require("hardhat");

async function main() {
    console.log("Deploying BaseConfess to", hre.network.name, "...\n");

    // USDC addresses
    const USDC_ADDRESSES = {
        base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
        hardhat: "", // Will deploy mock
        localhost: "", // Will deploy mock
    };

    const network = hre.network.name;
    let usdcAddress = USDC_ADDRESSES[network];

    // Deploy mock USDC for local testing
    if (!usdcAddress) {
        console.log("Deploying MockUSDC for local testing...");
        const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
        const mockUSDC = await MockUSDC.deploy();
        await mockUSDC.waitForDeployment();
        usdcAddress = await mockUSDC.getAddress();
        console.log("MockUSDC deployed to:", usdcAddress);
        console.log("");
    }

    console.log("Using USDC address:", usdcAddress);
    console.log("");

    // Deploy BaseConfess
    const BaseConfess = await hre.ethers.getContractFactory("BaseConfess");
    const baseConfess = await BaseConfess.deploy(usdcAddress);
    await baseConfess.waitForDeployment();

    const contractAddress = await baseConfess.getAddress();

    console.log("=".repeat(50));
    console.log("BaseConfess deployed successfully!");
    console.log("=".repeat(50));
    console.log("");
    console.log("Contract Address:", contractAddress);
    console.log("USDC Address:", usdcAddress);
    console.log("Network:", network);
    console.log("");

    // Verification info
    if (network === "base" || network === "baseSepolia") {
        console.log("To verify the contract, run:");
        console.log(`npx hardhat verify --network ${network} ${contractAddress} ${usdcAddress}`);
        console.log("");
        console.log("View on Basescan:");
        const explorer = network === "base" ? "https://basescan.org" : "https://sepolia.basescan.org";
        console.log(`${explorer}/address/${contractAddress}`);
    }

    console.log("");
    console.log("=".repeat(50));
    console.log("IMPORTANT: Update your .env file with:");
    console.log(`VITE_CONTRACT_ADDRESS=${contractAddress}`);
    console.log("=".repeat(50));

    return { baseConfess, contractAddress, usdcAddress };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
