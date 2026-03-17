'use client';

import {
  MsgSend,
  ChainRestAuthApi,
  ChainRestTendermintApi,
  createTransaction,
  TxClient,
} from '@injectivelabs/sdk-ts';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import BigNumber from 'bignumber.js';

const CHAIN_ID = 'injective-888';
const DENOM = 'inj';
const INJ_DECIMALS = 18;

/**
 * Estimate gas fee for transactions
 * @param gasPrice Gas price in INJ
 * @param gasLimit Total gas needed
 * @returns Formatted string of estimated fee in INJ
 */
export const estimateGasFee = (gasPrice: number, gasLimit: number): string => {
  const totalGas = new BigNumber(gasPrice).times(gasLimit);
  return totalGas.toFixed(18);
};

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
      return {
        success: false,
        error: 'Keplr wallet not found',
      };
    }

    // Get signer and account info
    const offlineSigner = keplr.getOfflineSigner(CHAIN_ID);
    const accounts = await offlineSigner.getAccounts();

    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        error: 'No account found in Keplr',
      };
    }

    const senderAddress = accounts[0].address;

    // Convert amount to base units (18 decimals for INJ)
    const amountInInj = new BigNumber(amount)
      .times(new BigNumber(10).pow(INJ_DECIMALS))
      .toFixed(0);

    // Create message
    const msg = MsgSend.create({
      srcInjectiveAddress: senderAddress,
      dstInjectiveAddress: toAddress,
      amount: {
        denom: DENOM,
        amount: amountInInj,
      },
    });

    // Get network endpoints
    const endpoints = getNetworkEndpoints(Network.TestnetK8s);
    const chainId = 'injective-888';

    // Get account and sequence for tx
    const authApi = new ChainRestAuthApi({
      baseURL: endpoints.rest,
    });

    const auth = await authApi.fetchAccount(senderAddress);

    // Create transaction
    const tx = createTransaction({
      pubKey: Buffer.from(accounts[0].pubkey).toString('base64'),
      chainId,
      fee: {
        amount: [
          {
            denom: DENOM,
            amount: '50000000000000',
          },
        ],
        gas: '200000',
      },
      sequence: parseInt(auth.account.base_account.sequence, 10),
      accountNumber: parseInt(auth.account.base_account.account_number, 10),
      messages: [msg],
    });

    // Sign transaction
    const signResponse = await offlineSigner.signDirect(
      senderAddress,
      {
        bodyBytes: tx.getBodyBytes(),
        authInfoBytes: tx.getAuthInfoBytes(),
        chainId,
      }
    );

    // Broadcast transaction
    const txClient = new TxClient({
      baseURL: endpoints.rest,
    });

    const txResponse = await txClient.broadcast(signResponse.signed);

    if (txResponse.code === 0) {
      console.log('[v0] Transaction successful:', txResponse.txhash);
      return {
        success: true,
        txHash: txResponse.txhash,
      };
    } else {
      return {
        success: false,
        error: `Transaction failed: ${txResponse.rawLog}`,
      };
    }
  } catch (error: any) {
    console.error('[v0] Send token error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
};

/**
 * Send tokens to multiple recipients with progress tracking
 */
export const sendAllTokens = async (
  recipients: Array<{ address: string; amount: string }>,
  onProgress?: (progress: TransactionProgress) => void
): Promise<Array<{ address: string; status: 'success' | 'failed'; txHash?: string; error?: string }>> => {
  const results: Array<{ address: string; status: 'success' | 'failed'; txHash?: string; error?: string }> = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    // Notify progress
    if (onProgress) {
      onProgress({
        completed: i,
        total: recipients.length,
        address: recipient.address,
        status: 'pending',
      });
    }

    // Send token
    const result = await sendToken(recipient.address, recipient.amount);

    if (result.success) {
      results.push({
        address: recipient.address,
        status: 'success',
        txHash: result.txHash,
      });
    } else {
      results.push({
        address: recipient.address,
        status: 'failed',
        error: result.error,
      });
    }

    // Notify completion
    if (onProgress) {
      onProgress({
        completed: i + 1,
        total: recipients.length,
        address: recipient.address,
        status: result.success ? 'success' : 'failed',
      });
    }

    // Delay between transactions (1 second)
    if (i < recipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
};
