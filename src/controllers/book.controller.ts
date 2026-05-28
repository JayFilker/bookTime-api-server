import { Request, Response, NextFunction } from 'express';
import * as bookService from '../services/book.service';
import { success } from '../utils/response';
import { BookListQuery } from '../types/book.types';

export const getBooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: BookListQuery = {
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
      category: req.query.category as string ?? undefined,
    };
    const data = await bookService.getBooks(query);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

export const getBookById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await bookService.getBookById(req.params['id'] as string);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};
