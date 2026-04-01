import type { BookMetadata } from './openLibrary';

interface GoogleBookVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type?: string;
      identifier?: string;
    }>;
  };
}

const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY?.trim();

function sanitizeIsbn(value: string): string {
  return value.replace(/[^0-9X]/gi, '').toUpperCase();
}

function ensureHttps(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//i, 'https://');
}

function extractIsbn(volume: GoogleBookVolume): string | undefined {
  const ids = volume.volumeInfo?.industryIdentifiers || [];
  const isbn13 = ids.find((id) => id.type === 'ISBN_13')?.identifier;
  const isbn10 = ids.find((id) => id.type === 'ISBN_10')?.identifier;
  const selected = isbn13 || isbn10;
  return selected ? sanitizeIsbn(selected) : undefined;
}

function mapGoogleVolumeToMetadata(volume: GoogleBookVolume): BookMetadata {
  const info = volume.volumeInfo || {};
  const imageLinks = info.imageLinks || {};

  return {
    id: volume.id,
    title: info.title || 'Untitled',
    author: info.authors?.[0] || 'Unknown Author',
    coverUrl: ensureHttps(imageLinks.thumbnail || imageLinks.smallThumbnail),
    isbn: extractIsbn(volume),
    description: info.description || ''
  };
}

function buildGoogleBooksUrl(query: string, maxResults: number): string {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults)
  });

  if (GOOGLE_BOOKS_API_KEY) {
    params.set('key', GOOGLE_BOOKS_API_KEY);
  }

  return `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
}

export async function searchBooksGoogle(query: string): Promise<BookMetadata[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  try {
    const url = buildGoogleBooksUrl(trimmedQuery, 10);
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Google Books API returned status ${response.status} for search.`);
      return [];
    }

    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];

    return items
      .map((item: GoogleBookVolume) => mapGoogleVolumeToMetadata(item))
      .slice(0, 5);
  } catch (error) {
    console.error('Error searching books from Google Books:', error);
    return [];
  }
}

export async function fetchBookByISBNGoogle(isbn: string): Promise<BookMetadata | null> {
  const cleanIsbn = sanitizeIsbn(isbn);
  if (!cleanIsbn) return null;

  try {
    const url = buildGoogleBooksUrl(`isbn:${cleanIsbn}`, 1);
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Google Books API returned status ${response.status} for ISBN lookup.`);
      return null;
    }

    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length === 0) return null;

    const mapped = mapGoogleVolumeToMetadata(items[0] as GoogleBookVolume);
    if (!mapped.isbn) {
      mapped.isbn = cleanIsbn;
    }
    return mapped;
  } catch (error) {
    console.error('Error fetching book from Google Books:', error);
    return null;
  }
}
