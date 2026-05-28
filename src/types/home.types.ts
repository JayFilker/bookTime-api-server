export interface HomeBook {
  id: string;
  title: string;
  author: string;
  category: string;
}

export interface HomeData {
  featured: HomeBook[];   // 本期强推
  newBooks: HomeBook[];   // 最新入库
}