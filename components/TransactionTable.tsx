'use client';

import { Check, X, Clock, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export interface TransactionRow {
  address: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  txHash?: string;
  error?: string;
}

interface TransactionTableProps {
  transactions: TransactionRow[];
  totalAmount?: number;
  onRetry?: (address: string) => void;
}

export const TransactionTable = ({
  transactions,
  totalAmount,
  onRetry,
}: TransactionTableProps) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-950/45 text-emerald-100';
      case 'failed':
        return 'bg-rose-950/45 text-rose-100';
      case 'pending':
        return 'bg-amber-950/45 text-amber-100';
      default:
        return 'bg-slate-900/50 text-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600 animate-spin" />;
      default:
        return null;
    }
  };

  const successCount = transactions.filter((t) => t.status === 'success').length;
  const failedCount = transactions.filter((t) => t.status === 'failed').length;
  const pendingCount = transactions.filter((t) => t.status === 'pending').length;

  const totalAmountValue =
    totalAmount || transactions.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

  return (
    <div className="w-full space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-cyan-300/30 bg-cyan-950/35 p-3">
          <p className="text-xs text-slate-300">Total Recipients</p>
          <p className="text-xl font-bold text-cyan-200">{transactions.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-300/30 bg-emerald-950/35 p-3">
          <p className="text-xs text-slate-300">Successful</p>
          <p className="text-xl font-bold text-emerald-200">{successCount}</p>
        </div>
        <div className="rounded-lg border border-rose-300/30 bg-rose-950/35 p-3">
          <p className="text-xs text-slate-300">Failed</p>
          <p className="text-xl font-bold text-rose-200">{failedCount}</p>
        </div>
        <div className="rounded-lg border border-amber-300/30 bg-amber-950/35 p-3">
          <p className="text-xs text-slate-300">Pending</p>
          <p className="text-xl font-bold text-amber-200">{pendingCount}</p>
        </div>
      </div>

      {/* Total Amount */}
      <div className="rounded-lg border border-cyan-300/30 bg-linear-to-r from-cyan-900/35 to-blue-900/30 p-4">
        <p className="text-sm text-slate-300">Total Amount to Send</p>
        <p className="text-2xl font-bold text-cyan-100">{totalAmountValue.toFixed(2)} INJ</p>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto rounded-xl border border-cyan-300/30">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/90 text-cyan-100">
            <tr>
              <th className="p-3 text-left font-semibold">Address</th>
              <th className="p-3 text-left font-semibold">Amount (INJ)</th>
              <th className="p-3 text-left font-semibold">Status</th>
              <th className="p-3 text-left font-semibold">Transaction Hash</th>
              <th className="p-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, idx) => (
              <tr key={idx} className={`border-t ${getStatusColor(tx.status)}`}>
                <td className="max-w-37.5 truncate p-3 font-mono text-xs md:max-w-50">
                  {tx.address}
                </td>
                <td className="p-3 font-semibold">{tx.amount}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(tx.status)}
                    <span className="capitalize">{tx.status}</span>
                    {tx.error && (
                      <span className="text-xs truncate" title={tx.error}>
                        ({tx.error})
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  {tx.txHash ? (
                    <div className="flex items-center gap-2">
                      <span className="max-w-30 truncate font-mono text-xs">
                        {tx.txHash.slice(0, 8)}...
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(tx.txHash!)}
                        title="Copy transaction hash"
                        className="text-cyan-100 hover:bg-slate-800/80 hover:text-cyan-100"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="p-3">
                  {tx.status === 'failed' && onRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRetry(tx.address)}
                      className="text-xs"
                    >
                      Retry
                    </Button>
                  )}
                  {copiedHash === tx.txHash && (
                    <span className="text-xs text-emerald-300">Copied!</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transactions.length === 0 && (
        <div className="py-8 text-center text-slate-300">
          <p>No transactions yet. Upload a CSV and connect your wallet to start.</p>
        </div>
      )}
    </div>
  );
};
