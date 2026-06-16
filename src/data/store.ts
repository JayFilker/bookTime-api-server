import fs from 'fs';
import path from 'path';
import { Book } from '../types/book.types';
import { Chapter } from '../types/chapter.types';

const DATA_DIR = path.join(__dirname);

interface ChapterContent {
  bookId: string;
  chapterId: string;
  title: string;
  content: string;
}

interface HomeBook {
  id: string;
  title: string;
  author: string;
  category: string;
}

interface HomeData {
  featured: HomeBook[];
  newBooks: HomeBook[];
}

function loadJson<T>(filename: string, fallback: T): T {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`[store] ${filename} 不存在，使用空数据。请先运行爬取脚本。`);
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8')) as T;
}

const books: Book[] = loadJson<Book[]>('books.json', []);
const chapters: Chapter[] = loadJson<Chapter[]>('chapters.json', []);
const firstChapters: ChapterContent[] = loadJson<ChapterContent[]>('first-chapters.json', []);
const homeData: HomeData = loadJson<HomeData>('home.json', { featured: [], newBooks: [] });

const bookById = new Map<string, Book>(books.map(b => [b.id, b]));
const chaptersByBookId = new Map<string, Chapter[]>();
for (const ch of chapters) {
  const arr = chaptersByBookId.get(ch.bookId) ?? [];
  arr.push(ch);
  chaptersByBookId.set(ch.bookId, arr);
}
const firstChapterMap = new Map<string, ChapterContent>(
  firstChapters.map(fc => [`${fc.bookId}:${fc.chapterId}`, fc])
);

const PLACEHOLDER_CONTENT =
  '此章节内容在演示环境中不可用。\n\n' +
  '¿ÎÈÝ·Ç³£¾«²Ê£¬µ«ÑÝʾ»·¾³ÔÝ²»Ö§³Ö¡£\n\n' +
  '请在本地开发环境中查看完整章节内容。';

export const store = {
  getAllBooks: (): Book[] => books,
  getBookById: (id: string): Book | undefined => bookById.get(id),
  getChaptersByBookId: (bookId: string): Chapter[] => chaptersByBookId.get(bookId) ?? [],

  getChapterContent: (bookId: string, chapterId: string): ChapterContent | null => {
    const real = firstChapterMap.get(`${bookId}:${chapterId}`);
    if (real) return real;
    const chList = chaptersByBookId.get(bookId);
    if (!chList) return null;
    const ch = chList.find(c => c.id === chapterId);
    if (!ch) return null;
    return { bookId, chapterId, title: ch.title, content: PLACEHOLDER_CONTENT };
  },

  getHomeData: (): HomeData => homeData,

  searchBooks: (keyword: string): Book[] => {
    const kw = keyword.toLowerCase();
    return books.filter(
      b => b.title.toLowerCase().includes(kw) || b.author.toLowerCase().includes(kw)
    );
  },
};