import { useState, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { hashContent, storeConfessionLocally, getConfessionContent } from '../utils/helpers';
import type { Confession, ConfessionWithContent, Category, ReactionCounts, Reaction } from '../types';
import toast from 'react-hot-toast';

export function useConfessions() {
  const { baseConfessContract, hasAccess, refreshStats } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [confessions, setConfessions] = useState<ConfessionWithContent[]>([]);
  const [totalConfessions, setTotalConfessions] = useState<bigint>(BigInt(0));

  // Fetch confessions by range
  const fetchConfessions = useCallback(async (startId: number, count: number) => {
    if (!baseConfessContract || !hasAccess) return [];

    setIsLoading(true);
    try {
      const rawConfessions: Confession[] = await baseConfessContract.getConfessionsByRange(startId, count);

      const confessionsWithContent: ConfessionWithContent[] = rawConfessions
        .filter((c) => c.id > 0n && !c.isHidden)
        .map((c) => ({
          ...c,
          content: getConfessionContent(c.contentHash) || '[Content not available locally]',
        }));

      setConfessions(confessionsWithContent);
      return confessionsWithContent;
    } catch (error) {
      console.error('Error fetching confessions:', error);
      toast.error('Failed to load confessions');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [baseConfessContract, hasAccess]);

  // Fetch total count
  const fetchTotalConfessions = useCallback(async () => {
    if (!baseConfessContract) return BigInt(0);

    try {
      const total = await baseConfessContract.getTotalConfessions();
      setTotalConfessions(total);
      return total;
    } catch (error) {
      console.error('Error fetching total:', error);
      return BigInt(0);
    }
  }, [baseConfessContract]);

  // Fetch confessions by category
  const fetchByCategory = useCallback(async (category: Category, offset: number, limit: number) => {
    if (!baseConfessContract || !hasAccess) return [];

    setIsLoading(true);
    try {
      const ids: bigint[] = await baseConfessContract.getConfessionsByCategory(category, offset, limit);

      const confessionsData = await Promise.all(
        ids.map(async (id) => {
          const confession: Confession = await baseConfessContract.getConfession(id);
          return {
            ...confession,
            content: getConfessionContent(confession.contentHash) || '[Content not available locally]',
          };
        })
      );

      return confessionsData.filter((c) => !c.isHidden);
    } catch (error) {
      console.error('Error fetching by category:', error);
      toast.error('Failed to load confessions');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [baseConfessContract, hasAccess]);

  // Post a new confession
  const postConfession = useCallback(async (content: string, category: Category) => {
    if (!baseConfessContract || !hasAccess) {
      toast.error('You need access to post confessions');
      return null;
    }

    setIsLoading(true);
    try {
      const contentHash = hashContent(content);

      const tx = await baseConfessContract.postConfession(contentHash, category);
      toast.loading('Posting confession...', { id: 'post-confession' });

      const receipt = await tx.wait();
      toast.dismiss('post-confession');

      // Find the ConfessionPosted event
      const event = receipt.logs.find((log: unknown) => {
        try {
          const logEntry = log as { topics: string[]; data: string };
          const parsed = baseConfessContract.interface.parseLog(logEntry);
          return parsed?.name === 'ConfessionPosted';
        } catch {
          return false;
        }
      });

      let confessionId = 0;
      if (event) {
        const logEntry = event as { topics: string[]; data: string };
        const parsed = baseConfessContract.interface.parseLog(logEntry);
        confessionId = Number(parsed?.args?.confessionId || 0);
      }

      // Store locally for anonymous retrieval
      storeConfessionLocally(confessionId, content, contentHash);

      toast.success('Confession posted anonymously!');
      refreshStats();

      return confessionId;
    } catch (error: unknown) {
      console.error('Error posting confession:', error);
      toast.dismiss('post-confession');

      const err = error as { reason?: string };
      if (err.reason?.includes('CooldownNotElapsed')) {
        toast.error('Please wait 5 minutes between confessions');
      } else if (err.reason?.includes('DailyLimitReached')) {
        toast.error('Daily limit reached (10 confessions per day)');
      } else {
        toast.error('Failed to post confession');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [baseConfessContract, hasAccess, refreshStats]);

  // Get reaction counts for a confession
  const getReactionCounts = useCallback(async (confessionId: bigint): Promise<ReactionCounts | null> => {
    if (!baseConfessContract || !hasAccess) return null;

    try {
      return await baseConfessContract.getConfessionReactionCounts(confessionId);
    } catch (error) {
      console.error('Error getting reaction counts:', error);
      return null;
    }
  }, [baseConfessContract, hasAccess]);

  // Get user's reaction on a confession
  const getMyReaction = useCallback(async (confessionId: bigint): Promise<Reaction | null> => {
    if (!baseConfessContract || !hasAccess) return null;

    try {
      return await baseConfessContract.getMyConfessionReaction(confessionId);
    } catch (error) {
      console.error('Error getting my reaction:', error);
      return null;
    }
  }, [baseConfessContract, hasAccess]);

  // React to a confession
  const reactToConfession = useCallback(async (confessionId: bigint, reactionType: number) => {
    if (!baseConfessContract || !hasAccess) {
      toast.error('You need access to react');
      return false;
    }

    try {
      const tx = await baseConfessContract.reactToConfession(confessionId, reactionType);
      await tx.wait();
      toast.success('Reaction added!');
      return true;
    } catch (error: unknown) {
      console.error('Error reacting:', error);
      const err = error as { reason?: string };
      if (err.reason?.includes('AlreadyReacted')) {
        toast.error('You already reacted to this confession');
      } else {
        toast.error('Failed to add reaction');
      }
      return false;
    }
  }, [baseConfessContract, hasAccess]);

  // Change reaction
  const changeReaction = useCallback(async (confessionId: bigint, newReactionType: number) => {
    if (!baseConfessContract || !hasAccess) return false;

    try {
      const tx = await baseConfessContract.changeConfessionReaction(confessionId, newReactionType);
      await tx.wait();
      toast.success('Reaction changed!');
      return true;
    } catch (error) {
      console.error('Error changing reaction:', error);
      toast.error('Failed to change reaction');
      return false;
    }
  }, [baseConfessContract, hasAccess]);

  // Remove reaction
  const removeReaction = useCallback(async (confessionId: bigint) => {
    if (!baseConfessContract || !hasAccess) return false;

    try {
      const tx = await baseConfessContract.removeConfessionReaction(confessionId);
      await tx.wait();
      toast.success('Reaction removed');
      return true;
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast.error('Failed to remove reaction');
      return false;
    }
  }, [baseConfessContract, hasAccess]);

  return {
    confessions,
    totalConfessions,
    isLoading,
    fetchConfessions,
    fetchTotalConfessions,
    fetchByCategory,
    postConfession,
    getReactionCounts,
    getMyReaction,
    reactToConfession,
    changeReaction,
    removeReaction,
  };
}
