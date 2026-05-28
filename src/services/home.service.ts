import { CheerioAPI } from 'cheerio';
import { HomeBook, HomeData } from '../types/home.types';
import { fetchHtml } from '../utils/scraper';
import { cache, TTL } from '../utils/cache';

const CACHE_KEY = 'home:featured_and_new';

function parseSectionBooks($: CheerioAPI, sectionTitle: string): HomeBook[] {
  const books: HomeBook[] = [];
  $('.r h2').each((_, h2) => {
    if ($(h2).text().trim() !== sectionTitle) return;
    $(h2).next('ul').find('li').each((__, li) => {
      const bookA = $(li).find('.s2 a');
      const href = bookA.attr('href') ?? '';
      const id = href.match(/\/book\/(\d+)\//)?.[1];
      if (!id) return;
      const authorA = $(li).find('.s5 a');
      const author = authorA.length ? authorA.text().trim() : $(li).find('.s5').text().trim();
      books.push({
        id,
        title: bookA.text().trim(),
        author,
        category: $(li).find('.s1').text().replace(/[\[\]]/g, '').trim(),
      });
    });
  });
  return books;
}

export const getHomeData = async (): Promise<HomeData> => {
  const cached = cache.get<HomeData>(CACHE_KEY);
  if (cached) return cached;

  const $ = await fetchHtml('/');

  const result: HomeData = {
    featured: parseSectionBooks($, '本期强推'),
    newBooks: parseSectionBooks($, '最新入库小说'),
  };

  cache.set(CACHE_KEY, result, TTL.BOOK_LIST);
  return result;
};