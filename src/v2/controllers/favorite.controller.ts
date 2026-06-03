import { Request, Response } from 'express';
import { FavoriteService } from '../services/favorite.service';
import { AddFavoriteRequest, FavoriteListResponse, FavoriteStatusResponse } from '../types/favorite.types';

export class FavoriteController {
  // 添加收藏
  static addFavorite(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const { bookId }: AddFavoriteRequest = req.body;

      // 验证输入
      if (!bookId || typeof bookId !== 'string') {
        res.status(400).json({
          code: 400,
          message: 'bookId 是必填项且必须是字符串'
        });
        return;
      }

      if (!bookId.trim()) {
        res.status(400).json({
          code: 400,
          message: 'bookId 不能为空'
        });
        return;
      }

      const result = FavoriteService.addFavorite(userId, bookId.trim());

      if (!result.success) {
        const statusCode = result.message === '已收藏该书籍' ? 409 : 500;
        res.status(statusCode).json({
          code: statusCode,
          message: result.message
        });
        return;
      }

      res.json({
        code: 200,
        message: result.message,
        data: {
          bookId: bookId.trim(),
          isFavorited: true
        }
      });
    } catch (error) {
      console.error('添加收藏失败:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }

  // 取消收藏
  static removeFavorite(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const { bookId } = req.params;

      // 验证输入
      if (!bookId || typeof bookId !== 'string') {
        res.status(400).json({
          code: 400,
          message: '无效的 bookId'
        });
        return;
      }

      const result = FavoriteService.removeFavorite(userId, bookId);

      if (!result.success && result.message === '未收藏该书籍') {
        res.status(404).json({
          code: 404,
          message: result.message
        });
        return;
      }

      if (!result.success) {
        res.status(500).json({
          code: 500,
          message: result.message
        });
        return;
      }

      res.json({
        code: 200,
        message: result.message,
        data: {
          bookId,
          isFavorited: false
        }
      });
    } catch (error) {
      console.error('取消收藏失败:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }

  // 获取收藏列表
  static async getFavoriteList(req: Request, res: Response): Promise<void> {
    try {
      const userId = res.locals['userId'] as number;

      let page = parseInt(req.query.page as string) || 1;
      let pageSize = parseInt(req.query.pageSize as string) || 20;
      if (page < 1) page = 1;
      if (pageSize < 1 || pageSize > 100) pageSize = 20;

      const { list, total } = await FavoriteService.getFavoriteList(userId, page, pageSize);

      const response: FavoriteListResponse = { list, total, page, pageSize };

      res.json({ code: 200, message: '获取成功', data: response });
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }

  // 检查收藏状态
  static checkFavoriteStatus(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const { bookId } = req.params;

      // 验证输入
      if (!bookId || typeof bookId !== 'string') {
        res.status(400).json({
          code: 400,
          message: '无效的 bookId'
        });
        return;
      }

      const isFavorited = FavoriteService.checkFavoriteStatus(userId, bookId);

      const response: FavoriteStatusResponse = {
        bookId,
        isFavorited
      };

      res.json({
        code: 200,
        message: '查询成功',
        data: response
      });
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }

  // 获取收藏统计
  static getFavoriteStats(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;

      const count = FavoriteService.getFavoriteCount(userId);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          totalFavorites: count
        }
      });
    } catch (error) {
      console.error('获取收藏统计失败:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }
}