import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface CSVImportProps {
  onImport: (books: any[]) => void;
  onClose: () => void;
}

export const CSVImport: React.FC<CSVImportProps> = ({ onImport, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const books = results.data.map((row: any) => ({
          title: row.title || row.Title,
          author: row.author || row.Author,
          isbn: row.isbn || row.ISBN || '',
          countries: (row.countries || row.Countries || row.country || row.Country || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          fictionalPlaces: (row.fictional || row.Fictional || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        })).filter(b => b.title && b.author).slice(0, 500);

        if (books.length === 0) {
          setError('No valid books found in CSV. Ensure you have "title" and "author" columns.');
          setLoading(false);
          return;
        }

        onImport(books);
        setSuccess(books.length);
        setLoading(false);
        setTimeout(onClose, 2000);
      },
      error: (err) => {
        setError(`Error parsing CSV: ${err.message}`);
        setLoading(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Import CSV</h2>
          <p className="text-gray-500 mt-2">Upload a CSV file with columns: title, author, isbn, countries.</p>
        </div>

        <div className="space-y-4">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {!loading && !success && !error && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
            >
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2 group-hover:text-emerald-500" />
              <span className="text-gray-600 font-medium">Click to select CSV file</span>
            </button>
          )}

          {loading && (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-gray-600">Processing your library...</p>
            </div>
          )}

          {success && (
            <div className="py-8 flex flex-col items-center gap-3 text-emerald-600">
              <CheckCircle2 className="w-12 h-12" />
              <p className="font-semibold">Successfully imported {success} books!</p>
            </div>
          )}

          {error && (
            <div className="py-8 flex flex-col items-center gap-3 text-red-500">
              <AlertCircle className="w-12 h-12" />
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm underline"
              >
                Try again
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
