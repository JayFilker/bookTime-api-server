export interface BookComment {
  id: number;
  userId: number;
  bookId: string;
  content: string;
  createdAt: string;
}

export interface BookCommentImage {
  id: number;
  commentId: number;
  path: string;
  sort: number;
}

export interface BookCommentWithMeta extends BookComment {
  likeCount: number;
  isLiked: boolean;
  images: BookCommentImage[];
  username: string;
  nickname: string | null;
  avatar: string | null;
}

export interface AddCommentRequest {
  content: string;
}

export interface SetRatingRequest {
  rating: number;
}

export interface BookRatingStats {
  avgRating: number;
  totalRatings: number;
  myRating: number | null;
}

export interface CommentListResponse {
  list: BookCommentWithMeta[];
  total: number;
  page: number;
  pageSize: number;
}
