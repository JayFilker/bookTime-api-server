import { Router } from 'express';
import { getBooks, getBookById } from '../controllers/book.controller';
import { getChaptersByBookId, getChapterById } from '../controllers/chapter.controller';

const router = Router();

router.get('/', getBooks);
router.get('/:id', getBookById);
router.get('/:bookId/chapters', getChaptersByBookId);
router.get('/:bookId/chapters/:chapterId', getChapterById);

export default router;
