import dotenv from 'dotenv';
dotenv.config();

const jwtSecret = process.env['JWT_SECRET'];
const jwtExpiresIn = process.env['JWT_EXPIRES_IN'] ?? '7d';

if (!jwtSecret) {
  throw new Error('环境变量 JWT_SECRET 未配置');
}

export const v2Config = {
  jwtSecret,
  jwtExpiresIn,
};