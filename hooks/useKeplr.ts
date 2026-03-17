import { useState, useCallback, useEffect } from 'react';

const CHAIN_ID = 'injective-888';

// Injective testnet chain configuration
const INJECTIVE_TESTNET_CONFIG = {
  chainId: 'injective-888',
  chainName: 'Injective Testnet',
  rpc: 'https://testnet.tm.injective.network:26657',
  rest: 'https://testnet-api.injective.dev',
  bip44: {
    coinType: 60,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'inj',
    bech32PrefixAccPub: 'injpub',
    bech32PrefixValAddr: 'injvaloper',
    bech32PrefixValPub: 'injvaloperpub',
    bech32PrefixConsAddr: 'injvalcons',
    bech32PrefixConsPub: 'injvalconspub',
  },
  currencies: [
    {
      coinDenom: 'INJ',
      coinMinimalDenom: 'inj',
      coinDecimals: 18,
      coinGeckoId: 'injective-protocol',
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'INJ',
      coinMinimalDenom: 'inj',
      coinDecimals: 18,
      coinGeckoId: 'injective-protocol',
      gasPriceStep: {
        low: 0.000000025,
        average: 0.000000035,
        high: 0.000000050,
      },
    },
  ],
  stakeCurrency: {
    coinDenom: 'INJ',
    coinMinimalDenom: 'inj',
    coinDecimals: 18,
    coinGeckoId: 'injective-protocol',
  },
};

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

      // Suggest chain first if it doesn't exist
      try {
        await keplr.experimentalSuggestChain(INJECTIVE_TESTNET_CONFIG);
      } catch (suggestErr: any) {
        // Chain might already be added, continue anyway
        if (!suggestErr.message?.includes('already exists')) {
          console.log('[v0] Chain suggestion:', suggestErr.message);
        }
      }

      // Request connection
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
      } else if (errorMessage.includes('not found') || errorMessage.includes('modular chain')) {
        setError('Please check your Keplr wallet and try again.');
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
