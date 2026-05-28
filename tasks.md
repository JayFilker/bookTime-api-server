# 开发计划：用户交互 API（v2）

## 核心约束

> **禁止修改现有 API 及任何可能影响其运行的代码。**
>
> 具体规则：
> - 不修改 `src/routes/`、`src/controllers/`、`src/services/`、`src/utils/`、`src/types/`、`src/middlewares/` 下的任何现有文件
> - 不修改 `src/index.ts`
> - `src/app.ts` 仅允许在文件末尾追加，不得改动任何现有行
> - 不修改 `package.json` 的现有字段，只允许通过 `npm install` 追加依赖
> - 每个阶段完成后必须验证原有接口（`/api/books`、`/api/home`、`/api/search`）仍正常响应

---

## 阶段概览

| 阶段 | 内容 | 交付物 |
| ---- | ---- | ------ |
| Phase 1 | 基础设施搭建 | DB 单例、目录结构、配置、中间件骨架 |
| Phase 2 | 认证模块 | 注册、登录接口 |
| Phase 3 | 用户模块 | 个人信息查询、修改、头像上传 |
| Phase 4 | 收藏模块 | 收藏/取消/列表/状态查询 |
| Phase 5 | 动态模块 | 发布/列表/点赞/删除（含图片） |
| Phase 6 | 书籍评论模块 | 发布/列表/点赞/删除（含图片） |
| Phase 7 | 书籍评分模块 | 评分/更新/平均分查询 |
| Phase 8 | 接入主应用 | 挂载路由、静态文件服务、联调验证 |

---

## Phase 1 — 基础设施搭建

> 目标：搭建 v2 模块的骨架，后续所有模块都依赖这一阶段的产出。

### 任务列表

- [ ] **1.1** 安装依赖

  ```bash
  npm install better-sqlite3 jsonwebtoken bcrypt multer
  npm install -D @types/better-sqlite3 @types/jsonwebtoken @types/bcrypt @types/multer
  ```

- [ ] **1.2** 创建目录结构

  ```
  src/v2/config.ts
  src/v2/db/index.ts
  src/v2/middlewares/auth.middleware.ts
  src/v2/middlewares/upload.middleware.ts
  src/v2/routes/index.ts
  src/v2/types/（空目录占位）
  src/v2/controllers/（空目录占位）
  src/v2/services/（空目录占位）
  data/（加入 .gitignore）
  uploads/avatars/（加入 .gitignore）
  uploads/posts/（加入 .gitignore）
  uploads/comments/（加入 .gitignore）
  ```

- [ ] **1.3** 新建 `src/v2/config.ts`

  读取环境变量 `JWT_SECRET`、`JWT_EXPIRES_IN`，启动时若缺失则抛出错误。

- [ ] **1.4** 新建 `src/v2/db/index.ts`

  初始化 better-sqlite3 单例，执行所有 `CREATE TABLE IF NOT EXISTS` 建表 SQL（users、favorites、posts、post_images、post_likes、book_comments、book_comment_images、book_comment_likes、book_ratings），启用外键约束 `PRAGMA foreign_keys = ON`。

- [ ] **1.5** 新建 `src/v2/middlewares/auth.middleware.ts`

  实现 `requireAuth` 和 `optionalAuth` 两个中间件，读取 `Authorization: Bearer <token>`，验证 JWT，将 `userId` 注入 `res.locals`。

- [ ] **1.6** 新建 `src/v2/middlewares/upload.middleware.ts`

  配置三个 multer 实例：
  - `uploadAvatar`：单张，存至 `uploads/avatars/`，限 5MB，仅 jpg/png/webp
  - `uploadPostImages`：多张最多 9 张，存至 `uploads/posts/`，限 5MB/张
  - `uploadCommentImages`：多张最多 9 张，存至 `uploads/comments/`，限 5MB/张

  文件名统一用 `Date.now() + '-' + Math.random()` 生成，避免重名。

- [ ] **1.7** 在 `.env` 追加环境变量

  ```
  JWT_SECRET=your_secret_key_here
  JWT_EXPIRES_IN=7d
  ```

### 完成标志

- `npx ts-node src/index.ts` 能正常启动，DB 文件自动创建，所有表存在
- `/api/*` 原有接口响应正常，无任何影响

---

## Phase 2 — 认证模块

> 目标：实现注册和登录，产出可用的 accessToken 供后续模块测试。

### 新增文件

```
src/v2/types/auth.types.ts
src/v2/services/auth.service.ts
src/v2/controllers/auth.controller.ts
src/v2/routes/auth.routes.ts
```

### 任务列表

- [ ] **2.1** `auth.types.ts`：定义 `RegisterBody`、`LoginBody`、`AuthUser` 类型

- [ ] **2.2** `auth.service.ts`：
  - `register(username, password)`：校验格式（用户名 2-20 位字母/数字/下划线，密码 6-40 位），bcrypt hash 密码，写入 users 表，返回 user + token
  - `login(username, password)`：查用户，bcrypt 对比密码，失败统一抛 `401 用户名或密码错误`，成功返回 user + token

- [ ] **2.3** `auth.controller.ts`：`register`、`login` 两个 handler，参数校验后调用 service，统一用 `success()` 响应

- [ ] **2.4** `auth.routes.ts`：

  ```
  POST /register → register
  POST /login    → login
  ```

- [ ] **2.5** 在 `src/v2/routes/index.ts` 注册 `/auth` 路由

### 接口

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| POST | `/v2/auth/register` | 注册 |
| POST | `/v2/auth/login` | 登录 |

### 完成标志

- 能成功注册并拿到 `accessToken`
- 密码错误返回 `401`，用户名重复返回 `409`

---

## Phase 3 — 用户模块

> 目标：实现个人信息查询、修改和头像上传。

### 新增文件

```
src/v2/types/user.types.ts
src/v2/services/user.service.ts
src/v2/controllers/user.controller.ts
src/v2/routes/user.routes.ts
```

### 任务列表

- [ ] **3.1** `user.types.ts`：定义 `UserProfile`、`UpdateProfileBody` 类型

- [ ] **3.2** `user.service.ts`：
  - `getProfile(userId)`：按 id 查用户，返回脱敏字段（不含 password），avatar 相对路径拼接为完整 URL
  - `updateProfile(userId, data)`：更新 nickname/bio，返回更新后的 profile
  - `updateAvatar(userId, filePath)`：更新 avatar 字段，删除旧头像文件（若存在）

- [ ] **3.3** `user.controller.ts`：`getMe`、`updateMe`、`uploadAvatar` 三个 handler

- [ ] **3.4** `user.routes.ts`：

  ```
  GET  /me         → requireAuth → getMe
  PUT  /me         → requireAuth → updateMe
  POST /me/avatar  → requireAuth → uploadAvatar（multer 中间件先行）
  ```

- [ ] **3.5** 在 `src/v2/routes/index.ts` 注册 `/users` 路由

### 接口

| 方法 | 路径 | 认证 | 说明 |
| ---- | ---- | ---- | ---- |
| GET | `/v2/users/me` | 必须 | 获取个人信息 |
| PUT | `/v2/users/me` | 必须 | 更新个人信息 |
| POST | `/v2/users/me/avatar` | 必须 | 上传/更新头像 |

### 完成标志

- 携带有效 token 能查到自己的信息
- 上传头像后 `avatar` 字段更新，旧文件被删除
- 无 token 访问返回 `401`

---

## Phase 4 — 收藏模块

> 目标：实现小说收藏的增删查功能。

### 新增文件

```
src/v2/types/（复用 book.types.ts）
src/v2/services/favorite.service.ts
src/v2/controllers/favorite.controller.ts
src/v2/routes/favorite.routes.ts
```

### 任务列表

- [ ] **4.1** `favorite.service.ts`：
  - `getFavorites(userId, page, pageSize)`：分页查询当前用户的收藏列表
  - `addFavorite(userId, bookId)`：插入记录，已存在时抛 `409 已收藏`
  - `removeFavorite(userId, bookId)`：删除记录，不存在时抛 `404 收藏记录不存在`
  - `getFavoriteStatus(userId, bookId)`：返回 `{ isFavorited: boolean }`

- [ ] **4.2** `favorite.controller.ts`：`list`、`add`、`remove`、`status` 四个 handler

- [ ] **4.3** `favorite.routes.ts`：

  ```
  GET    /            → requireAuth → list
  POST   /            → requireAuth → add
  DELETE /:bookId     → requireAuth → remove
  GET    /:bookId/status → requireAuth → status
  ```

- [ ] **4.4** 在 `src/v2/routes/index.ts` 注册 `/favorites` 路由

### 接口

| 方法 | 路径 | 认证 | 说明 |
| ---- | ---- | ---- | ---- |
| GET | `/v2/favorites` | 必须 | 收藏列表 |
| POST | `/v2/favorites` | 必须 | 收藏小说 |
| DELETE | `/v2/favorites/:bookId` | 必须 | 取消收藏 |
| GET | `/v2/favorites/:bookId/status` | 必须 | 查询是否已收藏 |

### 完成标志

- 收藏同一本书两次返回 `409`
- 取消未收藏的书返回 `404`
- 收藏列表支持分页

---

## Phase 5 — 动态模块

> 目标：实现动态的发布（含多图）、列表展示、点赞和删除。

### 新增文件

```
src/v2/types/post.types.ts
src/v2/services/post.service.ts
src/v2/controllers/post.controller.ts
src/v2/routes/post.routes.ts
```

### 任务列表

- [ ] **5.1** `post.types.ts`：定义 `PostItem`、`CreatePostBody` 类型

- [ ] **5.2** `post.service.ts`：
  - `getPosts(page, pageSize)`：分页查动态列表，JOIN users 带出用户信息，子查询带出 likeCount 和 images 数组，avatar/images 相对路径拼接完整 URL
  - `createPost(userId, content, imagePaths)`：写 posts 表，批量写 post_images 表（事务）
  - `toggleLike(userId, postId)`：若不存在则插入，若存在则删除，返回当前 `liked` 状态和最新 `likeCount`
  - `deletePost(userId, postId)`：校验归属，删除动态（CASCADE 自动删除图片记录），同时删除磁盘上的图片文件

- [ ] **5.3** `post.controller.ts`：`list`、`create`、`like`、`remove` 四个 handler

- [ ] **5.4** `post.routes.ts`：

  ```
  GET    /              → list
  POST   /              → requireAuth → uploadPostImages → create
  POST   /:postId/like  → requireAuth → like
  DELETE /:postId       → requireAuth → remove
  ```

- [ ] **5.5** 在 `src/v2/routes/index.ts` 注册 `/posts` 路由

### 接口

| 方法 | 路径 | 认证 | 说明 |
| ---- | ---- | ---- | ---- |
| GET | `/v2/posts` | 无 | 动态列表 |
| POST | `/v2/posts` | 必须 | 发布动态（含图片） |
| POST | `/v2/posts/:postId/like` | 必须 | 点赞/取消点赞 |
| DELETE | `/v2/posts/:postId` | 必须 | 删除动态 |

### 完成标志

- 发布动态时上传图片，列表中 `images` 字段返回完整 URL 数组
- 点赞再次调用变为取消，`liked` 字段正确反映
- 删除他人动态返回 `403`

---

## Phase 6 — 书籍评论模块

> 目标：实现书籍评论的发布（含多图）、列表展示、点赞和删除。

### 新增文件

```
src/v2/types/book.types.ts
src/v2/services/book.service.ts（评论部分）
src/v2/controllers/book.controller.ts（评论部分）
src/v2/routes/book.routes.ts
```

### 任务列表

- [ ] **6.1** `book.types.ts`：定义 `CommentItem`、`CreateCommentBody` 类型

- [ ] **6.2** `book.service.ts` — 评论部分：
  - `getComments(bookId, page, pageSize)`：分页查指定书籍的评论，JOIN users，带出 likeCount 和 images 数组
  - `createComment(userId, bookId, content, imagePaths)`：写 book_comments 表，批量写 book_comment_images 表（事务）
  - `toggleCommentLike(userId, commentId)`：同动态点赞逻辑
  - `deleteComment(userId, commentId)`：校验归属，删除评论及磁盘图片

- [ ] **6.3** `book.controller.ts` — 评论部分：`listComments`、`createComment`、`likeComment`、`deleteComment`

- [ ] **6.4** `book.routes.ts` — 评论路由：

  ```
  GET    /:bookId/comments                      → listComments
  POST   /:bookId/comments                      → requireAuth → uploadCommentImages → createComment
  POST   /:bookId/comments/:commentId/like      → requireAuth → likeComment
  DELETE /:bookId/comments/:commentId           → requireAuth → deleteComment
  ```

- [ ] **6.5** 在 `src/v2/routes/index.ts` 注册 `/books` 路由

### 接口

| 方法 | 路径 | 认证 | 说明 |
| ---- | ---- | ---- | ---- |
| GET | `/v2/books/:bookId/comments` | 无 | 评论列表 |
| POST | `/v2/books/:bookId/comments` | 必须 | 发布评论（含图片） |
| POST | `/v2/books/:bookId/comments/:commentId/like` | 必须 | 点赞/取消点赞评论 |
| DELETE | `/v2/books/:bookId/comments/:commentId` | 必须 | 删除评论 |

### 完成标志

- 不同书籍的评论相互隔离
- 评论图片正常上传和展示
- 删除他人评论返回 `403`

---

## Phase 7 — 书籍评分模块

> 目标：实现评分的新增/更新（upsert）和平均分查询。

### 任务列表

- [ ] **7.1** `book.service.ts` — 评分部分：
  - `getRating(bookId, userId?)`：计算平均分（保留一位小数）和评分数，若传入 `userId` 则同时返回该用户的评分
  - `upsertRating(userId, bookId, rating)`：`INSERT OR REPLACE` 实现 upsert，`rating` 超出 1-5 范围时抛 `400`

- [ ] **7.2** `book.controller.ts` — 评分部分：`getRating`、`upsertRating` 两个 handler

- [ ] **7.3** `book.routes.ts` — 评分路由（追加到已有文件）：

  ```
  GET  /:bookId/rating → optionalAuth → getRating
  POST /:bookId/rating → requireAuth  → upsertRating
  ```

### 接口

| 方法 | 路径 | 认证 | 说明 |
| ---- | ---- | ---- | ---- |
| GET | `/v2/books/:bookId/rating` | 可选 | 获取书籍评分 |
| POST | `/v2/books/:bookId/rating` | 必须 | 评价/更新评分 |

### 完成标志

- 同一用户对同一本书评分两次，第二次覆盖第一次
- 未登录查询时 `userRating` 为 `null`，登录后返回本人评分
- `rating` 传 0 或 6 返回 `400`

---

## Phase 8 — 接入主应用 & 联调

> 目标：将 v2 路由挂载到主应用，做全链路联调，确认原 API 无影响。

### 任务列表

- [ ] **8.1** 修改 `src/app.ts`（纯追加，不动现有代码）

  在现有 `app.use('/api', routes)` 之后追加：

  ```typescript
  import v2Routes from './v2/routes';
  import path from 'path';

  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  app.use('/v2', v2Routes);
  ```

- [ ] **8.2** 验证原 API 无影响

  - `GET /api/books` 正常响应
  - `GET /api/home` 正常响应
  - `GET /api/search?keyword=xxx` 正常响应

- [ ] **8.3** 全链路冒烟测试

  按以下顺序逐一验证：

  1. 注册新用户 → 拿到 token
  2. 登录 → 拿到 token
  3. 查个人信息
  4. 上传头像 → 确认图片文件存在，URL 可访问
  5. 修改昵称/简介
  6. 收藏一本书 → 查列表 → 查 status → 取消收藏
  7. 发布带图动态 → 查列表确认图片 URL → 点赞 → 再次点赞取消 → 删除
  8. 给书籍发布带图评论 → 查列表 → 点赞 → 删除
  9. 给书籍评 5 星 → 查平均分 → 改为 3 星 → 确认覆盖

- [ ] **8.4** 更新 `.gitignore`

  确认以下路径已加入：

  ```
  data/
  uploads/
  ```

### 完成标志

- 所有 20 条 v2 接口均按文档预期响应
- 原 `/api/*` 接口全部正常
- `uploads/` 和 `data/` 未被提交到 git

---

## 依赖关系

```
Phase 1（基础设施）
    ↓
Phase 2（认证）
    ↓
Phase 3（用户）──────────────────┐
Phase 4（收藏）                  │
Phase 5（动态）──────────────────┤
Phase 6（书籍评论）              │（各模块独立，可并行开发）
Phase 7（书籍评分）──────────────┘
    ↓
Phase 8（接入 & 联调）
```

Phase 3-7 互不依赖，完成 Phase 2 后可并行开发，最后统一在 Phase 8 联调。