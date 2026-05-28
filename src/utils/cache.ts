interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    if (process.env.NODE_ENV === 'development') return null;
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    if (process.env.NODE_ENV === 'development') return;
    this.store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  del(key: string): void {
    this.store.delete(key);
  }
}

export const cache = new MemoryCache();

// TTL 常量（秒）
export const TTL = {
  BOOK_DETAIL: 60 * 30,    // 书籍详情 30 分钟
  BOOK_LIST: 60 * 10,      // 书籍列表 10 分钟
  CHAPTER_LIST: 60 * 30,   // 章节列表 30 分钟
  CHAPTER_CONTENT: 60 * 60 * 24, // 章节内容 24 小时（已发布内容不变）
  SEARCH: 60 * 5,          // 搜索结果 5 分钟
  CATEGORY: 60 * 10,       // 分类列表 10 分钟
};