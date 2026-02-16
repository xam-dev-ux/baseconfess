import { useWallet } from '../context/WalletContext';
import { useAccess } from '../hooks/useAccess';
import { formatNumber } from '../utils/helpers';

export function Landing() {
  const { isConnected, isConnecting, connect, stats } = useWallet();
  const { isLoading, step, hasEnoughBalance, purchaseAccess, usdcBalance } = useAccess();

  const handleGetAccess = async () => {
    if (!isConnected) {
      await connect();
      return;
    }
    await purchaseAccess();
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-12">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-2xl shadow-primary-500/30">
          <span className="text-5xl">🤫</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-dark-300 bg-clip-text text-transparent">
          Your Secrets, Safely Shared
        </h1>

        <p className="text-lg text-dark-300 mb-8 max-w-lg mx-auto">
          Share anonymous confessions on Base. No judgments, no links to your wallet. Just you and your truth.
        </p>

        {/* Stats */}
        {stats && (
          <div className="flex items-center justify-center gap-8 mb-10">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{formatNumber(stats.totalConfessions)}</p>
              <p className="text-sm text-dark-400">Confessions</p>
            </div>
            <div className="w-px h-12 bg-dark-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{formatNumber(stats.totalMembers)}</p>
              <p className="text-sm text-dark-400">Members</p>
            </div>
            <div className="w-px h-12 bg-dark-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{formatNumber(stats.totalReactions)}</p>
              <p className="text-sm text-dark-400">Reactions</p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="space-y-4">
          <button
            onClick={handleGetAccess}
            disabled={isLoading || isConnecting}
            className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100"
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting Wallet...
              </span>
            ) : !isConnected ? (
              'Connect Wallet to Get Started'
            ) : isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {step === 'approving' ? 'Approving USDC...' : 'Processing...'}
              </span>
            ) : (
              'Get 30-Day Access - 0.00001 USDC'
            )}
          </button>

          {isConnected && !hasEnoughBalance && (
            <p className="text-sm text-red-400">
              Insufficient USDC balance ({(Number(usdcBalance) / 1e6).toFixed(6)} USDC)
            </p>
          )}
        </div>

        {/* Pricing Info */}
        <div className="mt-8 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
          <div className="flex items-center justify-center gap-4 text-sm text-dark-300">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Unlimited confessions
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              100% anonymous
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Community moderated
            </span>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
        <div className="p-6 bg-dark-800/50 rounded-xl border border-dark-700">
          <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="font-semibold mb-2">True Anonymity</h3>
          <p className="text-sm text-dark-400">
            Confessions are never linked to your wallet. Not even onchain.
          </p>
        </div>

        <div className="p-6 bg-dark-800/50 rounded-xl border border-dark-700">
          <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
            <span className="text-2xl">🛡️</span>
          </div>
          <h3 className="font-semibold mb-2">Community Safety</h3>
          <p className="text-sm text-dark-400">
            Members moderate together. Report and vote on inappropriate content.
          </p>
        </div>

        <div className="p-6 bg-dark-800/50 rounded-xl border border-dark-700">
          <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="font-semibold mb-2">React & Engage</h3>
          <p className="text-sm text-dark-400">
            Support others with reactions. Comment anonymously on confessions.
          </p>
        </div>
      </div>

      {/* Help Section */}
      {isConnected && !hasEnoughBalance && (
        <div className="mt-12 max-w-lg mx-auto p-6 bg-dark-800/50 rounded-xl border border-dark-700">
          <h3 className="font-semibold mb-4 text-center">Need USDC on Base?</h3>
          <div className="space-y-3 text-sm">
            <a
              href="https://app.uniswap.org/swap?chain=base&outputCurrency=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span>Swap ETH for USDC on Uniswap</span>
              <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://bridge.base.org/deposit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <span>Bridge USDC from Ethereum</span>
              <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
