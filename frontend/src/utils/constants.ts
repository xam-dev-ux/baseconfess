// Contract addresses
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0xadD16C796Cab6D6FEd1e6a057c267a06642E05b4';
export const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Base Network configuration
export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_CONFIG = {
  chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
  chainName: 'Base',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

// Contract constants
export const ACCESS_PRICE = BigInt(10); // 0.00001 USDC (6 decimals)
export const ACCESS_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
export const MAX_CONFESSION_LENGTH = 500;
export const MAX_COMMENT_LENGTH = 200;

// USDC ABI (minimal)
export const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

// BaseConfess Contract ABI
export const BASE_CONFESS_ABI = [
  // Access functions
  'function purchaseAccess() external',
  'function hasActiveAccess(address user) external view returns (bool)',
  'function getAccessDetails(address user) external view returns (tuple(uint256 expirationTimestamp, uint256 totalPayments, uint256 joinedAt, uint256 lastRenewalAt))',
  'function getExpirationTimestamp(address user) external view returns (uint256)',
  'function getRemainingAccessTime(address user) external view returns (uint256)',

  // Confession functions
  'function postConfession(bytes32 contentHash, uint8 category) external',
  'function getConfession(uint256 confessionId) external view returns (tuple(uint256 id, bytes32 contentHash, uint8 category, uint256 timestamp, bool isHidden, uint256 totalReactions, uint256 totalComments, uint256 reportCount))',
  'function getConfessionsByRange(uint256 startId, uint256 count) external view returns (tuple(uint256 id, bytes32 contentHash, uint8 category, uint256 timestamp, bool isHidden, uint256 totalReactions, uint256 totalComments, uint256 reportCount)[])',
  'function getConfessionsByCategory(uint8 category, uint256 offset, uint256 limit) external view returns (uint256[])',
  'function getTotalConfessions() external view returns (uint256)',

  // Comment functions
  'function postComment(uint256 confessionId, bytes32 contentHash) external',
  'function getCommentsForConfession(uint256 confessionId) external view returns (tuple(uint256 id, uint256 confessionId, bytes32 contentHash, uint256 timestamp, bool isDeleted, uint256 totalReactions)[])',
  'function getCommentCount(uint256 confessionId) external view returns (uint256)',

  // Reaction functions
  'function reactToConfession(uint256 confessionId, uint8 reactionType) external',
  'function changeConfessionReaction(uint256 confessionId, uint8 newReactionType) external',
  'function removeConfessionReaction(uint256 confessionId) external',
  'function reactToComment(uint256 commentId, uint8 reactionType) external',
  'function getConfessionReactionCounts(uint256 confessionId) external view returns (tuple(uint256 likes, uint256 loves, uint256 thinking, uint256 fires, uint256 sads))',
  'function getMyConfessionReaction(uint256 confessionId) external view returns (tuple(uint8 reactionType, uint256 timestamp, bool exists))',
  'function getCommentReactionCounts(uint256 commentId) external view returns (tuple(uint256 likes, uint256 loves, uint256 thinking, uint256 fires, uint256 sads))',

  // Report functions
  'function reportConfession(uint256 confessionId, uint8 reason) external',
  'function reportComment(uint256 commentId, uint8 reason) external',
  'function voteOnReport(uint256 reportId, bool voteFor) external',
  'function getReport(uint256 reportId) external view returns (tuple(uint256 id, uint8 targetType, uint256 targetId, uint8 reason, uint256 votesFor, uint256 votesAgainst, bool resolved, uint256 timestamp, uint256 totalVoters))',
  'function getPendingReports(uint256 offset, uint256 limit) external view returns (tuple(uint256 id, uint8 targetType, uint256 targetId, uint8 reason, uint256 votesFor, uint256 votesAgainst, bool resolved, uint256 timestamp, uint256 totalVoters)[])',
  'function getUserVoteOnReport(uint256 reportId, address user) external view returns (bool hasVoted, bool votedFor)',

  // View functions
  'function getContractBalance() external view returns (uint256)',
  'function getTotalMembers() external view returns (uint256)',
  'function getGlobalStats() external view returns (tuple(uint256 totalConfessions, uint256 totalComments, uint256 totalReactions, uint256 totalMembers, uint256 activeMembers, uint256 totalReports, uint256 resolvedReports))',
  'function getConfessionCountByCategory(uint8 category) external view returns (uint256)',

  // Settings
  'function voteThreshold() external view returns (uint256)',
  'function approvalPercentage() external view returns (uint256)',

  // Events
  'event AccessPurchased(address indexed user, uint256 expiresAt, uint256 totalPayments)',
  'event ConfessionPosted(uint256 indexed confessionId, uint8 category, uint256 timestamp)',
  'event CommentPosted(uint256 indexed commentId, uint256 indexed confessionId, uint256 timestamp)',
  'event ReactionAdded(uint256 indexed targetId, bool isConfession, uint8 reactionType)',
  'event ReportCreated(uint256 indexed reportId, uint8 targetType, uint256 targetId, uint8 reason)',
  'event ReportVoted(uint256 indexed reportId, bool voteFor, uint256 totalVotesFor, uint256 totalVotesAgainst)',
  'event ReportResolved(uint256 indexed reportId, bool contentRemoved)',
];
