export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  category: string;
  chapterCount: number;
  latestChapter: string;
  updatedAt: string;
}

export interface BookListQuery {
  page?: number;
  pageSize?: number;
  category?: string;
}