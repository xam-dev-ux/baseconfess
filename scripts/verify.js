const hre = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
    const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

    if (!CONTRACT_ADDRESS) {
        console.error("Please set CONTRACT_ADDRESS environment variable");
        process.exit(1);
    }

    console.log("Verifying BaseConfess contract...");
    console.log("Contract:", CONTRACT_ADDRESS);
    console.log("USDC:", USDC_ADDRESS);
    console.log("Network:", hre.network.name);
    console.log("");

    try {
        await hre.run("verify:verify", {
            address: CONTRACT_ADDRESS,
            constructorArguments: [USDC_ADDRESS],
        });
        console.log("Contract verified successfully!");
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("Contract is already verified!");
        } else {
            console.error("Verification failed:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
