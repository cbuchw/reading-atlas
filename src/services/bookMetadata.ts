import { fetchBookByISBNGoogle, searchBooksGoogle } from './googleBooks';
import {
  fetchBookByISBN as fetchBookByISBNOpenLibrary,
  searchBooks as searchBooksOpenLibrary,
  type BookMetadata
} from './openLibrary';

async function enrichCoverFromOpenLibrary(book: BookMetadata): Promise<BookMetadata> {
  if (book.coverUrl) return book;

  if (book.isbn) {
    const openLibraryByIsbn = await fetchBookByISBNOpenLibrary(book.isbn);
    if (openLibraryByIsbn?.coverUrl) {
      return { ...book, coverUrl: openLibraryByIsbn.coverUrl };
    }
  }

  const fallbackQuery = [book.title, book.author].filter(Boolean).join(' ').trim();
  if (!fallbackQuery) return book;

  const openLibraryResults = await searchBooksOpenLibrary(fallbackQuery);
  const withCover = openLibraryResults.find((item) => !!item.coverUrl);
  if (withCover?.coverUrl) {
    return { ...book, coverUrl: withCover.coverUrl };
  }

  return book;
}

export type { BookMetadata };

export async function searchBooks(query: string): Promise<BookMetadata[]> {
  const googleResults = await searchBooksGoogle(query);
  if (googleResults.length === 0) {
    return searchBooksOpenLibrary(query);
  }

  return Promise.all(googleResults.map((book) => enrichCoverFromOpenLibrary(book)));
}

export async function fetchBookByISBN(isbn: string): Promise<BookMetadata | null> {
  const googleResult = await fetchBookByISBNGoogle(isbn);

  if (!googleResult) {
    return fetchBookByISBNOpenLibrary(isbn);
  }

  if (googleResult.coverUrl) {
    return googleResult;
  }

  const openLibraryResult = await fetchBookByISBNOpenLibrary(isbn);
  if (openLibraryResult?.coverUrl) {
    return { ...googleResult, coverUrl: openLibraryResult.coverUrl };
  }

  return googleResult;
}
