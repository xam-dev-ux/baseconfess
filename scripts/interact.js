const hre = require("hardhat");

// USDC ABI (minimal for interactions)
const USDC_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
];

async function main() {
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
    const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

    if (!CONTRACT_ADDRESS) {
        console.error("Please set CONTRACT_ADDRESS environment variable");
        process.exit(1);
    }

    const [signer] = await hre.ethers.getSigners();
    console.log("Using account:", signer.address);
    console.log("Network:", hre.network.name);
    console.log("");

    // Get contracts
    const baseConfess = await hre.ethers.getContractAt("BaseConfess", CONTRACT_ADDRESS);
    const usdc = new hre.ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

    // Parse command
    const command = process.argv[2];
    const args = process.argv.slice(3);

    switch (command) {
        case "stats":
            await getStats(baseConfess);
            break;

        case "access":
            await checkAccess(baseConfess, signer.address);
            break;

        case "purchase":
            await purchaseAccess(baseConfess, usdc, signer);
            break;

        case "approve":
            await approveUSDC(usdc, CONTRACT_ADDRESS, signer);
            break;

        case "confess":
            if (args.length < 2) {
                console.error("Usage: confess <content> <category>");
                console.error("Categories: 0=Love, 1=Work, 2=Secrets, 3=Controversial, 4=Life, 5=Other");
                process.exit(1);
            }
            await postConfession(baseConfess, args[0], parseInt(args[1]));
            break;

        case "read":
            const id = args[0] ? parseInt(args[0]) : 1;
            const count = args[1] ? parseInt(args[1]) : 10;
            await readConfessions(baseConfess, id, count);
            break;

        case "react":
            if (args.length < 2) {
                console.error("Usage: react <confessionId> <reactionType>");
                console.error("Reactions: 0=Like, 1=Love, 2=Thinking, 3=Fire, 4=Sad");
                process.exit(1);
            }
            await react(baseConfess, parseInt(args[0]), parseInt(args[1]));
            break;

        case "comment":
            if (args.length < 2) {
                console.error("Usage: comment <confessionId> <content>");
                process.exit(1);
            }
            await postComment(baseConfess, parseInt(args[0]), args[1]);
            break;

        case "balance":
            await checkBalance(usdc, signer.address);
            break;

        default:
            console.log("BaseConfess Interaction Script");
            console.log("==============================");
            console.log("");
            console.log("Commands:");
            console.log("  stats              - Get global statistics");
            console.log("  access             - Check your access status");
            console.log("  balance            - Check your USDC balance");
            console.log("  approve            - Approve USDC spending");
            console.log("  purchase           - Purchase 30-day access");
            console.log("  confess <text> <category> - Post a confession");
            console.log("  read [id] [count]  - Read confessions (default: id=1, count=10)");
            console.log("  react <id> <type>  - React to a confession");
            console.log("  comment <id> <text> - Comment on a confession");
            console.log("");
            console.log("Categories: 0=Love, 1=Work, 2=Secrets, 3=Controversial, 4=Life, 5=Other");
            console.log("Reactions: 0=Like, 1=Love, 2=Thinking, 3=Fire, 4=Sad");
    }
}

async function getStats(contract) {
    console.log("Fetching global statistics...\n");

    const stats = await contract.getGlobalStats();
    const balance = await contract.getContractBalance();
    const members = await contract.getTotalMembers();

    console.log("Global Statistics");
    console.log("-".repeat(30));
    console.log("Total Confessions:", stats.totalConfessions.toString());
    console.log("Total Comments:", stats.totalComments.toString());
    console.log("Total Reactions:", stats.totalReactions.toString());
    console.log("Total Members:", members.toString());
    console.log("Total Reports:", stats.totalReports.toString());
    console.log("Resolved Reports:", stats.resolvedReports.toString());
    console.log("Contract Balance:", hre.ethers.formatUnits(balance, 6), "USDC");
}

async function checkAccess(contract, address) {
    console.log("Checking access for:", address, "\n");

    const hasAccess = await contract.hasActiveAccess(address);
    const details = await contract.getAccessDetails(address);

    console.log("Access Status");
    console.log("-".repeat(30));
    console.log("Has Active Access:", hasAccess);

    if (details.joinedAt > 0) {
        console.log("First Joined:", new Date(Number(details.joinedAt) * 1000).toLocaleString());
        console.log("Total Payments:", details.totalPayments.toString());

        if (hasAccess) {
            const remaining = await contract.getRemainingAccessTime(address);
            const days = Math.floor(Number(remaining) / 86400);
            const hours = Math.floor((Number(remaining) % 86400) / 3600);
            console.log("Expires:", new Date(Number(details.expirationTimestamp) * 1000).toLocaleString());
            console.log("Remaining:", days, "days,", hours, "hours");
        } else {
            console.log("Status: EXPIRED");
        }
    } else {
        console.log("Status: Never purchased access");
    }
}

async function checkBalance(usdc, address) {
    const balance = await usdc.balanceOf(address);
    const decimals = await usdc.decimals();
    console.log("USDC Balance:", hre.ethers.formatUnits(balance, decimals), "USDC");
}

async function approveUSDC(usdc, spender, signer) {
    const amount = hre.ethers.parseUnits("1", 6); // 1 USDC
    console.log("Approving 1 USDC...");

    const tx = await usdc.approve(spender, amount);
    console.log("Transaction:", tx.hash);
    await tx.wait();
    console.log("Approved successfully!");
}

async function purchaseAccess(contract, usdc, signer) {
    const amount = hre.ethers.parseUnits("1", 6);
    const contractAddress = await contract.getAddress();

    // Check balance
    const balance = await usdc.balanceOf(signer.address);
    if (balance < amount) {
        console.error("Insufficient USDC balance. You need at least 1 USDC.");
        return;
    }

    // Check allowance
    const allowance = await usdc.allowance(signer.address, contractAddress);
    if (allowance < amount) {
        console.log("Approving USDC first...");
        const approveTx = await usdc.approve(contractAddress, amount);
        await approveTx.wait();
        console.log("Approved!");
    }

    console.log("Purchasing access...");
    const tx = await contract.purchaseAccess();
    console.log("Transaction:", tx.hash);
    await tx.wait();
    console.log("Access purchased successfully!");

    // Show new access details
    await checkAccess(contract, signer.address);
}

async function postConfession(contract, content, category) {
    if (content.length > 500) {
        console.error("Content too long. Maximum 500 characters.");
        return;
    }

    const contentHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(content));
    console.log("Posting confession...");
    console.log("Content:", content);
    console.log("Category:", ["Love", "Work", "Secrets", "Controversial", "Life", "Other"][category]);

    const tx = await contract.postConfession(contentHash, category);
    console.log("Transaction:", tx.hash);

    const receipt = await tx.wait();

    // Find ConfessionPosted event
    const event = receipt.logs.find(log => {
        try {
            return contract.interface.parseLog(log)?.name === "ConfessionPosted";
        } catch { return false; }
    });

    if (event) {
        const parsed = contract.interface.parseLog(event);
        console.log("\nConfession posted successfully!");
        console.log("Confession ID:", parsed.args.confessionId.toString());
    }
}

async function readConfessions(contract, startId, count) {
    console.log(`Reading confessions ${startId} to ${startId + count - 1}...\n`);

    const confessions = await contract.getConfessionsByRange(startId, count);
    const categories = ["Love", "Work", "Secrets", "Controversial", "Life", "Other"];

    for (const confession of confessions) {
        if (confession.id === 0n) continue;

        console.log("-".repeat(50));
        console.log("ID:", confession.id.toString());
        console.log("Category:", categories[Number(confession.category)]);
        console.log("Content Hash:", confession.contentHash);
        console.log("Posted:", new Date(Number(confession.timestamp) * 1000).toLocaleString());
        console.log("Reactions:", confession.totalReactions.toString());
        console.log("Comments:", confession.totalComments.toString());
        console.log("Hidden:", confession.isHidden);
    }
    console.log("-".repeat(50));
}

async function react(contract, confessionId, reactionType) {
    const reactions = ["Like", "Love", "Thinking", "Fire", "Sad"];
    console.log("Reacting to confession", confessionId, "with", reactions[reactionType]);

    const tx = await contract.reactToConfession(confessionId, reactionType);
    console.log("Transaction:", tx.hash);
    await tx.wait();
    console.log("Reaction added successfully!");
}

async function postComment(contract, confessionId, content) {
    if (content.length > 200) {
        console.error("Comment too long. Maximum 200 characters.");
        return;
    }

    const contentHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(content));
    console.log("Posting comment on confession", confessionId);

    const tx = await contract.postComment(confessionId, contentHash);
    console.log("Transaction:", tx.hash);
    await tx.wait();
    console.log("Comment posted successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
