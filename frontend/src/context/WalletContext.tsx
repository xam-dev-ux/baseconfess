import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BrowserProvider, Contract, JsonRpcSigner } from 'ethers';
import { CONTRACT_ADDRESS, USDC_ADDRESS, BASE_CONFESS_ABI, USDC_ABI, BASE_CHAIN_ID, BASE_CHAIN_CONFIG } from '../utils/constants';
import { BuilderCodeSigner } from '../utils/builderCode';
import type { Access, GlobalStats } from '../types';

interface WalletContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  chainId: number | null;

  // Contracts
  baseConfessContract: Contract | null;
  usdcContract: Contract | null;

  // Access state
  hasAccess: boolean;
  accessDetails: Access | null;
  remainingTime: bigint;
  usdcBalance: bigint;
  usdcAllowance: bigint;

  // Global stats
  stats: GlobalStats | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshAccess: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshUsdcData: () => Promise<void>;
  switchToBase: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Type for ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
}

// Get ethereum provider safely
function getEthereum(): EthereumProvider | undefined {
  if (typeof window !== 'undefined') {
    return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  }
  return undefined;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  // Contracts
  const [baseConfessContract, setBaseConfessContract] = useState<Contract | null>(null);
  const [usdcContract, setUsdcContract] = useState<Contract | null>(null);

  // Access state
  const [hasAccess, setHasAccess] = useState(false);
  const [accessDetails, setAccessDetails] = useState<Access | null>(null);
  const [remainingTime, setRemainingTime] = useState<bigint>(BigInt(0));
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0));
  const [usdcAllowance, setUsdcAllowance] = useState<bigint>(BigInt(0));

  // Stats
  const [stats, setStats] = useState<GlobalStats | null>(null);

  // Initialize contracts when signer changes
  useEffect(() => {
    if (signer && CONTRACT_ADDRESS) {
      const confessContract = new Contract(CONTRACT_ADDRESS, BASE_CONFESS_ABI, signer);
      const usdc = new Contract(USDC_ADDRESS, USDC_ABI, signer);
      setBaseConfessContract(confessContract);
      setUsdcContract(usdc);
    } else {
      setBaseConfessContract(null);
      setUsdcContract(null);
    }
  }, [signer]);

  // Switch to Base network
  const switchToBase = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_CONFIG.chainId }],
      });
    } catch (error: unknown) {
      // Chain not added, add it
      if ((error as { code?: number })?.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [BASE_CHAIN_CONFIG],
        });
      } else {
        throw error;
      }
    }
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      throw new Error('No wallet found. Please install MetaMask.');
    }

    setIsConnecting(true);

    try {
      const browserProvider = new BrowserProvider(ethereum as unknown as { request: (...args: unknown[]) => Promise<unknown> });
      await browserProvider.send('eth_requestAccounts', []);

      const network = await browserProvider.getNetwork();
      const currentChainId = Number(network.chainId);

      // Switch to Base if not on it
      if (currentChainId !== BASE_CHAIN_ID) {
        await switchToBase();
        // Re-create provider after switch
        const newProvider = new BrowserProvider(ethereum as unknown as { request: (...args: unknown[]) => Promise<unknown> });
        const baseSigner = await newProvider.getSigner();
        // Wrap with BuilderCodeSigner to add attribution to all transactions
        const newSigner = new BuilderCodeSigner(newProvider, await baseSigner.getAddress());
        const newAddress = await newSigner.getAddress();

        setProvider(newProvider);
        setSigner(newSigner);
        setAddress(newAddress);
        setChainId(BASE_CHAIN_ID);
      } else {
        const baseSigner = await browserProvider.getSigner();
        // Wrap with BuilderCodeSigner to add attribution to all transactions
        const walletSigner = new BuilderCodeSigner(browserProvider, await baseSigner.getAddress());
        const walletAddress = await walletSigner.getAddress();

        setProvider(browserProvider);
        setSigner(walletSigner);
        setAddress(walletAddress);
        setChainId(currentChainId);
      }

      setIsConnected(true);
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [switchToBase]);

  // Disconnect
  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setHasAccess(false);
    setAccessDetails(null);
    setRemainingTime(BigInt(0));
    setUsdcBalance(BigInt(0));
    setUsdcAllowance(BigInt(0));
  }, []);

  // Refresh access status
  const refreshAccess = useCallback(async () => {
    if (!baseConfessContract || !address) return;

    try {
      const [hasActiveAccess, details, remaining] = await Promise.all([
        baseConfessContract.hasActiveAccess(address),
        baseConfessContract.getAccessDetails(address),
        baseConfessContract.getRemainingAccessTime(address),
      ]);

      setHasAccess(hasActiveAccess);
      setAccessDetails(details);
      setRemainingTime(remaining);
    } catch (error) {
      console.error('Error refreshing access:', error);
    }
  }, [baseConfessContract, address]);

  // Refresh global stats
  const refreshStats = useCallback(async () => {
    if (!baseConfessContract) return;

    try {
      const globalStats = await baseConfessContract.getGlobalStats();
      setStats(globalStats);
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  }, [baseConfessContract]);

  // Refresh USDC data
  const refreshUsdcData = useCallback(async () => {
    if (!usdcContract || !address) return;

    try {
      const [balance, allowance] = await Promise.all([
        usdcContract.balanceOf(address),
        usdcContract.allowance(address, CONTRACT_ADDRESS),
      ]);

      setUsdcBalance(balance);
      setUsdcAllowance(allowance);
    } catch (error) {
      console.error('Error refreshing USDC data:', error);
    }
  }, [usdcContract, address]);

  // Auto-refresh on connection
  useEffect(() => {
    if (isConnected && baseConfessContract) {
      refreshAccess();
      refreshStats();
      refreshUsdcData();
    }
  }, [isConnected, baseConfessContract, refreshAccess, refreshStats, refreshUsdcData]);

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== address) {
        setAddress(accounts[0]);
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const newChainId = args[0] as string;
      setChainId(parseInt(newChainId, 16));
      window.location.reload();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [address, disconnect]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      const ethereum = getEthereum();
      if (ethereum) {
        try {
          const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[];
          if (accounts.length > 0) {
            await connect();
          }
        } catch (error) {
          console.error('Auto-connect error:', error);
        }
      }
    };

    autoConnect();
  }, [connect]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        isConnecting,
        address,
        provider,
        signer,
        chainId,
        baseConfessContract,
        usdcContract,
        hasAccess,
        accessDetails,
        remainingTime,
        usdcBalance,
        usdcAllowance,
        stats,
        connect,
        disconnect,
        refreshAccess,
        refreshStats,
        refreshUsdcData,
        switchToBase,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
