import db from '../db';
import {
  BookComment,
  BookCommentWithMeta,
  BookCommentImage,
  BookRatingStats,
} from '../types/book.types';
import { withBaseUrl } from '../utils/url';

interface CommentRow extends BookComment {
  username: string;
  nickname: string | null;
  avatar: string | null;
  likeCount: number;
}

function getCommentImages(commentIds: number[]): Map<number, BookCommentImage[]> {
  const map = new Map<number, BookCommentImage[]>();
  if (commentIds.length === 0) return map;
  const placeholders = commentIds.map(() => '?').join(',');
  const imgs = db
    .prepare(`SELECT * FROM book_comment_images WHERE commentId IN (${placeholders}) ORDER BY commentId, sort`)
    .all(...commentIds) as BookCommentImage[];
  imgs.forEach(img => {
    const arr = map.get(img.commentId) ?? [];
    arr.push({ ...img, path: withBaseUrl(img.path) as string });
    map.set(img.commentId, arr);
  });
  return map;
}

export class BookService {
  // 发布书评
  static addComment(
    userId: number,
    bookId: string,
    content: string,
    imagePaths: string[] = []
  ): { success: boolean; comment?: BookCommentWithMeta; message: string } {
    try {
      const result = db
        .prepare('INSERT INTO book_comments (userId, bookId, content) VALUES (?, ?, ?)')
        .run(userId, bookId, content);

      const id = result.lastInsertRowid as number;

      if (imagePaths.length > 0) {
        const imgStmt = db.prepare('INSERT INTO book_comment_images (commentId, path, sort) VALUES (?, ?, ?)');
        imagePaths.forEach((path, i) => imgStmt.run(id, path, i));
      }

      const row = db
        .prepare(
          `SELECT bc.id, bc.userId, bc.bookId, bc.content, bc.createdAt,
                  u.username, u.nickname, u.avatar
           FROM book_comments bc
           JOIN users u ON u.id = bc.userId
           WHERE bc.id = ?`
        )
        .get(id) as Omit<CommentRow, 'likeCount'>;

      const images = imagePaths.map((path, i) => ({
        id: 0, commentId: id, path: withBaseUrl(path) as string, sort: i,
      }));

      return {
        success: true,
        message: '发布成功',
        comment: { ...row, avatar: withBaseUrl(row.avatar), likeCount: 0, isLiked: false, images },
      };
    } catch (error) {
      console.error('添加书评失败:', error);
      return { success: false, message: '发布失败' };
    }
  }

  // 获取书评列表
  static getComments(
    bookId: string,
    page: number = 1,
    pageSize: number = 20,
    currentUserId?: number
  ): { list: BookCommentWithMeta[]; total: number } {
    try {
      const { count: total } = db
        .prepare('SELECT COUNT(*) as count FROM book_comments WHERE bookId = ?')
        .get(bookId) as { count: number };

      if (total === 0) return { list: [], total: 0 };

      const offset = (page - 1) * pageSize;
      const rows = db
        .prepare(
          `SELECT bc.id, bc.userId, bc.bookId, bc.content, bc.createdAt,
                  u.username, u.nickname, u.avatar,
                  COUNT(bcl.id) as likeCount
           FROM book_comments bc
           JOIN users u ON u.id = bc.userId
           LEFT JOIN book_comment_likes bcl ON bcl.commentId = bc.id
           WHERE bc.bookId = ?
           GROUP BY bc.id
           ORDER BY bc.createdAt DESC
           LIMIT ? OFFSET ?`
        )
        .all(bookId, pageSize, offset) as CommentRow[];

      const ids = rows.map(r => r.id);
      const imageMap = getCommentImages(ids);

      const likedSet = new Set<number>();
      if (currentUserId && ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        const liked = db
          .prepare(
            `SELECT commentId FROM book_comment_likes WHERE userId = ? AND commentId IN (${placeholders})`
          )
          .all(currentUserId, ...ids) as { commentId: number }[];
        liked.forEach(l => likedSet.add(l.commentId));
      }

      return {
        list: rows.map(r => ({
          ...r,
          avatar: withBaseUrl(r.avatar),
          isLiked: likedSet.has(r.id),
          images: imageMap.get(r.id) ?? [],
        })),
        total,
      };
    } catch (error) {
      console.error('获取书评列表失败:', error);
      return { list: [], total: 0 };
    }
  }

  // 删除书评（只能删自己的）
  static deleteComment(
    userId: number,
    commentId: number
  ): { success: boolean; message: string } {
    try {
      const comment = db
        .prepare('SELECT userId FROM book_comments WHERE id = ?')
        .get(commentId) as { userId: number } | undefined;

      if (!comment) return { success: false, message: '书评不存在' };
      if (comment.userId !== userId) return { success: false, message: '无权删除该书评' };

      db.prepare('DELETE FROM book_comments WHERE id = ?').run(commentId);
      return { success: true, message: '删除成功' };
    } catch (error) {
      console.error('删除书评失败:', error);
      return { success: false, message: '删除失败' };
    }
  }

  // 切换点赞状态
  static toggleCommentLike(
    userId: number,
    commentId: number
  ): { success: boolean; isLiked: boolean; message: string } {
    try {
      const exists = db
        .prepare('SELECT 1 FROM book_comments WHERE id = ?')
        .get(commentId);
      if (!exists) return { success: false, isLiked: false, message: '书评不存在' };

      const already = db
        .prepare('SELECT 1 FROM book_comment_likes WHERE userId = ? AND commentId = ?')
        .get(userId, commentId);

      if (already) {
        db.prepare('DELETE FROM book_comment_likes WHERE userId = ? AND commentId = ?').run(userId, commentId);
        return { success: true, isLiked: false, message: '取消点赞' };
      }

      db.prepare('INSERT INTO book_comment_likes (userId, commentId) VALUES (?, ?)').run(userId, commentId);
      return { success: true, isLiked: true, message: '点赞成功' };
    } catch (error) {
      console.error('切换点赞失败:', error);
      return { success: false, isLiked: false, message: '操作失败' };
    }
  }

  // 设置/更新评分
  static setRating(
    userId: number,
    bookId: string,
    rating: number
  ): { success: boolean; message: string } {
    try {
      db.prepare(
        `INSERT INTO book_ratings (userId, bookId, rating)
         VALUES (?, ?, ?)
         ON CONFLICT(userId, bookId) DO UPDATE SET rating = excluded.rating`
      ).run(userId, bookId, rating);
      return { success: true, message: '评分成功' };
    } catch (error) {
      console.error('设置评分失败:', error);
      return { success: false, message: '评分失败' };
    }
  }

  // 获取评分统计
  static getRatingStats(bookId: string, userId?: number): BookRatingStats {
    try {
      const stats = db
        .prepare(
          `SELECT ROUND(AVG(rating), 1) as avgRating, COUNT(*) as totalRatings
           FROM book_ratings WHERE bookId = ?`
        )
        .get(bookId) as { avgRating: number | null; totalRatings: number };

      let myRating: number | null = null;
      if (userId) {
        const my = db
          .prepare('SELECT rating FROM book_ratings WHERE userId = ? AND bookId = ?')
          .get(userId, bookId) as { rating: number } | undefined;
        myRating = my?.rating ?? null;
      }

      return {
        avgRating: stats.avgRating ?? 0,
        totalRatings: stats.totalRatings,
        myRating,
      };
    } catch (error) {
      console.error('获取评分统计失败:', error);
      return { avgRating: 0, totalRatings: 0, myRating: null };
    }
  }

  // 获取用户个人书评列表
  static getUserComments(
    userId: number,
    page: number = 1,
    pageSize: number = 20
  ): { list: BookCommentWithMeta[]; total: number } {
    try {
      const { count: total } = db
        .prepare('SELECT COUNT(*) as count FROM book_comments WHERE userId = ?')
        .get(userId) as { count: number };

      if (total === 0) return { list: [], total: 0 };

      const offset = (page - 1) * pageSize;
      const rows = db
        .prepare(
          `SELECT bc.id, bc.userId, bc.bookId, bc.content, bc.createdAt,
                  u.username, u.nickname, u.avatar,
                  COUNT(bcl.id) as likeCount
           FROM book_comments bc
           JOIN users u ON u.id = bc.userId
           LEFT JOIN book_comment_likes bcl ON bcl.commentId = bc.id
           WHERE bc.userId = ?
           GROUP BY bc.id
           ORDER BY bc.createdAt DESC
           LIMIT ? OFFSET ?`
        )
        .all(userId, pageSize, offset) as CommentRow[];

      const ids = rows.map(r => r.id);
      const imageMap = getCommentImages(ids);

      // 用户查看自己的书评，isLiked 始终为 false（自己不能给自己点赞）
      return {
        list: rows.map(r => ({
          ...r,
          avatar: withBaseUrl(r.avatar),
          isLiked: false,
          images: imageMap.get(r.id) ?? [],
        })),
        total,
      };
    } catch (error) {
      console.error('获取用户书评列表失败:', error);
      return { list: [], total: 0 };
    }
  }
}