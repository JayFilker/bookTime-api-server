import db from '../db';
import { Post, PostWithMeta, PostImage } from '../types/post.types';

interface PostRow extends Post {
  username: string;
  nickname: string | null;
  avatar: string | null;
  likeCount: number;
  imageCount: number;
}

export class PostService {
  // 发布动态
  static createPost(
    userId: number,
    content: string,
    imagePaths: string[] = []
  ): { success: boolean; post?: PostWithMeta; message: string } {
    try {
      const result = db
        .prepare('INSERT INTO posts (userId, content) VALUES (?, ?)')
        .run(userId, content);

      const postId = result.lastInsertRowid as number;

      // 插入图片
      if (imagePaths.length > 0) {
        const imgStmt = db.prepare('INSERT INTO post_images (postId, path, sort) VALUES (?, ?, ?)');
        imagePaths.forEach((path, i) => imgStmt.run(postId, path, i));
      }

      const row = db
        .prepare(
          `SELECT p.id, p.userId, p.content, p.createdAt,
                  u.username, u.nickname, u.avatar
           FROM posts p
           JOIN users u ON u.id = p.userId
           WHERE p.id = ?`
        )
        .get(postId) as Omit<PostRow, 'likeCount' | 'imageCount'>;

      const images = imagePaths.map((path, i) => ({ id: 0, postId, path, sort: i })) as PostImage[];

      return {
        success: true,
        message: '发布成功',
        post: { ...row, likeCount: 0, isLiked: false, imageCount: images.length, images },
      };
    } catch (error) {
      console.error('发布动态失败:', error);
      return { success: false, message: '发布失败' };
    }
  }

  // 获取动态列表
  static getPosts(
    page: number = 1,
    pageSize: number = 20,
    currentUserId?: number
  ): { list: PostWithMeta[]; total: number } {
    try {
      const { count: total } = db
        .prepare('SELECT COUNT(*) as count FROM posts')
        .get() as { count: number };

      if (total === 0) return { list: [], total: 0 };

      const offset = (page - 1) * pageSize;
      const rows = db
        .prepare(
          `SELECT p.id, p.userId, p.content, p.createdAt,
                  u.username, u.nickname, u.avatar,
                  COUNT(DISTINCT pl.id) as likeCount,
                  COUNT(DISTINCT pi.id) as imageCount
           FROM posts p
           JOIN users u ON u.id = p.userId
           LEFT JOIN post_likes pl ON pl.postId = p.id
           LEFT JOIN post_images pi ON pi.postId = p.id
           GROUP BY p.id
           ORDER BY p.createdAt DESC
           LIMIT ? OFFSET ?`
        )
        .all(pageSize, offset) as PostRow[];

      const postIds = rows.map(r => r.id);

      // 批量查询图片
      const imageMap = new Map<number, PostImage[]>();
      if (postIds.length > 0) {
        const placeholders = postIds.map(() => '?').join(',');
        const imgs = db
          .prepare(`SELECT * FROM post_images WHERE postId IN (${placeholders}) ORDER BY postId, sort`)
          .all(...postIds) as PostImage[];
        imgs.forEach(img => {
          const arr = imageMap.get(img.postId) ?? [];
          arr.push(img);
          imageMap.set(img.postId, arr);
        });
      }

      // 批量查询点赞
      const likedSet = new Set<number>();
      if (currentUserId && postIds.length > 0) {
        const placeholders = postIds.map(() => '?').join(',');
        const liked = db
          .prepare(`SELECT postId FROM post_likes WHERE userId = ? AND postId IN (${placeholders})`)
          .all(currentUserId, ...postIds) as { postId: number }[];
        liked.forEach(l => likedSet.add(l.postId));
      }

      return {
        list: rows.map(r => ({
          ...r,
          isLiked: likedSet.has(r.id),
          images: imageMap.get(r.id) ?? [],
        })),
        total,
      };
    } catch (error) {
      console.error('获取动态列表失败:', error);
      return { list: [], total: 0 };
    }
  }

  // 获取单条动态
  static getPostById(
    postId: number,
    currentUserId?: number
  ): PostWithMeta | null {
    try {
      const row = db
        .prepare(
          `SELECT p.id, p.userId, p.content, p.createdAt,
                  u.username, u.nickname, u.avatar,
                  COUNT(DISTINCT pl.id) as likeCount,
                  COUNT(DISTINCT pi.id) as imageCount
           FROM posts p
           JOIN users u ON u.id = p.userId
           LEFT JOIN post_likes pl ON pl.postId = p.id
           LEFT JOIN post_images pi ON pi.postId = p.id
           WHERE p.id = ?
           GROUP BY p.id`
        )
        .get(postId) as PostRow | undefined;

      if (!row) return null;

      const images = db
        .prepare('SELECT * FROM post_images WHERE postId = ? ORDER BY sort')
        .all(postId) as PostImage[];

      const isLiked = currentUserId
        ? !!db.prepare('SELECT 1 FROM post_likes WHERE userId = ? AND postId = ?').get(currentUserId, postId)
        : false;

      return { ...row, isLiked, images };
    } catch (error) {
      console.error('获取动态失败:', error);
      return null;
    }
  }

  // 删除动态（只能删自己的）
  static deletePost(
    userId: number,
    postId: number
  ): { success: boolean; message: string } {
    try {
      const post = db
        .prepare('SELECT userId FROM posts WHERE id = ?')
        .get(postId) as { userId: number } | undefined;

      if (!post) return { success: false, message: '动态不存在' };
      if (post.userId !== userId) return { success: false, message: '无权删除该动态' };

      db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
      return { success: true, message: '删除成功' };
    } catch (error) {
      console.error('删除动态失败:', error);
      return { success: false, message: '删除失败' };
    }
  }

  // 切换点赞状态
  static toggleLike(
    userId: number,
    postId: number
  ): { success: boolean; isLiked: boolean; message: string } {
    try {
      const exists = db.prepare('SELECT 1 FROM posts WHERE id = ?').get(postId);
      if (!exists) return { success: false, isLiked: false, message: '动态不存在' };

      const already = db
        .prepare('SELECT 1 FROM post_likes WHERE userId = ? AND postId = ?')
        .get(userId, postId);

      if (already) {
        db.prepare('DELETE FROM post_likes WHERE userId = ? AND postId = ?').run(userId, postId);
        return { success: true, isLiked: false, message: '取消点赞' };
      }

      db.prepare('INSERT INTO post_likes (userId, postId) VALUES (?, ?)').run(userId, postId);
      return { success: true, isLiked: true, message: '点赞成功' };
    } catch (error) {
      console.error('切换点赞失败:', error);
      return { success: false, isLiked: false, message: '操作失败' };
    }
  }

  // 获取用户自己的动态列表
  static getUserPosts(
    userId: number,
    page: number = 1,
    pageSize: number = 20,
    currentUserId?: number
  ): { list: PostWithMeta[]; total: number } {
    try {
      const { count: total } = db
        .prepare('SELECT COUNT(*) as count FROM posts WHERE userId = ?')
        .get(userId) as { count: number };

      if (total === 0) return { list: [], total: 0 };

      const offset = (page - 1) * pageSize;
      const rows = db
        .prepare(
          `SELECT p.id, p.userId, p.content, p.createdAt,
                  u.username, u.nickname, u.avatar,
                  COUNT(DISTINCT pl.id) as likeCount,
                  COUNT(DISTINCT pi.id) as imageCount
           FROM posts p
           JOIN users u ON u.id = p.userId
           LEFT JOIN post_likes pl ON pl.postId = p.id
           LEFT JOIN post_images pi ON pi.postId = p.id
           WHERE p.userId = ?
           GROUP BY p.id
           ORDER BY p.createdAt DESC
           LIMIT ? OFFSET ?`
        )
        .all(userId, pageSize, offset) as PostRow[];

      const postIds = rows.map(r => r.id);
      const imageMap = new Map<number, PostImage[]>();
      if (postIds.length > 0) {
        const placeholders = postIds.map(() => '?').join(',');
        const imgs = db
          .prepare(`SELECT * FROM post_images WHERE postId IN (${placeholders}) ORDER BY postId, sort`)
          .all(...postIds) as PostImage[];
        imgs.forEach(img => {
          const arr = imageMap.get(img.postId) ?? [];
          arr.push(img);
          imageMap.set(img.postId, arr);
        });
      }

      const likedSet = new Set<number>();
      if (currentUserId && postIds.length > 0) {
        const placeholders = postIds.map(() => '?').join(',');
        const liked = db
          .prepare(`SELECT postId FROM post_likes WHERE userId = ? AND postId IN (${placeholders})`)
          .all(currentUserId, ...postIds) as { postId: number }[];
        liked.forEach(l => likedSet.add(l.postId));
      }

      return {
        list: rows.map(r => ({
          ...r,
          isLiked: likedSet.has(r.id),
          images: imageMap.get(r.id) ?? [],
        })),
        total,
      };
    } catch (error) {
      console.error('获取用户动态失败:', error);
      return { list: [], total: 0 };
    }
  }
}