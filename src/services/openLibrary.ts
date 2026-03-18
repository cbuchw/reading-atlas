export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
}

export async function searchBooks(query: string): Promise<BookMetadata[]> {
  if (!query) return [];

  try {
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`);
    const data = await response.json();

    if (!data.docs) return [];

    return data.docs.map((doc: any) => {
      const book: any = {
        id: doc.key,
        title: doc.title,
        author: doc.author_name?.[0] || 'Unknown Author',
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
    const data = await response.json();
    const bookKey = `ISBN:${cleanIsbn}`;

    if (data[bookKey]) {
      const book = data[bookKey];
      return {
        id: bookKey,
        title: book.title,
        author: book.authors?.[0]?.name || 'Unknown Author',
        coverUrl: book.cover?.large || book.cover?.medium || book.cover?.small,
        isbn: cleanIsbn
      };
    }
  } catch (error) {
    console.error('Error fetching book from Open Library:', error);
  }

  return null;
}
