import { Book } from '../types/book.types';
import { SearchQuery } from '../types/search.types';
import { fetchViaVercel } from '../utils/scraper';
import { cache, TTL } from '../utils/cache';
import { store } from '../data/store';

const IS_PROD = process.env.NODE_ENV !== 'development';

const pendingRequests = new Map<string, Promise<Book[]>>();

export const search = async (query: SearchQuery): Promise<{ list: Book[]; total: number; page: number; pageSize: number }> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;

  if (IS_PROD) {
    const matched = store.searchBooks(query.keyword);
    const start = (page - 1) * pageSize;
    return { list: matched.slice(start, start + pageSize), total: matched.length, page, pageSize };
  }

  const cacheKey = `search:${query.keyword}`;
  let books = cache.get<Book[]>(cacheKey);

  if (!books) {
    let pending = pendingRequests.get(cacheKey);
    if (!pending) {
      pending = (async (): Promise<Book[]> => {
        let lastError: unknown;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const result = await fetchViaVercel<Book[]>('/api/scrape/search', { keyword: query.keyword });
            if (result.length > 0) {
              cache.set(cacheKey, result, TTL.SEARCH);
              return result;
            }
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            lastError = err;
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        if (lastError) throw lastError;
        return [];
      })().finally(() => {
        pendingRequests.delete(cacheKey);
      });
      pendingRequests.set(cacheKey, pending);
    }
    books = await pending;
  }

  const start = (page - 1) * pageSize;
  return { list: books.slice(start, start + pageSize), total: books.length, page, pageSize };
};