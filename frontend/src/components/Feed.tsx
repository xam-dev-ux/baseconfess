import { useState, useEffect, useCallback } from 'react';
import { useConfessions } from '../hooks/useConfessions';
import { ConfessionCard } from './ConfessionCard';
import { CreateConfessionModal } from './CreateConfessionModal';
import { Category, CATEGORY_CONFIG } from '../types';
import type { ConfessionWithContent } from '../types';

const ITEMS_PER_PAGE = 10;

export function Feed() {
  const { fetchConfessions, fetchTotalConfessions, fetchByCategory, isLoading } = useConfessions();
  const [confessions, setConfessions] = useState<ConfessionWithContent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load confessions
  const loadConfessions = useCallback(async (reset: boolean = false) => {
    const currentPage = reset ? 1 : page;

    if (selectedCategory === 'all') {
      // Get total first
      const total = await fetchTotalConfessions();
      const startId = Math.max(1, Number(total) - (currentPage * ITEMS_PER_PAGE) + 1);
      const count = Math.min(ITEMS_PER_PAGE, startId);

      if (count <= 0) {
        setHasMore(false);
        return;
      }

      const newConfessions = await fetchConfessions(startId, count);
      // Reverse to show newest first
      const sorted = [...newConfessions].reverse();

      if (reset) {
        setConfessions(sorted);
      } else {
        setConfessions((prev) => [...prev, ...sorted]);
      }

      setHasMore(startId > 1);
    } else {
      const offset = reset ? 0 : (currentPage - 1) * ITEMS_PER_PAGE;
      const newConfessions = await fetchByCategory(selectedCategory, offset, ITEMS_PER_PAGE);

      if (reset) {
        setConfessions(newConfessions);
      } else {
        setConfessions((prev) => [...prev, ...newConfessions]);
      }

      setHasMore(newConfessions.length === ITEMS_PER_PAGE);
    }
  }, [fetchConfessions, fetchTotalConfessions, fetchByCategory, page, selectedCategory]);

  // Initial load
  useEffect(() => {
    loadConfessions(true);
    setPage(1);
  }, [selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more
  const loadMore = () => {
    setPage((p) => p + 1);
    loadConfessions(false);
  };

  // Refresh after posting
  const handlePostSuccess = () => {
    loadConfessions(true);
    setPage(1);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Category Tabs */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${selectedCategory === 'all'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-dark-800/50 text-dark-300 hover:text-white border border-dark-700'
              }`}
          >
            All
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(parseInt(cat) as Category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${selectedCategory === parseInt(cat)
                  ? `${config.color} border`
                  : 'bg-dark-800/50 text-dark-300 hover:text-white border border-dark-700'
                }`}
            >
              {config.emoji} {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Confessions List */}
      <div className="space-y-4">
        {isLoading && confessions.length === 0 ? (
          // Loading skeleton
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-dark-800/50 rounded-xl border border-dark-700 p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-20 h-6 bg-dark-700 rounded-full" />
                <div className="w-16 h-4 bg-dark-700 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-dark-700 rounded w-full" />
                <div className="h-4 bg-dark-700 rounded w-3/4" />
              </div>
            </div>
          ))
        ) : confessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700/50 flex items-center justify-center">
              <span className="text-3xl">🤫</span>
            </div>
            <h3 className="text-lg font-medium mb-2">No confessions yet</h3>
            <p className="text-dark-400 mb-4">Be the first to share your secret!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition-colors"
            >
              Create Confession
            </button>
          </div>
        ) : (
          confessions.map((confession) => (
            <ConfessionCard
              key={confession.id.toString()}
              confession={confession}
              onUpdate={() => loadConfessions(true)}
            />
          ))
        )}

        {/* Load More */}
        {hasMore && confessions.length > 0 && (
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="w-full py-3 bg-dark-800/50 hover:bg-dark-700/50 border border-dark-700 rounded-xl text-dark-300 hover:text-white transition-colors"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>

      {/* Floating Create Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40"
        title="New Confession"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Create Modal */}
      <CreateConfessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handlePostSuccess}
      />
    </div>
  );
}
