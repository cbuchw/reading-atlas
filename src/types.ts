import { Timestamp } from 'firebase/firestore';

export interface Book {
  id?: string;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  countries: string[];
  isFictional?: boolean;
  addedAt: Timestamp;
  userId: string;
}

export interface CountryStats {
  [countryName: string]: number;
}
