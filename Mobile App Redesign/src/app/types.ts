export interface Song {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  collection: string;
  language: string;
  type: string;
  verses: Verse[];
}

export interface Verse {
  number?: number;
  type: 'verse' | 'chorus' | 'refrain';
  lines: string[];
}

export interface Collection {
  id: string;
  name: string;
  language: string;
  description: string;
  songCount: number;
}

export interface FavoriteCategory {
  id: string;
  name: string;
  songIds: string[];
  createdAt: Date;
}

export interface RecentSong {
  songId: string;
  timestamp: Date;
}
