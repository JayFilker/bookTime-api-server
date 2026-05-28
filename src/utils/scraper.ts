import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

export const BASE_URL = 'https://www.bqge.org';
const MOBILE_BASE_URL = 'http://m.bqge.org';

function createHttp(baseURL: string, ua: string): AxiosInstance {
  return axios.create({ baseURL, timeout: 10000, headers: { 'User-Agent': ua } });
}

const desktopHttp = createHttp(BASE_URL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
const mobileHttp = createHttp(MOBILE_BASE_URL, 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');

export async function fetchHtml(url: string, method: 'get' | 'post' = 'get', data?: string): Promise<cheerio.CheerioAPI> {
  const res = method === 'post'
    ? await desktopHttp.post<string>(url, data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    : await desktopHttp.get<string>(url);
  return cheerio.load(res.data);
}

export async function fetchMobileHtml(url: string): Promise<cheerio.CheerioAPI> {
  const res = await mobileHttp.get<string>(url);
  return cheerio.load(res.data);
}

export async function fetchMobileRaw(url: string): Promise<string> {
  const res = await mobileHttp.get<string>(url);
  return res.data;
}