import React, { useState } from 'react';
import { Search, Trash2, MapPin, Globe, LayoutGrid, List as ListIcon, Pencil } from 'lucide-react';
import { Book } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { DefaultCover } from './DefaultCover';

interface BookListProps {
  books: Book[];
  onDelete: (id: string) => void;
  onEdit: (book: Book) => void;
}

export const BookList: React.FC<BookListProps> = ({ books, onDelete, onEdit }) => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(search.toLowerCase()) ||
    book.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brass w-5 h-5" />
          <input
            type="text"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-brass/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-olive/5 focus:border-olive transition-all"
          />
        </div>
        
        <div className="flex bg-white border border-brass/20 rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-2 rounded-xl transition-all",
              viewMode === 'grid' ? "bg-olive text-white shadow-md" : "text-brass hover:bg-paper"
            )}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-2 rounded-xl transition-all",
              viewMode === 'list' ? "bg-olive text-white shadow-md" : "text-brass hover:bg-paper"
            )}
          >
            <ListIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-brass/30">
          <Globe className="w-16 h-16 text-brass/20 mx-auto mb-6" />
          <h3 className="text-2xl font-serif text-ink mb-2">Your library is quiet</h3>
          <p className="text-ink/40 max-w-xs mx-auto">No books found matching your search. Try another title or author.</p>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6" 
            : "space-y-4"
        )}>
          <AnimatePresence mode="popLayout">
            {filteredBooks.map((book) => (
              <motion.div
                key={book.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "group bg-white border border-brass/10 transition-all duration-500",
                  viewMode === 'grid' 
                    ? "rounded-2xl overflow-hidden flex flex-col hover:shadow-2xl hover:-translate-y-1" 
                    : "rounded-2xl p-4 flex items-center gap-6 hover:shadow-xl"
                )}
              >
                {/* Cover */}
                <div className={cn(
                  "relative overflow-hidden bg-paper",
                  viewMode === 'grid' ? "aspect-[2/3] w-full" : "w-16 h-24 rounded-lg flex-shrink-0"
                )}>
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <DefaultCover 
                      title={book.title} 
                      author={book.author} 
                      variant={viewMode === 'grid' ? 'grid' : 'list'} 
                    />
                  )}
                  
                  {viewMode === 'grid' && (
                    <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(book);
                        }}
                        className="p-3 bg-white text-olive rounded-full hover:bg-olive/10 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (book.id) onDelete(book.id);
                        }}
                        className="p-3 bg-white text-red-500 rounded-full hover:bg-red-50 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className={cn(
                  "flex-1 flex flex-col",
                  viewMode === 'grid' ? "p-4" : ""
                )}>
                  <div className="flex-1">
                    <h4 className={cn(
                      "font-serif font-bold text-ink mb-1 line-clamp-1",
                      viewMode === 'grid' ? "text-base" : "text-xl"
                    )}>
                      {book.title}
                    </h4>
                    <p className="text-sm text-ink/50 italic mb-2">{book.author}</p>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {book.countries?.map(c => (
                        <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 bg-olive/5 text-olive text-[9px] font-bold uppercase tracking-widest rounded border border-olive/10">
                          <MapPin className="w-2 h-2" />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {viewMode === 'list' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(book);
                        }}
                        className="p-3 text-ink/20 hover:text-olive transition-colors"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (book.id) onDelete(book.id);
                        }}
                        className="p-3 text-ink/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const BookOpen = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
