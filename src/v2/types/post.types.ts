export interface Post {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
}

export interface PostImage {
  id: number;
  postId: number;
  path: string;
  sort: number;
}

export interface PostWithMeta extends Post {
  likeCount: number;
  isLiked: boolean;
  imageCount: number;
  images: PostImage[];
  username: string;
  nickname: string | null;
  avatar: string | null;
}

export interface CreatePostRequest {
  content: string;
}

export interface PostListResponse {
  list: PostWithMeta[];
  total: number;
  page: number;
  pageSize: number;
}