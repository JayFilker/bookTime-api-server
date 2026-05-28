import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 jpg、png、webp 格式'));
  }
}

function filename(_req: Request, file: Express.Multer.File, cb: (err: Error | null, name: string) => void): void {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
}

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

export const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOADS_ROOT, 'avatars'),
    filename,
  }),
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 1 },
});

export const uploadPostImages = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOADS_ROOT, 'posts'),
    filename,
  }),
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 9 },
});

export const uploadCommentImages = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOADS_ROOT, 'comments'),
    filename,
  }),
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 9 },
});