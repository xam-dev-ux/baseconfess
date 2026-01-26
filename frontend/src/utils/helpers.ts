import { keccak256, toUtf8Bytes } from 'ethers';
import type { StoredConfession, StoredComment } from '../types';

// Hash content for anonymous storage
export function hashContent(content: string): string {
  return keccak256(toUtf8Bytes(content));
}

// Format timestamp to relative time
export function formatRelativeTime(timestamp: bigint | number): string {
  const now = Date.now() / 1000;
  const time = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  const diff = now - time;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;

  return new Date(time * 1000).toLocaleDateString();
}

// Format remaining time
export function formatRemainingTime(seconds: bigint | number): string {
  const secs = typeof seconds === 'bigint' ? Number(seconds) : seconds;

  if (secs <= 0) return 'Expired';

  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return 'Less than 1h';
}

// Format number with K/M suffix
export function formatNumber(num: bigint | number): string {
  const n = typeof num === 'bigint' ? Number(num) : num;

  if (n >= 1000000) {
    return (n / 1000000).toFixed(1) + 'M';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'K';
  }
  return n.toString();
}

// Truncate address
export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Local storage keys
const CONFESSIONS_KEY = 'baseconfess_confessions';
const COMMENTS_KEY = 'baseconfess_comments';

// Store confession content locally
export function storeConfessionLocally(
  id: number,
  content: string,
  contentHash: string
): void {
  const stored = getLocalConfessions();
  stored.push({
    id,
    content,
    contentHash,
    timestamp: Date.now(),
  });
  localStorage.setItem(CONFESSIONS_KEY, JSON.stringify(stored));
}

// Get local confessions
export function getLocalConfessions(): StoredConfession[] {
  try {
    const data = localStorage.getItem(CONFESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Get confession content by hash
export function getConfessionContent(contentHash: string): string | null {
  const stored = getLocalConfessions();
  const found = stored.find((c) => c.contentHash === contentHash);
  return found?.content || null;
}

// Store comment content locally
export function storeCommentLocally(
  id: number,
  confessionId: number,
  content: string,
  contentHash: string
): void {
  const stored = getLocalComments();
  stored.push({
    id,
    confessionId,
    content,
    contentHash,
    timestamp: Date.now(),
  });
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(stored));
}

// Get local comments
export function getLocalComments(): StoredComment[] {
  try {
    const data = localStorage.getItem(COMMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Get comment content by hash
export function getCommentContent(contentHash: string): string | null {
  const stored = getLocalComments();
  const found = stored.find((c) => c.contentHash === contentHash);
  return found?.content || null;
}

// Clear old stored content (older than 90 days)
export function cleanupOldContent(): void {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;

  const confessions = getLocalConfessions().filter((c) => c.timestamp > cutoff);
  localStorage.setItem(CONFESSIONS_KEY, JSON.stringify(confessions));

  const comments = getLocalComments().filter((c) => c.timestamp > cutoff);
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
}

// Validate content length
export function validateConfessionContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content.trim()) {
    return { valid: false, error: 'Confession cannot be empty' };
  }
  if (content.length > 500) {
    return { valid: false, error: 'Confession must be 500 characters or less' };
  }
  return { valid: true };
}

export function validateCommentContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content.trim()) {
    return { valid: false, error: 'Comment cannot be empty' };
  }
  if (content.length > 200) {
    return { valid: false, error: 'Comment must be 200 characters or less' };
  }
  return { valid: true };
}

// Check if running in Farcaster frame
export function isInFarcasterFrame(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}
