import { useState, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { ACCESS_PRICE, CONTRACT_ADDRESS } from '../utils/constants';
import toast from 'react-hot-toast';

export function useAccess() {
  const {
    baseConfessContract,
    usdcContract,
    usdcBalance,
    usdcAllowance,
    refreshAccess,
    refreshUsdcData,
    refreshStats,
  } = useWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'approving' | 'purchasing'>('idle');

  // Check if user has enough USDC
  const hasEnoughBalance = usdcBalance >= ACCESS_PRICE;

  // Check if approval is needed
  const needsApproval = usdcAllowance < ACCESS_PRICE;

  // Approve USDC spending
  const approveUsdc = useCallback(async () => {
    if (!usdcContract) {
      toast.error('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    setStep('approving');

    try {
      const tx = await usdcContract.approve(CONTRACT_ADDRESS, ACCESS_PRICE);
      toast.loading('Approving USDC...', { id: 'approve' });

      await tx.wait();
      toast.dismiss('approve');
      toast.success('USDC approved!');

      await refreshUsdcData();
      return true;
    } catch (error) {
      console.error('Approval error:', error);
      toast.dismiss('approve');
      toast.error('Failed to approve USDC');
      return false;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  }, [usdcContract, refreshUsdcData]);

  // Purchase access
  const purchaseAccess = useCallback(async () => {
    if (!baseConfessContract || !usdcContract) {
      toast.error('Wallet not connected');
      return false;
    }

    if (!hasEnoughBalance) {
      toast.error('Insufficient USDC balance');
      return false;
    }

    setIsLoading(true);

    try {
      // Check and approve if needed
      if (needsApproval) {
        setStep('approving');
        const approved = await approveUsdc();
        if (!approved) return false;
      }

      // Purchase access
      setStep('purchasing');
      const tx = await baseConfessContract.purchaseAccess();
      toast.loading('Purchasing access...', { id: 'purchase' });

      await tx.wait();
      toast.dismiss('purchase');
      toast.success('Welcome to BaseConfess! Your 30-day access is now active.');

      await Promise.all([refreshAccess(), refreshUsdcData(), refreshStats()]);

      return true;
    } catch (error: unknown) {
      console.error('Purchase error:', error);
      toast.dismiss('purchase');

      const err = error as { reason?: string };
      if (err.reason?.includes('InsufficientAllowance')) {
        toast.error('Please approve USDC first');
      } else {
        toast.error('Failed to purchase access');
      }
      return false;
    } finally {
      setIsLoading(false);
      setStep('idle');
    }
  }, [
    baseConfessContract,
    usdcContract,
    hasEnoughBalance,
    needsApproval,
    approveUsdc,
    refreshAccess,
    refreshUsdcData,
    refreshStats,
  ]);

  return {
    isLoading,
    step,
    hasEnoughBalance,
    needsApproval,
    usdcBalance,
    approveUsdc,
    purchaseAccess,
  };
}
