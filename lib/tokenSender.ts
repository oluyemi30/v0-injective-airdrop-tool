'use client';

import {
  MsgSend,
  ChainRestAuthApi,
  ChainRestTendermintApi,
  createTransaction,
  getTxRawFromTxRawOrDirectSignResponse,
  TxRestApi,
} from '@injectivelabs/sdk-ts';
import { BigNumber } from 'bignumber.js';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';

const NETWORK = Network.TestnetK8s;
const CHAIN_ID = 'injective-888';
const ENDPOINTS = getNetworkEndpoints(NETWORK);
const INJ_DECIMALS = 18;

// Default fee for INJ transactions
const DEFAULT_STD_FEE = {
  amount: [{ denom: 'inj', amount: '50000000000000000' }], // 0.05 INJ
  gas: '200000',
};

export const estimateGasFee = (gasPrice: number, gasLimit: number): string => {
  return (gasPrice * gasLimit).toFixed(18);
};

interface KeplrWindow extends Window {
  keplr?: any;
}

export interface SendTokenResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface TransactionProgress {
  completed: number;
  total: number;
  address: string;
  status: 'pending' | 'success' | 'failed';
}

export const sendToken = async (
  toAddress: string,
  amount: string
): Promise<SendTokenResult> => {
  try {
    const keplrWindow = window as KeplrWindow;
    const keplr = keplrWindow.keplr;

    if (!keplr) {
      return { success: false, error: 'Keplr wallet not found' };
    }

    // Get key and accounts
    const key = await keplr.getKey(CHAIN_ID);
    const offlineSigner = keplr.getOfflineSigner(CHAIN_ID);
    const accounts = await offlineSigner.getAccounts();

    if (!accounts || accounts.length === 0) {
      return { success: false, error: 'No account found in Keplr' };
    }

    const senderAddress = accounts[0].address;
    const pubKey = Buffer.from(key.pubKey).toString('base64');

    // Convert amount to base units (inj has 18 decimals)
    const amountInWei = new BigNumber(amount)
      .multipliedBy(new BigNumber(10).pow(INJ_DECIMALS))
      .toFixed(0);

    // Build the MsgSend
    const msg = MsgSend.fromJSON({
      amount: {
        denom: 'inj',
        amount: amountInWei,
      },
      srcInjectiveAddress: senderAddress,
      dstInjectiveAddress: toAddress,
    });

    // Fetch account details
    const chainRestAuthApi = new ChainRestAuthApi(ENDPOINTS.rest);
    const accountDetailsResponse = await chainRestAuthApi.fetchAccount(senderAddress);
    const baseAccount = accountDetailsResponse.baseAccount;

    // Fetch latest block for timeout height
    const chainRestTendermintApi = new ChainRestTendermintApi(ENDPOINTS.rest);
    const latestBlock = await chainRestTendermintApi.fetchLatestBlock();
    const latestHeight = latestBlock.header.height;
    const timeoutHeight = parseInt(latestHeight, 10) + 50;

    // Create the transaction
    const { signDoc } = createTransaction({
      pubKey,
      chainId: CHAIN_ID,
      fee: DEFAULT_STD_FEE,
      message: msg,
      sequence: parseInt(baseAccount.sequence as string, 10),
      timeoutHeight,
      accountNumber: parseInt(baseAccount.accountNumber as string, 10),
    });

    // Sign with Keplr
    const directSignResponse = await offlineSigner.signDirect(
      senderAddress,
      signDoc
    );

    // Build the final TxRaw from the sign response
    const txRawSigned = getTxRawFromTxRawOrDirectSignResponse(directSignResponse);

    // Broadcast
    const txRestApi = new TxRestApi(ENDPOINTS.rest);
    const txResponse = await txRestApi.broadcast(txRawSigned);

    if (txResponse.code !== 0) {
      return {
        success: false,
        error: `Transaction failed: ${txResponse.rawLog || txResponse.code}`,
      };
    }

    return {
      success: true,
      txHash: txResponse.txHash,
    };
  } catch (error: any) {
    console.error('[tokenSender] Error:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error occurred',
    };
  }
};

export const sendAllTokens = async (
  recipients: Array<{ address: string; amount: string }>,
  onProgress?: (progress: TransactionProgress) => void
): Promise<Array<{ address: string; status: 'success' | 'failed'; txHash?: string; error?: string }>> => {
  const results: Array<{
    address: string;
    status: 'success' | 'failed';
    txHash?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    if (onProgress) {
      onProgress({
        completed: i,
        total: recipients.length,
        address: recipient.address,
        status: 'pending',
      });
    }

    const result = await sendToken(recipient.address, recipient.amount);

    results.push({
      address: recipient.address,
      status: result.success ? 'success' : 'failed',
      txHash: result.txHash,
      error: result.error,
    });

    if (onProgress) {
      onProgress({
        completed: i + 1,
        total: recipients.length,
        address: recipient.address,
        status: result.success ? 'success' : 'failed',
      });
    }

    if (i < recipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
};
