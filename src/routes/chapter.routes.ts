import { Router } from 'express';
import { getChapterById } from '../controllers/chapter.controller';

const router = Router();

router.get('/:chapterId', getChapterById);

export default router;