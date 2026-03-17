'use client';

import { MsgSend } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import BigNumber from 'bignumber.js';

const CHAIN_ID = 'injective-888';
const DENOM = 'inj';
const INJ_DECIMALS = 18;

/**
 * Estimate gas fee for transactions
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

    // Validate recipient address
    if (!toAddress || toAddress.length === 0) {
      return {
        success: false,
        error: 'Invalid recipient address',
      };
    }

    // Convert amount to base units (18 decimals for INJ)
    const amountInInj = new BigNumber(amount)
      .times(new BigNumber(10).pow(INJ_DECIMALS))
      .toFixed(0);

    console.log('[v0] Sending', amount, 'INJ to', toAddress, '- Base units:', amountInInj);

    // Get network endpoints for testnet
    const endpoints = getNetworkEndpoints(Network.TestnetK8s);

    // Prepare the send message using the correct API
    const msg = {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: senderAddress,
        toAddress: toAddress,
        amount: [
          {
            denom: DENOM,
            amount: amountInInj,
          },
        ],
      },
    };

    // Get account details from the blockchain
    const authUrl = `${endpoints.rest}/cosmos/auth/v1beta1/accounts/${senderAddress}`;
    const authResponse = await fetch(authUrl);
    const authData = await authResponse.json();
    
    if (!authData.account) {
      return {
        success: false,
        error: 'Could not fetch account info from blockchain',
      };
    }

    const accountNumber = authData.account.account_number;
    const sequence = authData.account.sequence;

    console.log('[v0] Account:', senderAddress, 'Number:', accountNumber, 'Sequence:', sequence);

    // Build the transaction
    const txBody = {
      messages: [msg],
      memo: '',
      timeoutHeight: '0',
      extensionOptions: [],
      nonCriticalExtensionOptions: [],
    };

    const authInfo = {
      signerInfos: [
        {
          publicKey: {
            typeUrl: '/cosmos.crypto.secp256k1.PubKey',
            value: {
              key: Buffer.from(accounts[0].pubkey).toString('base64'),
            },
          },
          modeInfo: {
            single: {
              mode: 'SIGN_MODE_DIRECT',
            },
          },
          sequence: sequence,
        },
      ],
      fee: {
        amount: [
          {
            denom: DENOM,
            amount: '50000000000000', // 0.00005 INJ
          },
        ],
        gasLimit: '200000',
      },
    };

    // Convert to protobuf-like structure and sign
    const txBytes = {
      bodyBytes: Buffer.from(JSON.stringify(txBody)),
      authInfoBytes: Buffer.from(JSON.stringify(authInfo)),
      chainId: CHAIN_ID,
    };

    // Sign the transaction
    const signResponse = await offlineSigner.signDirect(senderAddress, txBytes);

    console.log('[v0] Transaction signed');

    // Broadcast the transaction
    const broadcastUrl = `${endpoints.rest}/cosmos/tx/v1beta1/txs`;
    const broadcastResponse = await fetch(broadcastUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_bytes: Buffer.from(signResponse.signed).toString('base64'),
        mode: 'BROADCAST_MODE_BLOCK',
      }),
    });

    const broadcastData = await broadcastResponse.json();

    console.log('[v0] Broadcast response:', broadcastData);

    if (broadcastData.tx_response?.code === 0) {
      console.log('[v0] Transaction successful:', broadcastData.tx_response.txhash);
      return {
        success: true,
        txHash: broadcastData.tx_response.txhash,
      };
    } else {
      const errorMsg = broadcastData.tx_response?.raw_log || broadcastData.message || 'Unknown error';
      return {
        success: false,
        error: `Transaction failed: ${errorMsg}`,
      };
    }
  } catch (error: any) {
    console.error('[v0] Send token error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
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

    console.log('[v0] Sending token', i + 1, 'of', recipients.length);

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
