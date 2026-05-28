import { Router } from 'express';
import bookRoutes from './book.routes';
import searchRoutes from './search.routes';
import homeRoutes from './home.routes';

const router = Router();

router.use('/books', bookRoutes);
router.use('/search', searchRoutes);
router.use('/home', homeRoutes);

export default router;