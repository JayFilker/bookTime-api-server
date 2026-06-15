import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchHtml, BASE_URL } from '../_lib/scraper';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = req.query.id as string;
  try {
    const $ = await fetchHtml(`/book/${id}/`);
    const title = $('#info h1').text().trim();
    if (!title) { res.status(404).json({ ok: false, error: '书籍不存在' }); return; }

    const author = $('#info p:first-of-type a').text().trim();
    const category = $('meta[property="og:novel:category"]').attr('content') ?? '';
    const latestChapter = $('meta[property="og:novel:latest_chapter_name"]').attr('content') ?? '';
    const updatedAt = $('meta[property="og:novel:update_time"]').attr('content') ?? '';
    const coverSrc = $('#fmimg img').attr('src') ?? '';
    const cover = coverSrc.startsWith('http') ? coverSrc : `${BASE_URL}${coverSrc}`;
    const description = $('#intro div:first-child').text().trim();

    const chapters: unknown[] = [];
    $( '#list dd a').each((i, el) => {
      const href = $(el).attr('href') ?? '';
      const chId = href.match(/\/book\/\d+\/(\d+)\.html/)?.[1];
      if (chId) chapters.push({ id: chId, bookId: id, title: $(el).text().trim(), order: chapters.length + 1 });
    });

    // 后续分页章节
    const options = $('select option').map((_, el) => $(el).attr('value') ?? '').get();
    const chapterlistPages = options.filter(v => v.includes('/chapterlist/'));
    for (const pageUrl of chapterlistPages) {
      const $p = await fetchHtml(pageUrl);
      $p('#list dd a').each((_, el) => {
        const href = $p(el).attr('href') ?? '';
        const chId = href.match(/\/book\/\d+\/(\d+)\.html/)?.[1];
        if (chId) chapters.push({ id: chId, bookId: id, title: $p(el).text().trim(), order: chapters.length + 1 });
      });
    }

    res.setHeader('Cache-Control', 's-maxage=600');
    res.json({ ok: true, data: { id, title, author, cover, description, category, chapterCount: chapters.length, latestChapter, updatedAt, chapters } });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}