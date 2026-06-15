import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { BASE_URL, MOBILE_BASE_URL } from './_lib/scraper';

const mobileHttp = axios.create({
  baseURL: MOBILE_BASE_URL,
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Connection': 'keep-alive',
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const keyword = req.query.keyword as string;
  if (!keyword) { res.status(400).json({ ok: false, error: '缺少 keyword 参数' }); return; }

  try {
    const response = await mobileHttp.post<string>(`/search.html?_=${Date.now()}`, `s=${encodeURIComponent(keyword)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const $ = cheerio.load(response.data);
    const books: unknown[] = [];

    $('.bookbox').each((_, el) => {
      const a = $(el).find('.bookname a').first();
      const href = a.attr('href') ?? '';
      const id = href.match(/\/book\/(\d+)\//)?.[1];
      if (!id) return;
      const coverSrc = $(el).find('img').attr('src') ?? '';
      const cover = coverSrc.startsWith('http') ? coverSrc : `${BASE_URL}${coverSrc}`;
      books.push({
        id, title: a.text().trim(),
        author: $(el).find('.author').text().replace('作者：', '').trim(),
        cover, description: '',
        category: $(el).find('.cat').text().replace('分类：', '').trim(),
        chapterCount: 0,
        latestChapter: $(el).find('.update a').text().trim() || $(el).find('.update').text().replace('最新章节：', '').trim(),
        updatedAt: '',
      });
    });

    res.setHeader('Cache-Control', 's-maxage=120');
    res.json({ ok: true, data: books });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}