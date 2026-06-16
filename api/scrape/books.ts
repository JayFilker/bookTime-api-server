import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchHtml, BASE_URL } from './_lib/scraper';

const CATEGORY_MAP: Record<string, string> = {
  '玄幻小说': '1', '修真小说': '2', '都市小说': '3',
  '历史小说': '4', '网游小说': '5', '科幻小说': '6', '其他小说': '7',
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const category = req.query.category as string | undefined;

    if (category && CATEGORY_MAP[category]) {
      const catId = CATEGORY_MAP[category];
      const TARGET_PAGE_SIZE = 30;
      const clientStart = (page - 1) * pageSize + 1;
      const clientEnd = clientStart + pageSize - 1;
      const targetStartPage = Math.ceil(clientStart / TARGET_PAGE_SIZE);
      const targetEndPage = Math.ceil(clientEnd / TARGET_PAGE_SIZE);

      const allBooks: unknown[] = [];
      let totalPages = 1;
      for (let targetPage = targetStartPage; targetPage <= targetEndPage; targetPage++) {
        const $ = await fetchHtml(`/class/${catId}/${targetPage}.html`);
        $('#newscontent .l li').each((_, el) => {
          const bookA = $(el).find('.s2 a').first();
          const href = bookA.attr('href') ?? '';
          const id = href.match(/\/book\/(\d+)\//)?.[1];
          if (!id) return;
          allBooks.push({
            id, title: bookA.text().trim(),
            author: $(el).find('.s4').text().trim(),
            cover: `${BASE_URL}/img/${id}.jpg`,
            description: '', category: category ?? '',
            chapterCount: 0,
            latestChapter: $(el).find('.s3 a').text().trim(),
            updatedAt: $(el).find('.s5').text().trim(),
          });
        });
        if (targetPage === targetStartPage) {
          const lastHref = $('a').filter((_, el) => $(el).text().trim() === '末 页').attr('href') ?? '';
          totalPages = Number(lastHref.match(/\/class\/\d+\/(\d+)\.html/)?.[1] ?? 1);
        }
      }

      const offsetInMerged = (clientStart - 1) % TARGET_PAGE_SIZE;
      res.setHeader('Cache-Control', 's-maxage=300');
      res.json({ ok: true, data: { list: allBooks.slice(offsetInMerged, offsetInMerged + pageSize), total: totalPages * TARGET_PAGE_SIZE, page, pageSize } });
      return;
    }

    const $ = await fetchHtml('/');
    const books: unknown[] = [];
    $('#newscontent .l li, #newscontent .r li').each((_, el) => {
      const bookA = $(el).find('.s2 a').first();
      const href = bookA.attr('href') ?? '';
      const id = href.match(/\/book\/(\d+)\//)?.[1];
      if (!id) return;
      books.push({
        id, title: bookA.text().trim(),
        author: $(el).find('.s4').text().trim(),
        cover: `${BASE_URL}/img/${id}.jpg`,
        description: '', category: $(el).find('.s1').text().replace(/[\[\]]/g, '').trim(),
        chapterCount: 0,
        latestChapter: $(el).find('.s3 a').text().trim(),
        updatedAt: $(el).find('.s5').text().trim(),
      });
    });

    const start = (page - 1) * pageSize;
    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({ ok: true, data: { list: books.slice(start, start + pageSize), total: books.length, page, pageSize } });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}