import { useWallet } from '../context/WalletContext';
import { truncateAddress, formatRemainingTime } from '../utils/helpers';

interface HeaderProps {
  onOpenModeration: () => void;
}

export function Header({ onOpenModeration }: HeaderProps) {
  const { isConnected, isConnecting, address, hasAccess, remainingTime, connect, disconnect } = useWallet();

  return (
    <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-sm border-b border-dark-700">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="text-xl">🤫</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">BaseConfess</h1>
              <p className="text-xs text-dark-400">Anonymous confessions</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isConnected && hasAccess && (
              <>
                {/* Access Timer */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  <span className="text-sm text-primary-400">{formatRemainingTime(remainingTime)}</span>
                </div>

                {/* Moderation Button */}
                <button
                  onClick={onOpenModeration}
                  className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                  title="Community Moderation"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Connect/Disconnect Button */}
            {isConnected ? (
              <button
                onClick={disconnect}
                className="flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm font-medium transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="hidden sm:inline">{truncateAddress(address || '')}</span>
                <span className="sm:hidden">Connected</span>
              </button>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 rounded-lg text-sm font-medium transition-colors"
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    <span>Connect</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
