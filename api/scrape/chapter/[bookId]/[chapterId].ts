import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import { fetchMobileRaw } from '../../_lib/scraper';

const AD_PATTERNS = ['bqge.org', '请勿开启', '一秒记住', 'tianyibook', '天翼小说'];

function extractContent(html: string): string {
  const b64Matches = [...html.matchAll(/qsbs\.bb\('([^']+)'\)/g)];
  if (b64Matches.length > 0) {
    const decoded = b64Matches.map(m => { try { return Buffer.from(m[1], 'base64').toString('utf8'); } catch { return ''; } }).join('');
    const $ = cheerio.load(decoded);
    return $('p').map((_, el) => $(el).text().trim()).get().filter(t => t && !AD_PATTERNS.some(p => t.includes(p))).join('\n');
  }
  const $ = cheerio.load(html);
  return $('#chaptercontent p').map((_, el) => $(el).text().trim()).get().filter(t => t && !AD_PATTERNS.some(p => t.includes(p))).join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const bookId = req.query.bookId as string;
  const chapterId = req.query.chapterId as string;
  try {
    const firstHtml = await fetchMobileRaw(`/book/${bookId}/${chapterId}.html`);
    const $first = cheerio.load(firstHtml);
    const title = $first('span.title').text().replace(/（第\d+页）/, '').trim();
    const prevHref = $first('#pb_prev').attr('href') ?? '';
    const prevId = prevHref.match(/\/book\/\d+\/(\d+)(?:_\d+)?\.html/)?.[1];

    const pages: string[] = [extractContent(firstHtml)];
    let pageNum = 1;
    let nextHref = $first('#pb_next').attr('href') ?? '';
    let hasNext = /\/\d+_\d+\.html$/.test(nextHref);

    while (hasNext && pageNum < 20) {
      const html = await fetchMobileRaw(`/book/${bookId}/${chapterId}_${pageNum}.html`);
      pages.push(extractContent(html));
      const $p = cheerio.load(html);
      nextHref = $p('#pb_next').attr('href') ?? '';
      hasNext = /\/\d+_\d+\.html$/.test(nextHref);
      pageNum++;
    }

    const nextId = nextHref.match(/\/book\/\d+\/(\d+)\.html/)?.[1];

    res.setHeader('Cache-Control', 's-maxage=3600');
    res.json({ ok: true, data: { id: chapterId, bookId, title, order: 0, content: pages.join('\n'), prevChapterId: prevId, nextChapterId: nextId } });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}