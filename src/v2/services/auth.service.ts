import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db';
import { v2Config } from '../config';
import { AuthResult } from '../types/auth.types';

const USERNAME_RE = /^[a-zA-Z0-9_]{2,20}$/;
const BCRYPT_ROUNDS = 10;

interface UserRow {
  id: number;
  username: string;
  password: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
}

function signToken(userId: number): string {
  return jwt.sign({ userId }, v2Config.jwtSecret, { expiresIn: v2Config.jwtExpiresIn } as jwt.SignOptions);
}

export const register = async (username: string, password: string): Promise<AuthResult> => {
  if (!USERNAME_RE.test(username)) {
    const err = Object.assign(new Error('用户名只能包含字母、数字、下划线，长度 2-20 位'), { statusCode: 400 });
    throw err;
  }
  if (password.length < 6 || password.length > 40) {
    const err = Object.assign(new Error('密码长度须在 6-40 位之间'), { statusCode: 400 });
    throw err;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    const err = Object.assign(new Error('用户名已被注册'), { statusCode: 409 });
    throw err;
  }

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const result = db.prepare(
    'INSERT INTO users (username, password) VALUES (?, ?)'
  ).run(username, hashed);

  const userId = result.lastInsertRowid as number;
  return {
    accessToken: signToken(userId),
    user: { id: userId, username, nickname: null, avatar: null, bio: null },
  };
};

export const login = async (username: string, password: string): Promise<AuthResult> => {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;

  // 密码错误与用户不存在统一返回相同错误，防枚举攻击
  const invalidErr = Object.assign(new Error('用户名或密码错误'), { statusCode: 401 });

  if (!row) throw invalidErr;

  const match = await bcrypt.compare(password, row.password);
  if (!match) throw invalidErr;

  return {
    accessToken: signToken(row.id),
    user: { id: row.id, username: row.username, nickname: row.nickname, avatar: row.avatar, bio: row.bio },
  };
};