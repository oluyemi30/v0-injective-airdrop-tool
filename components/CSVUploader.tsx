'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { AlertCircle, Upload, CheckCircle } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateRow = (row: any): row is CSVRow => {
    return row.address && String(row.address).trim() && row.amount && String(row.amount).trim();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
          const invalidCount = rows.length - validRows.length;

          if (validRows.length === 0) {
            throw new Error('No valid rows found. Ensure all rows have address and amount.');
          }

          setParsedData(validRows);
          setPreview(validRows.slice(0, 5));
          onDataParsed(validRows);

          if (invalidCount > 0) {
            setError(`Warning: ${invalidCount} row(s) skipped due to missing address or amount`);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to parse CSV');
          setParsedData([]);
          setPreview([]);
        } finally {
          setIsLoading(false);
        }
      },
      error: (error) => {
        setError(`Parsing error: ${error.message}`);
        setIsLoading(false);
      },
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload">
          <Button
            asChild
            variant="outline"
            className="cursor-pointer"
            disabled={isLoading}
          >
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {isLoading ? 'Uploading...' : 'Upload CSV'}
            </span>
          </Button>
        </label>
        <p className="text-sm text-gray-500 mt-2">
          CSV must contain: address, amount
        </p>
      </div>

      {error && (
        <Alert variant={error.startsWith('Warning') ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {parsedData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold">
              {parsedData.length} valid row{parsedData.length !== 1 ? 's' : ''} loaded
            </p>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left font-semibold">Address</th>
                  <th className="p-3 text-left font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs truncate">{row.address}</td>
                    <td className="p-3">{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parsedData.length > 5 && (
            <p className="text-xs text-gray-500">
              Showing first 5 of {parsedData.length} rows
            </p>
          )}
        </div>
      )}
    </div>
  );
};
