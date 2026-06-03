import { Router } from 'express';
import { PostController } from '../controllers/post.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';
import { uploadPostImages } from '../middlewares/upload.middleware';

const router = Router();

// 动态广场
router.get('/', optionalAuth, PostController.getPosts);

// 发布动态（最多9张图）
router.post('/', requireAuth, uploadPostImages.array('images', 9), PostController.createPost);

// 指定用户的动态（必须在 /:postId 之前，否则 "user" 会被当成 postId）
router.get('/user/:userId', optionalAuth, PostController.getUserPosts);

// 单条动态
router.get('/:postId', optionalAuth, PostController.getPostById);

// 删除动态
router.delete('/:postId', requireAuth, PostController.deletePost);

// 点赞/取消点赞
router.post('/:postId/like', requireAuth, PostController.toggleLike);

export default router;