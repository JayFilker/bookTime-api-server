export interface UserProfile {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  bio?: string;
}