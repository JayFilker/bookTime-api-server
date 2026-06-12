import { Book, BookListQuery } from '../types/book.types';
import { Chapter } from '../types/chapter.types';
import { fetchHtml, BASE_URL } from '../utils/scraper';
import { cache, TTL } from '../utils/cache';
import { store } from '../data/store';

const IS_PROD = process.env.NODE_ENV !== 'development';

// 分类 ID 映射
const CATEGORY_MAP: Record<string, string> = {
  '玄幻小说': '1',
  '修真小说': '2',
  '都市小说': '3',
  '历史小说': '4',
  '网游小说': '5',
  '科幻小说': '6',
  '其他小说': '7',
};

async function fetchAllChapters(bookId: string): Promise<Chapter[]> {
  const chapters: Chapter[] = [];

  // 第一批：书籍详情页（第1-99章）
  const $detail = await fetchHtml(`/book/${bookId}/`);
  $detail('#list dd a').each((i, el) => {
    const href = $detail(el).attr('href') ?? '';
    const id = href.match(/\/book\/\d+\/(\d+)\.html/)?.[1];
    if (id) chapters.push({ id, bookId, title: $detail(el).text().trim(), order: chapters.length + 1 });
  });

  // 后续分页：从 select options 中获取所有 chapterlist 链接
  const options = $detail('select option').map((_, el) => $detail(el).attr('value') ?? '').get();
  const chapterlistPages = options.filter((v) => v.includes('/chapterlist/'));

  for (const pageUrl of chapterlistPages) {
    const $page = await fetchHtml(pageUrl);
    $page('#list dd a').each((_, el) => {
      const href = $page(el).attr('href') ?? '';
      const id = href.match(/\/book\/\d+\/(\d+)\.html/)?.[1];
      if (id) chapters.push({ id, bookId, title: $page(el).text().trim(), order: chapters.length + 1 });
    });
  }

  return chapters;
}

export const getBookSummary = async (id: string): Promise<Book> => {
  if (IS_PROD) {
    const book = store.getBookById(id);
    if (!book) throw new Error('书籍不存在');
    return book;
  }

  const cacheKey = `book:summary:${id}`;
  const cached = cache.get<Book>(cacheKey);
  if (cached) return cached;

  const $ = await fetchHtml(`/book/${id}/`);

  const title = $('#info h1').text().trim();
  if (!title) throw new Error('书籍不存在');

  const author = $('#info p:first-of-type a').text().trim();
  const category = $('meta[property="og:novel:category"]').attr('content') ?? '';
  const latestChapter = $('meta[property="og:novel:latest_chapter_name"]').attr('content') ?? '';
  const updatedAt = $('meta[property="og:novel:update_time"]').attr('content') ?? '';
  const coverSrc = $('#fmimg img').attr('src') ?? '';
  const cover = coverSrc.startsWith('http') ? coverSrc : `${BASE_URL}${coverSrc}`;
  const description = $('#intro div:first-child').text().trim();

  const result: Book = { id, title, author, cover, description, category, chapterCount: 0, latestChapter, updatedAt };
  cache.set(cacheKey, result, TTL.BOOK_DETAIL);
  return result;
};

export const getBookById = async (id: string): Promise<Book & { chapters: Chapter[] }> => {
  if (IS_PROD) {
    const book = store.getBookById(id);
    if (!book) throw new Error('书籍不存在');
    const chapters = store.getChaptersByBookId(id);
    return { ...book, chapters };
  }

  const cacheKey = `book:${id}`;
  const cached = cache.get<Book & { chapters: Chapter[] }>(cacheKey);
  if (cached) return cached;

  const $ = await fetchHtml(`/book/${id}/`);

  const title = $('#info h1').text().trim();
  if (!title) throw new Error('书籍不存在');

  const author = $('#info p:first-of-type a').text().trim();
  const category = $('meta[property="og:novel:category"]').attr('content') ?? '';
  const latestChapter = $('meta[property="og:novel:latest_chapter_name"]').attr('content') ?? '';
  const updatedAt = $('meta[property="og:novel:update_time"]').attr('content') ?? '';
  const coverSrc = $('#fmimg img').attr('src') ?? '';
  const cover = coverSrc.startsWith('http') ? coverSrc : `${BASE_URL}${coverSrc}`;
  const description = $('#intro div:first-child').text().trim();

  const chapters = await fetchAllChapters(id);

  const result = { id, title, author, cover, description, category, chapterCount: chapters.length, latestChapter, updatedAt, chapters };
  cache.set(cacheKey, result, TTL.BOOK_DETAIL);
  return result;
};

export const getBooks = async (query: BookListQuery): Promise<{ list: Book[]; total: number; page: number; pageSize: number }> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  if (IS_PROD) {
    const all = store.getAllBooks();
    const filtered = query.category ? all.filter(b => b.category === query.category) : all;
    const start = (page - 1) * pageSize;
    return { list: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
  }

  // 有分类时走分类页
  if (query.category && CATEGORY_MAP[query.category]) {
    const catId = CATEGORY_MAP[query.category];
    const cacheKey = `category:${catId}:${page}:${pageSize}`;
    const cached = cache.get<{ list: Book[]; total: number; page: number; pageSize: number }>(cacheKey);
    if (cached) return cached;

    // 目标网站每页的数据量（固定值）
    const TARGET_PAGE_SIZE = 30;

    // 计算客户端请求的数据范围（从 1 开始计数）
    const clientStart = (page - 1) * pageSize + 1; // 例如 page=5, pageSize=4 → 17
    const clientEnd = clientStart + pageSize - 1;   // 例如 17 + 4 - 1 = 20

    // 计算需要爬取目标网站的哪些页
    const targetStartPage = Math.ceil(clientStart / TARGET_PAGE_SIZE); // 例如 17/30 → 1
    const targetEndPage = Math.ceil(clientEnd / TARGET_PAGE_SIZE);     // 例如 20/30 → 1

    // 爬取所需的目标页面
    const allBooks: Book[] = [];
    let totalPages = 1;
    for (let targetPage = targetStartPage; targetPage <= targetEndPage; targetPage++) {
      const $ = await fetchHtml(`/class/${catId}/${targetPage}.html`);
      $('#newscontent .l li').each((_, el) => {
        const bookA = $(el).find('.s2 a').first();
        const href = bookA.attr('href') ?? '';
        const id = href.match(/\/book\/(\d+)\//)?.[1];
        if (!id) return;
        allBooks.push({
          id,
          title: bookA.text().trim(),
          author: $(el).find('.s4').text().trim(),
          cover: `${BASE_URL}/img/${id}.jpg`,
          description: '',
          category: query.category ?? '',
          chapterCount: 0,
          latestChapter: $(el).find('.s3 a').text().trim(),
          updatedAt: $(el).find('.s5').text().trim(),
        });
      });

      // 从第一次请求中获取总页数，避免重复请求
      if (targetPage === targetStartPage) {
        const lastPageHref = $('a').filter((_, el) => $(el).text().trim() === '末 页').attr('href') ?? '';
        totalPages = Number(lastPageHref.match(/\/class\/\d+\/(\d+)\.html/)?.[1] ?? 1);
      }
    }

    // 计算在合并后的数组中的切片位置
    const offsetInMerged = (clientStart - 1) % TARGET_PAGE_SIZE; // 例如 (17-1) % 30 = 16
    const paginatedBooks = allBooks.slice(offsetInMerged, offsetInMerged + pageSize);
    const total = totalPages * TARGET_PAGE_SIZE;

    const result = { list: paginatedBooks, total, page, pageSize };
    cache.set(cacheKey, result, TTL.CATEGORY);
    return result;
  }

  // 无分类时走首页最近更新
  const cacheKey = `books:home:${page}`;
  const cached = cache.get<{ list: Book[]; total: number; page: number; pageSize: number }>(cacheKey);
  if (cached) return cached;

  const $ = await fetchHtml('/');
  const books: Book[] = [];
  $('#newscontent .l li, #newscontent .r li').each((_, el) => {
    const bookA = $(el).find('.s2 a').first();
    const href = bookA.attr('href') ?? '';
    const id = href.match(/\/book\/(\d+)\//)?.[1];
    if (!id) return;
    books.push({
      id,
      title: bookA.text().trim(),
      author: $(el).find('.s4').text().trim(),
      cover: `${BASE_URL}/img/${id}.jpg`,
      description: '',
      category: $(el).find('.s1').text().replace(/[\[\]]/g, '').trim(),
      chapterCount: 0,
      latestChapter: $(el).find('.s3 a').text().trim(),
      updatedAt: $(el).find('.s5').text().trim(),
    });
  });

  const start = (page - 1) * pageSize;
  const result = { list: books.slice(start, start + pageSize), total: books.length, page, pageSize };
  cache.set(cacheKey, result, TTL.BOOK_LIST);
  return result;
};