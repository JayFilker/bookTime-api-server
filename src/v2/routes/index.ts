import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import favoriteRoutes from './favorite.routes';
import bookRoutes from './book.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/books', bookRoutes);

// 后续阶段逐步注册：
// router.use('/posts', postRoutes);

export default router;