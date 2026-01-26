require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            viaIR: true,
        },
    },
    networks: {
        hardhat: {
            chainId: 31337,
        },
        base: {
            url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
            chainId: 8453,
            accounts: [PRIVATE_KEY],
            gasPrice: "auto",
        },
        baseSepolia: {
            url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
            chainId: 84532,
            accounts: [PRIVATE_KEY],
            gasPrice: "auto",
        },
    },
    etherscan: {
        apiKey: BASESCAN_API_KEY,
    },
    sourcify: {
        enabled: true,
    },
    paths: {
        sources: "./contracts",
        tests: "./contracts/test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    mocha: {
        timeout: 40000,
    },
};
