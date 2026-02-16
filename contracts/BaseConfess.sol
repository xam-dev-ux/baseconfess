// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BaseConfess
 * @author BaseConfess Team
 * @notice Anonymous confession board on Base L2 with USDC payments
 * @dev Implements anonymous confessions, reactions, comments, and community moderation
 */
contract BaseConfess is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Custom Errors ============
    error NoActiveAccess();
    error InsufficientAllowance();
    error TransferFailed();
    error InvalidConfessionId();
    error InvalidCommentId();
    error InvalidReportId();
    error ContentTooLong();
    error ContentTooShort();
    error AlreadyReacted();
    error NoReactionToRemove();
    error CooldownNotElapsed();
    error DailyLimitReached();
    error AlreadyVoted();
    error ReportAlreadyResolved();
    error CannotVoteOwnReport();
    error InvalidCategory();
    error InvalidReactionType();
    error InvalidReportReason();
    error ConfessionHidden();
    error CommentDeleted();
    error ZeroAddress();

    // ============ Enums ============
    enum Category { Love, Work, Secrets, Controversial, Life, Other }
    enum ReactionType { Like, Love, Thinking, Fire, Sad }
    enum ReportReason { Illegal, Spam, Harassment, Other }
    enum ReportTargetType { Confession, Comment }

    // ============ Structs ============
    struct Access {
        uint256 expirationTimestamp;
        uint256 totalPayments;
        uint256 joinedAt;
        uint256 lastRenewalAt;
    }

    struct Confession {
        uint256 id;
        bytes32 contentHash;
        Category category;
        uint256 timestamp;
        bool isHidden;
        uint256 totalReactions;
        uint256 totalComments;
        uint256 reportCount;
    }

    struct Comment {
        uint256 id;
        uint256 confessionId;
        bytes32 contentHash;
        uint256 timestamp;
        bool isDeleted;
        uint256 totalReactions;
    }

    struct Reaction {
        ReactionType reactionType;
        uint256 timestamp;
        bool exists;
    }

    struct Report {
        uint256 id;
        ReportTargetType targetType;
        uint256 targetId;
        ReportReason reason;
        uint256 votesFor;
        uint256 votesAgainst;
        bool resolved;
        uint256 timestamp;
        uint256 totalVoters;
    }

    struct ReactionCounts {
        uint256 likes;
        uint256 loves;
        uint256 thinking;
        uint256 fires;
        uint256 sads;
    }

    struct GlobalStats {
        uint256 totalConfessions;
        uint256 totalComments;
        uint256 totalReactions;
        uint256 totalMembers;
        uint256 activeMembers;
        uint256 totalReports;
        uint256 resolvedReports;
    }

    // ============ Constants ============
    uint256 public constant ACCESS_DURATION = 30 days;
    uint256 public constant ACCESS_PRICE = 10; // 0.00001 USDC (6 decimals)
    uint256 public constant MAX_CONFESSION_LENGTH = 500;
    uint256 public constant MAX_COMMENT_LENGTH = 200;
    uint256 public constant MIN_CONTENT_LENGTH = 1;
    uint256 public constant DAILY_CONFESSION_LIMIT = 10;
    uint256 public constant DAILY_COMMENT_LIMIT = 30;
    uint256 public constant CONFESSION_COOLDOWN = 5 minutes;
    uint256 public constant COMMENT_COOLDOWN = 1 minutes;
    uint256 public constant REPORT_COOLDOWN = 1 hours;

    // ============ State Variables ============
    IERC20 public immutable usdc;

    // Moderation settings (configurable by owner)
    uint256 public voteThreshold = 10;
    uint256 public approvalPercentage = 70;
    uint256 public moderatorRewardPercentage = 10;

    // Counters
    uint256 private _confessionIdCounter;
    uint256 private _commentIdCounter;
    uint256 private _reportIdCounter;
    uint256 private _totalMembers;
    uint256 private _totalReactions;

    // Mappings
    mapping(address => Access) private _accesses;
    mapping(uint256 => Confession) private _confessions;
    mapping(uint256 => Comment) private _comments;
    mapping(uint256 => Report) private _reports;

    // Reaction mappings: confessionId/commentId => user => Reaction
    mapping(uint256 => mapping(address => Reaction)) private _confessionReactions;
    mapping(uint256 => mapping(address => Reaction)) private _commentReactions;

    // Reaction counts per confession/comment
    mapping(uint256 => ReactionCounts) private _confessionReactionCounts;
    mapping(uint256 => ReactionCounts) private _commentReactionCounts;

    // Comments per confession
    mapping(uint256 => uint256[]) private _confessionComments;

    // Reports voting
    mapping(uint256 => mapping(address => bool)) private _reportVoters;
    mapping(uint256 => mapping(address => bool)) private _reportVotes; // true = for, false = against

    // Anti-spam: daily limits and cooldowns
    mapping(address => mapping(uint256 => uint256)) private _dailyConfessions; // user => day => count
    mapping(address => mapping(uint256 => uint256)) private _dailyComments; // user => day => count
    mapping(address => uint256) private _lastConfessionTime;
    mapping(address => uint256) private _lastCommentTime;
    mapping(address => uint256) private _lastReportTime;

    // Category tracking
    mapping(Category => uint256[]) private _confessionsByCategory;

    // ============ Events ============
    event AccessPurchased(address indexed user, uint256 expiresAt, uint256 totalPayments);
    event AccessRenewed(address indexed user, uint256 newExpiresAt);
    event ConfessionPosted(uint256 indexed confessionId, Category category, uint256 timestamp);
    event CommentPosted(uint256 indexed commentId, uint256 indexed confessionId, uint256 timestamp);
    event ReactionAdded(uint256 indexed targetId, bool isConfession, ReactionType reactionType);
    event ReactionChanged(uint256 indexed targetId, bool isConfession, ReactionType oldType, ReactionType newType);
    event ReactionRemoved(uint256 indexed targetId, bool isConfession, ReactionType reactionType);
    event ReportCreated(uint256 indexed reportId, ReportTargetType targetType, uint256 targetId, ReportReason reason);
    event ReportVoted(uint256 indexed reportId, bool voteFor, uint256 totalVotesFor, uint256 totalVotesAgainst);
    event ReportResolved(uint256 indexed reportId, bool contentRemoved);
    event ConfessionHiddenByModeration(uint256 indexed confessionId);
    event CommentDeletedByModeration(uint256 indexed commentId);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event ModerationSettingsUpdated(uint256 voteThreshold, uint256 approvalPercentage);

    // ============ Constructor ============
    constructor(address _usdcAddress) Ownable(msg.sender) {
        if (_usdcAddress == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdcAddress);
    }

    // ============ Modifiers ============
    modifier onlyWithAccess() {
        if (!hasActiveAccess(msg.sender)) revert NoActiveAccess();
        _;
    }

    modifier validConfession(uint256 confessionId) {
        if (confessionId == 0 || confessionId > _confessionIdCounter) revert InvalidConfessionId();
        if (_confessions[confessionId].isHidden) revert ConfessionHidden();
        _;
    }

    modifier validComment(uint256 commentId) {
        if (commentId == 0 || commentId > _commentIdCounter) revert InvalidCommentId();
        if (_comments[commentId].isDeleted) revert CommentDeleted();
        _;
    }

    // ============ Access Functions ============

    /**
     * @notice Purchase or renew 30-day access to the board
     * @dev Requires prior USDC approval. Accumulates if user already has access.
     */
    function purchaseAccess() external nonReentrant {
        uint256 allowance = usdc.allowance(msg.sender, address(this));
        if (allowance < ACCESS_PRICE) revert InsufficientAllowance();

        usdc.safeTransferFrom(msg.sender, address(this), ACCESS_PRICE);

        Access storage access = _accesses[msg.sender];

        if (access.joinedAt == 0) {
            // New member
            access.joinedAt = block.timestamp;
            _totalMembers++;
        }

        // Calculate new expiration (accumulative)
        uint256 currentExpiration = access.expirationTimestamp;
        if (currentExpiration < block.timestamp) {
            // Access expired or first time
            access.expirationTimestamp = block.timestamp + ACCESS_DURATION;
        } else {
            // Still active, extend from current expiration
            access.expirationTimestamp = currentExpiration + ACCESS_DURATION;
        }

        access.totalPayments++;
        access.lastRenewalAt = block.timestamp;

        emit AccessPurchased(msg.sender, access.expirationTimestamp, access.totalPayments);
    }

    /**
     * @notice Check if an address has active access
     * @param user The address to check
     * @return bool True if user has active access
     */
    function hasActiveAccess(address user) public view returns (bool) {
        return _accesses[user].expirationTimestamp > block.timestamp;
    }

    /**
     * @notice Get access details for a user
     * @param user The address to query
     * @return Access struct with all details
     */
    function getAccessDetails(address user) external view returns (Access memory) {
        return _accesses[user];
    }

    /**
     * @notice Get expiration timestamp for a user
     * @param user The address to query
     * @return Expiration timestamp (0 if never purchased)
     */
    function getExpirationTimestamp(address user) external view returns (uint256) {
        return _accesses[user].expirationTimestamp;
    }

    /**
     * @notice Get remaining access time in seconds
     * @param user The address to query
     * @return Seconds remaining (0 if expired)
     */
    function getRemainingAccessTime(address user) external view returns (uint256) {
        uint256 expiration = _accesses[user].expirationTimestamp;
        if (expiration <= block.timestamp) return 0;
        return expiration - block.timestamp;
    }

    // ============ Confession Functions ============

    /**
     * @notice Post an anonymous confession
     * @param contentHash Hash of the confession content
     * @param category Category of the confession
     */
    function postConfession(bytes32 contentHash, Category category)
        external
        onlyWithAccess
        nonReentrant
    {
        // Anti-spam checks
        uint256 today = block.timestamp / 1 days;
        if (_dailyConfessions[msg.sender][today] >= DAILY_CONFESSION_LIMIT)
            revert DailyLimitReached();
        if (block.timestamp < _lastConfessionTime[msg.sender] + CONFESSION_COOLDOWN)
            revert CooldownNotElapsed();

        _confessionIdCounter++;
        uint256 confessionId = _confessionIdCounter;

        _confessions[confessionId] = Confession({
            id: confessionId,
            contentHash: contentHash,
            category: category,
            timestamp: block.timestamp,
            isHidden: false,
            totalReactions: 0,
            totalComments: 0,
            reportCount: 0
        });

        _confessionsByCategory[category].push(confessionId);
        _dailyConfessions[msg.sender][today]++;
        _lastConfessionTime[msg.sender] = block.timestamp;

        // Note: We do NOT store msg.sender to maintain anonymity
        emit ConfessionPosted(confessionId, category, block.timestamp);
    }

    /**
     * @notice Get a confession by ID
     * @param confessionId The confession ID
     * @return Confession struct
     */
    function getConfession(uint256 confessionId)
        external
        view
        onlyWithAccess
        returns (Confession memory)
    {
        if (confessionId == 0 || confessionId > _confessionIdCounter)
            revert InvalidConfessionId();
        return _confessions[confessionId];
    }

    /**
     * @notice Get confessions by range (pagination)
     * @param startId Starting confession ID (inclusive)
     * @param count Number of confessions to return
     * @return Array of confessions
     */
    function getConfessionsByRange(uint256 startId, uint256 count)
        external
        view
        onlyWithAccess
        returns (Confession[] memory)
    {
        if (startId == 0) startId = 1;
        if (startId > _confessionIdCounter) return new Confession[](0);

        uint256 endId = startId + count - 1;
        if (endId > _confessionIdCounter) endId = _confessionIdCounter;

        uint256 resultCount = endId - startId + 1;
        Confession[] memory result = new Confession[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = _confessions[startId + i];
        }

        return result;
    }

    /**
     * @notice Get confession IDs by category
     * @param category The category to filter
     * @param offset Starting index
     * @param limit Max results to return
     * @return Array of confession IDs
     */
    function getConfessionsByCategory(Category category, uint256 offset, uint256 limit)
        external
        view
        onlyWithAccess
        returns (uint256[] memory)
    {
        uint256[] storage categoryConfessions = _confessionsByCategory[category];
        uint256 total = categoryConfessions.length;

        if (offset >= total) return new uint256[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        uint256[] memory result = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = categoryConfessions[i];
        }

        return result;
    }

    /**
     * @notice Get total number of confessions
     * @return Total confession count
     */
    function getTotalConfessions() external view returns (uint256) {
        return _confessionIdCounter;
    }

    // ============ Comment Functions ============

    /**
     * @notice Post an anonymous comment on a confession
     * @param confessionId The confession to comment on
     * @param contentHash Hash of the comment content
     */
    function postComment(uint256 confessionId, bytes32 contentHash)
        external
        onlyWithAccess
        validConfession(confessionId)
        nonReentrant
    {
        // Anti-spam checks
        uint256 today = block.timestamp / 1 days;
        if (_dailyComments[msg.sender][today] >= DAILY_COMMENT_LIMIT)
            revert DailyLimitReached();
        if (block.timestamp < _lastCommentTime[msg.sender] + COMMENT_COOLDOWN)
            revert CooldownNotElapsed();

        _commentIdCounter++;
        uint256 commentId = _commentIdCounter;

        _comments[commentId] = Comment({
            id: commentId,
            confessionId: confessionId,
            contentHash: contentHash,
            timestamp: block.timestamp,
            isDeleted: false,
            totalReactions: 0
        });

        _confessionComments[confessionId].push(commentId);
        _confessions[confessionId].totalComments++;
        _dailyComments[msg.sender][today]++;
        _lastCommentTime[msg.sender] = block.timestamp;

        // Note: We do NOT store msg.sender to maintain anonymity
        emit CommentPosted(commentId, confessionId, block.timestamp);
    }

    /**
     * @notice Get all comments for a confession
     * @param confessionId The confession ID
     * @return Array of comments
     */
    function getCommentsForConfession(uint256 confessionId)
        external
        view
        onlyWithAccess
        returns (Comment[] memory)
    {
        if (confessionId == 0 || confessionId > _confessionIdCounter)
            revert InvalidConfessionId();

        uint256[] storage commentIds = _confessionComments[confessionId];
        Comment[] memory result = new Comment[](commentIds.length);

        for (uint256 i = 0; i < commentIds.length; i++) {
            result[i] = _comments[commentIds[i]];
        }

        return result;
    }

    /**
     * @notice Get comment count for a confession
     * @param confessionId The confession ID
     * @return Number of comments
     */
    function getCommentCount(uint256 confessionId) external view returns (uint256) {
        return _confessions[confessionId].totalComments;
    }

    // ============ Reaction Functions ============

    /**
     * @notice Add a reaction to a confession
     * @param confessionId The confession ID
     * @param reactionType Type of reaction
     */
    function reactToConfession(uint256 confessionId, ReactionType reactionType)
        external
        onlyWithAccess
        validConfession(confessionId)
    {
        Reaction storage existingReaction = _confessionReactions[confessionId][msg.sender];

        if (existingReaction.exists) revert AlreadyReacted();

        existingReaction.reactionType = reactionType;
        existingReaction.timestamp = block.timestamp;
        existingReaction.exists = true;

        _updateReactionCount(_confessionReactionCounts[confessionId], reactionType, true);
        _confessions[confessionId].totalReactions++;
        _totalReactions++;

        emit ReactionAdded(confessionId, true, reactionType);
    }

    /**
     * @notice Change your reaction on a confession
     * @param confessionId The confession ID
     * @param newReactionType New reaction type
     */
    function changeConfessionReaction(uint256 confessionId, ReactionType newReactionType)
        external
        onlyWithAccess
        validConfession(confessionId)
    {
        Reaction storage existingReaction = _confessionReactions[confessionId][msg.sender];

        if (!existingReaction.exists) revert NoReactionToRemove();

        ReactionType oldType = existingReaction.reactionType;

        _updateReactionCount(_confessionReactionCounts[confessionId], oldType, false);
        _updateReactionCount(_confessionReactionCounts[confessionId], newReactionType, true);

        existingReaction.reactionType = newReactionType;
        existingReaction.timestamp = block.timestamp;

        emit ReactionChanged(confessionId, true, oldType, newReactionType);
    }

    /**
     * @notice Remove your reaction from a confession
     * @param confessionId The confession ID
     */
    function removeConfessionReaction(uint256 confessionId)
        external
        onlyWithAccess
    {
        Reaction storage existingReaction = _confessionReactions[confessionId][msg.sender];

        if (!existingReaction.exists) revert NoReactionToRemove();

        ReactionType reactionType = existingReaction.reactionType;

        _updateReactionCount(_confessionReactionCounts[confessionId], reactionType, false);
        _confessions[confessionId].totalReactions--;
        _totalReactions--;

        delete _confessionReactions[confessionId][msg.sender];

        emit ReactionRemoved(confessionId, true, reactionType);
    }

    /**
     * @notice Add a reaction to a comment
     * @param commentId The comment ID
     * @param reactionType Type of reaction
     */
    function reactToComment(uint256 commentId, ReactionType reactionType)
        external
        onlyWithAccess
        validComment(commentId)
    {
        Reaction storage existingReaction = _commentReactions[commentId][msg.sender];

        if (existingReaction.exists) revert AlreadyReacted();

        existingReaction.reactionType = reactionType;
        existingReaction.timestamp = block.timestamp;
        existingReaction.exists = true;

        _updateReactionCount(_commentReactionCounts[commentId], reactionType, true);
        _comments[commentId].totalReactions++;
        _totalReactions++;

        emit ReactionAdded(commentId, false, reactionType);
    }

    /**
     * @notice Get reaction counts for a confession
     * @param confessionId The confession ID
     * @return ReactionCounts struct
     */
    function getConfessionReactionCounts(uint256 confessionId)
        external
        view
        onlyWithAccess
        returns (ReactionCounts memory)
    {
        return _confessionReactionCounts[confessionId];
    }

    /**
     * @notice Get your reaction on a confession
     * @param confessionId The confession ID
     * @return Reaction struct (exists = false if no reaction)
     */
    function getMyConfessionReaction(uint256 confessionId)
        external
        view
        onlyWithAccess
        returns (Reaction memory)
    {
        return _confessionReactions[confessionId][msg.sender];
    }

    /**
     * @notice Get reaction counts for a comment
     * @param commentId The comment ID
     * @return ReactionCounts struct
     */
    function getCommentReactionCounts(uint256 commentId)
        external
        view
        onlyWithAccess
        returns (ReactionCounts memory)
    {
        return _commentReactionCounts[commentId];
    }

    // ============ Report & Moderation Functions ============

    /**
     * @notice Report a confession
     * @param confessionId The confession ID to report
     * @param reason Reason for the report
     */
    function reportConfession(uint256 confessionId, ReportReason reason)
        external
        onlyWithAccess
        validConfession(confessionId)
    {
        if (block.timestamp < _lastReportTime[msg.sender] + REPORT_COOLDOWN)
            revert CooldownNotElapsed();

        _reportIdCounter++;
        uint256 reportId = _reportIdCounter;

        _reports[reportId] = Report({
            id: reportId,
            targetType: ReportTargetType.Confession,
            targetId: confessionId,
            reason: reason,
            votesFor: 0,
            votesAgainst: 0,
            resolved: false,
            timestamp: block.timestamp,
            totalVoters: 0
        });

        _confessions[confessionId].reportCount++;
        _lastReportTime[msg.sender] = block.timestamp;

        emit ReportCreated(reportId, ReportTargetType.Confession, confessionId, reason);
    }

    /**
     * @notice Report a comment
     * @param commentId The comment ID to report
     * @param reason Reason for the report
     */
    function reportComment(uint256 commentId, ReportReason reason)
        external
        onlyWithAccess
        validComment(commentId)
    {
        if (block.timestamp < _lastReportTime[msg.sender] + REPORT_COOLDOWN)
            revert CooldownNotElapsed();

        _reportIdCounter++;
        uint256 reportId = _reportIdCounter;

        _reports[reportId] = Report({
            id: reportId,
            targetType: ReportTargetType.Comment,
            targetId: commentId,
            reason: reason,
            votesFor: 0,
            votesAgainst: 0,
            resolved: false,
            timestamp: block.timestamp,
            totalVoters: 0
        });

        _lastReportTime[msg.sender] = block.timestamp;

        emit ReportCreated(reportId, ReportTargetType.Comment, commentId, reason);
    }

    /**
     * @notice Vote on a report
     * @param reportId The report ID
     * @param voteFor True to vote for removal, false to vote against
     */
    function voteOnReport(uint256 reportId, bool voteFor)
        external
        onlyWithAccess
    {
        if (reportId == 0 || reportId > _reportIdCounter) revert InvalidReportId();

        Report storage report = _reports[reportId];
        if (report.resolved) revert ReportAlreadyResolved();
        if (_reportVoters[reportId][msg.sender]) revert AlreadyVoted();

        _reportVoters[reportId][msg.sender] = true;
        _reportVotes[reportId][msg.sender] = voteFor;
        report.totalVoters++;

        if (voteFor) {
            report.votesFor++;
        } else {
            report.votesAgainst++;
        }

        emit ReportVoted(reportId, voteFor, report.votesFor, report.votesAgainst);

        // Check if threshold reached
        if (report.totalVoters >= voteThreshold) {
            _resolveReport(reportId);
        }
    }

    /**
     * @notice Get a report by ID
     * @param reportId The report ID
     * @return Report struct
     */
    function getReport(uint256 reportId)
        external
        view
        onlyWithAccess
        returns (Report memory)
    {
        if (reportId == 0 || reportId > _reportIdCounter) revert InvalidReportId();
        return _reports[reportId];
    }

    /**
     * @notice Get pending reports (not resolved)
     * @param offset Starting index
     * @param limit Max results
     * @return Array of pending reports
     */
    function getPendingReports(uint256 offset, uint256 limit)
        external
        view
        onlyWithAccess
        returns (Report[] memory)
    {
        // Count pending reports first
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= _reportIdCounter; i++) {
            if (!_reports[i].resolved) pendingCount++;
        }

        if (offset >= pendingCount) return new Report[](0);

        uint256 end = offset + limit;
        if (end > pendingCount) end = pendingCount;

        Report[] memory result = new Report[](end - offset);
        uint256 resultIndex = 0;
        uint256 skipped = 0;

        for (uint256 i = 1; i <= _reportIdCounter && resultIndex < result.length; i++) {
            if (!_reports[i].resolved) {
                if (skipped >= offset) {
                    result[resultIndex] = _reports[i];
                    resultIndex++;
                } else {
                    skipped++;
                }
            }
        }

        return result;
    }

    /**
     * @notice Check if user has voted on a report
     * @param reportId The report ID
     * @param user The user address
     * @return hasVoted Whether user has voted
     * @return votedFor Whether user voted for removal
     */
    function getUserVoteOnReport(uint256 reportId, address user)
        external
        view
        returns (bool hasVoted, bool votedFor)
    {
        hasVoted = _reportVoters[reportId][user];
        votedFor = _reportVotes[reportId][user];
    }

    // ============ Admin Functions ============

    /**
     * @notice Update moderation settings
     * @param _voteThreshold New vote threshold
     * @param _approvalPercentage New approval percentage (0-100)
     */
    function updateModerationSettings(uint256 _voteThreshold, uint256 _approvalPercentage)
        external
        onlyOwner
    {
        require(_voteThreshold > 0, "Threshold must be > 0");
        require(_approvalPercentage <= 100, "Percentage must be <= 100");

        voteThreshold = _voteThreshold;
        approvalPercentage = _approvalPercentage;

        emit ModerationSettingsUpdated(_voteThreshold, _approvalPercentage);
    }

    /**
     * @notice Withdraw accumulated USDC
     * @param to Address to send funds
     * @param amount Amount to withdraw
     */
    function withdrawFunds(address to, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        if (to == address(0)) revert ZeroAddress();
        usdc.safeTransfer(to, amount);
        emit FundsWithdrawn(to, amount);
    }

    /**
     * @notice Emergency function to hide content (only owner)
     * @param confessionId The confession to hide
     */
    function emergencyHideConfession(uint256 confessionId) external onlyOwner {
        if (confessionId == 0 || confessionId > _confessionIdCounter)
            revert InvalidConfessionId();
        _confessions[confessionId].isHidden = true;
        emit ConfessionHiddenByModeration(confessionId);
    }

    // ============ View Functions ============

    /**
     * @notice Get contract USDC balance
     * @return Balance in USDC
     */
    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice Get total number of members (ever joined)
     * @return Total members
     */
    function getTotalMembers() external view returns (uint256) {
        return _totalMembers;
    }

    /**
     * @notice Get global statistics
     * @return GlobalStats struct
     */
    function getGlobalStats() external view returns (GlobalStats memory) {
        uint256 resolvedCount = 0;
        for (uint256 i = 1; i <= _reportIdCounter; i++) {
            if (_reports[i].resolved) resolvedCount++;
        }

        return GlobalStats({
            totalConfessions: _confessionIdCounter,
            totalComments: _commentIdCounter,
            totalReactions: _totalReactions,
            totalMembers: _totalMembers,
            activeMembers: 0, // Would need iteration to calculate
            totalReports: _reportIdCounter,
            resolvedReports: resolvedCount
        });
    }

    /**
     * @notice Get confession count by category
     * @param category The category
     * @return Count of confessions in category
     */
    function getConfessionCountByCategory(Category category) external view returns (uint256) {
        return _confessionsByCategory[category].length;
    }

    // ============ Internal Functions ============

    function _updateReactionCount(
        ReactionCounts storage counts,
        ReactionType reactionType,
        bool increment
    ) internal {
        if (reactionType == ReactionType.Like) {
            counts.likes = increment ? counts.likes + 1 : counts.likes - 1;
        } else if (reactionType == ReactionType.Love) {
            counts.loves = increment ? counts.loves + 1 : counts.loves - 1;
        } else if (reactionType == ReactionType.Thinking) {
            counts.thinking = increment ? counts.thinking + 1 : counts.thinking - 1;
        } else if (reactionType == ReactionType.Fire) {
            counts.fires = increment ? counts.fires + 1 : counts.fires - 1;
        } else if (reactionType == ReactionType.Sad) {
            counts.sads = increment ? counts.sads + 1 : counts.sads - 1;
        }
    }

    function _resolveReport(uint256 reportId) internal {
        Report storage report = _reports[reportId];

        // Calculate approval percentage
        uint256 totalVotes = report.votesFor + report.votesAgainst;
        uint256 approvalRate = (report.votesFor * 100) / totalVotes;

        bool shouldRemove = approvalRate >= approvalPercentage;

        if (shouldRemove) {
            if (report.targetType == ReportTargetType.Confession) {
                _confessions[report.targetId].isHidden = true;
                emit ConfessionHiddenByModeration(report.targetId);
            } else {
                _comments[report.targetId].isDeleted = true;
                emit CommentDeletedByModeration(report.targetId);
            }
        }

        report.resolved = true;
        emit ReportResolved(reportId, shouldRemove);
    }
}
