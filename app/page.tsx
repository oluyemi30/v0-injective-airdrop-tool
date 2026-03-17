'use client';

import { useState, useCallback } from 'react';
import { CSVUploader, CSVRow } from '@/components/CSVUploader';
import { TransactionTable, TransactionRow } from '@/components/TransactionTable';
import { useKeplr } from '@/hooks/useKeplr';
import { sendAllTokens, estimateGasFee } from '@/lib/tokenSender';
import { deduplicateAddresses, validateCSVData } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Wallet, CheckCircle, Info } from 'lucide-react';

export default function Home() {
  const { address, isConnected, isLoading: isConnecting, error: keplrError, connectWallet } = useKeplr();
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string>('');
  const [sendInfo, setSendInfo] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [estimatedGas, setEstimatedGas] = useState<string>('0');

  const handleCSVParsed = useCallback((data: CSVRow[]) => {
    // Validate and deduplicate
    const validationResult = validateCSVData(data);
    
    if (validationResult.invalid.length > 0) {
      const invalidSummary = validationResult.invalid
        .slice(0, 3)
        .map((inv) => `Row ${inv.row}: ${inv.error}`)
        .join('; ');
      setSendInfo(
        `${validationResult.invalid.length} invalid row(s): ${invalidSummary}${
          validationResult.invalid.length > 3 ? '...' : ''
        }`
      );
    } else {
      setSendInfo('');
    }

    if (validationResult.duplicates.length > 0) {
      setSendInfo(
        `Removed ${validationResult.duplicates.length} duplicate address(es)`
      );
    }

    setCSVData(validationResult.valid);
    
    // Initialize transaction rows with pending status
    const initialTransactions: TransactionRow[] = validationResult.valid.map((row) => ({
      address: row.address,
      amount: row.amount,
      status: 'pending',
    }));
    setTransactions(initialTransactions);

    // Calculate estimated gas
    const gasEstimate = estimateGasFee(0.000000025, 200000 * validationResult.valid.length);
    setEstimatedGas(gasEstimate);
  }, []);

  const handleSendAll = async () => {
    if (!isConnected || !address) {
      setSendError('Please connect your wallet first');
      return;
    }

    if (csvData.length === 0) {
      setSendError('Please upload a CSV file first');
      return;
    }

    setIsSending(true);
    setSendError('');

    try {
      const recipients = csvData.map((row) => ({
        address: row.address,
        amount: row.amount,
      }));

      const results = await sendAllTokens(recipients, (progressData) => {
        setProgress(Math.round((progressData.completed / progressData.total) * 100));

        // Update transaction status
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.address === progressData.address
              ? {
                  ...tx,
                  status: progressData.status,
                }
              : tx
          )
        );
      });

      // Update final results
      results.forEach((result) => {
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.address === result.address
              ? {
                  ...tx,
                  status: result.status,
                  txHash: result.txHash,
                  error: result.error,
                }
              : tx
          )
        );
      });

      setProgress(100);
    } catch (error: any) {
      setSendError(error.message || 'Failed to send tokens');
      setProgress(0);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryFailed = async () => {
    const failedTransactions = transactions.filter((t) => t.status === 'failed');

    if (failedTransactions.length === 0) {
      setSendError('No failed transactions to retry');
      return;
    }

    setIsSending(true);
    setSendError('');

    try {
      const recipients = failedTransactions.map((tx) => ({
        address: tx.address,
        amount: tx.amount,
      }));

      const results = await sendAllTokens(recipients, (progressData) => {
        // Update transaction status
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.address === progressData.address
              ? {
                  ...tx,
                  status: progressData.status,
                }
              : tx
          )
        );
      });

      // Update final results
      results.forEach((result) => {
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.address === result.address
              ? {
                  ...tx,
                  status: result.status,
                  txHash: result.txHash,
                  error: result.error,
                }
              : tx
          )
        );
      });
    } catch (error: any) {
      setSendError(error.message || 'Failed to retry transactions');
    } finally {
      setIsSending(false);
    }
  };

  const failedCount = transactions.filter((t) => t.status === 'failed').length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">Injective Airdrop Tool</h1>
          <p className="text-slate-600">Send INJ tokens to multiple recipients from a CSV file</p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Connection
          </h2>

          {keplrError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{keplrError}</AlertDescription>
            </Alert>
          )}

          {!isConnected ? (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              size="lg"
              className="w-full md:w-auto"
            >
              {isConnecting ? 'Connecting...' : 'Connect Keplr Wallet'}
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-slate-900">Wallet Connected</p>
                <p className="text-sm text-slate-600 font-mono break-all">{address}</p>
              </div>
            </div>
          )}
        </div>

        {/* CSV Upload */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Upload CSV File</h2>
          <CSVUploader onDataParsed={handleCSVParsed} />
        </div>

        {/* Send Tokens */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Send Tokens</h2>

          {sendError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{sendError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {csvData.length > 0 && (
              <>
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p className="font-semibold text-blue-900">Ready to send to {csvData.length} recipient(s)</p>
                <p className="text-blue-700">
                  Total: {csvData.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0).toFixed(2)} INJ
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Estimated gas fee: {parseFloat(estimatedGas).toFixed(8)} INJ
                </p>
              </div>
              {sendInfo && (
                <Alert className="bg-amber-50 border-amber-200">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-amber-700">{sendInfo}</AlertDescription>
                </Alert>
              )}
            </>
            )}

            <div className="flex gap-3 flex-col md:flex-row">
              <Button
                onClick={handleSendAll}
                disabled={!isConnected || csvData.length === 0 || isSending}
                size="lg"
                className="flex-1"
              >
                {isSending ? `Sending... (${progress}%)` : 'Send All Tokens'}
              </Button>

              {failedCount > 0 && (
                <Button
                  onClick={handleRetryFailed}
                  disabled={isSending}
                  variant="outline"
                  size="lg"
                >
                  Retry {failedCount} Failed
                </Button>
              )}
            </div>

            {isSending && (
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Transaction Table */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Transaction Status</h2>
            <TransactionTable
              transactions={transactions}
              totalAmount={csvData.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0)}
            />
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-slate-600 space-y-2">
          <p>Testnet: injective-888</p>
          <p>
            Need help?{' '}
            <a
              href="https://testnet.explorer.injective.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Check block explorer
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
