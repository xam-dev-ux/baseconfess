import { useState, useEffect } from 'react';
import { useReports } from '../hooks/useReports';
import { formatRelativeTime } from '../utils/helpers';
import { REPORT_REASON_CONFIG, ReportTargetType } from '../types';
import type { Report } from '../types';

interface ModerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModerationPanel({ isOpen, onClose }: ModerationPanelProps) {
  const { pendingReports, fetchPendingReports, voteOnReport, checkUserVote, getModerationSettings, isLoading } = useReports();
  const [settings, setSettings] = useState<{ threshold: number; percentage: number } | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, { hasVoted: boolean; votedFor: boolean }>>({});

  // Load reports and settings
  useEffect(() => {
    if (isOpen) {
      fetchPendingReports();
      getModerationSettings().then((s) => s && setSettings(s));
    }
  }, [isOpen, fetchPendingReports, getModerationSettings]);

  // Load user's votes for each report
  useEffect(() => {
    const loadVotes = async () => {
      const votes: Record<string, { hasVoted: boolean; votedFor: boolean }> = {};
      for (const report of pendingReports) {
        const vote = await checkUserVote(report.id);
        if (vote) {
          votes[report.id.toString()] = vote;
        }
      }
      setUserVotes(votes);
    };

    if (pendingReports.length > 0) {
      loadVotes();
    }
  }, [pendingReports, checkUserVote]);

  const handleVote = async (reportId: bigint, voteFor: boolean) => {
    const success = await voteOnReport(reportId, voteFor);
    if (success) {
      // Refresh reports
      fetchPendingReports();
      // Update local vote state
      setUserVotes((prev) => ({
        ...prev,
        [reportId.toString()]: { hasVoted: true, votedFor: voteFor },
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 overflow-y-auto">
      <div className="bg-dark-800 rounded-2xl border border-dark-700 max-w-2xl w-full my-8 animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between sticky top-0 bg-dark-800 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-semibold">Community Moderation</h2>
            <p className="text-sm text-dark-400">Help keep the community safe by voting on reports</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings Info */}
        {settings && (
          <div className="px-6 py-3 bg-dark-900/50 border-b border-dark-700 flex items-center gap-4 text-sm text-dark-400">
            <span>Votes needed: {settings.threshold}</span>
            <span>Approval threshold: {settings.percentage}%</span>
          </div>
        )}

        {/* Reports List */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-dark-400">Loading reports...</div>
          ) : pendingReports.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">All clear!</h3>
              <p className="text-dark-400">No pending reports to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReports.map((report) => (
                <ReportCard
                  key={report.id.toString()}
                  report={report}
                  settings={settings}
                  userVote={userVotes[report.id.toString()]}
                  onVote={handleVote}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReportCardProps {
  report: Report;
  settings: { threshold: number; percentage: number } | null;
  userVote?: { hasVoted: boolean; votedFor: boolean };
  onVote: (reportId: bigint, voteFor: boolean) => void;
}

function ReportCard({ report, settings, userVote, onVote }: ReportCardProps) {
  const totalVotes = Number(report.votesFor) + Number(report.votesAgainst);
  const approvalPercent = totalVotes > 0 ? (Number(report.votesFor) / totalVotes) * 100 : 0;
  const progressPercent = settings ? (Number(report.totalVoters) / settings.threshold) * 100 : 0;

  const reasonConfig = REPORT_REASON_CONFIG[report.reason];
  const targetTypeLabel = report.targetType === ReportTargetType.Confession ? 'Confession' : 'Comment';

  return (
    <div className="bg-dark-700/50 rounded-xl border border-dark-600 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
            {reasonConfig.label}
          </span>
          <span className="text-xs text-dark-500">{targetTypeLabel} #{report.targetId.toString()}</span>
        </div>
        <span className="text-xs text-dark-500">{formatRelativeTime(report.timestamp)}</span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-dark-400">
            {report.totalVoters.toString()}/{settings?.threshold || '?'} votes
          </span>
          <span className={`${approvalPercent >= (settings?.percentage || 70) ? 'text-red-400' : 'text-dark-400'}`}>
            {approvalPercent.toFixed(0)}% for removal
          </span>
        </div>
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1 text-dark-500">
          <span>Keep: {report.votesAgainst.toString()}</span>
          <span>Remove: {report.votesFor.toString()}</span>
        </div>
      </div>

      {/* Actions */}
      {userVote?.hasVoted ? (
        <div className="flex items-center justify-center gap-2 p-2 bg-dark-600/50 rounded-lg">
          <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-dark-300">
            You voted: {userVote.votedFor ? 'Remove' : 'Keep'}
          </span>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => onVote(report.id, false)}
            className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Keep Content
          </button>
          <button
            onClick={() => onVote(report.id, true)}
            className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove Content
          </button>
        </div>
      )}
    </div>
  );
}
