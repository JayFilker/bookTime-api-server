import { Request, Response } from 'express';
import { BookService } from '../services/book.service';
import { AddCommentRequest, SetRatingRequest } from '../types/book.types';

export class BookController {
  // 发布书评（支持图片）
  static addComment(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const bookId = req.params['bookId'] as string;
      const { content }: AddCommentRequest = req.body;

      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ code: 400, message: '书评内容不能为空' });
        return;
      }
      if (content.trim().length > 1000) {
        res.status(400).json({ code: 400, message: '书评内容不能超过1000个字符' });
        return;
      }

      const files = (req.files as Express.Multer.File[]) ?? [];
      const imagePaths = files.map(f => `/uploads/comments/${f.filename}`);

      const result = BookService.addComment(userId, bookId, content.trim(), imagePaths);
      if (!result.success) {
        res.status(500).json({ code: 500, message: result.message });
        return;
      }

      res.status(201).json({ code: 200, message: result.message, data: result.comment });
    } catch (error) {
      console.error('发布书评失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 获取书评列表
  static getComments(req: Request, res: Response): void {
    try {
      const bookId = req.params['bookId'] as string;
      const currentUserId = res.locals['userId'] as number | undefined;
      let page = parseInt(req.query['page'] as string) || 1;
      let pageSize = parseInt(req.query['pageSize'] as string) || 20;
      if (page < 1) page = 1;
      if (pageSize < 1 || pageSize > 100) pageSize = 20;

      const { list, total } = BookService.getComments(bookId, page, pageSize, currentUserId);
      res.json({ code: 200, message: '获取成功', data: { list, total, page, pageSize } });
    } catch (error) {
      console.error('获取书评列表失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 删除书评
  static deleteComment(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const commentId = parseInt(req.params['commentId'] as string);

      if (isNaN(commentId)) {
        res.status(400).json({ code: 400, message: '无效的 commentId' });
        return;
      }

      const result = BookService.deleteComment(userId, commentId);
      if (!result.success) {
        const code =
          result.message === '书评不存在' ? 404 :
          result.message === '无权删除该书评' ? 403 : 500;
        res.status(code).json({ code, message: result.message });
        return;
      }

      res.json({ code: 200, message: result.message });
    } catch (error) {
      console.error('删除书评失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 点赞/取消点赞书评
  static toggleCommentLike(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const commentId = parseInt(req.params['commentId'] as string);

      if (isNaN(commentId)) {
        res.status(400).json({ code: 400, message: '无效的 commentId' });
        return;
      }

      const result = BookService.toggleCommentLike(userId, commentId);
      if (!result.success) {
        const code = result.message === '书评不存在' ? 404 : 500;
        res.status(code).json({ code, message: result.message });
        return;
      }

      res.json({ code: 200, message: result.message, data: { commentId, isLiked: result.isLiked } });
    } catch (error) {
      console.error('切换点赞失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 设置/更新评分
  static setRating(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const bookId = req.params['bookId'] as string;
      const { rating }: SetRatingRequest = req.body;

      if (
        typeof rating !== 'number' ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        res.status(400).json({ code: 400, message: 'rating 必须是 1-5 的整数' });
        return;
      }

      const result = BookService.setRating(userId, bookId, rating);
      if (!result.success) {
        res.status(500).json({ code: 500, message: result.message });
        return;
      }

      res.json({ code: 200, message: result.message, data: { bookId, rating } });
    } catch (error) {
      console.error('设置评分失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 获取评分统计
  static getRatingStats(req: Request, res: Response): void {
    try {
      const bookId = req.params['bookId'] as string;
      const currentUserId = res.locals['userId'] as number | undefined;

      const stats = BookService.getRatingStats(bookId, currentUserId);
      res.json({ code: 200, message: '获取成功', data: stats });
    } catch (error) {
      console.error('获取评分统计失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }
}
