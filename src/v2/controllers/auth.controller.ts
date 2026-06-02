import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { success, error } from '../../utils/response';
import { RegisterBody, LoginBody } from '../types/auth.types';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = req.body as RegisterBody;
    if (!username || !password) {
      res.status(400).json(error('username 和 password 不能为空', 400));
      return;
    }
    const data = await authService.register(username, password);
    res.status(201).json(success(data, '注册成功'));
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode) {
      res.status(e.statusCode).json(error(e.message, e.statusCode));
      return;
    }
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = req.body as LoginBody;
    if (!username || !password) {
      res.status(400).json(error('username 和 password 不能为空', 400));
      return;
    }
    const data = await authService.login(username, password);
    res.json(success(data, '登录成功'));
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode) {
      res.status(e.statusCode).json(error(e.message, e.statusCode));
      return;
    }
    next(err);
  }
};