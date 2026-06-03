import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { uploadAvatar } from '../middlewares/upload.middleware';

const router = Router();

// 获取用户资料
router.get('/profile', requireAuth, UserController.getProfile);

// 更新用户资料
router.put('/profile', requireAuth, UserController.updateProfile);

// 上传头像
router.post('/avatar', requireAuth, uploadAvatar.single('avatar'), UserController.uploadAvatar);

export default router;