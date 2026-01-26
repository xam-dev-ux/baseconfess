import { useState, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { hashContent, storeCommentLocally, getCommentContent } from '../utils/helpers';
import type { Comment, CommentWithContent } from '../types';
import toast from 'react-hot-toast';

export function useComments() {
  const { baseConfessContract, hasAccess } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch comments for a confession
  const fetchComments = useCallback(async (confessionId: bigint): Promise<CommentWithContent[]> => {
    if (!baseConfessContract || !hasAccess) return [];

    setIsLoading(true);
    try {
      const rawComments: Comment[] = await baseConfessContract.getCommentsForConfession(confessionId);

      const commentsWithContent: CommentWithContent[] = rawComments
        .filter((c) => !c.isDeleted)
        .map((c) => ({
          ...c,
          content: getCommentContent(c.contentHash) || '[Content not available locally]',
        }));

      return commentsWithContent;
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [baseConfessContract, hasAccess]);

  // Post a comment
  const postComment = useCallback(async (confessionId: bigint, content: string) => {
    if (!baseConfessContract || !hasAccess) {
      toast.error('You need access to comment');
      return null;
    }

    setIsLoading(true);
    try {
      const contentHash = hashContent(content);

      const tx = await baseConfessContract.postComment(confessionId, contentHash);
      toast.loading('Posting comment...', { id: 'post-comment' });

      const receipt = await tx.wait();
      toast.dismiss('post-comment');

      // Find the CommentPosted event
      const event = receipt.logs.find((log: unknown) => {
        try {
          const logEntry = log as { topics: string[]; data: string };
          const parsed = baseConfessContract.interface.parseLog(logEntry);
          return parsed?.name === 'CommentPosted';
        } catch {
          return false;
        }
      });

      let commentId = 0;
      if (event) {
        const logEntry = event as { topics: string[]; data: string };
        const parsed = baseConfessContract.interface.parseLog(logEntry);
        commentId = Number(parsed?.args?.commentId || 0);
      }

      // Store locally
      storeCommentLocally(commentId, Number(confessionId), content, contentHash);

      toast.success('Comment posted anonymously!');
      return commentId;
    } catch (error: unknown) {
      console.error('Error posting comment:', error);
      toast.dismiss('post-comment');

      const err = error as { reason?: string };
      if (err.reason?.includes('CooldownNotElapsed')) {
        toast.error('Please wait 1 minute between comments');
      } else if (err.reason?.includes('DailyLimitReached')) {
        toast.error('Daily limit reached (30 comments per day)');
      } else {
        toast.error('Failed to post comment');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [baseConfessContract, hasAccess]);

  // React to a comment
  const reactToComment = useCallback(async (commentId: bigint, reactionType: number) => {
    if (!baseConfessContract || !hasAccess) {
      toast.error('You need access to react');
      return false;
    }

    try {
      const tx = await baseConfessContract.reactToComment(commentId, reactionType);
      await tx.wait();
      toast.success('Reaction added!');
      return true;
    } catch (error: unknown) {
      console.error('Error reacting to comment:', error);
      const err = error as { reason?: string };
      if (err.reason?.includes('AlreadyReacted')) {
        toast.error('You already reacted to this comment');
      } else {
        toast.error('Failed to add reaction');
      }
      return false;
    }
  }, [baseConfessContract, hasAccess]);

  // Get comment reaction counts
  const getCommentReactionCounts = useCallback(async (commentId: bigint) => {
    if (!baseConfessContract || !hasAccess) return null;

    try {
      return await baseConfessContract.getCommentReactionCounts(commentId);
    } catch (error) {
      console.error('Error getting comment reactions:', error);
      return null;
    }
  }, [baseConfessContract, hasAccess]);

  return {
    isLoading,
    fetchComments,
    postComment,
    reactToComment,
    getCommentReactionCounts,
  };
}
