export interface UserProfile {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  // 统计信息
  postsCount?: number;
  favoritesCount?: number;
  commentsCount?: number;
}

export interface UpdateProfileRequest {
  nickname?: string;
  bio?: string;
}