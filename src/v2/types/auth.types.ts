export interface RegisterBody {
  username: string;
  password: string;
}

export interface LoginBody {
  username: string;
  password: string;
}

export interface AuthUser {
  id: number;
  username: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}