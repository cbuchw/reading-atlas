import React, { useState } from 'react';
import { X, Loader2, ClipboardPaste, AlertCircle, CheckCircle2, Image as ImageIcon, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { parseGleephText, parseGleephImage } from '../services/gleephService';
import { searchBooks } from '../services/openLibrary';

interface GleephImportProps {
  onImport: (books: any[]) => void;
  onClose: () => void;
}

export const GleephImport: React.FC<GleephImportProps> = ({ onImport, onClose }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedBooks, setParsedBooks] = useState<any[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [importMethod, setImportMethod] = useState<'text' | 'image'>('text');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleParse = async () => {
    if (importMethod === 'text' && !text.trim()) return;
    if (importMethod === 'image' && !imagePreview) return;

    setLoading(true);
    setError(null);
    try {
      let books = [];
      if (importMethod === 'text') {
        books = await parseGleephText(text);
      } else if (imagePreview) {
        books = await parseGleephImage(imagePreview, "image/jpeg");
      }

      if (books.length === 0) {
        setError("Aucun livre n'a pu être extrait. Assurez-vous que le contenu est bien lisible.");
      } else {
        setParsedBooks(books);
        setStep('preview');
      }
    } catch (err) {
      setError("Une erreur est survenue lors de l'analyse.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    try {
      const enrichedBooks = [];
      for (const book of parsedBooks) {
        // Try to find more info (countries, cover) for each book
        const results = await searchBooks(`${book.title} ${book.author}`);
        if (results.length > 0) {
          enrichedBooks.push({
            ...results[0],
            title: book.title, // Keep original title if preferred
            author: book.author
          });
        } else {
          enrichedBooks.push({
            title: book.title,
            author: book.author,
            countries: []
          });
        }
      }
      onImport(enrichedBooks);
      onClose();
    } catch (err) {
      setError("Erreur lors de l'enrichissement des données.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-paper w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-brass/10 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-olive/10 rounded-xl flex items-center justify-center">
              <ClipboardPaste className="w-5 h-5 text-olive" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-ink">Import Gleeph</h2>
              <p className="text-xs text-ink/40 font-medium uppercase tracking-wider">Extraction par IA</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brass/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-brass" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 'input' ? (
            <div className="space-y-6">
              {/* Method Switcher */}
              <div className="flex bg-brass/5 p-1 rounded-2xl border border-brass/10">
                <button
                  onClick={() => setImportMethod('text')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                    importMethod === 'text' ? "bg-white text-olive shadow-sm" : "text-ink/40 hover:text-ink/60"
                  )}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  Texte copié
                </button>
                <button
                  onClick={() => setImportMethod('image')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                    importMethod === 'image' ? "bg-white text-olive shadow-sm" : "text-ink/40 hover:text-ink/60"
                  )}
                >
                  <ImageIcon className="w-4 h-4" />
                  Capture d'écran
                </button>
              </div>

              <div className="bg-olive/5 border border-olive/10 rounded-2xl p-6">
                <h3 className="text-olive font-bold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Comment faire ?
                </h3>
                <ol className="text-sm text-ink/60 space-y-2 list-decimal list-inside">
                  {importMethod === 'text' ? (
                    <>
                      <li>Ouvrez votre étagère sur <strong>Gleeph.com</strong></li>
                      <li>Sélectionnez et <strong>copiez</strong> toute la liste des livres</li>
                      <li><strong>Collez</strong> le texte ci-dessous</li>
                    </>
                  ) : (
                    <>
                      <li>Prenez une <strong>capture d'écran</strong> de vos livres sur Gleeph</li>
                      <li><strong>Importez</strong> l'image ci-dessous</li>
                      <li>L'IA identifiera les titres et auteurs automatiquement</li>
                    </>
                  )}
                </ol>
              </div>

              {importMethod === 'text' ? (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Collez le texte ici..."
                  className="w-full h-64 bg-white border border-brass/20 rounded-2xl p-6 font-sans text-ink focus:ring-2 focus:ring-olive/20 focus:border-olive transition-all resize-none"
                />
              ) : (
                <div className="space-y-4">
                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-brass/20 rounded-2xl bg-white hover:bg-brass/5 transition-colors cursor-pointer group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 text-brass/40 group-hover:text-olive transition-colors mb-4" />
                        <p className="mb-2 text-sm text-ink/60 font-bold">Cliquez pour importer une image</p>
                        <p className="text-xs text-ink/40">PNG, JPG ou WebP</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-brass/20 group">
                      <img src={imagePreview} alt="Preview" className="w-full h-64 object-contain bg-ink/5" />
                      <button 
                        onClick={() => setImagePreview(null)}
                        className="absolute top-4 right-4 p-2 bg-ink/60 text-white rounded-full hover:bg-ink transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-4 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={loading || (importMethod === 'text' ? !text.trim() : !imagePreview)}
                className="w-full py-4 bg-olive text-white font-bold rounded-2xl hover:bg-olive/90 transition-all shadow-lg shadow-olive/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {loading ? "Analyse en cours..." : "Analyser le contenu"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif font-bold text-ink">
                  Livres détectés ({parsedBooks.length})
                </h3>
                <button 
                  onClick={() => setStep('input')}
                  className="text-sm text-olive font-bold hover:underline"
                >
                  Modifier le texte
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {parsedBooks.map((book, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-brass/10">
                    <div className="w-8 h-8 bg-olive/5 rounded-full flex items-center justify-center text-olive font-bold text-xs">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink truncate">{book.title}</p>
                      <p className="text-sm text-ink/50 truncate">{book.author}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="w-full py-4 bg-olive text-white font-bold rounded-2xl hover:bg-olive/90 transition-all shadow-lg shadow-olive/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Ajouter à ma bibliothèque
              </button>
              <p className="text-center text-xs text-ink/40 italic">
                Nous allons tenter de récupérer automatiquement les couvertures et les pays.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
