import { Request, Response, NextFunction } from 'express';
import * as homeService from '../services/home.service';
import { success } from '../utils/response';

export const getHomeData = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await homeService.getHomeData();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};