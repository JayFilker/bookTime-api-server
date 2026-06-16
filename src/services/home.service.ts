import { HomeData } from '../types/home.types';
import { fetchViaVercel } from '../utils/scraper';
import { cache, TTL } from '../utils/cache';
import { store } from '../data/store';

const IS_PROD = process.env.NODE_ENV !== 'development';

const CACHE_KEY = 'home:featured_and_new';

export const getHomeData = async (): Promise<HomeData> => {
  if (IS_PROD) return store.getHomeData();

  const cached = cache.get<HomeData>(CACHE_KEY);
  if (cached) return cached;

  const result = await fetchViaVercel<HomeData>('/api/scrape/home');

  cache.set(CACHE_KEY, result, TTL.BOOK_LIST);
  return result;
};