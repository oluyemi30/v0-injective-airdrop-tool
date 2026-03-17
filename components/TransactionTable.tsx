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
        return 'bg-green-50 text-green-700';
      case 'failed':
        return 'bg-red-50 text-red-700';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return 'bg-gray-50 text-gray-700';
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
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600">Total Recipients</p>
          <p className="text-xl font-bold text-blue-600">{transactions.length}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600">Successful</p>
          <p className="text-xl font-bold text-green-600">{successCount}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600">Failed</p>
          <p className="text-xl font-bold text-red-600">{failedCount}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
      </div>

      {/* Total Amount */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Total Amount to Send</p>
        <p className="text-2xl font-bold text-blue-700">{totalAmountValue.toFixed(2)} INJ</p>
      </div>

      {/* Transaction Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
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
                <td className="p-3 font-mono text-xs truncate max-w-[150px] md:max-w-[200px]">
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
                      <span className="font-mono text-xs truncate max-w-[120px]">
                        {tx.txHash.slice(0, 8)}...
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(tx.txHash!)}
                        title="Copy transaction hash"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
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
                    <span className="text-xs text-green-600">Copied!</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No transactions yet. Upload a CSV and connect your wallet to start.</p>
        </div>
      )}
    </div>
  );
};
