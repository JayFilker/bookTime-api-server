export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  order: number;
}

export interface ChapterDetail extends Chapter {
  content: string;
  prevChapterId?: string;
  nextChapterId?: string;
}
