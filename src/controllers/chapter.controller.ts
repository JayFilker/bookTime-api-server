import { Request, Response, NextFunction } from 'express';
import * as chapterService from '../services/chapter.service';
import { success } from '../utils/response';

export const getChaptersByBookId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
    const data = await chapterService.getChaptersByBookId(req.params['bookId'] as string, page, pageSize);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

export const getChapterById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await chapterService.getChapterById(req.params['chapterId'] as string, req.params['bookId'] as string);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};