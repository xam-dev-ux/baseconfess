import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import sdk from '@farcaster/frame-sdk';
import { WalletProvider, useWallet } from './context/WalletContext';
import { Header } from './components/Header';
import { Landing } from './components/Landing';
import { Feed } from './components/Feed';
import { ModerationPanel } from './components/ModerationPanel';
import { cleanupOldContent } from './utils/helpers';

function AppContent() {
  const { isConnected, hasAccess } = useWallet();
  const [showModeration, setShowModeration] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize Farcaster SDK
  useEffect(() => {
    const initSdk = async () => {
      try {
        // Call ready() to hide splash screen and show app
        await sdk.actions.ready();
      } catch (error) {
        console.log('Not in Farcaster frame or SDK not available:', error);
      }
      setIsReady(true);
    };

    initSdk();
  }, []);

  // Cleanup old local content on mount
  useEffect(() => {
    cleanupOldContent();
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center animate-pulse">
          <span className="text-3xl">🤫</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <Header onOpenModeration={() => setShowModeration(true)} />

      {isConnected && hasAccess ? (
        <Feed />
      ) : (
        <Landing />
      )}

      <ModerationPanel isOpen={showModeration} onClose={() => setShowModeration(false)} />

      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#8b5cf6',
              secondary: '#f1f5f9',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f1f5f9',
            },
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;
