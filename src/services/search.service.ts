import axios from 'axios';
import * as cheerio from 'cheerio';
import { Book } from '../types/book.types';
import { SearchQuery } from '../types/search.types';
import { BASE_URL } from '../utils/scraper';
import { cache, TTL } from '../utils/cache';
import { store } from '../data/store';

const IS_PROD = process.env.NODE_ENV !== 'development';

const mobileHttp = axios.create({
  baseURL: 'http://m.bqge.org',
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15' },
});

const fetchAndParseSearch = async (keyword: string): Promise<Book[]> => {
  // 加时间戳参数绕过外部站点 CDN 对限流响应的缓存（x-cache: HIT 会导致永远拿到缓存的限流页）
  const res = await mobileHttp.post<string>(`/search.html?_=${Date.now()}`, `s=${encodeURIComponent(keyword)}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const $ = cheerio.load(res.data);
  const books: Book[] = [];

  $('.bookbox').each((_, el) => {
    const a = $(el).find('.bookname a').first();
    const href = a.attr('href') ?? '';
    const id = href.match(/\/book\/(\d+)\//)?.[1];
    if (!id) return;
    const coverSrc = $(el).find('img').attr('src') ?? '';
    const cover = coverSrc.startsWith('http') ? coverSrc : `${BASE_URL}${coverSrc}`;
    books.push({
      id,
      title: a.text().trim(),
      author: $(el).find('.author').text().replace('作者：', '').trim(),
      cover,
      description: '',
      category: $(el).find('.cat').text().replace('分类：', '').trim(),
      chapterCount: 0,
      latestChapter: $(el).find('.update a').text().trim() || $(el).find('.update').text().replace('最新章节：', '').trim(),
      updatedAt: '',
    });
  });

  return books;
};

// 记录正在进行中的请求，相同关键词的并发请求复用同一个 Promise，避免竞态条件
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
    // 若已有相同关键词的请求在途，直接复用，不重复打外部站点
    let pending = pendingRequests.get(cacheKey);
    if (!pending) {
      pending = (async (): Promise<Book[]> => {
        let lastError: unknown;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const result = await fetchAndParseSearch(query.keyword);
            if (result.length > 0) {
              // 只缓存非空结果，避免空结果污染缓存
              cache.set(cacheKey, result, TTL.SEARCH);
              return result;
            }
            // 结果为空时等待后重试
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
