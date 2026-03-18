import React, { useState, useMemo, useEffect } from 'react';
import { Search, Loader2, Plus, X, Book as BookIcon, Check, AlertCircle, Search as SearchIcon, ClipboardPaste } from 'lucide-react';
import { searchBooks, BookMetadata, fetchBookByISBN } from '../services/openLibrary';
import { cn } from '../lib/utils';
import { COUNTRIES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface BookFormProps {
  onAdd?: (book: {
    title: string;
    author: string;
    isbn?: string;
    coverUrl?: string;
    countries: string[];
  }) => void;
  onUpdate?: (book: {
    title: string;
    author: string;
    isbn?: string;
    coverUrl?: string;
    countries: string[];
  }) => void;
  initialData?: any;
  onClose: () => void;
  onGleephClick?: () => void;
}

export const BookForm: React.FC<BookFormProps> = ({ onAdd, onUpdate, initialData, onClose, onGleephClick }) => {
  const [isbn, setIsbn] = useState(initialData?.isbn || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [author, setAuthor] = useState(initialData?.author || '');
  const [coverUrl, setCoverUrl] = useState(initialData?.coverUrl || '');
  const [countries, setCountries] = useState<string[]>(initialData?.countries || []);
  const [countryInput, setCountryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const isEditMode = !!initialData;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookMetadata[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        const results = await searchBooks(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectBook = (book: BookMetadata) => {
    setTitle(book.title);
    setAuthor(book.author);
    setIsbn(book.isbn || '');
    setCoverUrl(book.coverUrl || '');
    setSearchQuery('');
    setSearchResults([]);
    setLookupStatus('success');
  };

  const filteredCountries = useMemo(() => {
    if (!countryInput) return [];
    return COUNTRIES.filter(c => 
      c.toLowerCase().includes(countryInput.toLowerCase()) && 
      !countries.includes(c)
    ).slice(0, 5);
  }, [countryInput, countries]);

  const handleLookup = async () => {
    if (!isbn) return;
    setLoading(true);
    setLookupStatus('idle');
    try {
      const metadata = await fetchBookByISBN(isbn);
      if (metadata) {
        setTitle(metadata.title);
        setAuthor(metadata.author);
        setCoverUrl(metadata.coverUrl || '');
        setLookupStatus('success');
      } else {
        setLookupStatus('error');
      }
    } catch (err) {
      setLookupStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const addCountry = (name: string) => {
    if (name && !countries.includes(name)) {
      setCountries([...countries, name]);
      setCountryInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author) return;
    
    const bookData = {
      title,
      author,
      isbn,
      coverUrl,
      countries
    };

    if (isEditMode && onUpdate) {
      onUpdate(bookData);
    } else if (onAdd) {
      onAdd(bookData);
    }
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-paper w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-brass/20"
      >
        <div className="p-8 border-b border-brass/10 flex justify-between items-center bg-paper">
          <h2 className="text-2xl font-serif font-semibold text-ink flex items-center gap-3">
            <BookIcon className="w-6 h-6 text-olive" />
            {isEditMode ? 'Edit book details' : 'Add to your collection'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brass/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-ink/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
          {/* Gleeph Import Shortcut */}
          {!isEditMode && onGleephClick && (
            <button
              type="button"
              onClick={onGleephClick}
              className="w-full py-4 px-6 bg-olive/5 border border-olive/10 text-olive rounded-2xl flex items-center justify-center gap-3 hover:bg-olive/10 transition-all group"
            >
              <ClipboardPaste className="w-5 h-5" />
              <div className="text-left">
                <p className="font-bold text-sm">Importer depuis Gleeph</p>
                <p className="text-[10px] opacity-60 uppercase tracking-wider">Copier-coller ou capture d'écran</p>
              </div>
            </button>
          )}

          {/* Search by Title/Author */}
          <div className="space-y-3">
            <label className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-ink/40">Search by Title or Author</label>
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for a book..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 bg-white border border-brass/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-olive/5 focus:border-olive transition-all"
                />
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/20" />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-olive" />
                  </div>
                )}
              </div>

              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-brass/20 rounded-2xl shadow-xl z-20 overflow-hidden"
                  >
                    {searchResults.map(book => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => selectBook(book)}
                        className="w-full text-left px-5 py-3 hover:bg-paper transition-colors border-b border-brass/5 last:border-0 flex items-center gap-4"
                      >
                        {book.coverUrl ? (
                          <img src={book.coverUrl} className="w-10 h-14 object-cover rounded shadow-sm" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-14 bg-paper rounded flex items-center justify-center">
                            <BookIcon className="w-4 h-4 text-ink/20" />
                          </div>
                        )}
                        <div>
                          <p className="font-serif font-bold text-ink line-clamp-1">{book.title}</p>
                          <p className="text-xs text-ink/40 italic">{book.author}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px bg-brass/10 flex-1" />
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-ink/20">or enter manually</span>
            <div className="h-px bg-brass/10 flex-1" />
          </div>

          {/* ISBN Lookup */}
          <div className="space-y-3">
            <label className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-ink/40">ISBN Lookup</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter ISBN..."
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  className="w-full px-5 py-3 bg-white border border-brass/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-olive/5 focus:border-olive transition-all"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin text-olive" />}
                  {lookupStatus === 'success' && <Check className="w-4 h-4 text-emerald-600" />}
                  {lookupStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLookup}
                disabled={loading || !isbn}
                className="px-6 py-3 bg-olive text-white rounded-2xl hover:bg-olive/90 transition-all disabled:opacity-50 font-medium"
              >
                Lookup
              </button>
            </div>
            <AnimatePresence>
              {lookupStatus === 'error' && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 font-medium"
                >
                  Could not find book details. Please enter manually.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Title & Author */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-ink/40">Title *</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-5 py-3 bg-white border border-brass/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-olive/5 focus:border-olive transition-all"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-ink/40">Author *</label>
              <input
                required
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-5 py-3 bg-white border border-brass/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-olive/5 focus:border-olive transition-all"
              />
            </div>
          </div>

          {/* Countries Autocomplete */}
          <div className="space-y-3">
            <label className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-ink/40">Countries</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search for a country..."
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
                className="w-full px-5 py-3 bg-white border border-brass/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-olive/5 focus:border-olive transition-all"
              />
              <AnimatePresence>
                {filteredCountries.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-brass/20 rounded-2xl shadow-xl z-10 overflow-hidden"
                  >
                    {filteredCountries.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => addCountry(c)}
                        className="w-full text-left px-5 py-3 hover:bg-paper transition-colors border-b border-brass/5 last:border-0"
                      >
                        {c}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {countries.map(c => (
                <span key={c} className="px-3 py-1.5 bg-olive/5 text-olive text-sm font-medium rounded-full flex items-center gap-2 border border-olive/10">
                  {c}
                  <button type="button" onClick={() => setCountries(countries.filter(x => x !== c))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-olive text-white font-semibold rounded-2xl hover:bg-olive/90 transition-all shadow-xl shadow-olive/20 flex items-center justify-center gap-3"
          >
            {isEditMode ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {isEditMode ? 'Save Changes' : 'Add to Library'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};
