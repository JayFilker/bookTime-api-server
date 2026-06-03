import db from '../db';
import { UserProfile, UpdateProfileRequest } from '../types/user.types';
import { withBaseUrl } from '../utils/url';

export class UserService {
  // 获取用户资料
  static getUserProfile(userId: number): UserProfile | null {
    const stmt = db.prepare(`
      SELECT id, username, nickname, avatar, bio, createdAt
      FROM users
      WHERE id = ?
    `);

    const user = stmt.get(userId) as UserProfile | undefined;
    if (!user) return null;

    // 获取统计信息
    const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE userId = ?').get(userId) as { count: number };
    const favoritesCount = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE userId = ?').get(userId) as { count: number };
    const commentsCount = db.prepare('SELECT COUNT(*) as count FROM book_comments WHERE userId = ?').get(userId) as { count: number };

    return {
      ...user,
      avatar: withBaseUrl(user.avatar) ?? undefined,
      postsCount: postsCount.count,
      favoritesCount: favoritesCount.count,
      commentsCount: commentsCount.count
    };
  }

  // 更新用户资料
  static updateUserProfile(userId: number, data: UpdateProfileRequest): boolean {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.nickname !== undefined) {
      fields.push('nickname = ?');
      values.push(data.nickname);
    }

    if (data.bio !== undefined) {
      fields.push('bio = ?');
      values.push(data.bio);
    }

    if (fields.length === 0) {
      return true; // 没有字段需要更新
    }

    values.push(userId);

    const stmt = db.prepare(`
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  // 更新用户头像
  static updateUserAvatar(userId: number, avatarPath: string): boolean {
    const stmt = db.prepare(`
      UPDATE users
      SET avatar = ?
      WHERE id = ?
    `);

    const result = stmt.run(avatarPath, userId);
    return result.changes > 0;
  }

  // 检查用户是否存在
  static userExists(userId: number): boolean {
    const stmt = db.prepare('SELECT 1 FROM users WHERE id = ?');
    return !!stmt.get(userId);
  }
}