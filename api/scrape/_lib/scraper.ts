import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

export const BASE_URL = 'https://www.bqge.org';
export const MOBILE_BASE_URL = 'http://m.bqge.org';

const DESKTOP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

const MOBILE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

export const desktopHttp: AxiosInstance = axios.create({ baseURL: BASE_URL, timeout: 15000, headers: DESKTOP_HEADERS });
export const mobileHttp: AxiosInstance = axios.create({ baseURL: MOBILE_BASE_URL, timeout: 15000, headers: MOBILE_HEADERS });

export async function fetchHtml(url: string, method: 'get' | 'post' = 'get', data?: string): Promise<cheerio.CheerioAPI> {
  const res = method === 'post'
    ? await desktopHttp.post<string>(url, data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    : await desktopHttp.get<string>(url);
  return cheerio.load(res.data as string);
}

export async function fetchMobileRaw(url: string): Promise<string> {
  const res = await mobileHttp.get<string>(url);
  return res.data as string;
}