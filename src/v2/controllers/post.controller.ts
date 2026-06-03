import { Request, Response } from 'express';
import { PostService } from '../services/post.service';
import { CreatePostRequest, CreateCommentRequest } from '../types/post.types';

export class PostController {
  // 发布动态
  static createPost(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const { content, title }: CreatePostRequest = req.body;

      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ code: 400, message: '动态内容不能为空' });
        return;
      }
      if (content.trim().length > 500) {
        res.status(400).json({ code: 400, message: '动态内容不能超过500个字符' });
        return;
      }
      if (title && title.trim().length > 50) {
        res.status(400).json({ code: 400, message: '动态标题不能超过50个字符' });
        return;
      }

      const files = (req.files as Express.Multer.File[]) ?? [];
      const imagePaths = files.map(f => `/uploads/posts/${f.filename}`);

      const result = PostService.createPost(
        userId,
        content.trim(),
        imagePaths,
        title?.trim() || undefined
      );
      if (!result.success) {
        res.status(500).json({ code: 500, message: result.message });
        return;
      }

      res.status(201).json({ code: 200, message: result.message, data: result.post });
    } catch (error) {
      console.error('发布动态失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 获取动态广场列表
  static getPosts(req: Request, res: Response): void {
    try {
      const currentUserId = res.locals['userId'] as number | undefined;
      let page = parseInt(req.query['page'] as string) || 1;
      let pageSize = parseInt(req.query['pageSize'] as string) || 20;
      if (page < 1) page = 1;
      if (pageSize < 1 || pageSize > 100) pageSize = 20;

      const { list, total } = PostService.getPosts(page, pageSize, currentUserId);
      res.json({ code: 200, message: '获取成功', data: { list, total, page, pageSize } });
    } catch (error) {
      console.error('获取动态列表失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 获取单条动态
  static getPostById(req: Request, res: Response): void {
    try {
      const postId = parseInt(req.params['postId'] as string);
      const currentUserId = res.locals['userId'] as number | undefined;

      if (isNaN(postId)) {
        res.status(400).json({ code: 400, message: '无效的 postId' });
        return;
      }

      const post = PostService.getPostById(postId, currentUserId);
      if (!post) {
        res.status(404).json({ code: 404, message: '动态不存在' });
        return;
      }

      res.json({ code: 200, message: '获取成功', data: post });
    } catch (error) {
      console.error('获取动态失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 删除动态
  static deletePost(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const postId = parseInt(req.params['postId'] as string);

      if (isNaN(postId)) {
        res.status(400).json({ code: 400, message: '无效的 postId' });
        return;
      }

      const result = PostService.deletePost(userId, postId);
      if (!result.success) {
        const code =
          result.message === '动态不存在' ? 404 :
          result.message === '无权删除该动态' ? 403 : 500;
        res.status(code).json({ code, message: result.message });
        return;
      }

      res.json({ code: 200, message: result.message });
    } catch (error) {
      console.error('删除动态失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 点赞/取消点赞
  static toggleLike(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const postId = parseInt(req.params['postId'] as string);

      if (isNaN(postId)) {
        res.status(400).json({ code: 400, message: '无效的 postId' });
        return;
      }

      const result = PostService.toggleLike(userId, postId);
      if (!result.success) {
        const code = result.message === '动态不存在' ? 404 : 500;
        res.status(code).json({ code, message: result.message });
        return;
      }

      res.json({ code: 200, message: result.message, data: { postId, isLiked: result.isLiked } });
    } catch (error) {
      console.error('切换点赞失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 获取指定用户的动态
  static getUserPosts(req: Request, res: Response): void {
    try {
      const userId = parseInt(req.params['userId'] as string);
      const currentUserId = res.locals['userId'] as number | undefined;
      let page = parseInt(req.query['page'] as string) || 1;
      let pageSize = parseInt(req.query['pageSize'] as string) || 20;
      if (isNaN(userId)) {
        res.status(400).json({ code: 400, message: '无效的 userId' });
        return;
      }
      if (page < 1) page = 1;
      if (pageSize < 1 || pageSize > 100) pageSize = 20;

      const { list, total } = PostService.getUserPosts(userId, page, pageSize, currentUserId);
      res.json({ code: 200, message: '获取成功', data: { list, total, page, pageSize } });
    } catch (error) {
      console.error('获取用户动态失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 发布评论
  static createComment(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const postId = parseInt(req.params['postId'] as string);
      const { content }: CreateCommentRequest = req.body;

      if (isNaN(postId)) {
        res.status(400).json({ code: 400, message: '无效的 postId' });
        return;
      }
      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ code: 400, message: '评论内容不能为空' });
        return;
      }
      if (content.trim().length > 300) {
        res.status(400).json({ code: 400, message: '评论内容不能超过300个字符' });
        return;
      }

      const result = PostService.createComment(userId, postId, content.trim());
      if (!result.success) {
        const code = result.message === '动态不存在' ? 404 : 500;
        res.status(code).json({ code, message: result.message });
        return;
      }

      res.status(201).json({ code: 200, message: result.message, data: result.comment });
    } catch (error) {
      console.error('发布评论失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 获取动态评论列表
  static getPostComments(req: Request, res: Response): void {
    try {
      const postId = parseInt(req.params['postId'] as string);
      const paginate = req.query['paginate'] !== 'false';
      let page = parseInt(req.query['page'] as string) || 1;
      let pageSize = parseInt(req.query['pageSize'] as string) || 20;

      if (isNaN(postId)) {
        res.status(400).json({ code: 400, message: '无效的 postId' });
        return;
      }
      if (page < 1) page = 1;
      if (pageSize < 1 || pageSize > 100) pageSize = 20;

      const { list, total } = PostService.getPostComments(postId, page, pageSize, paginate);
      res.json({ code: 200, message: '获取成功', data: { list, total, page: paginate ? page : 1, pageSize: paginate ? pageSize : total } });
    } catch (error) {
      console.error('获取评论列表失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  // 删除评论
  static deleteComment(req: Request, res: Response): void {
    try {
      const userId = res.locals['userId'] as number;
      const commentId = parseInt(req.params['commentId'] as string);

      if (isNaN(commentId)) {
        res.status(400).json({ code: 400, message: '无效的 commentId' });
        return;
      }

      const result = PostService.deleteComment(userId, commentId);
      if (!result.success) {
        const code =
          result.message === '评论不存在' ? 404 :
          result.message === '无权删除该评论' ? 403 : 500;
        res.status(code).json({ code, message: result.message });
        return;
      }

      res.json({ code: 200, message: result.message });
    } catch (error) {
      console.error('删除评论失败:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }
}