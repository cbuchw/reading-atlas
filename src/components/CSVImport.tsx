import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { searchBooks } from '../services/bookMetadata';

interface CSVImportProps {
  onImport: (books: any[]) => void;
  onClose: () => void;
}

export const CSVImport: React.FC<CSVImportProps> = ({ onImport, onClose }) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file');
      return;
    }

    setStep('processing');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: async (results) => {
        const rows = results.data as any[];
        const headers = results.meta.fields || [];
        
        const hasTitle = headers.some(h => ['title', 'name', 'book'].some(kw => h.includes(kw)));
        const hasAuthor = headers.some(h => ['author', 'writer', 'creator'].some(kw => h.includes(kw)));

        if (rows.length === 0) {
          setError('The CSV file appears to be empty.');
          setStep('upload');
          return;
        }

        if (!hasTitle || !hasAuthor) {
          setError('Could not find "title" and "author" columns. Please ensure your CSV has these headers.');
          setStep('upload');
          return;
        }

        const toProcess = rows.slice(0, 500);
        
        setProgress({ current: 0, total: toProcess.length, status: 'Starting import...' });

        const batchSize = 5;
        const importedBooks: any[] = [];
        
        for (let i = 0; i < toProcess.length; i += batchSize) {
          const batch = toProcess.slice(i, i + batchSize);
          
          const batchResults = await Promise.all(batch.map(async (row, index) => {
            // Robust header detection (now headers are lowercase and trimmed)
          const getVal = (keywords: string[]) => {
            // Priority 1: Exact matches
            for (const kw of keywords) {
              const key = Object.keys(row).find(k => k === kw);
              if (key) return row[key];
            }
            // Priority 2: Starts with keyword (e.g. "title (original)")
            for (const kw of keywords) {
              const key = Object.keys(row).find(k => k.startsWith(kw));
              if (key) return row[key];
            }
            // Priority 3: Contains keyword (but avoid "id" or "number")
            for (const kw of keywords) {
              const key = Object.keys(row).find(k => k.includes(kw) && !k.includes('id') && !k.includes('number'));
              if (key) return row[key];
            }
            // Last resort: any match
            for (const kw of keywords) {
              const key = Object.keys(row).find(k => k.includes(kw));
              if (key) return row[key];
            }
            return null;
          };

          const title = String(getVal(['title', 'name', 'book']) || '').trim();
          const author = String(getVal(['author', 'writer', 'creator']) || '').trim();

          if (!title || !author) return null;

          const currentIndex = i + index + 1;
          setProgress(prev => ({ 
            ...prev,
            current: currentIndex, 
            status: `Processing: ${title}` 
          }));

          // Enrich via Open Library
          const searchResults = await searchBooks(`${title} ${author}`);
          const metadata = searchResults.length > 0 ? searchResults[0] : null;

          return {
            title: String(metadata?.title || title).trim(),
            author: String(metadata?.author || author).trim(),
            isbn: String(metadata?.isbn || '').trim(),
            coverUrl: metadata?.coverUrl,
            countries: [],
            isFictional: false,
            addedAt: new Date()
          };
          }));

          importedBooks.push(...batchResults.filter(b => b !== null));
        }

        setResults(importedBooks);
        setStep('review');
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: '100%' }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: '100%' }}
        className="bg-paper w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] border border-brass/20"
      >
        <div className="p-6 sm:p-8 border-b border-brass/10 flex justify-between items-center bg-paper">
          <h2 className="text-xl sm:text-2xl font-serif font-semibold text-ink flex items-center gap-3">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-olive" />
            Import CSV
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brass/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-ink/40" />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-ink/60 font-medium">Upload your library</p>
                <button 
                  onClick={() => {
                    const csvContent = "title,author\nThe Great Gatsby,F. Scott Fitzgerald\n1984,George Orwell\nTo Kill a Mockingbird,Harper Lee";
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement("a");
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", "reading_atlas_template.csv");
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-xs font-bold text-olive hover:text-olive/80 flex items-center gap-1 transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  Download Template
                </button>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-brass/30 rounded-[2rem] hover:border-olive/50 transition-colors cursor-pointer bg-white/50 group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 text-brass mb-4 group-hover:scale-110 transition-transform" />
                  <p className="mb-2 text-sm text-ink/60 font-medium">Drop your CSV here</p>
                  <p className="text-xs text-ink/40">Columns required: title, author</p>
                </div>
                <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
              </label>
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 p-4 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="py-12 text-center space-y-8">
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-brass/10 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                  <circle 
                    className="text-olive stroke-current transition-all duration-500" 
                    strokeWidth="8" 
                    strokeDasharray={251.2}
                    strokeDashoffset={progress.total > 0 ? 251.2 - (251.2 * progress.current) / progress.total : 251.2}
                    strokeLinecap="round" 
                    fill="transparent" 
                    r="40" cx="50" cy="50" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-display font-bold text-olive">
                    {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-ink mb-2">Analyzing your library...</h3>
                <p className="text-ink/40 italic">{progress.status}</p>
                <p className="text-[10px] font-bold text-brass uppercase tracking-widest mt-4">
                  {progress.current} of {progress.total} books
                </p>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-8">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center gap-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <div>
                  <h3 className="font-bold text-emerald-900">Analysis Complete</h3>
                  <p className="text-sm text-emerald-700">We processed {results.length} books successfully.</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  onImport(results);
                  onClose();
                }}
                className="w-full py-4 bg-olive text-white font-semibold rounded-2xl hover:bg-olive/90 transition-all shadow-xl shadow-olive/20"
              >
                Confirm Import
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
