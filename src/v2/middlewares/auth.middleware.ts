import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v2Config } from '../config';

interface JwtPayload {
  userId: number;
}

function verifyToken(req: Request): number | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, v2Config.jwtSecret) as JwtPayload;
    return payload.userId;
  } catch {
    return null;
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const userId = verifyToken(req);
  if (userId === null) {
    res.status(401).json({ code: 401, message: '未登录或 token 已过期' });
    return;
  }
  res.locals['userId'] = userId;
  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const userId = verifyToken(req);
  if (userId !== null) {
    res.locals['userId'] = userId;
  }
  next();
};