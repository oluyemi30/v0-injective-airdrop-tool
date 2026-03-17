'use client';

import { Check, X, Clock, Copy, ExternalLink } from 'lucide-react';
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
        return 'bg-emerald-500/10 border-emerald-500/30';
      case 'failed':
        return 'bg-red-500/10 border-red-500/30';
      case 'pending':
        return 'bg-amber-500/10 border-amber-500/30';
      default:
        return 'bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-emerald-300';
      case 'failed':
        return 'text-red-300';
      case 'pending':
        return 'text-amber-300';
      default:
        return 'text-slate-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-400 animate-spin" />;
      default:
        return null;
    }
  };

  const successCount = transactions.filter((t) => t.status === 'success').length;
  const failedCount = transactions.filter((t) => t.status === 'failed').length;
  const pendingCount = transactions.filter((t) => t.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-2xl font-bold text-emerald-300">{successCount}</p>
          <p className="text-xs text-muted-foreground">Success</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-2xl font-bold text-amber-300">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
          <p className="text-2xl font-bold text-red-300">{failedCount}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 font-semibold text-indigo-300">Recipient</th>
              <th className="text-right py-3 px-4 font-semibold text-indigo-300">Amount</th>
              <th className="text-center py-3 px-4 font-semibold text-indigo-300">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-indigo-300">Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, idx) => (
              <tr
                key={idx}
                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${getStatusColor(
                  tx.status
                )} border`}
              >
                <td className="py-3 px-4">
                  <code className="text-xs font-mono text-cyan-300 break-all">{tx.address}</code>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-semibold text-amber-300">{parseFloat(tx.amount).toFixed(2)}</span>
                  <span className="text-muted-foreground text-xs ml-1">INJ</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-2">
                    {getStatusIcon(tx.status)}
                    <span className={`capitalize font-medium ${getStatusTextColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {tx.txHash ? (
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-purple-300 truncate max-w-xs">
                        {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-8)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(tx.txHash!)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Copy hash"
                      >
                        <Copy
                          className={`w-3 h-3 ${
                            copiedHash === tx.txHash ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                      </button>
                      <a
                        href={`https://testnet.explorer.injective.dev/transaction/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="View on explorer"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-400 hover:text-indigo-300" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {totalAmount !== undefined && (
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Distributed</p>
            <p className="text-2xl font-bold text-cyan-300">{totalAmount.toFixed(2)} INJ</p>
          </div>
        </div>
      )}
    </div>
  );
};
