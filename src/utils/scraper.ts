import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';

export const BASE_URL = 'https://www.bqge.org';
const MOBILE_BASE_URL = 'http://m.bqge.org';

// 通过 Vercel 中转时的基础 URL（在 Render 环境变量中配置）
const VERCEL_BASE_URL = process.env.VERCEL_SCRAPER_URL;

const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

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

function createHttp(baseURL: string, headers: Record<string, string>): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 15000,
    headers,
    ...(proxyAgent ? { httpAgent: proxyAgent, httpsAgent: proxyAgent } : {}),
  });
}

const desktopHttp = createHttp(BASE_URL, DESKTOP_HEADERS);
const mobileHttp = createHttp(MOBILE_BASE_URL, MOBILE_HEADERS);
// 用于调 Vercel 中转接口（不需要代理，走公网即可）
const vercelHttp = VERCEL_BASE_URL ? axios.create({ baseURL: VERCEL_BASE_URL, timeout: 30000 }) : null;

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

// 通过 Vercel 中转获取数据，失败时降级直连
export async function fetchViaVercel<T>(path: string, params?: Record<string, string>): Promise<T> {
  if (vercelHttp) {
    try {
      const res = await vercelHttp.get<{ ok: boolean; data: T }>(path, { params });
      if (res.data.ok) return res.data.data;
    } catch {
      // 降级直连
    }
  }
  throw new Error('Vercel scraper not configured');
}