import React, { useState, useEffect } from 'react';
import { auth, db, signIn, logOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, addDoc, deleteDoc, updateDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Book } from './types';
import { WorldMap } from './components/WorldMap';
import { BookForm } from './components/BookForm';
import { BookList } from './components/BookList';
import { CSVImport } from './components/CSVImport';
import { GleephImport } from './components/GleephImport';
import { DefaultCover } from './components/DefaultCover';
import { 
  Library, 
  Plus, 
  Upload, 
  LogOut, 
  LogIn, 
  BookOpen, 
  Map as MapIcon,
  X,
  ChevronRight,
  Loader2,
  ClipboardPaste
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGleephModal, setShowGleephModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signIn();
    } catch (error) {
      // Errors are handled in firebase.ts, but we catch here to reset state
    } finally {
      setSigningIn(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setBooks([]);
      return;
    }

    const q = query(
      collection(db, 'books'),
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
      console.error("Firestore error:", error);
    });

    return unsubscribe;
  }, [user]);

  const handleAddBook = async (bookData: any) => {
    if (!user) return;
    try {
      // Remove any existing id from bookData to avoid conflicts with Firestore document ID
      const { id, ...rest } = bookData;
      
      // Sanitize bookData to remove undefined values which Firestore doesn't support
      const sanitizedData = Object.fromEntries(
        Object.entries(rest).filter(([_, v]) => v !== undefined)
      );

      const docData: any = {
        ...sanitizedData,
        userId: user.uid,
        addedAt: serverTimestamp()
      };

      if (id !== undefined) {
        docData.olKey = id;
      }

      await addDoc(collection(db, 'books'), docData);
    } catch (error) {
      console.error("Error adding book:", error);
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'books', id));
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  const handleUpdateBook = async (id: string, bookData: any) => {
    try {
      const sanitizedData = Object.fromEntries(
        Object.entries(bookData).filter(([_, v]) => v !== undefined)
      );
      await updateDoc(doc(db, 'books', id), sanitizedData);
      setEditingBook(null);
    } catch (error) {
      console.error("Error updating book:", error);
    }
  };

  const handleImportBooks = async (importedBooks: any[]) => {
    if (!user) return;
    for (const book of importedBooks) {
      await handleAddBook(book);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Loading your library...</p>
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
          <div className="mb-16">
            <span className="block text-2xl font-serif italic text-ink/60 mb-2">The</span>
            <h1 className="text-8xl font-display font-black text-ink tracking-tighter leading-none mb-8">Reading Atlas</h1>
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-px bg-brass/30" />
              <span className="text-xs font-sans font-bold text-brass uppercase tracking-[0.5em]">Map your reading life</span>
            </div>
          </div>
          
          <div className="mb-16 max-w-md mx-auto">
            <p className="font-serif italic text-3xl text-olive/70 leading-tight">
              “To travel far, there is no better ship than a book.”
            </p>
            <span className="block mt-6 font-serif text-brass text-lg">
              — Emily Dickinson
            </span>
          </div>

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-[260px] mx-auto py-5 bg-olive text-white font-semibold rounded-2xl hover:bg-olive/90 transition-all shadow-xl shadow-olive/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {signingIn ? 'Opening portal...' : 'Begin your journey'}
          </button>
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
      <header className="bg-paper/80 backdrop-blur-md border-b border-brass/10 px-6 py-6 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-display font-bold text-ink tracking-tight">The Reading Atlas</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* View Switcher */}
          <div className="bg-white border border-brass/10 rounded-full p-1 flex shadow-sm relative">
            <div className="flex relative z-10">
              <button
                onClick={() => setView('map')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-colors duration-300",
                  view === 'map' ? "text-white" : "text-olive/60 hover:text-olive"
                )}
              >
                <MapIcon className="w-4 h-4" />
                <span>Map</span>
              </button>
              <button
                onClick={() => setView('list')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-colors duration-300",
                  view === 'list' ? "text-white" : "text-olive/60 hover:text-olive"
                )}
              >
                <Library className="w-4 h-4" />
                <span>Library</span>
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

          <div className="h-8 w-px bg-brass/10 mx-2" />

          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 bg-olive text-white rounded-full flex items-center justify-center hover:bg-olive/90 transition-all shadow-lg shadow-olive/20 active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>

          <button
            onClick={logOut}
            className="p-2 text-ink/40 hover:text-red-400 transition-colors"
            title="Leave Library"
          >
            <LogOut className="w-5 h-5" />
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
              <div className="mb-8">
                <h2 className="text-4xl font-serif font-bold text-ink tracking-tight">The Collected Works</h2>
                <p className="text-ink/40 mt-2 italic">
                  You have explored <span className="text-olive font-bold">{books.length}</span> stories across <span className="text-olive font-bold">{uniqueCountriesCount}</span> nations.
                </p>
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
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-end"
            onClick={() => setSelectedCountry(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="bg-paper w-full max-w-lg h-full shadow-2xl p-10 overflow-y-auto border-l border-brass/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-12">
                <div>
                  <h3 className="text-5xl font-serif font-bold text-ink mb-2">{selectedCountry}</h3>
                  <p className="text-olive font-medium italic text-lg">{countryBooks.length} volumes discovered here</p>
                </div>
                <button onClick={() => setSelectedCountry(null)} className="p-3 hover:bg-brass/10 rounded-full transition-colors">
                  <X className="w-7 h-7 text-brass" />
                </button>
              </div>

              {countryBooks.length === 0 ? (
                <div className="text-center py-24">
                  <BookOpen className="w-16 h-16 text-brass/20 mx-auto mb-6" />
                  <p className="text-ink/40 italic">This territory remains unexplored in your library.</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {countryBooks.map(book => (
                    <div key={book.id} className="flex gap-6 group">
                      <div className="w-24 h-36 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-brass/10 group-hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <DefaultCover title={book.title} author={book.author} />
                        )}
                      </div>
                      <div className="flex-1 py-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-2xl font-serif font-bold text-ink mb-1 group-hover:text-olive transition-colors">{book.title}</h4>
                          <button 
                            onClick={() => setEditingBook(book)}
                            className="p-2 text-ink/20 hover:text-olive transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-ink/50 italic mb-4">{book.author}</p>
                        <div className="flex items-center text-[10px] font-bold text-brass uppercase tracking-[0.2em]">
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

      {/* Modals */}
      {showAddModal && (
        <BookForm 
          onAdd={handleAddBook} 
          onClose={() => setShowAddModal(false)} 
          onGleephClick={() => {
            setShowAddModal(false);
            setShowGleephModal(true);
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
      {showGleephModal && (
        <GleephImport onImport={handleImportBooks} onClose={() => setShowGleephModal(false)} />
      )}
    </div>
  );
}
