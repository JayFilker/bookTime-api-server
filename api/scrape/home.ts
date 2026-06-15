import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchHtml } from './_lib/scraper';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const $ = await fetchHtml('/');
    const result: { featured: unknown[]; newBooks: unknown[] } = { featured: [], newBooks: [] };

    const parseSection = (title: string): unknown[] => {
      const books: unknown[] = [];
      $('.r h2').each((_, h2) => {
        if ($(h2).text().trim() !== title) return;
        $(h2).next('ul').find('li').each((__, li) => {
          const bookA = $(li).find('.s2 a');
          const href = bookA.attr('href') ?? '';
          const id = href.match(/\/book\/(\d+)\//)?.[1];
          if (!id) return;
          const authorA = $(li).find('.s5 a');
          const author = authorA.length ? authorA.text().trim() : $(li).find('.s5').text().trim();
          books.push({ id, title: bookA.text().trim(), author, category: $(li).find('.s1').text().replace(/[\[\]]/g, '').trim() });
        });
      });
      return books;
    };

    result.featured = parseSection('本期强推');
    result.newBooks = parseSection('最新入库小说');

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}