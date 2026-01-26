// Enums matching Solidity contract
export enum Category {
  Love = 0,
  Work = 1,
  Secrets = 2,
  Controversial = 3,
  Life = 4,
  Other = 5,
}

export enum ReactionType {
  Like = 0,
  Love = 1,
  Thinking = 2,
  Fire = 3,
  Sad = 4,
}

export enum ReportReason {
  Illegal = 0,
  Spam = 1,
  Harassment = 2,
  Other = 3,
}

export enum ReportTargetType {
  Confession = 0,
  Comment = 1,
}

// Category metadata
export const CATEGORY_CONFIG: Record<Category, { label: string; emoji: string; color: string }> = {
  [Category.Love]: { label: 'Love', emoji: '💕', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  [Category.Work]: { label: 'Work', emoji: '💼', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  [Category.Secrets]: { label: 'Secrets', emoji: '🤫', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  [Category.Controversial]: { label: 'Controversial', emoji: '🔥', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  [Category.Life]: { label: 'Life', emoji: '🌟', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  [Category.Other]: { label: 'Other', emoji: '💭', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

// Reaction metadata
export const REACTION_CONFIG: Record<ReactionType, { emoji: string; label: string }> = {
  [ReactionType.Like]: { emoji: '👍', label: 'Like' },
  [ReactionType.Love]: { emoji: '💜', label: 'Love' },
  [ReactionType.Thinking]: { emoji: '🤔', label: 'Thinking' },
  [ReactionType.Fire]: { emoji: '🔥', label: 'Fire' },
  [ReactionType.Sad]: { emoji: '😢', label: 'Sad' },
};

// Report reason metadata
export const REPORT_REASON_CONFIG: Record<ReportReason, { label: string; description: string }> = {
  [ReportReason.Illegal]: { label: 'Illegal Content', description: 'Content that violates laws' },
  [ReportReason.Spam]: { label: 'Spam', description: 'Promotional or repetitive content' },
  [ReportReason.Harassment]: { label: 'Harassment', description: 'Targeted abuse or bullying' },
  [ReportReason.Other]: { label: 'Other', description: 'Other rule violations' },
};

// Interfaces
export interface Access {
  expirationTimestamp: bigint;
  totalPayments: bigint;
  joinedAt: bigint;
  lastRenewalAt: bigint;
}

export interface Confession {
  id: bigint;
  contentHash: string;
  category: Category;
  timestamp: bigint;
  isHidden: boolean;
  totalReactions: bigint;
  totalComments: bigint;
  reportCount: bigint;
}

export interface ConfessionWithContent extends Confession {
  content: string;
}

export interface Comment {
  id: bigint;
  confessionId: bigint;
  contentHash: string;
  timestamp: bigint;
  isDeleted: boolean;
  totalReactions: bigint;
}

export interface CommentWithContent extends Comment {
  content: string;
}

export interface Reaction {
  reactionType: ReactionType;
  timestamp: bigint;
  exists: boolean;
}

export interface ReactionCounts {
  likes: bigint;
  loves: bigint;
  thinking: bigint;
  fires: bigint;
  sads: bigint;
}

export interface Report {
  id: bigint;
  targetType: ReportTargetType;
  targetId: bigint;
  reason: ReportReason;
  votesFor: bigint;
  votesAgainst: bigint;
  resolved: boolean;
  timestamp: bigint;
  totalVoters: bigint;
}

export interface GlobalStats {
  totalConfessions: bigint;
  totalComments: bigint;
  totalReactions: bigint;
  totalMembers: bigint;
  activeMembers: bigint;
  totalReports: bigint;
  resolvedReports: bigint;
}

// Local storage types for anonymous content
export interface StoredConfession {
  id: number;
  content: string;
  contentHash: string;
  timestamp: number;
}

export interface StoredComment {
  id: number;
  confessionId: number;
  content: string;
  contentHash: string;
  timestamp: number;
}
