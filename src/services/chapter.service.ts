import { Chapter, ChapterDetail } from '../types/chapter.types';
import { fetchHtml, fetchMobileRaw } from '../utils/scraper';
import { cache, TTL } from '../utils/cache';
import * as cheerio from 'cheerio';
import { store } from '../data/store';

const IS_PROD = process.env.NODE_ENV !== 'development';

const AD_PATTERNS = ['bqge.org', '请勿开启', '一秒记住', 'tianyibook', '天翼小说'];

function extractContent(html: string): string {
  const b64Matches = [...html.matchAll(/qsbs\.bb\('([^']+)'\)/g)];
  if (b64Matches.length > 0) {
    const decoded = b64Matches
      .map((m) => {
        try { return Buffer.from(m[1], 'base64').toString('utf8'); }
        catch { return ''; }
      })
      .join('');
    const $ = cheerio.load(decoded);
    return $('p').map((_, el) => $(el).text().trim()).get()
      .filter((t) => t && !AD_PATTERNS.some((p) => t.includes(p)))
      .join('\n');
  }
  const $ = cheerio.load(html);
  return $('#chaptercontent p').map((_, el) => $(el).text().trim()).get()
    .filter((t) => t && !AD_PATTERNS.some((p) => t.includes(p)))
    .join('\n');
}

async function fetchChapterPage(bookId: string, chapterId: string, page: number): Promise<{ content: string; hasNext: boolean; nextHref: string }> {
  const suffix = page === 0 ? '' : `_${page}`;
  const html = await fetchMobileRaw(`/book/${bookId}/${chapterId}${suffix}.html`);
  const content = extractContent(html);
  const $ = cheerio.load(html);
  const nextHref = $('#pb_next').attr('href') ?? '';
  const hasNext = /\/\d+_\d+\.html$/.test(nextHref);
  return { content, hasNext, nextHref };
}

export const getChapterById = async (chapterId: string, bookId: string): Promise<ChapterDetail> => {
  if (IS_PROD) {
    const data = store.getChapterContent(bookId, chapterId);
    if (!data) throw new Error('章节不存在');
    const allChapters = store.getChaptersByBookId(bookId);
    const idx = allChapters.findIndex(c => c.id === chapterId);
    const prevChapterId = idx > 0 ? allChapters[idx - 1].id : undefined;
    const nextChapterId = idx >= 0 && idx < allChapters.length - 1 ? allChapters[idx + 1].id : undefined;
    return { id: chapterId, bookId, title: data.title, order: idx + 1, content: data.content, prevChapterId, nextChapterId };
  }

  const cacheKey = `chapter:${bookId}:${chapterId}`;
  const cached = cache.get<ChapterDetail>(cacheKey);
  if (cached) return cached;

  const html = await fetchMobileRaw(`/book/${bookId}/${chapterId}.html`);
  const $ = cheerio.load(html);
  const title = $('span.title').text().replace(/（第\d+页）/, '').trim();

  const pages: string[] = [];
  const first = await fetchChapterPage(bookId, chapterId, 0);
  pages.push(first.content);
  let pageNum = 1;
  let hasNext = first.hasNext;
  let lastNextHref = first.nextHref;
  while (hasNext && pageNum < 20) {
    const p = await fetchChapterPage(bookId, chapterId, pageNum);
    pages.push(p.content);
    hasNext = p.hasNext;
    lastNextHref = p.nextHref;
    pageNum++;
  }

  const prevHref = $('#pb_prev').attr('href') ?? '';
  // prevHref 可能带页码后缀（如 /book/123/456_3.html），用 _\d+ 兼容
  const prevId = prevHref.match(/\/book\/\d+\/(\d+)(?:_\d+)?\.html/)?.[1];
  const nextId = lastNextHref.match(/\/book\/\d+\/(\d+)\.html/)?.[1];

  const result: ChapterDetail = { id: chapterId, bookId, title, order: 0, content: pages.join('\n'), prevChapterId: prevId, nextChapterId: nextId };
  cache.set(cacheKey, result, TTL.CHAPTER_CONTENT);
  return result;
};

export const getChaptersByBookId = async (
  bookId: string,
  page: number,
  pageSize: number,
): Promise<{ list: Chapter[]; total: number; page: number; pageSize: number }> => {
  if (IS_PROD) {
    const all = store.getChaptersByBookId(bookId);
    const start = (page - 1) * pageSize;
    return { list: all.slice(start, start + pageSize), total: all.length, page, pageSize };
  }

  const cacheKey = `chapters:${bookId}`;
  let allChapters = cache.get<Chapter[]>(cacheKey);

  if (!allChapters) {
    allChapters = [];

    // 第一批：书籍详情页（第1-99章）
    const $detail = await fetchHtml(`/book/${bookId}/`);
    $detail('#list dd a').each((_, el) => {
      const href = $detail(el).attr('href') ?? '';
      const id = href.match(/\/book\/\d+\/(\d+)\.html/)?.[1];
      if (id) (allChapters as Chapter[]).push({ id, bookId, title: $detail(el).text().trim(), order: (allChapters as Chapter[]).length + 1 });
    });

    // 后续分页：从 chapterlist 第1页的 select 获取所有分页 URL
    const $first = await fetchHtml(`/chapterlist/${bookId}/1.html`);
    const chapterlistPages = $first('select option')
      .map((_, el) => $first(el).attr('value') ?? '')
      .get()
      .filter((v) => v.includes('/chapterlist/'));

    for (const pageUrl of chapterlistPages) {
      const $page = await fetchHtml(pageUrl);
      $page('#list dd a').each((_, el) => {
        const href = $page(el).attr('href') ?? '';
        const id = href.match(/\/book\/\d+\/(\d+)\.html/)?.[1];
        if (id) (allChapters as Chapter[]).push({ id, bookId, title: $page(el).text().trim(), order: (allChapters as Chapter[]).length + 1 });
      });
    }

    cache.set(cacheKey, allChapters, TTL.CHAPTER_LIST);
  }

  const total = allChapters.length;
  const start = (page - 1) * pageSize;
  return { list: allChapters.slice(start, start + pageSize), total, page, pageSize };
};