import { Request, Response, NextFunction } from 'express';
import * as searchService from '../services/search.service';
import { success, error } from '../utils/response';
import { SearchQuery } from '../types/search.types';

export const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const keyword = req.query.keyword as string;
    if (!keyword) {
      res.status(400).json(error('keyword 不能为空', 400));
      return;
    }
    const query: SearchQuery = {
      keyword,
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 10,
    };
    const data = await searchService.search(query);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};
