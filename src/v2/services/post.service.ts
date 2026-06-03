import db from '../db';
import { Post, PostWithMeta, PostImage, PostCommentWithUser } from '../types/post.types';
import { withBaseUrl } from '../utils/url';

interface PostRow extends Post {
  username: string;
  nickname: string | null;
  avatar: string | null;
  likeCount: number;
  imageCount: number;
  commentCount: number;
}

function buildPostMeta(
  rows: PostRow[],
  currentUserId?: number
): PostWithMeta[] {
  const postIds = rows.map(r => r.id);

  const imageMap = new Map<number, PostImage[]>();
  if (postIds.length > 0) {
    const ph = postIds.map(() => '?').join(',');
    const imgs = db
      .prepare(`SELECT * FROM post_images WHERE postId IN (${ph}) ORDER BY postId, sort`)
      .all(...postIds) as PostImage[];
    imgs.forEach(img => {
      const arr = imageMap.get(img.postId) ?? [];
      arr.push({ ...img, path: withBaseUrl(img.path) as string });
      imageMap.set(img.postId, arr);
    });
  }

  const likedSet = new Set<number>();
  if (currentUserId && postIds.length > 0) {
    const ph = postIds.map(() => '?').join(',');
    const liked = db
      .prepare(`SELECT postId FROM post_likes WHERE userId = ? AND postId IN (${ph})`)
      .all(currentUserId, ...postIds) as { postId: number }[];
    liked.forEach(l => likedSet.add(l.postId));
  }

  // 每条动态最多携带最新 3 条评论作为预览
  const commentMap = new Map<number, PostCommentWithUser[]>();
  if (postIds.length > 0) {
    const ph = postIds.map(() => '?').join(',');
    const comments = db
      .prepare(
        `SELECT pc.id, pc.postId, pc.userId, pc.content, pc.createdAt,
                u.username, u.nickname, u.avatar
         FROM post_comments pc
         JOIN users u ON u.id = pc.userId
         WHERE pc.postId IN (${ph})
         ORDER BY pc.postId, pc.createdAt DESC`
      )
      .all(...postIds) as PostCommentWithUser[];
    comments.forEach(c => {
      const arr = commentMap.get(c.postId) ?? [];
      if (arr.length < 3) arr.push(c);
      commentMap.set(c.postId, arr);
    });
  }

  return rows.map(r => ({
    ...r,
    avatar: withBaseUrl(r.avatar),
    isLiked: likedSet.has(r.id),
    images: imageMap.get(r.id) ?? [],
    comments: (commentMap.get(r.id) ?? []).map(c => ({ ...c, avatar: withBaseUrl(c.avatar) })),
  }));
}

export class PostService {
  // 发布动态
  static createPost(
    userId: number,
    content: string,
    imagePaths: string[] = [],
    title?: string
  ): { success: boolean; post?: PostWithMeta; message: string } {
    try {
      const result = db
        .prepare('INSERT INTO posts (userId, title, content) VALUES (?, ?, ?)')
        .run(userId, title ?? null, content);

      const postId = result.lastInsertRowid as number;

      // 插入图片
      if (imagePaths.length > 0) {
        const imgStmt = db.prepare('INSERT INTO post_images (postId, path, sort) VALUES (?, ?, ?)');
        imagePaths.forEach((path, i) => imgStmt.run(postId, path, i));
      }

      const row = db
        .prepare(
          `SELECT p.id, p.userId, p.title, p.content, p.createdAt,
                  u.username, u.nickname, u.avatar
           FROM posts p
           JOIN users u ON u.id = p.userId
           WHERE p.id = ?`
        )
        .get(postId) as Omit<PostRow, 'likeCount' | 'imageCount'>;

      const images = imagePaths.map((path, i) => ({ id: 0, postId, path: withBaseUrl(path) as string, sort: i })) as PostImage[];

      return {
        success: true,
        message: '发布成功',
        post: { ...row, likeCount: 0, isLiked: false, imageCount: images.length, images, commentCount: 0, comments: [] },
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
          `SELECT p.id, p.userId, p.title, p.content, p.createdAt,
                  u.username, u.nickname, u.avatar,
                  COUNT(DISTINCT pl.id) as likeCount,
                  COUNT(DISTINCT pi.id) as imageCount,
                  COUNT(DISTINCT pc.id) as commentCount
           FROM posts p
           JOIN users u ON u.id = p.userId
           LEFT JOIN post_likes pl ON pl.postId = p.id
           LEFT JOIN post_images pi ON pi.postId = p.id
           LEFT JOIN post_comments pc ON pc.postId = p.id
           GROUP BY p.id
           ORDER BY p.createdAt DESC
           LIMIT ? OFFSET ?`
        )
        .all(pageSize, offset) as PostRow[];

      return { list: buildPostMeta(rows, currentUserId), total };
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
          `SELECT p.id, p.userId, p.title, p.content, p.createdAt,
                  u.username, u.nickname, u.avatar,
                  COUNT(DISTINCT pl.id) as likeCount,
                  COUNT(DISTINCT pi.id) as imageCount,
                  COUNT(DISTINCT pc.id) as commentCount
           FROM posts p
           JOIN users u ON u.id = p.userId
           LEFT JOIN post_likes pl ON pl.postId = p.id
           LEFT JOIN post_images pi ON pi.postId = p.id
           LEFT JOIN post_comments pc ON pc.postId = p.id
           WHERE p.id = ?
           GROUP BY p.id`
        )
        .get(postId) as PostRow | undefined;

      if (!row) return null;

      const images = db
        .prepare('SELECT * FROM post_images WHERE postId = ? ORDER BY sort')
        .all(postId) as PostImage[];
      images.forEach(img => { img.path = withBaseUrl(img.path) as string; });

      const isLiked = currentUserId
        ? !!db.prepare('SELECT 1 FROM post_likes WHERE userId = ? AND postId = ?').get(currentUserId, postId)
        : false;

      const comments = (db
        .prepare(
          `SELECT pc.id, pc.postId, pc.userId, pc.content, pc.createdAt,
                  u.username, u.nickname, u.avatar
           FROM post_comments pc
           JOIN users u ON u.id = pc.userId
           WHERE pc.postId = ?
           ORDER BY pc.createdAt DESC`
        )
        .all(postId) as PostCommentWithUser[]).map(c => ({ ...c, avatar: withBaseUrl(c.avatar) }));

      return { ...row, avatar: withBaseUrl(row.avatar), isLiked, images, comments };
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

  // 发布评论
  static createComment(
    userId: number,
    postId: number,
    content: string
  ): { success: boolean; comment?: PostCommentWithUser; message: string } {
    try {
      const post = db.prepare('SELECT 1 FROM posts WHERE id = ?').get(postId);
      if (!post) return { success: false, message: '动态不存在' };

      const result = db
        .prepare('INSERT INTO post_comments (postId, userId, content) VALUES (?, ?, ?)')
        .run(postId, userId, content);

      const commentId = result.lastInsertRowid as number;
      const comment = db
        .prepare(
          `SELECT pc.id, pc.postId, pc.userId, pc.content, pc.createdAt,
                  u.username, u.nickname, u.avatar
           FROM post_comments pc
           JOIN users u ON u.id = pc.userId
           WHERE pc.id = ?`
        )
        .get(commentId) as PostCommentWithUser;

      return { success: true, message: '评论成功', comment };
    } catch (error) {
      console.error('发布评论失败:', error);
      return { success: false, message: '评论失败' };
    }
  }

  // 获取动态评论列表
  static getPostComments(
    postId: number,
    page: number = 1,
    pageSize: number = 20,
    paginate: boolean = true
  ): { list: PostCommentWithUser[]; total: number } {
    try {
      const post = db.prepare('SELECT 1 FROM posts WHERE id = ?').get(postId);
      if (!post) return { list: [], total: 0 };

      const { count: total } = db
        .prepare('SELECT COUNT(*) as count FROM post_comments WHERE postId = ?')
        .get(postId) as { count: number };

      if (total === 0) return { list: [], total: 0 };

      const baseQuery = `SELECT pc.id, pc.postId, pc.userId, pc.content, pc.createdAt,
              u.username, u.nickname, u.avatar
       FROM post_comments pc
       JOIN users u ON u.id = pc.userId
       WHERE pc.postId = ?
       ORDER BY pc.createdAt DESC`;

      const list = paginate
        ? (db.prepare(`${baseQuery} LIMIT ? OFFSET ?`).all(postId, pageSize, (page - 1) * pageSize) as PostCommentWithUser[]).map(c => ({ ...c, avatar: withBaseUrl(c.avatar) }))
        : (db.prepare(baseQuery).all(postId) as PostCommentWithUser[]).map(c => ({ ...c, avatar: withBaseUrl(c.avatar) }));

      return { list, total };
    } catch (error) {
      console.error('获取评论列表失败:', error);
      return { list: [], total: 0 };
    }
  }

  // 删除评论（只能删自己的）
  static deleteComment(
    userId: number,
    commentId: number
  ): { success: boolean; message: string } {
    try {
      const comment = db
        .prepare('SELECT userId FROM post_comments WHERE id = ?')
        .get(commentId) as { userId: number } | undefined;

      if (!comment) return { success: false, message: '评论不存在' };
      if (comment.userId !== userId) return { success: false, message: '无权删除该评论' };

      db.prepare('DELETE FROM post_comments WHERE id = ?').run(commentId);
      return { success: true, message: '删除成功' };
    } catch (error) {
      console.error('删除评论失败:', error);
      return { success: false, message: '删除失败' };
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
          `SELECT p.id, p.userId, p.title, p.content, p.createdAt,
                  u.username, u.nickname, u.avatar,
                  COUNT(DISTINCT pl.id) as likeCount,
                  COUNT(DISTINCT pi.id) as imageCount,
                  COUNT(DISTINCT pc.id) as commentCount
           FROM posts p
           JOIN users u ON u.id = p.userId
           LEFT JOIN post_likes pl ON pl.postId = p.id
           LEFT JOIN post_images pi ON pi.postId = p.id
           LEFT JOIN post_comments pc ON pc.postId = p.id
           WHERE p.userId = ?
           GROUP BY p.id
           ORDER BY p.createdAt DESC
           LIMIT ? OFFSET ?`
        )
        .all(userId, pageSize, offset) as PostRow[];

      return { list: buildPostMeta(rows, currentUserId), total };
    } catch (error) {
      console.error('获取用户动态失败:', error);
      return { list: [], total: 0 };
    }
  }
}