export interface Favorite {
  id: number;
  userId: number;
  bookId: string;
  createdAt: string;
}

export interface FavoriteWithBook extends Favorite {
  book?: {
    id: string;
    title: string;
    author: string;
    cover?: string;
    category: string;
    latestChapter?: string;
    updatedAt?: string;
  };
}

export interface AddFavoriteRequest {
  bookId: string;
}

export interface FavoriteListResponse {
  list: FavoriteWithBook[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FavoriteStatusResponse {
  bookId: string;
  isFavorited: boolean;
}