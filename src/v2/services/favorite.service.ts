import db from '../db';
import { Favorite, FavoriteWithBook } from '../types/favorite.types';

export class FavoriteService {
  // 添加收藏
  static addFavorite(userId: number, bookId: string): { success: boolean; message: string } {
    try {
      // 检查是否已经收藏
      const existingStmt = db.prepare('SELECT 1 FROM favorites WHERE userId = ? AND bookId = ?');
      const existing = existingStmt.get(userId, bookId);

      if (existing) {
        return { success: false, message: '已收藏该书籍' };
      }

      const stmt = db.prepare(`
        INSERT INTO favorites (userId, bookId)
        VALUES (?, ?)
      `);

      const result = stmt.run(userId, bookId);
      return { success: result.changes > 0, message: '收藏成功' };
    } catch (error) {
      console.error('添加收藏失败:', error);
      return { success: false, message: '收藏失败' };
    }
  }

  // 取消收藏
  static removeFavorite(userId: number, bookId: string): { success: boolean; message: string } {
    try {
      const stmt = db.prepare(`
        DELETE FROM favorites
        WHERE userId = ? AND bookId = ?
      `);

      const result = stmt.run(userId, bookId);
      return {
        success: result.changes > 0,
        message: result.changes > 0 ? '取消收藏成功' : '未收藏该书籍'
      };
    } catch (error) {
      console.error('取消收藏失败:', error);
      return { success: false, message: '取消收藏失败' };
    }
  }

  // 获取收藏列表
  static getFavoriteList(userId: number, page: number = 1, pageSize: number = 20): {
    list: FavoriteWithBook[];
    total: number;
  } {
    try {
      // 获取总数
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE userId = ?');
      const { count: total } = countStmt.get(userId) as { count: number };

      if (total === 0) {
        return { list: [], total: 0 };
      }

      // 获取分页数据
      const offset = (page - 1) * pageSize;
      const listStmt = db.prepare(`
        SELECT id, userId, bookId, createdAt
        FROM favorites
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `);

      const favorites = listStmt.all(userId, pageSize, offset) as Favorite[];

      // 为每个收藏获取书籍信息
      const favoritesWithBooks: FavoriteWithBook[] = [];
      for (const favorite of favorites) {
        const bookInfo = this.getBookInfo(favorite.bookId);
        favoritesWithBooks.push({
          ...favorite,
          book: bookInfo
        });
      }

      return { list: favoritesWithBooks, total };
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      return { list: [], total: 0 };
    }
  }

  // 检查收藏状态
  static checkFavoriteStatus(userId: number, bookId: string): boolean {
    try {
      const stmt = db.prepare('SELECT 1 FROM favorites WHERE userId = ? AND bookId = ?');
      return !!stmt.get(userId, bookId);
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      return false;
    }
  }

  // 获取书籍信息（调用v1接口）
  private static getBookInfo(bookId: string): any {
    try {
      // 这里应该调用v1的书籍详情接口获取书籍信息
      // 为了简化，暂时返回基础信息，实际项目中应该调用书籍服务
      return {
        id: bookId,
        title: `书籍${bookId}`,
        author: '未知作者',
        category: '未知分类'
      };
    } catch (error) {
      console.error('获取书籍信息失败:', error);
      return {
        id: bookId,
        title: `书籍${bookId}`,
        author: '未知作者',
        category: '未知分类'
      };
    }
  }

  // 获取用户收藏总数
  static getFavoriteCount(userId: number): number {
    try {
      const stmt = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE userId = ?');
      const { count } = stmt.get(userId) as { count: number };
      return count;
    } catch (error) {
      console.error('获取收藏总数失败:', error);
      return 0;
    }
  }
}