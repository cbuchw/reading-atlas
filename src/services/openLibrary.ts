export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  description?: string;
}

export async function searchBooks(query: string): Promise<BookMetadata[]> {
  if (!query) return [];

  try {
    // Try to parse title and author if the query looks like "Title Author"
    // This is a heuristic, but often helps with Open Library's search
    let url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Open Library API returned status ${response.status} for search.`);
      return [];
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Open Library API returned non-JSON response for search.');
      return [];
    }

    const data = await response.json();

    if (!data.docs) return [];

    // Sort docs to prioritize those with covers and those where the author name matches better
    const sortedDocs = data.docs.sort((a: any, b: any) => {
      const aHasCover = !!a.cover_i;
      const bHasCover = !!b.cover_i;
      if (aHasCover && !bHasCover) return -1;
      if (!aHasCover && bHasCover) return 1;
      return 0;
    });

    return sortedDocs.slice(0, 5).map((doc: any) => {
      const book: any = {
        id: doc.key,
        title: doc.title,
        author: doc.author_name?.[0] || 'Unknown Author',
        description: doc.first_sentence?.[0] || doc.subject?.slice(0, 5).join(', ') || ''
      };
      if (doc.isbn?.[0]) book.isbn = doc.isbn[0];
      if (doc.cover_i) book.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      return book;
    });
  } catch (error) {
    console.error('Error searching books from Open Library:', error);
    return [];
  }
}

export async function fetchBookByISBN(isbn: string): Promise<BookMetadata | null> {
  const cleanIsbn = isbn.replace(/[-\s]/g, '');
  if (!cleanIsbn) return null;

  try {
    const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
    
    if (!response.ok) {
      console.warn(`Open Library API returned status ${response.status} for ISBN lookup.`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Open Library API returned non-JSON response for ISBN lookup.');
      return null;
    }

    const data = await response.json();
    const bookKey = `ISBN:${cleanIsbn}`;

    if (data[bookKey]) {
      const book = data[bookKey];
      return {
        id: bookKey,
        title: book.title,
        author: book.authors?.[0]?.name || 'Unknown Author',
        coverUrl: book.cover?.large || book.cover?.medium || book.cover?.small,
        isbn: cleanIsbn,
        description: typeof book.notes === 'string' ? book.notes : (book.notes?.value || '')
      };
    }
  } catch (error) {
    console.error('Error fetching book from Open Library:', error);
  }

  return null;
}
