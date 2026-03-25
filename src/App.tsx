import React, { useState, useEffect } from 'react';
import { auth, db, signIn, logOut, handleFirestoreError, OperationType, firebaseConfig } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, addDoc, deleteDoc, updateDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Book } from './types';
import { WorldMap } from './components/WorldMap';
import { BookForm } from './components/BookForm';
import { BookList } from './components/BookList';
import { CSVImport } from './components/CSVImport';
import { GoodreadsImport } from './components/GoodreadsImport';
import { DefaultCover } from './components/DefaultCover';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  Library, 
  Plus, 
  LogOut, 
  LogIn, 
  BookOpen, 
  Map as MapIcon,
  X,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGoodreadsModal, setShowGoodreadsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoadingError("Authentication is taking longer than expected. Please check your internet connection or try refreshing.");
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("Auth state changed:", u ? u.email : "No user");
      setUser(u);
      setLoading(false);
      clearTimeout(timeoutId);
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoadingError(`Authentication error: ${error.message}`);
      setLoading(false);
      clearTimeout(timeoutId);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [loading]);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signIn();
      showToast("Welcome back to your library!");
    } catch (error: any) {
      console.error("Sign-in error in App:", error);
      let message = "Failed to sign in. Please try again.";
      if (error.code === 'auth/popup-closed-by-user') {
        message = "Sign-in popup was closed. Please try again.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized for sign-in. Please contact support.";
      } else if (error.message) {
        message = `Sign-in error: ${error.message}`;
      }
      showToast(message, "error");
    } finally {
      setSigningIn(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setBooks([]);
      return;
    }

    const path = 'books';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid),
      orderBy('addedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const booksData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Book[];
      setBooks(booksData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return unsubscribe;
  }, [user]);

  const handleAddBook = async (bookData: any) => {
    if (!user) return;
    const path = 'books';
    try {
      // Remove any existing id from bookData to avoid conflicts with Firestore document ID
      const { id, ...rest } = bookData;
      
      let finalCountries = rest.countries || [];
      let isFictional = rest.isFictional || false;

      // Sanitize bookData to remove undefined values which Firestore doesn't support
      const sanitizedData = Object.fromEntries(
        Object.entries(rest).filter(([_, v]) => v !== undefined)
      );

      const docData: any = {
        ...sanitizedData,
        countries: finalCountries,
        isFictional,
        userId: user.uid,
        addedAt: serverTimestamp()
      };

      if (id !== undefined) {
        docData.olKey = id;
      }

      const finalDocData = Object.fromEntries(
        Object.entries(docData).filter(([_, v]) => v !== undefined)
      );

      await addDoc(collection(db, path), finalDocData);
      showToast(`"${rest.title}" added to your atlas`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDeleteBook = async (id: string) => {
    const path = `books/${id}`;
    try {
      await deleteDoc(doc(db, 'books', id));
      showToast("Book removed from library");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleBulkDelete = () => {
    if (!user || books.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setShowDeleteConfirm(false);
    const path = 'books';
    try {
      // Delete in batches of 500 (Firestore limit)
      const batchSize = 500;
      for (let i = 0; i < books.length; i += batchSize) {
        const batch = books.slice(i, i + batchSize);
        await Promise.all(batch.map(book => deleteDoc(doc(db, 'books', book.id))));
      }
      showToast("Library cleared successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleUpdateBook = async (id: string, bookData: any) => {
    const path = `books/${id}`;
    try {
      const sanitizedData = Object.fromEntries(
        Object.entries(bookData).filter(([_, v]) => v !== undefined)
      );
      await updateDoc(doc(db, 'books', id), sanitizedData);
      setEditingBook(null);
      showToast("Book updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleImportBooks = async (importedBooks: any[]) => {
    if (!user) return;
    const path = 'books';
    let count = 0;
    for (const book of importedBooks) {
      try {
        // Sanitize to remove undefined values
        const sanitizedBook = Object.fromEntries(
          Object.entries(book).filter(([_, v]) => v !== undefined)
        );

        const docData = {
          ...sanitizedBook,
          userId: user.uid,
          addedAt: serverTimestamp()
        };
        await addDoc(collection(db, path), docData);
        count++;
      } catch (err) {
        console.error(`Import error for book: ${book.title}`, err);
        showToast(`Error importing "${book.title}"`, 'error');
      }
    }
    showToast(`Successfully imported ${count} books`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-8 max-w-md text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-olive/10 rounded-full" />
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-olive border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-serif font-bold text-ink">
              {loadingError ? "Connection Issue" : "Loading Library"}
            </h2>
            <p className="text-ink/60 font-serif italic text-lg">
              {loadingError || "Preparing your personal collection..."}
            </p>
          </div>
          {loadingError && (
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-olive text-white rounded-xl font-semibold hover:bg-olive/90 transition-all shadow-xl shadow-olive/20 active:scale-95"
            >
              Refresh Page
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="mb-12 md:mb-16">
            <span className="block text-xl md:text-2xl font-serif italic text-ink/60 mb-2">The</span>
            <h1 className="text-6xl md:text-8xl font-display font-black text-ink tracking-tighter leading-none mb-8">Reading Atlas</h1>
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-px bg-brass/30" />
              <span className="text-[10px] md:text-xs font-sans font-bold text-brass uppercase tracking-[0.3em] md:tracking-[0.5em]">Map your reading life</span>
            </div>
          </div>
          
          <div className="mb-12 md:mb-16 max-w-md mx-auto px-4">
            <p className="font-serif italic text-2xl md:text-3xl text-olive/70 leading-tight">
              “To travel far, there is no better ship than a book.”
            </p>
            <span className="block mt-6 font-serif text-brass text-base md:text-lg">
              — Emily Dickinson
            </span>
          </div>

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-[260px] mx-auto py-5 bg-olive text-white font-semibold rounded-2xl hover:bg-olive/90 transition-all shadow-xl shadow-olive/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {signingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
            {signingIn ? 'Opening portal...' : 'Begin your journey'}
          </button>

          <div className="mt-12 p-6 bg-brass/5 border border-brass/10 rounded-2xl max-w-md mx-auto">
            <p className="text-sm text-ink/60 flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-brass" />
              <span>
                <strong className="text-ink block mb-1">Trouble signing in?</strong> 
                Ensure popups are enabled in your browser settings. If you're using a private window, try switching to a standard one.
              </span>
            </p>
          </div>

          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="mt-8 text-xs font-sans font-bold text-brass uppercase tracking-widest hover:text-ink transition-colors"
          >
            {showDebug ? 'Hide Diagnostics' : 'Show Diagnostics'}
          </button>

          {showDebug && (
            <div className="mt-4 p-4 bg-ink/5 rounded-xl text-left font-mono text-[10px] text-ink/60 max-w-md mx-auto overflow-auto">
              <p>Domain: {window.location.hostname}</p>
              <p>Auth Domain: {firebaseConfig.authDomain}</p>
              <p>User Agent: {navigator.userAgent.substring(0, 50)}...</p>
              <p>Auth Ready: {(!loading).toString()}</p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const countryBooks = selectedCountry 
    ? books.filter(b => b.countries?.some(c => {
        const mapping: Record<string, string> = {
          'United States': 'United States of America',
          'US': 'United States of America',
          'USA': 'United States of America',
          'UK': 'United Kingdom',
          'Great Britain': 'United Kingdom',
          'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
          'Russian Federation': 'Russia',
          'Czechia': 'Czech Republic',
          'Viet Nam': 'Vietnam',
          'Korea, Republic of': 'Korea, South',
          'Democratic People\'s Republic of Korea': 'Korea, North',
        };
        const normalizedBookCountry = mapping[c] || c;
        return normalizedBookCountry === selectedCountry;
      }))
    : [];

  const uniqueCountriesCount = new Set(books.flatMap(b => b.countries || [])).size;

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-paper/80 backdrop-blur-md border-b border-brass/10 px-4 sm:px-6 py-4 sm:py-6 sticky top-0 z-40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="text-xl sm:text-3xl font-display font-bold text-ink tracking-tight truncate">The Reading Atlas</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* View Switcher */}
          <div className="bg-white border border-brass/10 rounded-full p-1 flex shadow-sm relative">
            <div className="flex relative z-10">
              <button
                onClick={() => setView('map')}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors duration-300",
                  view === 'map' ? "text-white" : "text-olive/60 hover:text-olive"
                )}
              >
                <MapIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Map</span>
              </button>
              <button
                onClick={() => setView('list')}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors duration-300",
                  view === 'list' ? "text-white" : "text-olive/60 hover:text-olive"
                )}
              >
                <Library className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Library</span>
              </button>
            </div>
            
            {/* Sliding Background */}
            <motion.div
              layoutId="activeTab"
              className="absolute inset-y-1 bg-olive rounded-full shadow-lg shadow-olive/20"
              initial={false}
              animate={{
                left: view === 'map' ? 4 : '50%',
                width: 'calc(50% - 4px)'
              }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          </div>

          <div className="h-8 w-px bg-brass/10 mx-1 sm:mx-2" />

          <button
            onClick={() => setShowAddModal(true)}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-olive text-white rounded-full flex items-center justify-center hover:bg-olive/90 transition-all shadow-lg shadow-olive/20 active:scale-95"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={logOut}
            className="p-1.5 sm:p-2 text-ink/40 hover:text-red-400 transition-colors"
            title="Leave Library"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="flex-1 relative">
          {view === 'map' ? (
            <div className="absolute inset-0">
              <WorldMap 
                books={books} 
                onCountryClick={(name) => setSelectedCountry(name)} 
                selectedCountry={selectedCountry}
                onAddClick={() => setShowAddModal(true)}
              />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto w-full">
              <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-4xl font-serif font-bold text-ink tracking-tight">The Collected Works</h2>
                  <p className="text-ink/40 mt-2 italic">
                    You have explored <span className="text-olive font-bold">{books.length}</span> stories across <span className="text-olive font-bold">{uniqueCountriesCount}</span> nations.
                  </p>
                </div>
                {books.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 text-red-500/60 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm font-medium shrink-0 border border-transparent hover:border-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Library
                  </button>
                )}
              </div>
              <BookList 
                books={books} 
                onDelete={handleDeleteBook} 
                onEdit={(book) => setEditingBook(book)}
              />
            </div>
          )}
        </div>
      </main>

      {/* Country Detail Modal */}
      <AnimatePresence>
        {selectedCountry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:justify-end"
            onClick={() => setSelectedCountry(null)}
          >
            <motion.div
              initial={{ x: '100%', y: '100%' }}
              animate={{ x: 0, y: 0 }}
              exit={{ x: '100%', y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="bg-paper w-full sm:max-w-lg h-[85vh] sm:h-full shadow-2xl p-6 sm:p-10 overflow-y-auto border-t sm:border-t-0 sm:border-l border-brass/20 rounded-t-[2.5rem] sm:rounded-t-none"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-8 sm:mb-12">
                <div>
                  <h3 className="text-3xl sm:text-5xl font-serif font-bold text-ink mb-2">{selectedCountry}</h3>
                  <p className="text-olive font-medium italic text-base sm:text-lg">{countryBooks.length} volumes discovered here</p>
                </div>
                <button onClick={() => setSelectedCountry(null)} className="p-2 sm:p-3 hover:bg-brass/10 rounded-full transition-colors">
                  <X className="w-6 h-6 sm:w-7 sm:h-7 text-brass" />
                </button>
              </div>

              {countryBooks.length === 0 ? (
                <div className="text-center py-16 sm:py-24">
                  <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-brass/20 mx-auto mb-6" />
                  <p className="text-ink/40 italic">This territory remains unexplored in your library.</p>
                </div>
              ) : (
                <div className="space-y-8 sm:space-y-10">
                  {countryBooks.map(book => (
                    <div key={book.id} className="flex gap-4 sm:gap-6 group">
                      <div className="w-20 h-28 sm:w-24 sm:h-36 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-brass/10 group-hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <DefaultCover title={book.title} author={book.author} />
                        )}
                      </div>
                      <div className="flex-1 py-1 sm:py-2">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <h4 className="text-xl sm:text-2xl font-serif font-bold text-ink mb-1 group-hover:text-olive transition-colors truncate">{book.title}</h4>
                            {book.isFictional && (
                              <span className="inline-block px-2 py-0.5 bg-brass/10 text-brass text-[10px] font-bold uppercase tracking-wider rounded-md mb-2">
                                Fictional World
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={() => setEditingBook(book)}
                            className="p-2 text-ink/20 hover:text-olive transition-colors shrink-0"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-sm sm:text-base text-ink/50 italic mb-3 sm:mb-4 truncate">{book.author}</p>
                        <div className="flex items-center text-[9px] sm:text-[10px] font-bold text-brass uppercase tracking-[0.2em]">
                          Archived {book.addedAt?.toDate().toLocaleDateString()}
                          <ChevronRight className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-4 border backdrop-blur-md min-w-[280px] max-w-[90vw]",
              toast.type === 'success' 
                ? "bg-olive text-white border-olive/20 shadow-olive/20" 
                : "bg-red-900 text-white border-red-500/20 shadow-red-900/20"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">
                {toast.type === 'success' ? 'Success' : 'Error'}
              </span>
              <span className="font-serif text-lg leading-tight">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {showAddModal && (
        <BookForm 
          onAdd={handleAddBook} 
          onClose={() => setShowAddModal(false)} 
          onImportCSV={() => {
            setShowAddModal(false);
            setShowImportModal(true);
          }}
          onImportGoodreads={() => {
            setShowAddModal(false);
            setShowGoodreadsModal(true);
          }}
        />
      )}
      {editingBook && (
        <BookForm 
          initialData={editingBook} 
          onUpdate={(data) => handleUpdateBook(editingBook.id!, data)} 
          onClose={() => setEditingBook(null)} 
        />
      )}
      {showImportModal && (
        <CSVImport onImport={handleImportBooks} onClose={() => setShowImportModal(false)} />
      )}
      {showGoodreadsModal && (
        <GoodreadsImport onImport={handleImportBooks} onClose={() => setShowGoodreadsModal(false)} />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-paper max-w-sm w-full rounded-[2rem] p-8 shadow-2xl border border-brass/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-ink text-center mb-2">Clear Library?</h3>
              <p className="text-ink/60 text-center mb-8 italic">
                This will permanently delete all <span className="text-ink font-bold">{books.length}</span> books from your collection. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmBulkDelete}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                  Yes, Clear Everything
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 bg-brass/10 text-ink rounded-2xl font-bold hover:bg-brass/20 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
