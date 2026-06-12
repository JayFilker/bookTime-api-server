/**
 * 本地爬取脚本 — 仅在本地运行，结果存入 src/data/
 * 运行：npx ts-node --project tsconfig.json src/scripts/crawl.ts
 */
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.bqge.org';
const MOBILE_BASE_URL = 'http://m.bqge.org';
const DATA_DIR = path.join(__dirname, '..', 'data');

const CATEGORIES: { name: string; id: string }[] = [
  { name: '玄幻小说', id: '1' },
  { name: '修真小说', id: '2' },
  { name: '都市小说', id: '3' },
  { name: '历史小说', id: '4' },
  { name: '网游小说', id: '5' },
  { name: '科幻小说', id: '6' },
  { name: '其他小说', id: '7' },
];

const BOOKS_PER_CATEGORY = 3;

const DESKTOP_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

const MOBILE_UAS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function buildHeaders(ua: string) {
  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Connection': 'keep-alive',
  };
}

async function getHtml(url: string, mobile = false): Promise<cheerio.CheerioAPI> {
  const baseURL = mobile ? MOBILE_BASE_URL : BASE_URL;
  const ua = mobile ? pick(MOBILE_UAS) : pick(DESKTOP_UAS);
  await sleep(600 + Math.random() * 600);
  const res = await axios.get<string>(baseURL + url, {
    timeout: 15000,
    headers: buildHeaders(ua),
  });
  return cheerio.load(res.data);
}

async function getRaw(url: string): Promise<string> {
  const ua = pick(MOBILE_UAS);
  await sleep(600 + Math.random() * 600);
  const res = await axios.get<string>(MOBILE_BASE_URL + url, {
    timeout: 15000,
    headers: buildHeaders(ua),
  });
  return res.data as string;
}

// ---- 数据类型 ----

interface Book {
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

interface Chapter {
  id: string;
  bookId: string;
  title: string;
  order: number;
}

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

// ---- 爬取逻辑 ----

async function crawlCategoryBookIds(catId: string, count: number): Promise<string[]> {
  console.log(`  爬取分类 ${catId} 的书籍列表...`);
  const $ = await getHtml(`/class/${catId}/1.html`);
  const ids: string[] = [];
  $('#newscontent .l li').each((_, el) => {
    if (ids.length >= count) return;
    const href = $(el).find('.s2 a').attr('href') ?? '';
    const id = href.match(/\/book\/(\d+)\//)?.[1];
    if (id) ids.push(id);
  });
  return ids;
}

async function crawlBookDetail(id: string, category: string): Promise<Book | null> {
  console.log(`  爬取书籍详情 id=${id}...`);
  try {
    const $ = await getHtml(`/book/${id}/`);
    const title = $('#info h1').text().trim();
    if (!title) return null;
    const author = $('#info p:first-of-type a').text().trim();
    const latestChapter = $('meta[property="og:novel:latest_chapter_name"]').attr('content') ?? '';
    const updatedAt = $('meta[property="og:novel:update_time"]').attr('content') ?? '';
    const coverSrc = $('#fmimg img').attr('src') ?? '';
    const cover = coverSrc.startsWith('http') ? coverSrc : `${BASE_URL}${coverSrc}`;
    const description = $('#intro div:first-child').text().trim();
    return { id, title, author, cover, description, category, chapterCount: 0, latestChapter, updatedAt };
  } catch (e) {
    console.error(`  书籍 ${id} 爬取失败:`, (e as Error).message);
    return null;
  }
}

async function crawlChapterList(bookId: string): Promise<Chapter[]> {
  console.log(`  爬取章节列表 bookId=${bookId}...`);
  const chapters: Chapter[] = [];
  try {
    const $detail = await getHtml(`/book/${bookId}/`);
    $detail('#list dd a').each((_, el) => {
      const href = $detail(el).attr('href') ?? '';
      const id = href.match(/\/book\/\d+\/(\d+)\.html/)?.[1];
      if (id) chapters.push({ id, bookId, title: $detail(el).text().trim(), order: chapters.length + 1 });
    });

    const $first = await getHtml(`/chapterlist/${bookId}/1.html`);
    const extraPages = $first('select option')
      .map((_, el) => $first(el).attr('value') ?? '')
      .get()
      .filter(v => v.includes('/chapterlist/'));

    for (const pageUrl of extraPages) {
      const $page = await getHtml(pageUrl);
      $page('#list dd a').each((_, el) => {
        const href = $page(el).attr('href') ?? '';
        const id = href.match(/\/book\/\d+\/(\d+)\.html/)?.[1];
        if (id) chapters.push({ id, bookId, title: $page(el).text().trim(), order: chapters.length + 1 });
      });
    }
  } catch (e) {
    console.error(`  章节列表 ${bookId} 爬取失败:`, (e as Error).message);
  }
  return chapters;
}

const AD_PATTERNS = ['bqge.org', '请勿开启', '一秒记住', 'tianyibook', '天翼小说'];

function extractContent(html: string): string {
  const b64Matches = [...html.matchAll(/qsbs\.bb\('([^']+)'\)/g)];
  if (b64Matches.length > 0) {
    const decoded = b64Matches.map(m => {
      try { return Buffer.from(m[1], 'base64').toString('utf8'); } catch { return ''; }
    }).join('');
    const $ = cheerio.load(decoded);
    return $('p').map((_, el) => $(el).text().trim()).get()
      .filter(t => t && !AD_PATTERNS.some(p => t.includes(p))).join('\n');
  }
  const $ = cheerio.load(html);
  return $('#chaptercontent p').map((_, el) => $(el).text().trim()).get()
    .filter(t => t && !AD_PATTERNS.some(p => t.includes(p))).join('\n');
}

async function crawlFirstChapter(bookId: string, chapters: Chapter[]): Promise<ChapterContent | null> {
  if (chapters.length === 0) return null;
  const first = chapters[0];
  console.log(`  爬取第一章 bookId=${bookId} chapterId=${first.id}...`);
  try {
    const html = await getRaw(`/book/${bookId}/${first.id}.html`);
    const $ = cheerio.load(html);
    const title = $('span.title').text().replace(/（第\d+页）/, '').trim() || first.title;
    const content = extractContent(html);
    return { bookId, chapterId: first.id, title, content };
  } catch (e) {
    console.error(`  第一章 ${bookId}/${first.id} 爬取失败:`, (e as Error).message);
    return null;
  }
}

async function crawlHome(): Promise<HomeData> {
  console.log('爬取首页数据...');
  const result: HomeData = { featured: [], newBooks: [] };
  try {
    const $ = await getHtml('/');
    $('.r h2').each((_, h2) => {
      const sectionTitle = $(h2).text().trim();
      if (sectionTitle !== '本期强推' && sectionTitle !== '最新入库小说') return;
      const books: HomeBook[] = [];
      $(h2).next('ul').find('li').each((__, li) => {
        const bookA = $(li).find('.s2 a');
        const href = bookA.attr('href') ?? '';
        const id = href.match(/\/book\/(\d+)\//)?.[1];
        if (!id) return;
        const authorA = $(li).find('.s5 a');
        books.push({
          id,
          title: bookA.text().trim(),
          author: authorA.length ? authorA.text().trim() : $(li).find('.s5').text().trim(),
          category: $(li).find('.s1').text().replace(/[\[\]]/g, '').trim(),
        });
      });
      if (sectionTitle === '本期强推') result.featured = books;
      else result.newBooks = books;
    });
  } catch (e) {
    console.error('首页爬取失败:', (e as Error).message);
  }
  return result;
}

// ---- 主流程 ----

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const allBooks: Book[] = [];
  const allChapters: Chapter[] = [];
  const allFirstChapters: ChapterContent[] = [];

  for (const cat of CATEGORIES) {
    console.log(`\n=== 分类: ${cat.name} ===`);
    const ids = await crawlCategoryBookIds(cat.id, BOOKS_PER_CATEGORY);

    for (const id of ids) {
      const book = await crawlBookDetail(id, cat.name);
      if (!book) continue;

      const chapters = await crawlChapterList(id);
      book.chapterCount = chapters.length;
      allBooks.push(book);
      allChapters.push(...chapters);

      const firstChapter = await crawlFirstChapter(id, chapters);
      if (firstChapter) allFirstChapters.push(firstChapter);

      console.log(`  完成: ${book.title} (${chapters.length} 章)`);
    }
  }

  const homeData = await crawlHome();

  fs.writeFileSync(path.join(DATA_DIR, 'books.json'), JSON.stringify(allBooks, null, 2), 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'chapters.json'), JSON.stringify(allChapters, null, 2), 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'first-chapters.json'), JSON.stringify(allFirstChapters, null, 2), 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'home.json'), JSON.stringify(homeData, null, 2), 'utf8');

  console.log(`\n爬取完成:`);
  console.log(`  书籍: ${allBooks.length} 本`);
  console.log(`  章节列表总条目: ${allChapters.length}`);
  console.log(`  第一章内容: ${allFirstChapters.length} 篇`);
  console.log(`  数据已写入 src/data/`);
}

main().catch(err => {
  console.error('爬取失败:', err);
  process.exit(1);
});