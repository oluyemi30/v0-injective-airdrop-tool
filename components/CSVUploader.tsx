'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { AlertCircle, Upload, CheckCircle, File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface CSVRow {
  address: string;
  amount: string;
}

interface CSVUploaderProps {
  onDataParsed: (data: CSVRow[]) => void;
}

export const CSVUploader = ({ onDataParsed }: CSVUploaderProps) => {
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateRow = (row: any): row is CSVRow => {
    return row.address && String(row.address).trim() && row.amount && String(row.amount).trim();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);
    setError('');
    setParsedData([]);
    setPreview([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as any[];

          // Validate headers
          if (!results.meta.fields?.includes('address') || !results.meta.fields?.includes('amount')) {
            throw new Error('CSV must contain "address" and "amount" columns');
          }

          // Filter and validate rows
          const validRows = rows.filter(validateRow);

          if (validRows.length === 0) {
            throw new Error('No valid rows found in CSV');
          }

          setParsedData(validRows);
          setPreview(validRows.slice(0, 5));
          onDataParsed(validRows);
        } catch (err: any) {
          setError(err.message || 'Error parsing CSV');
        } finally {
          setIsLoading(false);
        }
      },
      error: (error) => {
        setError(`Parse error: ${error.message}`);
        setIsLoading(false);
      },
    });
  };

  const handleClear = () => {
    setParsedData([]);
    setPreview([]);
    setError('');
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onDataParsed([]);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="relative border-2 border-dashed border-indigo-400/30 rounded-xl p-8 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 hover:border-indigo-400/60 hover:from-indigo-500/10 hover:to-purple-500/10 transition-all cursor-pointer group"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isLoading}
        />

        <div className="text-center">
          <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-lg font-semibold text-foreground mb-1">
            {isLoading ? 'Processing...' : 'Drop or click to upload CSV'}
          </p>
          <p className="text-sm text-muted-foreground">
            File should contain: address, amount columns
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/30 rounded-xl">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {/* File Info */}
      {parsedData.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <File className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="font-semibold text-foreground">{fileName}</p>
                <p className="text-sm text-muted-foreground">{parsedData.length} records</p>
              </div>
            </div>
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Preview Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 font-semibold text-indigo-300">#</th>
                  <th className="text-left py-2 px-3 font-semibold text-indigo-300">Address</th>
                  <th className="text-right py-2 px-3 font-semibold text-indigo-300">Amount (INJ)</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono text-xs text-cyan-300 truncate">
                      {row.address}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-300 font-semibold">
                      {parseFloat(row.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2 px-3">
                ... and {parsedData.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
