import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// 后续阶段逐步注册：
// router.use('/favorites', favoriteRoutes);
// router.use('/posts', postRoutes);
// router.use('/books', bookRoutes);

export default router;