const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BaseConfess", function () {
    let baseConfess;
    let mockUSDC;
    let owner;
    let user1;
    let user2;
    let user3;
    let users;

    const ACCESS_PRICE = ethers.parseUnits("1", 6); // 1 USDC
    const ACCESS_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
    const INITIAL_USDC_BALANCE = ethers.parseUnits("1000", 6); // 1000 USDC

    // Category enum values
    const Category = {
        Love: 0,
        Work: 1,
        Secrets: 2,
        Controversial: 3,
        Life: 4,
        Other: 5
    };

    // ReactionType enum values
    const ReactionType = {
        Like: 0,
        Love: 1,
        Thinking: 2,
        Fire: 3,
        Sad: 4
    };

    // ReportReason enum values
    const ReportReason = {
        Illegal: 0,
        Spam: 1,
        Harassment: 2,
        Other: 3
    };

    beforeEach(async function () {
        [owner, user1, user2, user3, ...users] = await ethers.getSigners();

        // Deploy mock USDC
        const MockERC20 = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockERC20.deploy();
        await mockUSDC.waitForDeployment();

        // Deploy BaseConfess
        const BaseConfess = await ethers.getContractFactory("BaseConfess");
        baseConfess = await BaseConfess.deploy(await mockUSDC.getAddress());
        await baseConfess.waitForDeployment();

        // Mint USDC to users
        await mockUSDC.mint(user1.address, INITIAL_USDC_BALANCE);
        await mockUSDC.mint(user2.address, INITIAL_USDC_BALANCE);
        await mockUSDC.mint(user3.address, INITIAL_USDC_BALANCE);

        // Mint to additional users for moderation tests
        for (let i = 0; i < 15; i++) {
            if (users[i]) {
                await mockUSDC.mint(users[i].address, INITIAL_USDC_BALANCE);
            }
        }
    });

    describe("Deployment", function () {
        it("Should set the correct USDC address", async function () {
            expect(await baseConfess.usdc()).to.equal(await mockUSDC.getAddress());
        });

        it("Should set the correct owner", async function () {
            expect(await baseConfess.owner()).to.equal(owner.address);
        });

        it("Should have correct default moderation settings", async function () {
            expect(await baseConfess.voteThreshold()).to.equal(10);
            expect(await baseConfess.approvalPercentage()).to.equal(70);
        });

        it("Should revert deployment with zero address", async function () {
            const BaseConfess = await ethers.getContractFactory("BaseConfess");
            await expect(
                BaseConfess.deploy(ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(baseConfess, "ZeroAddress");
        });
    });

    describe("Access System", function () {
        it("Should allow purchasing access with USDC", async function () {
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);

            await expect(baseConfess.connect(user1).purchaseAccess())
                .to.emit(baseConfess, "AccessPurchased");

            expect(await baseConfess.hasActiveAccess(user1.address)).to.be.true;
        });

        it("Should set correct expiration timestamp", async function () {
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await baseConfess.connect(user1).purchaseAccess();

            const currentTime = await time.latest();
            const access = await baseConfess.getAccessDetails(user1.address);

            expect(access.expirationTimestamp).to.be.closeTo(
                BigInt(currentTime) + BigInt(ACCESS_DURATION),
                BigInt(5) // Allow 5 seconds tolerance
            );
        });

        it("Should accumulate access time when renewing early", async function () {
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE * 2n);

            await baseConfess.connect(user1).purchaseAccess();
            const firstAccess = await baseConfess.getAccessDetails(user1.address);

            await baseConfess.connect(user1).purchaseAccess();
            const secondAccess = await baseConfess.getAccessDetails(user1.address);

            expect(secondAccess.expirationTimestamp).to.be.closeTo(
                firstAccess.expirationTimestamp + BigInt(ACCESS_DURATION),
                BigInt(5)
            );
            expect(secondAccess.totalPayments).to.equal(2);
        });

        it("Should revert if insufficient allowance", async function () {
            await expect(
                baseConfess.connect(user1).purchaseAccess()
            ).to.be.revertedWithCustomError(baseConfess, "InsufficientAllowance");
        });

        it("Should transfer USDC to contract", async function () {
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await baseConfess.connect(user1).purchaseAccess();

            expect(await baseConfess.getContractBalance()).to.equal(ACCESS_PRICE);
        });

        it("Should track total members", async function () {
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await mockUSDC.connect(user2).approve(await baseConfess.getAddress(), ACCESS_PRICE);

            await baseConfess.connect(user1).purchaseAccess();
            await baseConfess.connect(user2).purchaseAccess();

            expect(await baseConfess.getTotalMembers()).to.equal(2);
        });

        it("Should return remaining access time correctly", async function () {
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await baseConfess.connect(user1).purchaseAccess();

            const remaining = await baseConfess.getRemainingAccessTime(user1.address);
            expect(remaining).to.be.closeTo(BigInt(ACCESS_DURATION), BigInt(5));
        });

        it("Should return 0 for expired access", async function () {
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await baseConfess.connect(user1).purchaseAccess();

            // Fast forward past expiration
            await time.increase(ACCESS_DURATION + 1);

            expect(await baseConfess.getRemainingAccessTime(user1.address)).to.equal(0);
            expect(await baseConfess.hasActiveAccess(user1.address)).to.be.false;
        });
    });

    describe("Confession System", function () {
        beforeEach(async function () {
            // Give user1 access
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await baseConfess.connect(user1).purchaseAccess();
        });

        it("Should allow posting a confession with access", async function () {
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("My secret confession"));

            await expect(baseConfess.connect(user1).postConfession(contentHash, Category.Secrets))
                .to.emit(baseConfess, "ConfessionPosted")
                .withArgs(1, Category.Secrets, await time.latest() + 1);
        });

        it("Should revert posting without access", async function () {
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("My secret confession"));

            await expect(
                baseConfess.connect(user2).postConfession(contentHash, Category.Secrets)
            ).to.be.revertedWithCustomError(baseConfess, "NoActiveAccess");
        });

        it("Should store confession data correctly", async function () {
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("My secret confession"));
            await baseConfess.connect(user1).postConfession(contentHash, Category.Love);

            const confession = await baseConfess.connect(user1).getConfession(1);

            expect(confession.id).to.equal(1);
            expect(confession.contentHash).to.equal(contentHash);
            expect(confession.category).to.equal(Category.Love);
            expect(confession.isHidden).to.be.false;
        });

        it("Should enforce daily confession limit", async function () {
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("confession"));

            // Post 10 confessions (the limit)
            for (let i = 0; i < 10; i++) {
                await time.increase(301); // 5 min cooldown
                await baseConfess.connect(user1).postConfession(contentHash, Category.Other);
            }

            // 11th should fail
            await time.increase(301);
            await expect(
                baseConfess.connect(user1).postConfession(contentHash, Category.Other)
            ).to.be.revertedWithCustomError(baseConfess, "DailyLimitReached");
        });

        it("Should enforce confession cooldown", async function () {
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("confession"));

            await baseConfess.connect(user1).postConfession(contentHash, Category.Other);

            // Try immediately - should fail
            await expect(
                baseConfess.connect(user1).postConfession(contentHash, Category.Other)
            ).to.be.revertedWithCustomError(baseConfess, "CooldownNotElapsed");

            // Wait for cooldown
            await time.increase(301);

            // Should succeed now
            await expect(
                baseConfess.connect(user1).postConfession(contentHash, Category.Other)
            ).to.not.be.reverted;
        });

        it("Should get confessions by range", async function () {
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("confession"));

            // Post 5 confessions
            for (let i = 0; i < 5; i++) {
                await time.increase(301);
                await baseConfess.connect(user1).postConfession(contentHash, i % 6);
            }

            const confessions = await baseConfess.connect(user1).getConfessionsByRange(1, 3);
            expect(confessions.length).to.equal(3);
            expect(confessions[0].id).to.equal(1);
            expect(confessions[2].id).to.equal(3);
        });

        it("Should get confessions by category", async function () {
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("confession"));

            // Post confessions in different categories
            await baseConfess.connect(user1).postConfession(contentHash, Category.Love);
            await time.increase(301);
            await baseConfess.connect(user1).postConfession(contentHash, Category.Work);
            await time.increase(301);
            await baseConfess.connect(user1).postConfession(contentHash, Category.Love);

            const loveConfessions = await baseConfess.connect(user1).getConfessionsByCategory(
                Category.Love, 0, 10
            );
            expect(loveConfessions.length).to.equal(2);
        });
    });

    describe("Comment System", function () {
        let confessionId;

        beforeEach(async function () {
            // Give users access
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await mockUSDC.connect(user2).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await baseConfess.connect(user1).purchaseAccess();
            await baseConfess.connect(user2).purchaseAccess();

            // Create a confession
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("confession"));
            await baseConfess.connect(user1).postConfession(contentHash, Category.Secrets);
            confessionId = 1;
        });

        it("Should allow posting a comment", async function () {
            const commentHash = ethers.keccak256(ethers.toUtf8Bytes("My comment"));

            await expect(baseConfess.connect(user2).postComment(confessionId, commentHash))
                .to.emit(baseConfess, "CommentPosted");
        });

        it("Should update confession comment count", async function () {
            const commentHash = ethers.keccak256(ethers.toUtf8Bytes("My comment"));
            await baseConfess.connect(user2).postComment(confessionId, commentHash);

            const confession = await baseConfess.connect(user1).getConfession(confessionId);
            expect(confession.totalComments).to.equal(1);
        });

        it("Should get comments for confession", async function () {
            const commentHash1 = ethers.keccak256(ethers.toUtf8Bytes("Comment 1"));
            const commentHash2 = ethers.keccak256(ethers.toUtf8Bytes("Comment 2"));

            await baseConfess.connect(user2).postComment(confessionId, commentHash1);
            await time.increase(61); // Comment cooldown
            await baseConfess.connect(user1).postComment(confessionId, commentHash2);

            const comments = await baseConfess.connect(user1).getCommentsForConfession(confessionId);
            expect(comments.length).to.equal(2);
        });

        it("Should enforce comment cooldown", async function () {
            const commentHash = ethers.keccak256(ethers.toUtf8Bytes("Comment"));

            await baseConfess.connect(user2).postComment(confessionId, commentHash);

            await expect(
                baseConfess.connect(user2).postComment(confessionId, commentHash)
            ).to.be.revertedWithCustomError(baseConfess, "CooldownNotElapsed");
        });
    });

    describe("Reaction System", function () {
        let confessionId;

        beforeEach(async function () {
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await mockUSDC.connect(user2).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await baseConfess.connect(user1).purchaseAccess();
            await baseConfess.connect(user2).purchaseAccess();

            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("confession"));
            await baseConfess.connect(user1).postConfession(contentHash, Category.Love);
            confessionId = 1;
        });

        it("Should allow reacting to a confession", async function () {
            await expect(
                baseConfess.connect(user2).reactToConfession(confessionId, ReactionType.Love)
            ).to.emit(baseConfess, "ReactionAdded")
                .withArgs(confessionId, true, ReactionType.Love);
        });

        it("Should update reaction counts correctly", async function () {
            await baseConfess.connect(user1).reactToConfession(confessionId, ReactionType.Like);
            await baseConfess.connect(user2).reactToConfession(confessionId, ReactionType.Love);

            const counts = await baseConfess.connect(user1).getConfessionReactionCounts(confessionId);
            expect(counts.likes).to.equal(1);
            expect(counts.loves).to.equal(1);
        });

        it("Should prevent double reactions", async function () {
            await baseConfess.connect(user2).reactToConfession(confessionId, ReactionType.Like);

            await expect(
                baseConfess.connect(user2).reactToConfession(confessionId, ReactionType.Love)
            ).to.be.revertedWithCustomError(baseConfess, "AlreadyReacted");
        });

        it("Should allow changing reactions", async function () {
            await baseConfess.connect(user2).reactToConfession(confessionId, ReactionType.Like);

            await expect(
                baseConfess.connect(user2).changeConfessionReaction(confessionId, ReactionType.Fire)
            ).to.emit(baseConfess, "ReactionChanged");

            const counts = await baseConfess.connect(user1).getConfessionReactionCounts(confessionId);
            expect(counts.likes).to.equal(0);
            expect(counts.fires).to.equal(1);
        });

        it("Should allow removing reactions", async function () {
            await baseConfess.connect(user2).reactToConfession(confessionId, ReactionType.Like);
            await baseConfess.connect(user2).removeConfessionReaction(confessionId);

            const counts = await baseConfess.connect(user1).getConfessionReactionCounts(confessionId);
            expect(counts.likes).to.equal(0);
        });

        it("Should track user's reaction", async function () {
            await baseConfess.connect(user2).reactToConfession(confessionId, ReactionType.Thinking);

            const reaction = await baseConfess.connect(user2).getMyConfessionReaction(confessionId);
            expect(reaction.exists).to.be.true;
            expect(reaction.reactionType).to.equal(ReactionType.Thinking);
        });
    });

    describe("Moderation System", function () {
        let confessionId;
        let reportId;

        beforeEach(async function () {
            // Give many users access for voting
            const allUsers = [user1, user2, user3, ...users.slice(0, 12)];
            for (const user of allUsers) {
                if (user) {
                    await mockUSDC.connect(user).approve(await baseConfess.getAddress(), ACCESS_PRICE);
                    await baseConfess.connect(user).purchaseAccess();
                }
            }

            // Create a confession
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("confession"));
            await baseConfess.connect(user1).postConfession(contentHash, Category.Controversial);
            confessionId = 1;
        });

        it("Should allow reporting a confession", async function () {
            await expect(
                baseConfess.connect(user2).reportConfession(confessionId, ReportReason.Spam)
            ).to.emit(baseConfess, "ReportCreated");
        });

        it("Should enforce report cooldown", async function () {
            await baseConfess.connect(user2).reportConfession(confessionId, ReportReason.Spam);

            // Create another confession to report
            await time.increase(301);
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("confession2"));
            await baseConfess.connect(user1).postConfession(contentHash, Category.Other);

            await expect(
                baseConfess.connect(user2).reportConfession(2, ReportReason.Spam)
            ).to.be.revertedWithCustomError(baseConfess, "CooldownNotElapsed");
        });

        it("Should allow voting on reports", async function () {
            await baseConfess.connect(user2).reportConfession(confessionId, ReportReason.Illegal);
            reportId = 1;

            await expect(baseConfess.connect(user3).voteOnReport(reportId, true))
                .to.emit(baseConfess, "ReportVoted");

            const report = await baseConfess.connect(user1).getReport(reportId);
            expect(report.votesFor).to.equal(1);
        });

        it("Should prevent double voting", async function () {
            await baseConfess.connect(user2).reportConfession(confessionId, ReportReason.Illegal);
            reportId = 1;

            await baseConfess.connect(user3).voteOnReport(reportId, true);

            await expect(
                baseConfess.connect(user3).voteOnReport(reportId, false)
            ).to.be.revertedWithCustomError(baseConfess, "AlreadyVoted");
        });

        it("Should resolve report and hide confession when threshold reached", async function () {
            await baseConfess.connect(user2).reportConfession(confessionId, ReportReason.Illegal);
            reportId = 1;

            // Get 10 users to vote "for" removal (need 70% of 10 = 7 votes)
            const voters = [user3, ...users.slice(0, 9)];
            for (let i = 0; i < 10; i++) {
                // 8 vote for, 2 vote against (80% approval)
                const voteFor = i < 8;
                await baseConfess.connect(voters[i]).voteOnReport(reportId, voteFor);
            }

            const confession = await baseConfess.connect(user1).getConfession(confessionId);
            expect(confession.isHidden).to.be.true;
        });

        it("Should not hide confession if approval below threshold", async function () {
            await baseConfess.connect(user2).reportConfession(confessionId, ReportReason.Spam);
            reportId = 1;

            // Only 5 vote for (50% - below 70% threshold)
            const voters = [user3, ...users.slice(0, 9)];
            for (let i = 0; i < 10; i++) {
                const voteFor = i < 5;
                await baseConfess.connect(voters[i]).voteOnReport(reportId, voteFor);
            }

            const confession = await baseConfess.connect(user1).getConfession(confessionId);
            expect(confession.isHidden).to.be.false;
        });

        it("Should get pending reports", async function () {
            await baseConfess.connect(user2).reportConfession(confessionId, ReportReason.Harassment);

            const pendingReports = await baseConfess.connect(user1).getPendingReports(0, 10);
            expect(pendingReports.length).to.equal(1);
            expect(pendingReports[0].id).to.equal(1);
        });
    });

    describe("Admin Functions", function () {
        beforeEach(async function () {
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await baseConfess.connect(user1).purchaseAccess();
        });

        it("Should allow owner to update moderation settings", async function () {
            await baseConfess.connect(owner).updateModerationSettings(15, 80);

            expect(await baseConfess.voteThreshold()).to.equal(15);
            expect(await baseConfess.approvalPercentage()).to.equal(80);
        });

        it("Should prevent non-owner from updating settings", async function () {
            await expect(
                baseConfess.connect(user1).updateModerationSettings(15, 80)
            ).to.be.revertedWithCustomError(baseConfess, "OwnableUnauthorizedAccount");
        });

        it("Should allow owner to withdraw funds", async function () {
            const initialBalance = await mockUSDC.balanceOf(owner.address);

            await expect(baseConfess.connect(owner).withdrawFunds(owner.address, ACCESS_PRICE))
                .to.emit(baseConfess, "FundsWithdrawn")
                .withArgs(owner.address, ACCESS_PRICE);

            expect(await mockUSDC.balanceOf(owner.address)).to.equal(
                initialBalance + ACCESS_PRICE
            );
        });

        it("Should allow owner to emergency hide confession", async function () {
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("confession"));
            await baseConfess.connect(user1).postConfession(contentHash, Category.Other);

            await expect(baseConfess.connect(owner).emergencyHideConfession(1))
                .to.emit(baseConfess, "ConfessionHiddenByModeration");

            const confession = await baseConfess.connect(user1).getConfession(1);
            expect(confession.isHidden).to.be.true;
        });
    });

    describe("Global Stats", function () {
        it("Should track global statistics correctly", async function () {
            await mockUSDC.connect(user1).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await mockUSDC.connect(user2).approve(await baseConfess.getAddress(), ACCESS_PRICE);
            await baseConfess.connect(user1).purchaseAccess();
            await baseConfess.connect(user2).purchaseAccess();

            // Post confessions and comments
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("confession"));
            await baseConfess.connect(user1).postConfession(contentHash, Category.Love);
            await time.increase(301);
            await baseConfess.connect(user1).postConfession(contentHash, Category.Work);

            await baseConfess.connect(user2).postComment(1, contentHash);

            await baseConfess.connect(user2).reactToConfession(1, ReactionType.Fire);

            const stats = await baseConfess.getGlobalStats();
            expect(stats.totalConfessions).to.equal(2);
            expect(stats.totalComments).to.equal(1);
            expect(stats.totalReactions).to.equal(1);
            expect(stats.totalMembers).to.equal(2);
        });
    });
});

// Mock USDC contract for testing
const MockUSDCArtifact = {
    abi: [
        "function mint(address to, uint256 amount) external",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function balanceOf(address account) external view returns (uint256)",
        "function transfer(address to, uint256 amount) external returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
    ]
};
