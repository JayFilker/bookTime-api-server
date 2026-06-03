import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { BookService } from '../services/book.service';
import { UpdateProfileRequest } from '../types/user.types';

export class UserController {
  // 获取用户资料
  static getProfile(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;

      const profile = UserService.getUserProfile(userId);

      if (!profile) {
        res.status(404).json({
          code: 404,
          message: '用户不存在'
        });
        return;
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: profile
      });
    } catch (error) {
      console.error('获取用户资料失败:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }

  // 更新用户资料
  static updateProfile(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const updateData: UpdateProfileRequest = req.body;

      // 验证输入数据
      if (updateData.nickname !== undefined) {
        if (typeof updateData.nickname !== 'string') {
          res.status(400).json({
            code: 400,
            message: '昵称必须是字符串'
          });
          return;
        }
        if (updateData.nickname.length > 50) {
          res.status(400).json({
            code: 400,
            message: '昵称长度不能超过50个字符'
          });
          return;
        }
      }

      if (updateData.bio !== undefined) {
        if (typeof updateData.bio !== 'string') {
          res.status(400).json({
            code: 400,
            message: '个人简介必须是字符串'
          });
          return;
        }
        if (updateData.bio.length > 200) {
          res.status(400).json({
            code: 400,
            message: '个人简介长度不能超过200个字符'
          });
          return;
        }
      }

      const success = UserService.updateUserProfile(userId, updateData);

      if (!success) {
        res.status(404).json({
          code: 404,
          message: '用户不存在'
        });
        return;
      }

      // 返回更新后的用户资料
      const updatedProfile = UserService.getUserProfile(userId);

      res.json({
        code: 200,
        message: '更新成功',
        data: updatedProfile
      });
    } catch (error) {
      console.error('更新用户资料失败:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }

  // 上传头像
  static uploadAvatar(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;

      if (!req.file) {
        res.status(400).json({
          code: 400,
          message: '请选择头像文件'
        });
        return;
      }

      // 构建头像访问路径
      const avatarPath = `/uploads/avatars/${req.file.filename}`;

      const success = UserService.updateUserAvatar(userId, avatarPath);

      if (!success) {
        res.status(404).json({
          code: 404,
          message: '用户不存在'
        });
        return;
      }

      res.json({
        code: 200,
        message: '头像上传成功',
        data: {
          avatar: avatarPath
        }
      });
    } catch (error) {
      console.error('头像上传失败:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }

  // 获取个人书评列表
  static getMyComments(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      let page = parseInt(req.query['page'] as string) || 1;
      let pageSize = parseInt(req.query['pageSize'] as string) || 20;

      if (page < 1) page = 1;
      if (pageSize < 1 || pageSize > 100) pageSize = 20;

      const { list, total } = BookService.getUserComments(userId, page, pageSize);

      res.json({
        code: 200,
        message: '获取成功',
        data: { list, total, page, pageSize }
      });
    } catch (error) {
      console.error('获取个人书评列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }
}