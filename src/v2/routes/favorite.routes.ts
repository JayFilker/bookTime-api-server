import { Router } from 'express';
import { FavoriteController } from '../controllers/favorite.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// 添加收藏
router.post('/', requireAuth, FavoriteController.addFavorite);

// 取消收藏
router.delete('/:bookId', requireAuth, FavoriteController.removeFavorite);

// 获取收藏列表
router.get('/', requireAuth, FavoriteController.getFavoriteList);

// 获取收藏统计（必须在参数路由之前）
router.get('/stats', requireAuth, FavoriteController.getFavoriteStats);

// 检查收藏状态
router.get('/:bookId/status', requireAuth, FavoriteController.checkFavoriteStatus);

export default router;