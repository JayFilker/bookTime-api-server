import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import favoriteRoutes from './favorite.routes';
import bookRoutes from './book.routes';
import postRoutes from './post.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/books', bookRoutes);
router.use('/posts', postRoutes);

export default router;