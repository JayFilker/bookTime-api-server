import { Book, BookListQuery } from '../types/book.types';
import { Chapter } from '../types/chapter.types';
import { fetchViaVercel } from '../utils/scraper';
import { cache, TTL } from '../utils/cache';

export const getBookSummary = async (id: string): Promise<Book> => {
  const cacheKey = `book:summary:${id}`;
  const cached = cache.get<Book>(cacheKey);
  if (cached) return cached;

  const data = await fetchViaVercel<Book & { chapters: Chapter[] }>(`/api/scrape/book/${id}`);
  const result: Book = {
    id: data.id, title: data.title, author: data.author, cover: data.cover,
    description: data.description, category: data.category,
    chapterCount: data.chapterCount, latestChapter: data.latestChapter, updatedAt: data.updatedAt,
  };
  cache.set(cacheKey, result, TTL.BOOK_DETAIL);
  return result;
};

export const getBookById = async (id: string): Promise<Book & { chapters: Chapter[] }> => {
  const cacheKey = `book:${id}`;
  const cached = cache.get<Book & { chapters: Chapter[] }>(cacheKey);
  if (cached) return cached;

  const result = await fetchViaVercel<Book & { chapters: Chapter[] }>(`/api/scrape/book/${id}`);
  cache.set(cacheKey, result, TTL.BOOK_DETAIL);
  return result;
};

export const getBooks = async (query: BookListQuery): Promise<{ list: Book[]; total: number; page: number; pageSize: number }> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const cacheKey = query.category ? `category:${query.category}:${page}:${pageSize}` : `books:home:${page}`;

  const cached = cache.get<{ list: Book[]; total: number; page: number; pageSize: number }>(cacheKey);
  if (cached) return cached;

  const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
  if (query.category) params.category = query.category;

  const result = await fetchViaVercel<{ list: Book[]; total: number; page: number; pageSize: number }>('/api/scrape/books', params);
  cache.set(cacheKey, result, TTL.CATEGORY);
  return result;
};