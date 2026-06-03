import { Router } from 'express';
import { BookController } from '../controllers/book.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// 书评
router.get('/:bookId/comments', optionalAuth, BookController.getComments);
router.post('/:bookId/comments', requireAuth, BookController.addComment);
router.delete('/:bookId/comments/:commentId', requireAuth, BookController.deleteComment);
router.post('/:bookId/comments/:commentId/like', requireAuth, BookController.toggleCommentLike);

// 评分
router.post('/:bookId/rating', requireAuth, BookController.setRating);
router.get('/:bookId/rating', optionalAuth, BookController.getRatingStats);

export default router;