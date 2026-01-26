import { useState, useEffect } from 'react';
import { useConfessions } from '../hooks/useConfessions';
import { useComments } from '../hooks/useComments';
import { formatRelativeTime, formatNumber, validateCommentContent } from '../utils/helpers';
import { CATEGORY_CONFIG, REACTION_CONFIG, ReactionType, Category, REPORT_REASON_CONFIG, ReportReason } from '../types';
import type { ConfessionWithContent, ReactionCounts, CommentWithContent } from '../types';
import { useReports } from '../hooks/useReports';
import toast from 'react-hot-toast';

interface ConfessionCardProps {
  confession: ConfessionWithContent;
  onUpdate?: () => void;
}

export function ConfessionCard({ confession, onUpdate }: ConfessionCardProps) {
  const { getReactionCounts, getMyReaction, reactToConfession, changeReaction, removeReaction } = useConfessions();
  const { fetchComments, postComment } = useComments();
  const { reportConfession } = useReports();

  const [reactionCounts, setReactionCounts] = useState<ReactionCounts | null>(null);
  const [myReaction, setMyReaction] = useState<{ type: ReactionType | null; exists: boolean }>({ type: null, exists: false });
  const [comments, setComments] = useState<CommentWithContent[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[confession.category as Category];

  // Load reaction counts and user's reaction
  useEffect(() => {
    const loadData = async () => {
      const [counts, reaction] = await Promise.all([
        getReactionCounts(confession.id),
        getMyReaction(confession.id),
      ]);

      if (counts) setReactionCounts(counts);
      if (reaction) {
        setMyReaction({
          type: reaction.exists ? reaction.reactionType : null,
          exists: reaction.exists,
        });
      }
    };

    loadData();
  }, [confession.id, getReactionCounts, getMyReaction]);

  // Load comments when expanded
  useEffect(() => {
    if (showComments && comments.length === 0) {
      setIsLoadingComments(true);
      fetchComments(confession.id).then((c) => {
        setComments(c);
        setIsLoadingComments(false);
      });
    }
  }, [showComments, confession.id, fetchComments, comments.length]);

  const handleReaction = async (type: ReactionType) => {
    if (!myReaction.exists) {
      // Add new reaction
      const success = await reactToConfession(confession.id, type);
      if (success) {
        setMyReaction({ type, exists: true });
        // Optimistic update
        setReactionCounts((prev) => {
          if (!prev) return prev;
          return updateReactionCount(prev, type, 1);
        });
      }
    } else if (myReaction.type === type) {
      // Remove reaction
      const success = await removeReaction(confession.id);
      if (success) {
        setReactionCounts((prev) => {
          if (!prev) return prev;
          return updateReactionCount(prev, type, -1);
        });
        setMyReaction({ type: null, exists: false });
      }
    } else {
      // Change reaction
      const oldType = myReaction.type!;
      const success = await changeReaction(confession.id, type);
      if (success) {
        setReactionCounts((prev) => {
          if (!prev) return prev;
          let updated = updateReactionCount(prev, oldType, -1);
          updated = updateReactionCount(updated, type, 1);
          return updated;
        });
        setMyReaction({ type, exists: true });
      }
    }
  };

  const handlePostComment = async () => {
    const validation = validateCommentContent(newComment);
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }

    setIsPosting(true);
    const result = await postComment(confession.id, newComment.trim());
    setIsPosting(false);

    if (result) {
      setNewComment('');
      // Refresh comments
      const newComments = await fetchComments(confession.id);
      setComments(newComments);
      onUpdate?.();
    }
  };

  const handleReport = async (reason: ReportReason) => {
    await reportConfession(confession.id, reason);
    setShowReportModal(false);
  };

  const getReactionCount = (type: ReactionType): bigint => {
    if (!reactionCounts) return BigInt(0);
    switch (type) {
      case ReactionType.Like: return reactionCounts.likes;
      case ReactionType.Love: return reactionCounts.loves;
      case ReactionType.Thinking: return reactionCounts.thinking;
      case ReactionType.Fire: return reactionCounts.fires;
      case ReactionType.Sad: return reactionCounts.sads;
    }
  };

  return (
    <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full border ${categoryConfig.color}`}>
            {categoryConfig.emoji} {categoryConfig.label}
          </span>
          <span className="text-xs text-dark-500">{formatRelativeTime(confession.timestamp)}</span>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
          title="Report"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-dark-100 whitespace-pre-wrap break-words">{confession.content}</p>
      </div>

      {/* Reactions */}
      <div className="px-4 py-3 border-t border-dark-700/50 flex items-center gap-2 flex-wrap">
        {Object.entries(REACTION_CONFIG).map(([type, config]) => {
          const reactionType = parseInt(type) as ReactionType;
          const count = getReactionCount(reactionType);
          const isSelected = myReaction.type === reactionType;

          return (
            <button
              key={type}
              onClick={() => handleReaction(reactionType)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all
                ${isSelected
                  ? 'bg-primary-500/20 border border-primary-500/50 text-primary-400'
                  : 'bg-dark-700/50 hover:bg-dark-700 text-dark-300 hover:text-white border border-transparent'
                }`}
            >
              <span>{config.emoji}</span>
              <span>{formatNumber(count)}</span>
            </button>
          );
        })}

        {/* Comments button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ml-auto
            ${showComments
              ? 'bg-primary-500/20 border border-primary-500/50 text-primary-400'
              : 'bg-dark-700/50 hover:bg-dark-700 text-dark-300 hover:text-white border border-transparent'
            }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{formatNumber(confession.totalComments)}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 py-3 border-t border-dark-700/50 space-y-4 bg-dark-900/30">
          {/* Comment input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add an anonymous comment..."
              maxLength={200}
              className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm focus:outline-none focus:border-primary-500 placeholder-dark-500"
              onKeyDown={(e) => e.key === 'Enter' && !isPosting && handlePostComment()}
            />
            <button
              onClick={handlePostComment}
              disabled={isPosting || !newComment.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              {isPosting ? '...' : 'Post'}
            </button>
          </div>
          <div className="text-xs text-dark-500 text-right">{newComment.length}/200</div>

          {/* Comments list */}
          {isLoadingComments ? (
            <div className="text-center py-4 text-dark-400 text-sm">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-dark-400 text-sm">No comments yet. Be the first!</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <CommentItem key={comment.id.toString()} comment={comment} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-dark-800 rounded-xl border border-dark-700 max-w-md w-full p-6 animate-slide-up">
            <h3 className="text-lg font-semibold mb-4">Report Confession</h3>
            <p className="text-sm text-dark-400 mb-4">Why are you reporting this content?</p>

            <div className="space-y-2">
              {Object.entries(REPORT_REASON_CONFIG).map(([reason, config]) => (
                <button
                  key={reason}
                  onClick={() => handleReport(parseInt(reason) as ReportReason)}
                  className="w-full p-3 text-left bg-dark-700/50 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <span className="font-medium">{config.label}</span>
                  <p className="text-xs text-dark-400">{config.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowReportModal(false)}
              className="w-full mt-4 p-3 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Comment Item Component
function CommentItem({ comment }: { comment: CommentWithContent }) {
  return (
    <div className="p-3 bg-dark-800/50 rounded-lg">
      <p className="text-sm text-dark-200">{comment.content}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-dark-500">{formatRelativeTime(comment.timestamp)}</span>
        <span className="text-xs text-dark-500">{formatNumber(comment.totalReactions)} reactions</span>
      </div>
    </div>
  );
}

// Helper function to update reaction counts
function updateReactionCount(counts: ReactionCounts, type: ReactionType, delta: number): ReactionCounts {
  const updated = { ...counts };
  switch (type) {
    case ReactionType.Like:
      updated.likes = BigInt(Number(counts.likes) + delta);
      break;
    case ReactionType.Love:
      updated.loves = BigInt(Number(counts.loves) + delta);
      break;
    case ReactionType.Thinking:
      updated.thinking = BigInt(Number(counts.thinking) + delta);
      break;
    case ReactionType.Fire:
      updated.fires = BigInt(Number(counts.fires) + delta);
      break;
    case ReactionType.Sad:
      updated.sads = BigInt(Number(counts.sads) + delta);
      break;
  }
  return updated;
}
