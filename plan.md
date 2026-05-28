
# 开发方案：用户交互 API（v2）

## 一、背景与隔离原则

现有 API 基于 `/api` 前缀，全部为无状态爬虫接口，无数据库、无认证。

新 API 挂载于独立前缀 `/v2`，拥有完全独立的目录和数据源，**对现有代码的改动只有两处且均为纯追加操作**：

- `src/app.ts`：追加两行，挂载 `/v2` 路由器
- `.env`：追加 `JWT_SECRET` 等环境变量

除此之外，所有新代码放在 `src/v2/` 目录下，不修改任何现有文件。

---

## 二、技术选型

| 用途 | 选型 | 理由 |
|---|---|---|
| 数据库 | **better-sqlite3** | 纯文件存储，同步 API，零配置，无额外服务，稳定性极高，直接在项目内使用 |
| 图片存储 | **multer + 本地磁盘** | 图片保存在项目 `uploads/` 目录，通过静态文件服务对外暴露访问 URL，零依赖 |
| 密码加密 | `bcrypt` | 行业标准，防彩虹表攻击 |
| 认证机制 | JWT（无状态 Access Token） | 与现有架构一致（无 session），前端易集成 |
| token 有效期 | `7d`（可配置） | 小说阅读 App 用户不常重新登录，可适当延长 |

**选用 better-sqlite3 的原因：**

- 存储格式为单个 `.db` 文件，直接放在项目目录下，无需安装任何外部数据库服务
- 同步 API，代码比异步 sqlite3 简洁，不需要 `.then()` 或 `await`
- 性能优秀，读写速度在同类嵌入式数据库中最快
- 配置极少：`new Database('data.db')` 一行即可初始化，首次运行自动创建文件
- 原生支持 TypeScript 类型，`@types/better-sqlite3` 覆盖完整

不选 Prisma 的原因：Prisma 需要额外的 CLI 工具、schema 文件和迁移命令，配置步骤多，对这个项目是过度设计。

**图片存储策略：**

图片文件保存在项目根目录 `uploads/` 下，按类型分子目录：

```
uploads/
├── avatars/     # 用户头像
└── posts/       # 动态配图
```

数据库中只存储相对路径（如 `avatars/abc123.jpg`），接口返回时拼接为完整 URL（如 `http://localhost:3000/uploads/avatars/abc123.jpg`）。`app.ts` 追加一行 `express.static` 即可对外提供访问，该操作同样为纯追加。

图片限制：单张最大 5MB，仅接受 `image/jpeg`、`image/png`、`image/webp` 格式。

**需新增依赖：**

```bash
# 生产依赖
npm install better-sqlite3 jsonwebtoken bcrypt multer

# 开发依赖
npm install -D @types/better-sqlite3 @types/jsonwebtoken @types/bcrypt @types/multer
```

---

## 三、目录结构

```
src/
├── v2/                            # 所有新增代码，与原代码完全隔离
│   ├── config.ts                  # v2 独立配置（JWT_SECRET 等）
│   ├── db/
│   │   └── index.ts               # better-sqlite3 单例 + 建表初始化
│   ├── routes/
│   │   ├── index.ts               # v2 路由聚合入口
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── post.routes.ts
│   │   └── book.routes.ts         # 评论 + 评分接口
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── post.controller.ts
│   │   └── book.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── post.service.ts
│   │   └── book.service.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # JWT 验证中间件
│   │   └── upload.middleware.ts   # multer 上传配置（头像 / 动态图片）
│   └── types/
│       ├── auth.types.ts
│       ├── user.types.ts
│       ├── post.types.ts
│       └── book.types.ts
│
├── app.ts                         # 【唯一修改】追加 3 行（v2 路由 + 静态文件服务）
├── ... (原有文件不动)
│
data/
└── app.db                         # SQLite 数据文件（加入 .gitignore）

uploads/                           # 图片存储目录（加入 .gitignore）
├── avatars/                       # 用户头像
└── posts/                         # 动态配图
```

---

## 四、数据库设计

使用 better-sqlite3 直接编写建表 SQL，在 `src/v2/db/index.ts` 中初始化数据库单例，服务启动时自动执行 `CREATE TABLE IF NOT EXISTS` 建表，无需任何迁移工具。

```sql
-- users 表
CREATE TABLE IF NOT EXISTS users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT    NOT NULL UNIQUE,
  password  TEXT    NOT NULL,
  nickname  TEXT,
  avatar    TEXT,   -- 存相对路径，如 avatars/abc123.jpg
  bio       TEXT,
  createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- favorites 表（bookId 为爬虫书籍的字符串 ID）
CREATE TABLE IF NOT EXISTS favorites (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookId    TEXT    NOT NULL,
  createdAt TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(userId, bookId)
);

-- posts 动态表
CREATE TABLE IF NOT EXISTS posts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content   TEXT    NOT NULL,
  createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- post_images 动态配图表（一条动态可带多张图）
CREATE TABLE IF NOT EXISTS post_images (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  postId INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  path   TEXT    NOT NULL,  -- 存相对路径，如 posts/abc123.jpg
  sort   INTEGER NOT NULL DEFAULT 0
);

-- post_likes 动态点赞表
CREATE TABLE IF NOT EXISTS post_likes (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  postId INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(userId, postId)
);

-- book_comments 书籍评论表
CREATE TABLE IF NOT EXISTS book_comments (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookId    TEXT    NOT NULL,
  content   TEXT    NOT NULL,
  createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- book_comment_images 评论配图表（一条评论可带多张图）
CREATE TABLE IF NOT EXISTS book_comment_images (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  commentId INTEGER NOT NULL REFERENCES book_comments(id) ON DELETE CASCADE,
  path      TEXT    NOT NULL,  -- 存相对路径，如 comments/abc123.jpg
  sort      INTEGER NOT NULL DEFAULT 0
);

-- book_comment_likes 评论点赞表
CREATE TABLE IF NOT EXISTS book_comment_likes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commentId INTEGER NOT NULL REFERENCES book_comments(id) ON DELETE CASCADE,
  UNIQUE(userId, commentId)
);

-- book_ratings 书籍评分表（每用户每本书只能有一条，INSERT OR REPLACE 更新）
CREATE TABLE IF NOT EXISTS book_ratings (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  userId  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookId  TEXT    NOT NULL,
  rating  INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  UNIQUE(userId, bookId)
);
```

数据库文件路径：`data/app.db`，由 `src/v2/db/index.ts` 中的单例负责创建和持有连接。图片文件路径字段均存储相对路径（如 `avatars/abc123.jpg`），接口响应时由 service 层统一拼接为完整 URL。

---

## 五、API 接口设计

所有 v2 接口均返回与原 API 相同的统一格式：

```json
{ "code": 200, "message": "请求成功", "data": {} }
```

错误时：

```json
{ "code": 400, "message": "原因描述" }
```

### 5.1 认证接口 `/v2/auth`

#### 注册

```
POST /v2/auth/register
```

**请求体：**

| 字段 | 类型 | 说明 |
|---|---|---|
| username | string | 长度 2-20，仅字母/数字/下划线 |
| password | string | 长度 6-40 |

**响应 data：**

```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": 1,
    "username": "alice",
    "nickname": null,
    "avatar": null,
    "bio": null
  }
}
```

#### 登录

```
POST /v2/auth/login
```

**请求体：**

| 字段 | 类型 | 说明 |
|---|---|---|
| username | string | 用户名 |
| password | string | 密码 |

- 用户名或密码错误统一返回 `401 用户名或密码错误`（不区分具体原因，防枚举攻击）
- 成功响应结构同注册

---

### 5.2 用户接口 `/v2/users`

> 所有接口需携带 `Authorization: Bearer <token>` 请求头

#### 获取当前用户信息

```
GET /v2/users/me
```

**响应 data：**

```json
{
  "id": 1,
  "username": "alice",
  "nickname": "爱读书的Alice",
  "avatar": "https://...",
  "bio": "喜欢玄幻小说",
  "createdAt": "2026-06-01T00:00:00.000Z"
}
```

#### 上传头像（需认证）

```
POST /v2/users/me/avatar
Content-Type: multipart/form-data
```

**表单字段：**

| 字段 | 类型 | 说明 |
|---|---|---|
| avatar | file | 图片文件，支持 jpg/png/webp，最大 5MB |

**响应 data：**

```json
{ "avatarUrl": "http://localhost:3000/uploads/avatars/abc123.jpg" }
```

- 上传成功后自动更新用户 `avatar` 字段，旧头像文件同步删除

#### 更新个人信息

```
PUT /v2/users/me
```

**请求体（字段均可选，只传需要修改的字段）：**

| 字段 | 类型 | 说明 |
|---|---|---|
| nickname | string? | 昵称，最大 20 字 |
| avatar | string? | 头像 URL |
| bio | string? | 个人简介，最大 200 字 |

- 不允许通过此接口修改 `username` 和 `password`

---

### 5.3 收藏接口 `/v2/favorites`

> 所有接口需认证

#### 获取收藏列表

```
GET /v2/favorites?page=1&pageSize=20
```

**响应 data：**

```json
{
  "list": [
    { "bookId": "99084", "createdAt": "2026-06-01T00:00:00.000Z" }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20
}
```

#### 收藏小说

```
POST /v2/favorites
```

**请求体：**

| 字段 | 类型 | 说明 |
|---|---|---|
| bookId | string | 书籍 ID（对应爬虫接口的书籍 id） |

- 已收藏时返回 `409 已收藏`

#### 取消收藏

```
DELETE /v2/favorites/:bookId
```

- 未收藏时返回 `404 收藏记录不存在`

#### 查询单本书是否已收藏

```
GET /v2/favorites/:bookId/status
```

**响应 data：**

```json
{ "isFavorited": true }
```

---

### 5.4 动态接口 `/v2/posts`

#### 获取动态列表（公开）

```
GET /v2/posts?page=1&pageSize=20
```

**响应 data：**

```json
{
  "list": [
    {
      "id": 1,
      "content": "最近在看斗破苍穹，真好看！",
      "images": [
        "http://localhost:3000/uploads/posts/abc123.jpg"
      ],
      "createdAt": "2026-06-01T10:00:00.000Z",
      "likeCount": 5,
      "user": {
        "id": 1,
        "username": "alice",
        "nickname": "爱读书的Alice",
        "avatar": "http://localhost:3000/uploads/avatars/xyz.jpg"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

#### 发布动态（需认证）

```
POST /v2/posts
Content-Type: multipart/form-data
```

**表单字段：**

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| content | string | 动态内容，最大 500 字 |
| images | file[] | 可选，最多 9 张图片，支持 jpg/png/webp，每张最大 5MB |

#### 点赞 / 取消点赞动态（需认证，toggle 语义）

```
POST /v2/posts/:postId/like
```

**响应 data：**

```json
{ "liked": true, "likeCount": 6 }
```

- 未点赞时执行点赞，已点赞时执行取消，返回操作后的最新状态

#### 删除动态（需认证，只能删自己的）

```
DELETE /v2/posts/:postId
```

- 删除他人动态返回 `403 无权限`

---

### 5.5 书籍评论接口 `/v2/books/:bookId`

#### 获取评论列表（公开）

```
GET /v2/books/:bookId/comments?page=1&pageSize=20
```

**响应 data：**

```json
{
  "list": [
    {
      "id": 1,
      "content": "这本书写得很好",
      "images": [
        "http://localhost:3000/uploads/comments/abc123.jpg"
      ],
      "createdAt": "2026-06-01T10:00:00.000Z",
      "likeCount": 3,
      "user": {
        "id": 1,
        "username": "alice",
        "nickname": null,
        "avatar": "http://localhost:3000/uploads/avatars/xyz.jpg"
      }
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20
}
```

#### 发布评论（需认证）

```
POST /v2/books/:bookId/comments
Content-Type: multipart/form-data
```

**表单字段：**

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| content | string | 评论内容，最大 1000 字 |
| images | file[] | 可选，最多 9 张图片，支持 jpg/png/webp，每张最大 5MB |

#### 点赞 / 取消点赞评论（需认证，toggle 语义）

```
POST /v2/books/:bookId/comments/:commentId/like
```

**响应 data：**

```json
{ "liked": false, "likeCount": 2 }
```

#### 删除评论（需认证，只能删自己的）

```
DELETE /v2/books/:bookId/comments/:commentId
```

- 删除他人评论返回 `403 无权限`

---

### 5.6 书籍评分接口 `/v2/books/:bookId/rating`

#### 获取书籍平均评分（公开）

```
GET /v2/books/:bookId/rating
```

**响应 data：**

```json
{
  "averageRating": 4.7,
  "ratingCount": 312,
  "userRating": 5
}
```

| 字段 | 说明 |
|---|---|
| averageRating | 所有用户评分的平均值，保留一位小数；无评分时为 `null` |
| ratingCount | 参与评分的用户数 |
| userRating | 请求携带有效 token 时返回当前用户评分，否则为 `null` |

#### 评价 / 更新评分（需认证，upsert 语义）

```
POST /v2/books/:bookId/rating
```

**请求体：**

| 字段 | 类型 | 说明 |
|---|---|---|
| rating | number | 1-5 的整数，超出范围返回 `400` |

- 首次调用为新增，再次调用自动更新为新分值

---

## 六、认证中间件设计

新建 `src/v2/middlewares/auth.middleware.ts`，提供两个中间件：

| 中间件 | 说明 |
|---|---|
| `requireAuth` | 强制认证，token 无效或缺失返回 `401` |
| `optionalAuth` | 可选认证，token 有效则在 `req` 上注入 `userId`，无 token 也放行（用于评分查询 `userRating` 场景） |

两者共用同一个 JWT 验证逻辑，与现有 `src/middlewares/` 目录完全隔离。

---

## 七、对现有文件的改动说明

改动只有如下两处，均为**纯追加，不修改任何现有逻辑**：

### `src/app.ts`

在现有代码之后追加三行：

```typescript
import v2Routes from './v2/routes';
import path from 'path';

// 已有代码（不动）
app.use('/api', routes);

// 新增（追加）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/v2', v2Routes);
```

### `.env`

追加以下环境变量：

```
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
```

---

## 八、实施步骤

1. 安装新依赖（better-sqlite3、jsonwebtoken、bcrypt、multer 及其类型声明）
2. 创建 `uploads/avatars/`、`uploads/posts/`、`uploads/comments/`、`data/` 目录，加入 `.gitignore`
3. 新建 `src/v2/db/index.ts`，初始化 better-sqlite3 单例并执行建表 SQL
4. 新建 `src/v2/config.ts`，读取 `JWT_SECRET`、`JWT_EXPIRES_IN` 环境变量
5. 新建 `src/v2/middlewares/upload.middleware.ts`，配置 multer（头像单张、动态/评论多张）
6. 按模块顺序开发：`auth` → `user（含头像上传）` → `favorites` → `posts（含图片）` → `book comments（含图片）` → `book rating`
7. 每个模块按 types → service → controller → routes 顺序实现
8. 在 `src/v2/routes/index.ts` 聚合所有 v2 路由
9. 在 `src/app.ts` 追加静态文件服务和 v2 路由挂载（最后一步，改动最小）
10. 启动服务，验证 `/api/*` 原有接口无影响，逐一测试 `/v2/*` 新接口

---

## 九、接口速查表

| 方法 | 路径 | 认证 | 说明 |
| ---- | ---- | ---- | ---- |
| POST | `/v2/auth/register` | 无 | 注册 |
| POST | `/v2/auth/login` | 无 | 登录 |
| GET | `/v2/users/me` | 必须 | 获取个人信息 |
| PUT | `/v2/users/me` | 必须 | 更新个人信息 |
| POST | `/v2/users/me/avatar` | 必须 | 上传/更新头像 |
| GET | `/v2/favorites` | 必须 | 收藏列表 |
| POST | `/v2/favorites` | 必须 | 收藏小说 |
| DELETE | `/v2/favorites/:bookId` | 必须 | 取消收藏 |
| GET | `/v2/favorites/:bookId/status` | 必须 | 查询是否已收藏 |
| GET | `/v2/posts` | 无 | 动态列表 |
| POST | `/v2/posts` | 必须 | 发布动态（含图片） |
| POST | `/v2/posts/:postId/like` | 必须 | 点赞/取消点赞动态 |
| DELETE | `/v2/posts/:postId` | 必须 | 删除动态 |
| GET | `/v2/books/:bookId/comments` | 无 | 评论列表 |
| POST | `/v2/books/:bookId/comments` | 必须 | 发布评论（含图片） |
| POST | `/v2/books/:bookId/comments/:commentId/like` | 必须 | 点赞/取消点赞评论 |
| DELETE | `/v2/books/:bookId/comments/:commentId` | 必须 | 删除评论 |
| GET | `/v2/books/:bookId/rating` | 可选 | 获取书籍评分 |
| POST | `/v2/books/:bookId/rating` | 必须 | 评价/更新评分 |
