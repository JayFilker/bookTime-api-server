import { v2Config } from '../config';

export function withBaseUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${v2Config.baseUrl}${path}`;
}