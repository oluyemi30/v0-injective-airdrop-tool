import {
  MsgSend,
  ChainRestAuthApi,
  ChainRestTendermintApi,
  createTransaction,
  TxGrpcClient,
} from '@injectivelabs/sdk-ts';
import { Network } from '@injectivelabs/networks';
import BigNumber from 'bignumber.js';

const CHAIN_ID = 'injective-888';
const DENOM = 'inj';
const INJ_DECIMALS = 18;

interface KeplrWindow extends Window {
  keplr?: any;
}

interface SendTokenResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

interface TransactionProgress {
  completed: number;
  total: number;
  address: string;
  status: 'pending' | 'success' | 'failed';
}

/**
 * Send INJ tokens to a recipient address
 */
export const sendToken = async (
  toAddress: string,
  amount: string
): Promise<SendTokenResult> => {
  try {
    const keplrWindow = window as KeplrWindow;
    const keplr = keplrWindow.keplr;

    if (!keplr) {
      throw new Error('Keplr not found');
    }

    // Get sender address
    const offlineSigner = keplr.getOfflineSigner(CHAIN_ID);
    const accounts = await offlineSigner.getAccounts();
    const fromAddress = accounts[0].address;

    // Convert amount to correct decimals (18 for INJ)
    const amountInTokens = new BigNumber(amount).shiftedBy(INJ_DECIMALS).toFixed(0);

    // Create MsgSend
    const msg = MsgSend.fromJSON({
      fromAddress,
      toAddress,
      amount: [
        {
          denom: DENOM,
          amount: amountInTokens,
        },
      ],
    });

    // Get chain info
    const network = Network.InjectiveTestnet;
    const chainRestAuthApi = new ChainRestAuthApi({
      baseURL: network.rest,
    });

    const chainRestTendermintApi = new ChainRestTendermintApi({
      baseURL: network.rest,
    });

    // Get account number and sequence
    const { account } = await chainRestAuthApi.fetchAccount(fromAddress);
    const { signDoc } = await chainRestTendermintApi.fetchLatestBlock();

    const latestHeight = signDoc?.header?.height || 0;
    const blockNumber = parseInt(latestHeight.toString());

    // Build transaction
    const tx = createTransaction({
      message: msg,
      memo: 'INJ Transfer via Airdrop Tool',
      signMode: 0, // DirectSignMode
      fee: {
        gas: '200000', // Standard gas for send
        amount: [
          {
            denom: DENOM,
            amount: '0', // No fee for testnet
          },
        ],
      },
      timeoutHeight: blockNumber + 30,
      accountNumber: parseInt(account?.account_number?.toString() || '0'),
      sequence: parseInt(account?.sequence?.toString() || '0'),
      chainId: CHAIN_ID,
    });

    // Sign transaction
    const signResponse = await keplr.signDirect(
      CHAIN_ID,
      fromAddress,
      {
        bodyBytes: tx.bodyBytes,
        authInfoBytes: tx.authInfoBytes,
        chainId: CHAIN_ID,
        accountNumber: account?.account_number?.toString() || '0',
      },
      {
        isTransaction: true,
      }
    );

    // Broadcast transaction
    const txGrpcClient = new TxGrpcClient({
      channel: network.grpc,
    });

    const txResponse = await txGrpcClient.broadcast(signResponse.signed);

    if (txResponse.code !== 0) {
      throw new Error(`Transaction failed: ${txResponse.rawLog}`);
    }

    console.log('[TokenSender] Transaction successful:', txResponse.transactionHash);

    return {
      success: true,
      txHash: txResponse.transactionHash,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    console.error('[TokenSender] Error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Send tokens to multiple recipients
 */
export const sendAllTokens = async (
  recipients: Array<{ address: string; amount: string }>,
  onProgress?: (progress: TransactionProgress) => void
): Promise<Array<{ address: string; status: 'success' | 'failed'; txHash?: string; error?: string }>> => {
  const results = [];
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < recipients.length; i++) {
    const { address, amount } = recipients[i];

    // Call progress callback
    if (onProgress) {
      onProgress({
        completed: i,
        total: recipients.length,
        address,
        status: 'pending',
      });
    }

    try {
      const result = await sendToken(address, amount);

      if (result.success) {
        results.push({
          address,
          status: 'success',
          txHash: result.txHash,
        });

        if (onProgress) {
          onProgress({
            completed: i + 1,
            total: recipients.length,
            address,
            status: 'success',
          });
        }
      } else {
        results.push({
          address,
          status: 'failed',
          error: result.error,
        });

        if (onProgress) {
          onProgress({
            completed: i + 1,
            total: recipients.length,
            address,
            status: 'failed',
          });
        }
      }
    } catch (error: any) {
      results.push({
        address,
        status: 'failed',
        error: error.message || 'Unknown error',
      });

      if (onProgress) {
        onProgress({
          completed: i + 1,
          total: recipients.length,
          address,
          status: 'failed',
        });
      }
    }

    // Add delay between transactions (1 second)
    if (i < recipients.length - 1) {
      await delay(1000);
    }
  }

  return results;
};
