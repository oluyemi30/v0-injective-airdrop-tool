import { useState, useCallback, useEffect } from 'react';

const CHAIN_ID = 'injective-888';

interface KeplrWindow extends Window {
  keplr?: any;
}

interface UseKeplrReturn {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnect: () => void;
  isKeplrInstalled: boolean;
}

export const useKeplr = (): UseKeplrReturn => {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isKeplrInstalled, setIsKeplrInstalled] = useState(false);

  // Check if Keplr is installed
  useEffect(() => {
    const checkKeplr = async () => {
      const keplrWindow = window as KeplrWindow;
      const installed = !!keplrWindow.keplr;
      setIsKeplrInstalled(installed);

      if (!installed) {
        setError('Keplr wallet not installed. Please install it first.');
      }
    };

    // Wait for window to be ready
    if (typeof window !== 'undefined') {
      checkKeplr();
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!isKeplrInstalled) {
      setError('Keplr wallet not installed');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const keplrWindow = window as KeplrWindow;
      const keplr = keplrWindow.keplr;

      if (!keplr) {
        throw new Error('Keplr not found');
      }

      // Request connection and suggest chain
      await keplr.enable(CHAIN_ID);

      // Get offline signer
      const offlineSigner = keplr.getOfflineSigner(CHAIN_ID);
      const accounts = await offlineSigner.getAccounts();

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const walletAddress = accounts[0].address;
      setAddress(walletAddress);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect wallet';

      if (errorMessage.includes('User rejected')) {
        setError('Connection rejected. Please try again.');
      } else if (errorMessage.includes('not found')) {
        setError('Keplr chain not found. Please make sure injective-888 testnet is added.');
      } else {
        setError(errorMessage);
      }

      setAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, [isKeplrInstalled]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  return {
    address,
    isConnected: !!address,
    isLoading,
    error,
    connectWallet,
    disconnect,
    isKeplrInstalled,
  };
};
