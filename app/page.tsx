'use client';
// Cache clear: 2026-03-17

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Space_Grotesk } from 'next/font/google';
import Papa from 'papaparse';
import { useKeplr } from '@/hooks/useKeplr';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Wallet, FolderOpen, LogOut, Upload } from 'lucide-react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export default function Home() {
  const router = useRouter();
  const { address, isConnected, isLoading: isConnecting, error: keplrError, connectWallet, disconnect } = useKeplr();
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCSVParsed = useCallback((data: Array<{ address: string; amount: string }>) => {
    try {
      setUploadError('');
      sessionStorage.setItem('airdrop_csv_data', JSON.stringify(data));
      router.push('/airdrop');
    } catch {
      setUploadError('Unable to continue. Please try uploading your CSV again.');
    }
  }, [router]);

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setUploadError('Only CSV files are supported.');
        return;
      }

      setUploadError('');

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = (results.data as Array<{ address?: string; amount?: string }>).filter(
            (row) => row.address && row.amount
          );

          if (!results.meta.fields?.includes('address') || !results.meta.fields?.includes('amount')) {
            setUploadError('CSV must contain "address" and "amount" columns.');
            return;
          }

          if (rows.length === 0) {
            setUploadError('No valid rows found in this CSV.');
            return;
          }

          handleCSVParsed(
            rows.map((row) => ({
              address: String(row.address).trim(),
              amount: String(row.amount).trim(),
            }))
          );
        },
        error: () => {
          setUploadError('Could not parse CSV. Please try another file.');
        },
      });
    },
    [handleCSVParsed]
  );

  return (
    <main
      className={`${spaceGrotesk.className} relative min-h-screen overflow-hidden px-4 py-8 text-slate-100 md:px-8 md:py-12`}
      style={{
        background:
          'radial-gradient(circle at 50% 50%, rgba(6, 31, 44, 0.95) 0%, rgba(9, 28, 43, 0.92) 36%, rgba(17, 27, 42, 0.98) 66%, #1c2533 100%)',
      }}
    >
      <div className="fixed right-3 top-3 z-50 md:right-6 md:top-6">
        <header className="flex justify-end">
          {!isConnected ? (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="h-11 rounded-full border border-cyan-200/35 bg-slate-950/70 px-5 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)] hover:bg-slate-900"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          ) : (
            <div className="flex max-w-96 items-center gap-3 rounded-full border border-emerald-300/30 bg-emerald-950/35 px-3 py-2 shadow-[0_0_24px_rgba(16,185,129,0.16)] backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300/20 text-emerald-200">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="min-w-0 text-left">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Wallet Connected
                </p>
                <p className="truncate font-mono text-sm text-emerald-100">{address}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnect}
                className="h-8 rounded-full border border-emerald-300/40 bg-emerald-900/50 px-3 text-emerald-100 hover:bg-emerald-800"
              >
                <LogOut className="mr-1 h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          )}
        </header>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col pt-14 md:min-h-[calc(100vh-6rem)] md:pt-16">
        <section className="relative isolate flex flex-1 items-center justify-center py-8 text-center">
          <div className="relative z-10 w-full max-w-4xl space-y-6 md:space-y-8">
            <div className="relative mx-auto w-fit">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[180vmax] w-[180vmax] -translate-x-1/2 -translate-y-1/2 animate-pulse opacity-80 animation-duration-[10s]"
                style={{
                  background:
                    'repeating-radial-gradient(circle, rgba(54, 148, 182, 0.2) 0 2px, rgba(13, 37, 54, 0) 2px 96px)',
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 animate-pulse opacity-70 animation-delay-[1200ms] animation-duration-[12s]"
                style={{
                  background:
                    'radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, rgba(34, 211, 238, 0.07) 24%, rgba(9, 28, 43, 0) 58%)',
                }}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    processFile(file);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }
                }}
                className="hidden"
                id="csv-upload"
              />
              <div
                className={`relative z-20 mx-auto flex h-80 w-80 cursor-pointer flex-col items-center justify-center rounded-full border p-8 shadow-[0_0_80px_rgba(17,211,233,0.18)] backdrop-blur-sm transition-colors md:h-88 md:w-88 ${
                  isDragging
                    ? 'border-cyan-200 bg-cyan-900/40'
                    : 'border-cyan-300/25 bg-slate-950/70'
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);

                  const file = event.dataTransfer.files?.[0];
                  if (!file) return;

                  processFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-cyan-300/80 bg-slate-900/80">
                  <FolderOpen className="h-11 w-11 text-cyan-200" />
                </div>
                <p className="text-xl font-bold text-slate-100">Drop your CSV here</p>
                <p className="mt-1 text-sm text-slate-300">or click to browse</p>
              </div>
            </div>

            <h1 className="mx-auto max-w-4xl text-balance text-4xl font-bold tracking-tight text-slate-100 md:text-7xl">
              Drag and drop. Ship your airdrop.
            </h1>
            <p className="mx-auto max-w-2xl text-pretty text-base text-slate-300 md:text-2xl md:leading-9">
              Drop a CSV of recipients and continue to the airdrop console.
            </p>

          </div>
        </section>

        <div className="space-y-3">
          {keplrError && (
            <Alert variant="destructive" className="border-red-300/50 bg-red-900/40 text-red-100">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{keplrError}</AlertDescription>
            </Alert>
          )}

          {uploadError && (
            <Alert variant="destructive" className="border-red-300/50 bg-red-900/40 text-red-100">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
        </div>

        <footer className="pb-2 pt-4 text-center text-sm text-slate-300">
          <p>Testnet: injective-888</p>
          <p>
            Need help?{' '}
            <a
              href="https://testnet.explorer.injective.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-cyan-300 underline decoration-cyan-300/50 underline-offset-4 hover:text-cyan-200"
            >
              Check block explorer
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
