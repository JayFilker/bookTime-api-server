export interface Post {
  id: number;
  userId: number;
  title: string | null;
  content: string;
  createdAt: string;
}

export interface PostImage {
  id: number;
  postId: number;
  path: string;
  sort: number;
}

export interface PostComment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
}

export interface PostCommentWithUser extends PostComment {
  username: string;
  nickname: string | null;
  avatar: string | null;
}

export interface PostWithMeta extends Post {
  likeCount: number;
  isLiked: boolean;
  imageCount: number;
  images: PostImage[];
  username: string;
  nickname: string | null;
  avatar: string | null;
  commentCount: number;
  comments: PostCommentWithUser[];
}

export interface CreatePostRequest {
  title?: string;
  content: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface PostListResponse {
  list: PostWithMeta[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CommentListResponse {
  list: PostCommentWithUser[];
  total: number;
  page: number;
  pageSize: number;
}