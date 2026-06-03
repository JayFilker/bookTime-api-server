# Novel API Server — v2 接口文档

## 概述

- **Base URL**: `http://localhost:3000/v2`
- **认证方式**: Bearer Token（JWT），需要认证的接口在请求头加 `Authorization: Bearer <token>`
- **限流**: 每 IP 每分钟最多 60 次请求
- **统一响应格式**:

```json
{
  "code": 200,
  "message": "描述信息",
  "data": {}
}
```

---

## 认证模块 `/v2/auth`

### POST `/v2/auth/register` — 注册

**请求体**

```json
{
  "username": "string",   // 字母/数字/下划线，2-20 位
  "password": "string"    // 6-40 位
}
```

**请求示例**

```bash
curl -X POST http://localhost:3000/v2/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "pass123456"}'
```

**响应**

```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "id": 1,
      "username": "alice",
      "nickname": null,
      "avatar": null,
      "bio": null
    }
  }
}
```

**错误码**: `400` 参数校验失败 | `409` 用户名已注册

---

### POST `/v2/auth/login` — 登录

**请求体**

```json
{
  "username": "string",
  "password": "string"
}
```

**请求示例**

```bash
curl -X POST http://localhost:3000/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "pass123456"}'
```

**响应** 同注册，`message` 为 `"登录成功"`

**错误码**: `400` 参数缺失 | `401` 用户名或密码错误

---

## 用户模块 `/v2/users`

> 所有接口需要认证

### GET `/v2/users/profile` — 获取个人资料

**请求示例**

```bash
curl http://localhost:3000/v2/users/profile \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "username": "alice",
    "nickname": "Alice",
    "avatar": "/uploads/avatars/xxx.jpg",
    "bio": "个人简介",
    "createdAt": "2026-06-01 12:00:00",
    "postsCount": 15,
    "favoritesCount": 8,
    "commentsCount": 12
  }
}
```

---

### PUT `/v2/users/profile` — 更新个人资料

**请求体**（字段均可选）

```json
{
  "nickname": "string",
  "bio": "string"
}
```

> `nickname` 最多 50 字符，`bio` 最多 200 字符，字段均可选。

**请求示例**

```bash
curl -X PUT http://localhost:3000/v2/users/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nickname": "Alice", "bio": "热爱读书的人"}'
```

**响应** 返回更新后的完整资料，格式同 GET profile

---

### POST `/v2/users/avatar` — 上传头像

**Content-Type**: `multipart/form-data`

**字段**: `avatar`（文件，支持 jpg/png/webp，最大 5MB）

**请求示例**

```bash
curl -X POST http://localhost:3000/v2/users/avatar \
  -H "Authorization: Bearer <token>" \
  -F "avatar=@/path/to/avatar.jpg"
```

**响应**

```json
{
  "code": 200,
  "message": "头像上传成功",
  "data": {
    "avatar": "http://localhost:3000/uploads/avatars/1717000000-abc123.jpg"
  }
}
```

---

### GET `/v2/users/my-comments` — 获取个人书评列表

**Query 参数**: `page`（默认 1）、`pageSize`（默认 20，最大 100）

**请求示例**

```bash
curl "http://localhost:3000/v2/users/my-comments?page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "userId": 4,
        "bookId": "99084",
        "content": "情节跌宕，强烈推荐！",
        "createdAt": "2026-06-03 10:00:00",
        "likeCount": 3,
        "isLiked": false,
        "images": [
          { "id": 1, "commentId": 1, "path": "/uploads/comments/xxx.jpg", "sort": 0 }
        ],
        "username": "alice",
        "nickname": "Alice",
        "avatar": "/uploads/avatars/xxx.jpg"
      }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 收藏模块 `/v2/favorites`

> 所有接口需要认证

### POST `/v2/favorites` — 添加收藏

**请求体**

```json
{ "bookId": "99084" }
```

**请求示例**

```bash
curl -X POST http://localhost:3000/v2/favorites \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bookId": "99084"}'
```

**响应**

```json
{
  "code": 200,
  "message": "收藏成功",
  "data": { "bookId": "99084", "isFavorited": true }
}
```

**错误码**: `409` 已收藏

---

### DELETE `/v2/favorites/:bookId` — 取消收藏

**请求示例**




```bash
curl -X DELETE http://localhost:3000/v2/favorites/99084 \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "取消收藏成功",
  "data": { "bookId": "99084", "isFavorited": false }
}
```

**错误码**: `404` 未收藏该书籍

---

### GET `/v2/favorites` — 收藏列表

**Query 参数**: `page`（默认 1）、`pageSize`（默认 20，最大 100）

**请求示例**

```bash
curl "http://localhost:3000/v2/favorites?page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "userId": 4,
        "bookId": "99084",
        "createdAt": "2026-06-03 10:00:00",
        "book": {
          "id": "99084",
          "title": "斗破苍穹",
          "author": "天蚕土豆",
          "cover": "https://www.bqge.org/img/99084.jpg",
          "category": "玄幻小说",
          "latestChapter": "第1000章",
          "updatedAt": "2026-06-01"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

> 书籍信息通过轻量爬取获取（只抓详情页，不含章节列表），结果有缓存。若获取失败只返回 id。

---

### GET `/v2/favorites/stats` — 收藏统计

**请求示例**

```bash
curl http://localhost:3000/v2/favorites/stats \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": { "totalFavorites": 5 }
}
```

---

### GET `/v2/favorites/:bookId/status` — 检查收藏状态

**请求示例**

```bash
curl http://localhost:3000/v2/favorites/99084/status \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "查询成功",
  "data": { "bookId": "99084", "isFavorited": true }
}
```

---

## 书评与评分模块 `/v2/books`

### GET `/v2/books/:bookId/comments` — 获取书评列表

**认证**: 可选（登录后返回 `isLiked` 状态）

**Query 参数**: `page`（默认 1）、`pageSize`（默认 20，最大 100）

**请求示例**

```bash
# 未登录
curl "http://localhost:3000/v2/books/99084/comments?page=1&pageSize=10"

# 登录后（返回 isLiked 字段）
curl "http://localhost:3000/v2/books/99084/comments?page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "userId": 4,
        "bookId": "99084",
        "content": "情节跌宕，强烈推荐！",
        "createdAt": "2026-06-03 10:00:00",
        "likeCount": 3,
        "isLiked": false,
        "images": [
          { "id": 1, "commentId": 1, "path": "/uploads/comments/xxx.jpg", "sort": 0 }
        ],
        "username": "alice",
        "nickname": "Alice",
        "avatar": "/uploads/avatars/xxx.jpg"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### POST `/v2/books/:bookId/comments` — 发布书评

**认证**: 必须

**Content-Type**: `multipart/form-data`

**字段**:
- `content` (string, 必填，最多 1000 字符)
- `images` (文件数组，可选，最多 9 张，支持 jpg/png/webp，单张最大 5MB)

**请求示例**

```bash
# 纯文字书评
curl -X POST http://localhost:3000/v2/books/99084/comments \
  -H "Authorization: Bearer <token>" \
  -F "content=情节跌宕，强烈推荐！"

# 带图片书评
curl -X POST http://localhost:3000/v2/books/99084/comments \
  -H "Authorization: Bearer <token>" \
  -F "content=附上精彩截图" \
  -F "images=@/path/to/img1.jpg" \
  -F "images=@/path/to/img2.jpg"
```

**响应**

```json
{
  "code": 200,
  "message": "发布成功",
  "data": {
    "id": 1,
    "userId": 4,
    "bookId": "99084",
    "content": "情节跌宕，强烈推荐！",
    "createdAt": "2026-06-03 10:00:00",
    "likeCount": 0,
    "isLiked": false,
    "images": [],
    "username": "alice",
    "nickname": "Alice",
    "avatar": "/uploads/avatars/xxx.jpg"
  }
}
```

---

### DELETE `/v2/books/:bookId/comments/:commentId` — 删除书评

**认证**: 必须（只能删除自己的书评）

**请求示例**

```bash
curl -X DELETE http://localhost:3000/v2/books/99084/comments/1 \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{ "code": 200, "message": "删除成功" }
```

**错误码**: `403` 无权删除 | `404` 书评不存在

---

### POST `/v2/books/:bookId/comments/:commentId/like` — 点赞/取消点赞书评

**认证**: 必须（切换状态）

**请求示例**

```bash
curl -X POST http://localhost:3000/v2/books/99084/comments/1/like \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "点赞成功",
  "data": { "commentId": 1, "isLiked": true }
}
```

---

### POST `/v2/books/:bookId/rating` — 设置评分

**认证**: 必须（已评过则更新）

**请求体**

```json
{ "rating": 5 }
```

> `rating` 为 1-5 的整数。

**请求示例**

```bash
curl -X POST http://localhost:3000/v2/books/99084/rating \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5}'
```

**响应**

```json
{
  "code": 200,
  "message": "评分成功",
  "data": { "bookId": "99084", "rating": 5 }
}
```

**错误码**: `400` rating 不合法

---

### GET `/v2/books/:bookId/rating` — 获取评分统计

**认证**: 可选（登录后返回 `myRating`）

**请求示例**

```bash
# 未登录（myRating 为 null）
curl http://localhost:3000/v2/books/99084/rating

# 登录后（返回本人评分）
curl http://localhost:3000/v2/books/99084/rating \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "avgRating": 4.5,
    "totalRatings": 120,
    "myRating": 5
  }
}
```

---

## 动态广场模块 `/v2/posts`

### GET `/v2/posts` — 动态广场列表

**认证**: 可选

**Query 参数**: `page`（默认 1）、`pageSize`（默认 20，最大 100）

**请求示例**

```bash
# 未登录
curl "http://localhost:3000/v2/posts?page=1&pageSize=20"

# 登录后（返回 isLiked 字段）
curl "http://localhost:3000/v2/posts?page=1&pageSize=20" \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "userId": 4,
        "title": null,
        "content": "今天读完了斗破苍穹！",
        "createdAt": "2026-06-03 10:00:00",
        "likeCount": 10,
        "isLiked": false,
        "imageCount": 2,
        "images": [
          { "id": 1, "postId": 1, "path": "/uploads/posts/xxx.jpg", "sort": 0 },
          { "id": 2, "postId": 1, "path": "/uploads/posts/yyy.jpg", "sort": 1 }
        ],
        "username": "alice",
        "nickname": "Alice",
        "avatar": "/uploads/avatars/xxx.jpg",
        "commentCount": 5,
        "comments": [
          {
            "id": 3,
            "postId": 1,
            "userId": 7,
            "content": "我也看了，真的很好看！",
            "createdAt": "2026-06-04 09:00:00",
            "username": "bob",
            "nickname": "Bob",
            "avatar": null
          }
        ]
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

> `comments` 为最新 3 条评论预览，完整评论列表请使用 `GET /v2/posts/:postId/comments`。单条动态接口 `GET /v2/posts/:postId` 返回全部评论。

---

### POST `/v2/posts` — 发布动态

**认证**: 必须

**Content-Type**: `multipart/form-data`

**字段**:
- `title` (string, 可选，最多 50 字符)
- `content` (string, 必填，最多 500 字符)
- `images` (文件数组，可选，最多 9 张，支持 jpg/png/webp，单张最大 5MB)

**请求示例**

```bash
# 纯文字动态
curl -X POST http://localhost:3000/v2/posts \
  -H "Authorization: Bearer <token>" \
  -F "content=今天读完了斗破苍穹，太好看了！"

# 带图片动态
curl -X POST http://localhost:3000/v2/posts \
  -H "Authorization: Bearer <token>" \
  -F "content=附上今天的读书笔记" \
  -F "images=@/path/to/photo1.jpg" \
  -F "images=@/path/to/photo2.jpg"
```

**响应**

```json
{
  "code": 200,
  "message": "发布成功",
  "data": {
    "id": 1,
    "userId": 4,
    "title": null,
    "content": "今天读完了斗破苍穹，太好看了！",
    "createdAt": "2026-06-03 10:00:00",
    "likeCount": 0,
    "isLiked": false,
    "imageCount": 0,
    "images": [],
    "username": "alice",
    "nickname": "Alice",
    "avatar": "/uploads/avatars/xxx.jpg",
    "commentCount": 0,
    "comments": []
  }
}
```

---

### GET `/v2/posts/user/:userId` — 获取指定用户的动态

**认证**: 可选

**Query 参数**: `page`（默认 1）、`pageSize`（默认 20，最大 100）

**请求示例**

```bash
curl "http://localhost:3000/v2/posts/user/4?page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"
```

**响应** 格式同动态广场列表（含 `commentCount` 和 `comments` 预览字段）

---

### GET `/v2/posts/:postId` — 获取单条动态

**认证**: 可选

**请求示例**

```bash
curl http://localhost:3000/v2/posts/1 \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "userId": 4,
    "title": null,
    "content": "今天读完了斗破苍穹，太好看了！",
    "createdAt": "2026-06-03 10:00:00",
    "likeCount": 10,
    "isLiked": true,
    "imageCount": 0,
    "images": [],
    "username": "alice",
    "nickname": "Alice",
    "avatar": "/uploads/avatars/xxx.jpg",
    "commentCount": 5,
    "comments": [
      {
        "id": 3,
        "postId": 1,
        "userId": 7,
        "content": "我也看了，真的很好看！",
        "createdAt": "2026-06-04 09:00:00",
        "username": "bob",
        "nickname": "Bob",
        "avatar": null
      }
    ]
  }
}
```

**错误码**: `404` 动态不存在

---

### DELETE `/v2/posts/:postId` — 删除动态

**认证**: 必须（只能删除自己的动态）

**请求示例**

```bash
curl -X DELETE http://localhost:3000/v2/posts/1 \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{ "code": 200, "message": "删除成功" }
```

**错误码**: `403` 无权删除 | `404` 动态不存在

---

### POST `/v2/posts/:postId/like` — 点赞/取消点赞动态

**认证**: 必须（切换状态）

**请求示例**

```bash
curl -X POST http://localhost:3000/v2/posts/1/like \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{
  "code": 200,
  "message": "点赞成功",
  "data": { "postId": 1, "isLiked": true }
}
```

---

### GET `/v2/posts/:postId/comments` — 获取动态评论列表

**认证**: 无需

**Query 参数**: `page`（默认 1）、`pageSize`（默认 20，最大 100）、`paginate`（默认 `true`，传 `false` 时忽略分页参数、一次返回全部评论）

**请求示例**

```bash
# 分页获取
curl "http://localhost:3000/v2/posts/1/comments?page=1&pageSize=20"

# 一次性获取全部
curl "http://localhost:3000/v2/posts/1/comments?paginate=false"
```

**响应**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "postId": 1,
        "userId": 7,
        "content": "写得真好，我也去看！",
        "createdAt": "2026-06-04 08:30:00",
        "username": "bob",
        "nickname": "Bob",
        "avatar": null
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20
  }
}
```

> 列表按 `createdAt DESC` 排序（最新的在前）。`paginate=false` 时 `pageSize` 返回值等于 `total`。

---

### POST `/v2/posts/:postId/comments` — 发布评论

**认证**: 必须

**请求体**

```json
{ "content": "string" }
```

> `content` 最多 300 字符。

**请求示例**

```bash
curl -X POST http://localhost:3000/v2/posts/1/comments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "写得真好，我也去看！"}'
```

**响应**

```json
{
  "code": 200,
  "message": "评论成功",
  "data": {
    "id": 1,
    "postId": 1,
    "userId": 7,
    "content": "写得真好，我也去看！",
    "createdAt": "2026-06-04 08:30:00",
    "username": "bob",
    "nickname": "Bob",
    "avatar": null
  }
}
```

**错误码**: `400` 内容为空或超长 | `404` 动态不存在

---

### DELETE `/v2/posts/:postId/comments/:commentId` — 删除评论

**认证**: 必须（只能删除自己的评论）

**请求示例**

```bash
curl -X DELETE http://localhost:3000/v2/posts/1/comments/1 \
  -H "Authorization: Bearer <token>"
```

**响应**

```json
{ "code": 200, "message": "删除成功" }
```

**错误码**: `403` 无权删除 | `404` 评论不存在

---

## 通用错误码

| 状态码 | 含义         |
|--------|--------------|
| 400    | 参数错误     |
| 401    | 未登录或 token 已过期 |
| 403    | 无权限       |
| 404    | 资源不存在   |
| 409    | 资源冲突（重复操作） |
| 429    | 请求过于频繁 |
| 500    | 服务器内部错误 |

---

## 文件上传说明

- 上传接口均为 `multipart/form-data`
- 支持格式：`image/jpeg`、`image/png`、`image/webp`
- 单文件最大 5MB
- 上传后通过 `/uploads/...` 路径访问（已启用静态文件服务）
