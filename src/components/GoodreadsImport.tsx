import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, Loader2, AlertCircle, ExternalLink, Info } from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { fetchBookByISBN, searchBooks } from '../services/openLibrary';

interface GoodreadsImportProps {
  onImport: (books: any[]) => void;
  onClose: () => void;
}

export const GoodreadsImport: React.FC<GoodreadsImportProps> = ({ onImport, onClose }) => {
  const [step, setStep] = useState<'guide' | 'upload' | 'processing' | 'review'>('guide');
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
      complete: async (results) => {
        const rows = results.data as any[];
        
        // Validate Goodreads format
        const headers = results.meta.fields || [];
        const hasTitle = headers.some(h => h.toLowerCase().trim() === 'title');
        
        if (!hasTitle) {
          setError('This file does not appear to be a valid Goodreads export.');
          setStep('upload');
          return;
        }

        // Normalize rows to lowercase headers
        const normalizedRows = rows.map(row => {
          const newRow: any = {};
          Object.keys(row).forEach(key => {
            newRow[key.toLowerCase().trim()] = row[key];
          });
          return newRow;
        });

        // Filter for 'read' shelf if possible
        const toProcess = normalizedRows
          .filter(row => !row['exclusive shelf'] || row['exclusive shelf'] === 'read')
          .slice(0, 500);

        setProgress({ current: 0, total: toProcess.length, status: 'Starting import...' });

        const batchSize = 5;
        const importedBooks: any[] = [];
        
        for (let i = 0; i < toProcess.length; i += batchSize) {
          const batch = toProcess.slice(i, i + batchSize);
          
          const batchResults = await Promise.all(batch.map(async (row, index) => {
            const title = String(row.title || '').trim();
            const author = String(row.author || '').trim();
            const isbn = (row.isbn || row.isbn13 || '').toString().replace(/[^0-9X]/g, '');

            if (!title) return null;

            const currentIndex = i + index + 1;
            setProgress(prev => ({ 
              ...prev,
              current: currentIndex, 
              status: `Enriching: ${title}` 
            }));

            let metadata = null;
            if (isbn) {
              metadata = await fetchBookByISBN(isbn);
            }
            
            if (!metadata) {
              const searchResults = await searchBooks(`${title} ${author}`);
              if (searchResults.length > 0) {
                metadata = searchResults[0];
              }
            }

            const finalTitle = String(metadata?.title || title).trim();
            const finalAuthor = String(metadata?.author || author).trim();

            return {
              title: finalTitle,
              author: finalAuthor,
              isbn: String(metadata?.isbn || isbn).trim(),
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
        className="bg-paper w-full max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] border border-brass/20"
      >
        <div className="p-6 sm:p-8 border-b border-brass/10 flex justify-between items-center bg-paper">
          <h2 className="text-xl sm:text-2xl font-serif font-semibold text-ink flex items-center gap-3">
            <ExternalLink className="w-5 h-5 sm:w-6 sm:h-6 text-olive" />
            Goodreads Migration
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brass/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-ink/40" />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto">
          {step === 'guide' && (
            <div className="space-y-8">
              <div className="bg-olive/5 p-6 rounded-2xl border border-olive/10">
                <h3 className="font-bold text-olive mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  How to export from Goodreads
                </h3>
                <ol className="space-y-4 text-sm text-ink/70 list-decimal list-inside">
                  <li>Go to <span className="font-mono text-olive">My Books</span> on Goodreads.com</li>
                  <li>Click <span className="font-mono text-olive">Import and Export</span> in the sidebar</li>
                  <li>Click the <span className="font-mono text-olive">Export Library</span> button at the top right</li>
                  <li>Wait for the file to generate and download it</li>
                </ol>
              </div>
              <button
                onClick={() => setStep('upload')}
                className="w-full py-4 bg-olive text-white font-semibold rounded-2xl hover:bg-olive/90 transition-all shadow-xl shadow-olive/20"
              >
                I have my CSV file
              </button>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-brass/30 rounded-[2rem] hover:border-olive/50 transition-colors cursor-pointer bg-white/50 group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 text-brass mb-4 group-hover:scale-110 transition-transform" />
                  <p className="mb-2 text-sm text-ink/60 font-medium">Drop your Goodreads CSV here</p>
                  <p className="text-xs text-ink/40">or click to browse</p>
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
                <h3 className="text-xl font-serif font-bold text-ink mb-2">Mapping your journey...</h3>
                <p className="text-ink/40 italic">{progress.status}</p>
                <p className="text-[10px] font-bold text-brass uppercase tracking-widest mt-4">
                  {progress.current} of {progress.total} books processed
                </p>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-8">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center gap-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <div>
                  <h3 className="font-bold text-emerald-900">Import Ready</h3>
                  <p className="text-sm text-emerald-700">We found {results.length} books to add to your atlas.</p>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                {results.slice(0, 10).map((book, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-white border border-brass/10 rounded-xl">
                    <div className="w-8 h-12 bg-paper rounded overflow-hidden flex-shrink-0">
                      {book.coverUrl && <img src={book.coverUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{book.title}</p>
                      <p className="text-xs text-ink/40">{book.countries.join(', ') || (book.isFictional ? 'Fictional World' : 'No location detected')}</p>
                    </div>
                  </div>
                ))}
                {results.length > 10 && (
                  <p className="text-center text-xs text-ink/30 italic">...and {results.length - 10} more books</p>
                )}
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
