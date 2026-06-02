import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

router.use('/auth', authRoutes);

// 后续阶段逐步注册：
// router.use('/users', userRoutes);
// router.use('/favorites', favoriteRoutes);
// router.use('/posts', postRoutes);
// router.use('/books', bookRoutes);

export default router;