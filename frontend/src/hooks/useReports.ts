import { useState, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import type { Report, ReportReason } from '../types';
import toast from 'react-hot-toast';

export function useReports() {
  const { baseConfessContract, hasAccess, address } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingReports, setPendingReports] = useState<Report[]>([]);

  // Fetch pending reports
  const fetchPendingReports = useCallback(async (offset: number = 0, limit: number = 20) => {
    if (!baseConfessContract || !hasAccess) return [];

    setIsLoading(true);
    try {
      const reports: Report[] = await baseConfessContract.getPendingReports(offset, limit);
      setPendingReports(reports.filter((r) => r.id > 0n));
      return reports;
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [baseConfessContract, hasAccess]);

  // Report a confession
  const reportConfession = useCallback(async (confessionId: bigint, reason: ReportReason) => {
    if (!baseConfessContract || !hasAccess) {
      toast.error('You need access to report');
      return false;
    }

    setIsLoading(true);
    try {
      const tx = await baseConfessContract.reportConfession(confessionId, reason);
      toast.loading('Submitting report...', { id: 'report' });

      await tx.wait();
      toast.dismiss('report');
      toast.success('Report submitted anonymously');
      return true;
    } catch (error: unknown) {
      console.error('Error reporting confession:', error);
      toast.dismiss('report');

      const err = error as { reason?: string };
      if (err.reason?.includes('CooldownNotElapsed')) {
        toast.error('Please wait 1 hour between reports');
      } else {
        toast.error('Failed to submit report');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [baseConfessContract, hasAccess]);

  // Report a comment
  const reportComment = useCallback(async (commentId: bigint, reason: ReportReason) => {
    if (!baseConfessContract || !hasAccess) {
      toast.error('You need access to report');
      return false;
    }

    setIsLoading(true);
    try {
      const tx = await baseConfessContract.reportComment(commentId, reason);
      toast.loading('Submitting report...', { id: 'report' });

      await tx.wait();
      toast.dismiss('report');
      toast.success('Report submitted anonymously');
      return true;
    } catch (error: unknown) {
      console.error('Error reporting comment:', error);
      toast.dismiss('report');

      const err = error as { reason?: string };
      if (err.reason?.includes('CooldownNotElapsed')) {
        toast.error('Please wait 1 hour between reports');
      } else {
        toast.error('Failed to submit report');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [baseConfessContract, hasAccess]);

  // Vote on a report
  const voteOnReport = useCallback(async (reportId: bigint, voteFor: boolean) => {
    if (!baseConfessContract || !hasAccess) {
      toast.error('You need access to vote');
      return false;
    }

    setIsLoading(true);
    try {
      const tx = await baseConfessContract.voteOnReport(reportId, voteFor);
      toast.loading('Submitting vote...', { id: 'vote' });

      await tx.wait();
      toast.dismiss('vote');
      toast.success(`Vote submitted: ${voteFor ? 'Remove content' : 'Keep content'}`);
      return true;
    } catch (error: unknown) {
      console.error('Error voting:', error);
      toast.dismiss('vote');

      const err = error as { reason?: string };
      if (err.reason?.includes('AlreadyVoted')) {
        toast.error('You have already voted on this report');
      } else if (err.reason?.includes('ReportAlreadyResolved')) {
        toast.error('This report has already been resolved');
      } else {
        toast.error('Failed to submit vote');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [baseConfessContract, hasAccess]);

  // Check if user has voted on a report
  const checkUserVote = useCallback(async (reportId: bigint) => {
    if (!baseConfessContract || !address) return null;

    try {
      const [hasVoted, votedFor] = await baseConfessContract.getUserVoteOnReport(reportId, address);
      return { hasVoted, votedFor };
    } catch (error) {
      console.error('Error checking vote:', error);
      return null;
    }
  }, [baseConfessContract, address]);

  // Get report details
  const getReport = useCallback(async (reportId: bigint) => {
    if (!baseConfessContract || !hasAccess) return null;

    try {
      return await baseConfessContract.getReport(reportId);
    } catch (error) {
      console.error('Error getting report:', error);
      return null;
    }
  }, [baseConfessContract, hasAccess]);

  // Get moderation settings
  const getModerationSettings = useCallback(async () => {
    if (!baseConfessContract) return null;

    try {
      const [threshold, percentage] = await Promise.all([
        baseConfessContract.voteThreshold(),
        baseConfessContract.approvalPercentage(),
      ]);
      return { threshold: Number(threshold), percentage: Number(percentage) };
    } catch (error) {
      console.error('Error getting moderation settings:', error);
      return null;
    }
  }, [baseConfessContract]);

  return {
    isLoading,
    pendingReports,
    fetchPendingReports,
    reportConfession,
    reportComment,
    voteOnReport,
    checkUserVote,
    getReport,
    getModerationSettings,
  };
}
