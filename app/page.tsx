'use client';
// Build cache: 2026-03-17-v3

import { useState, useCallback } from 'react';
import { CSVUploader, CSVRow } from '@/components/CSVUploader';
import { TransactionTable, TransactionRow } from '@/components/TransactionTable';
import { useKeplr } from '@/hooks/useKeplr';
import { sendAllTokens, estimateGasFee } from '@/lib/tokenSender';
import { validateCSVData } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Wallet, CheckCircle, Info, Zap, Send, RefreshCw } from 'lucide-react';

export default function AirdropPage() {
  const { address, isLoading: isConnecting, error: walletError, connectWallet } = useKeplr();
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string>('');
  const [sendInfo, setSendInfo] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [estimatedGas, setEstimatedGas] = useState<string>('0');

  const handleCSVParsed = useCallback((data: CSVRow[]) => {
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
      setSendInfo(`Removed ${validationResult.duplicates.length} duplicate address(es)`);
    }

    setCSVData(validationResult.valid);
    const initialTransactions: TransactionRow[] = validationResult.valid.map((row) => ({
      address: row.address,
      amount: row.amount,
      status: 'pending',
    }));
    setTransactions(initialTransactions);

    const gasEstimate = estimateGasFee(0.000000025, 200000 * validationResult.valid.length);
    setEstimatedGas(gasEstimate);
  }, []);

  const handleSendTokens = useCallback(async () => {
    if (!address || csvData.length === 0) {
      setSendError('Wallet not connected or no recipients');
      return;
    }

    setIsSending(true);
    setSendError('');

    try {
      const results = await sendAllTokens(
        csvData,
        address,
        (progress: number) => setProgress(progress)
      );

      setTransactions((prev) =>
        prev.map((tx) => {
          const result = results.find((r) => r.address === tx.address);
          return result
            ? {
                ...tx,
                status: result.success ? 'success' : 'failed',
                txHash: result.txHash,
              }
            : tx;
        })
      );
    } catch (err: any) {
      setSendError(err.message || 'Failed to send tokens');
    } finally {
      setIsSending(false);
      setProgress(0);
    }
  }, [address, csvData]);

  const handleRetryFailed = useCallback(async () => {
    const failedTransactions = transactions.filter((tx) => tx.status === 'failed');
    if (failedTransactions.length === 0) {
      setSendInfo('No failed transactions to retry');
      return;
    }

    if (!address) {
      setSendError('Wallet not connected');
      return;
    }

    setIsSending(true);
    setSendError('');

    try {
      const failedCSVData = csvData.filter((csv) =>
        failedTransactions.some((tx) => tx.address === csv.address)
      );

      const results = await sendAllTokens(
        failedCSVData,
        address,
        (progress: number) => setProgress(progress)
      );

      setTransactions((prev) =>
        prev.map((tx) => {
          const result = results.find((r) => r.address === tx.address);
          return result ? { ...tx, status: result.success ? 'success' : 'failed', txHash: result.txHash } : tx;
        })
      );
    } catch (err: any) {
      setSendError(err.message || 'Failed to retry');
    } finally {
      setIsSending(false);
      setProgress(0);
    }
  }, [address, csvData, transactions]);

  const totalAmount = csvData.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
  const failedCount = transactions.filter((t) => t.status === 'failed').length;
  const successCount = transactions.filter((t) => t.status === 'success').length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f0a1f] via-[#1a1228] to-[#0f0a1f] py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full glass glow-indigo">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">Injective Airdrop Tool</span>
          </div>
          <h1 className="gradient-text text-5xl sm:text-6xl font-bold mb-4">
            Token Distribution
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Distribute INJ tokens across multiple wallets with a single click. Fast, secure, and transparent.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Upload & Wallet */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Connection Card */}
            <div className="glass glow-indigo p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-400" />
                  Wallet Connection
                </h2>
                {address && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              </div>

              {address ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-black/20 border border-emerald-500/20">
                    <p className="text-sm text-muted-foreground mb-1">Connected Address</p>
                    <p className="font-mono text-sm text-emerald-300 break-all">{address}</p>
                  </div>
                  <button
                    onClick={connectWallet}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:text-white transition-colors"
                  >
                    Reconnect
                  </button>
                </div>
              ) : (
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 rounded-lg glow-indigo hover-lift"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Keplr Wallet'}
                </Button>
              )}

              {walletError && (
                <Alert className="mt-4 bg-red-500/10 border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300">{walletError}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* CSV Upload Card */}
            <div className="glass glow-indigo p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-400" />
                Upload Recipients
              </h2>
              <CSVUploader onDataParsed={handleCSVParsed} />
            </div>
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats Card */}
            {csvData.length > 0 && (
              <div className="glass glow-pink p-6 rounded-2xl">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                  Distribution Stats
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold gradient-text">{csvData.length}</p>
                    <p className="text-sm text-muted-foreground">Recipients</p>
                  </div>
                  <div className="h-px bg-gradient-to-r from-indigo-500/20 to-pink-500/20"></div>
                  <div>
                    <p className="text-2xl font-bold text-cyan-300">{totalAmount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Total INJ</p>
                  </div>
                  <div className="h-px bg-gradient-to-r from-indigo-500/20 to-pink-500/20"></div>
                  <div>
                    <p className="text-lg font-mono text-amber-300">{parseFloat(estimatedGas).toFixed(8)}</p>
                    <p className="text-sm text-muted-foreground">Est. Gas</p>
                  </div>
                  {successCount > 0 && (
                    <>
                      <div className="h-px bg-gradient-to-r from-indigo-500/20 to-pink-500/20"></div>
                      <div>
                        <p className="text-lg font-bold text-emerald-300">{successCount}</p>
                        <p className="text-sm text-muted-foreground">Successful</p>
                      </div>
                    </>
                  )}
                  {failedCount > 0 && (
                    <>
                      <div className="h-px bg-gradient-to-r from-indigo-500/20 to-pink-500/20"></div>
                      <div>
                        <p className="text-lg font-bold text-red-400">{failedCount}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {csvData.length > 0 && (
              <div className="space-y-3">
                <Button
                  onClick={handleSendTokens}
                  disabled={!address || isSending}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white border-0 rounded-lg glow-pink hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? `Sending (${progress}/${csvData.length})...` : 'Send All Tokens'}
                </Button>

                {failedCount > 0 && (
                  <Button
                    onClick={handleRetryFailed}
                    disabled={isSending}
                    variant="outline"
                    className="w-full h-10 font-semibold border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 rounded-lg hover-lift"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Failed ({failedCount})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Messages */}
        {sendInfo && (
          <Alert className="mt-8 bg-cyan-500/10 border-cyan-500/20 rounded-2xl">
            <Info className="h-4 w-4 text-cyan-400" />
            <AlertDescription className="text-cyan-300">{sendInfo}</AlertDescription>
          </Alert>
        )}

        {sendError && (
          <Alert className="mt-8 bg-red-500/10 border-red-500/20 rounded-2xl">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{sendError}</AlertDescription>
          </Alert>
        )}

        {/* Transaction Table */}
        {transactions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 gradient-text">Transaction History</h2>
            <div className="glass glow-indigo rounded-2xl p-6 overflow-hidden">
              <TransactionTable transactions={transactions} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
