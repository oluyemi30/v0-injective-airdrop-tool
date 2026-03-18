'use client';

import {
  MsgSend,
  ChainRestAuthApi,
  ChainRestTendermintApi,
  createTransaction,
  getTxRawFromTxRawOrDirectSignResponse,
  TxRestClient,
} from '@injectivelabs/sdk-ts';
import { BigNumberInBase, DEFAULT_BLOCK_TIMEOUT_HEIGHT, DEFAULT_STD_FEE } from '@injectivelabs/utils';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { ChainId } from '@injectivelabs/ts-types';

const NETWORK = Network.TestnetK8s;
const CHAIN_ID = ChainId.Testnet; // 'injective-888'
const ENDPOINTS = getNetworkEndpoints(NETWORK);
const INJ_DECIMALS = 18;

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
    const amountInWei = new BigNumberInBase(amount).toWei().toFixed();

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
    const timeoutHeight = parseInt(latestHeight, 10) + DEFAULT_BLOCK_TIMEOUT_HEIGHT;

    // Create the transaction
    const { signDoc, txRaw } = createTransaction({
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
    // (user may have modified gas in Keplr popup)
    const txRawSigned = getTxRawFromTxRawOrDirectSignResponse(directSignResponse);

    // Broadcast
    const txRestClient = new TxRestClient(ENDPOINTS.rest);
    const txResponse = await txRestClient.broadcast(txRawSigned);

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

    // 1-second delay between transactions to avoid sequence conflicts
    if (i < recipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
};
