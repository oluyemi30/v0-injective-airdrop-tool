'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';
import { CSVRow } from '@/components/CSVUploader';
import { TransactionTable, TransactionRow } from '@/components/TransactionTable';
import { useKeplr } from '@/hooks/useKeplr';
import { sendAllTokens, estimateGasFee } from '@/lib/tokenSender';
import { validateCSVData } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info, Wallet } from 'lucide-react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const STORAGE_KEY = 'airdrop_csv_data';

export default function AirdropPage() {
  const { address, isConnected, isLoading: isConnecting, error: keplrError, connectWallet } = useKeplr();

  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendInfo, setSendInfo] = useState('');
  const [progress, setProgress] = useState(0);
  const [estimatedGas, setEstimatedGas] = useState('0');

  const initFromData = useCallback((data: CSVRow[]) => {
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

    setCsvData(validationResult.valid);

    const initialTransactions: TransactionRow[] = validationResult.valid.map((row) => ({
      address: row.address,
      amount: row.amount,
      status: 'pending',
    }));
    setTransactions(initialTransactions);

    const gasEstimate = estimateGasFee(0.000000025, 200000 * validationResult.valid.length);
    setEstimatedGas(gasEstimate);
    setProgress(0);
    setSendError('');
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    console.log('[v0] sessionStorage value for STORAGE_KEY:', stored);
    console.log('[v0] STORAGE_KEY:', STORAGE_KEY);
    console.log('[v0] All sessionStorage keys:', Object.keys(sessionStorage));

    if (!stored) {
      console.log('[v0] No CSV data found in sessionStorage');
      return;
    }

    try {
      const parsed = JSON.parse(stored) as CSVRow[];
      console.log('[v0] Parsed CSV data:', parsed);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.log('[v0] Parsed data is not a valid array or is empty');
        return;
      }

      initFromData(parsed);
    } catch (error) {
      console.log('[v0] Error parsing CSV from sessionStorage:', error);
      setSendError('Unable to load the uploaded CSV. Please upload again.');
    }
  }, [initFromData]);

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
    <main
      className={`${spaceGrotesk.className} relative min-h-screen overflow-hidden px-4 py-8 text-slate-100 md:px-8 md:py-12`}
      style={{
        background:
          'radial-gradient(circle at 50% 34%, rgba(6, 31, 44, 0.95) 0%, rgba(9, 28, 43, 0.92) 28%, rgba(17, 27, 42, 0.98) 56%, #1c2533 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-radial-gradient(circle at 50% 34%, rgba(54, 148, 182, 0.18) 0 2px, rgba(13, 37, 54, 0) 2px 96px)',
        }}
      />

      <div className="relative mx-auto max-w-6xl space-y-6 md:space-y-8">
        <header className="flex items-center justify-end gap-4">
          {!isConnected ? (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="border border-cyan-300/30 bg-slate-950/60 text-cyan-100 hover:bg-slate-900"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          ) : (
            <div className="max-w-88 rounded-xl border border-emerald-300/35 bg-emerald-950/45 px-4 py-2 text-right">
              <p className="text-xs text-emerald-200">Wallet connected</p>
              <p className="truncate font-mono text-sm text-emerald-100">{address}</p>
            </div>
          )}
        </header>

        <section className="rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-6 shadow-[0_12px_45px_rgba(5,19,30,0.55)] backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-slate-100 md:text-4xl">Airdrop Console</h1>
          <p className="mt-2 text-slate-300">Review recipients and send your INJ transactions.</p>
        </section>

        {keplrError && (
          <Alert variant="destructive" className="border-red-300/50 bg-red-900/40 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{keplrError}</AlertDescription>
          </Alert>
        )}

        {sendError && (
          <Alert variant="destructive" className="border-red-300/50 bg-red-900/40 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{sendError}</AlertDescription>
          </Alert>
        )}

        {csvData.length === 0 ? (
          <section className="rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-6 text-center shadow-[0_12px_45px_rgba(5,19,30,0.55)] backdrop-blur-sm">
            <p className="text-slate-200">No CSV data found yet.</p>
            <p className="mt-2 text-slate-300">Upload one from the home screen to continue.</p>
            <Link
              href="/"
              className="mt-4 inline-block text-cyan-300 underline decoration-cyan-300/60 underline-offset-4 hover:text-cyan-200"
            >
              Go to Home
            </Link>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-6 shadow-[0_12px_45px_rgba(5,19,30,0.55)] backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-semibold text-cyan-100 md:text-xl">Send Tokens</h2>

              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-200/25 bg-cyan-950/40 p-4 text-sm">
                  <p className="font-semibold text-cyan-100">Ready to send to {csvData.length} recipient(s)</p>
                  <p className="text-cyan-200">
                    Total: {csvData.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0).toFixed(2)} INJ
                  </p>
                  <p className="mt-1 text-xs text-cyan-300/90">
                    Estimated gas fee: {parseFloat(estimatedGas).toFixed(8)} INJ
                  </p>
                </div>

                {sendInfo && (
                  <Alert className="border-amber-300/40 bg-amber-900/35 text-amber-100">
                    <Info className="h-4 w-4" />
                    <AlertDescription>{sendInfo}</AlertDescription>
                  </Alert>
                )}

                {isConnected && (
                  <div className="rounded-xl border border-emerald-300/30 bg-emerald-950/40 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-300" />
                      <div>
                        <p className="font-semibold text-emerald-100">Using wallet</p>
                        <p className="break-all font-mono text-sm text-emerald-200/90">{address}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 md:flex-row">
                  <Button
                    onClick={handleSendAll}
                    disabled={!isConnected || isSending}
                    size="lg"
                    className="flex-1 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  >
                    {isSending ? `Sending... (${progress}%)` : 'Send All Tokens'}
                  </Button>

                  {failedCount > 0 && (
                    <Button
                      onClick={handleRetryFailed}
                      disabled={isSending}
                      variant="outline"
                      size="lg"
                      className="border-cyan-300/60 bg-slate-900/50 text-cyan-100 hover:bg-slate-800"
                    >
                      Retry {failedCount} Failed
                    </Button>
                  )}
                </div>

                {isSending && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-6 shadow-[0_12px_45px_rgba(5,19,30,0.55)] backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-semibold text-cyan-100 md:text-xl">Transaction Status</h2>
              <TransactionTable
                transactions={transactions}
                totalAmount={csvData.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0)}
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
