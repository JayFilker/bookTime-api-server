import { Chapter, ChapterDetail } from '../types/chapter.types';
import { fetchViaVercel } from '../utils/scraper';
import { cache, TTL } from '../utils/cache';

export const getChapterById = async (chapterId: string, bookId: string): Promise<ChapterDetail> => {
  const cacheKey = `chapter:${bookId}:${chapterId}`;
  const cached = cache.get<ChapterDetail>(cacheKey);
  if (cached) return cached;

  const result = await fetchViaVercel<ChapterDetail>(`/api/scrape/chapter/${bookId}/${chapterId}`);
  cache.set(cacheKey, result, TTL.CHAPTER_CONTENT);
  return result;
};

export const getChaptersByBookId = async (
  bookId: string,
  page: number,
  pageSize: number,
): Promise<{ list: Chapter[]; total: number; page: number; pageSize: number }> => {
  const cacheKey = `chapters:${bookId}`;
  let allChapters = cache.get<Chapter[]>(cacheKey);

  if (!allChapters) {
    const data = await fetchViaVercel<{ chapters: Chapter[] }>(`/api/scrape/book/${bookId}`);
    allChapters = data.chapters;
    cache.set(cacheKey, allChapters, TTL.CHAPTER_LIST);
  }

  const total = allChapters.length;
  const start = (page - 1) * pageSize;
  return { list: allChapters.slice(start, start + pageSize), total, page, pageSize };
};