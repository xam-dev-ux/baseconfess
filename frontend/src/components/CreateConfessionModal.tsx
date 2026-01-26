import { useState } from 'react';
import { useConfessions } from '../hooks/useConfessions';
import { validateConfessionContent } from '../utils/helpers';
import { Category, CATEGORY_CONFIG } from '../types';
import toast from 'react-hot-toast';

interface CreateConfessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateConfessionModal({ isOpen, onClose, onSuccess }: CreateConfessionModalProps) {
  const { postConfession, isLoading } = useConfessions();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>(Category.Other);
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async () => {
    const validation = validateConfessionContent(content);
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }

    const result = await postConfession(content.trim(), category);
    if (result) {
      setContent('');
      setCategory(Category.Other);
      setShowPreview(false);
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div className="bg-dark-800 rounded-t-2xl sm:rounded-2xl border border-dark-700 max-w-lg w-full max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold">New Anonymous Confession</h3>
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {!showPreview ? (
            <>
              {/* Textarea */}
              <div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your confession anonymously..."
                  maxLength={500}
                  rows={6}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none"
                  autoFocus
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${content.length > 450 ? 'text-orange-400' : 'text-dark-500'}`}>
                    {content.length}/500
                  </span>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm text-dark-400 mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
                    const catNum = parseInt(cat) as Category;
                    const isSelected = category === catNum;

                    return (
                      <button
                        key={cat}
                        onClick={() => setCategory(catNum)}
                        className={`p-2 rounded-lg text-sm border transition-all
                          ${isSelected
                            ? `${config.color} border-current`
                            : 'bg-dark-700/50 border-dark-600 hover:bg-dark-700'
                          }`}
                      >
                        <span className="mr-1">{config.emoji}</span>
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Preview */
            <div className="space-y-3">
              <div className="text-sm text-dark-400">Preview</div>
              <div className="p-4 bg-dark-700/50 rounded-xl border border-dark-600">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs rounded-full border ${CATEGORY_CONFIG[category].color}`}>
                    {CATEGORY_CONFIG[category].emoji} {CATEGORY_CONFIG[category].label}
                  </span>
                  <span className="text-xs text-dark-500">just now</span>
                </div>
                <p className="text-dark-100 whitespace-pre-wrap break-words">{content}</p>
              </div>
            </div>
          )}

          {/* Anonymous Warning */}
          <div className="flex items-center gap-2 p-3 bg-primary-500/10 rounded-lg border border-primary-500/30">
            <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-primary-300">
              Your confession will be 100% anonymous. No one can link it to your wallet.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-dark-700 flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700 rounded-lg text-sm transition-colors"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !content.trim()}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Posting...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Post Anonymously</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
