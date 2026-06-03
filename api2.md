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

**响应** 同注册，`message` 为 `"登录成功"`

**错误码**: `400` 参数缺失 | `401` 用户名或密码错误

---

## 用户模块 `/v2/users`

> 所有接口需要认证

### GET `/v2/users/profile` — 获取个人资料

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
    "createdAt": "2026-06-01 12:00:00"
  }
}
```

---

### PUT `/v2/users/profile` — 更新个人资料

**请求体**（字段均可选）

```json
{
  "nickname": "string",   // 最多 50 字符
  "bio": "string"         // 最多 200 字符
}
```

**响应** 返回更新后的完整资料，格式同 GET profile

---

### POST `/v2/users/avatar` — 上传头像

**Content-Type**: `multipart/form-data`

**字段**: `avatar`（文件，支持 jpg/png/webp，最大 5MB）

**响应**

```json
{
  "code": 200,
  "message": "头像上传成功",
  "data": {
    "avatar": "/uploads/avatars/1717000000-abc123.jpg"
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

> 书籍信息从 v1 书籍服务实时获取；若获取失败只返回 id。

---

### GET `/v2/favorites/stats` — 收藏统计

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

**响应**

```json
{
  "code": 200,
  "message": "发布成功",
  "data": { /* 同列表中的单条书评结构 */ }
}
```

---

### DELETE `/v2/books/:bookId/comments/:commentId` — 删除书评

**认证**: 必须（只能删除自己的书评）

**响应**

```json
{ "code": 200, "message": "删除成功" }
```

**错误码**: `403` 无权删除 | `404` 书评不存在

---

### POST `/v2/books/:bookId/comments/:commentId/like` — 点赞/取消点赞书评

**认证**: 必须（切换状态）

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
{ "rating": 5 }   // 1-5 整数
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
        "avatar": "/uploads/avatars/xxx.jpg"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### POST `/v2/posts` — 发布动态

**认证**: 必须

**Content-Type**: `multipart/form-data`

**字段**:
- `content` (string, 必填，最多 500 字符)
- `images` (文件数组，可选，最多 9 张，支持 jpg/png/webp，单张最大 5MB)

**响应**

```json
{
  "code": 200,
  "message": "发布成功",
  "data": { /* 同列表中的单条动态结构 */ }
}
```

---

### GET `/v2/posts/user/:userId` — 获取指定用户的动态

**认证**: 可选

**Query 参数**: `page`（默认 1）、`pageSize`（默认 20，最大 100）

**响应** 格式同动态广场列表

---

### GET `/v2/posts/:postId` — 获取单条动态

**认证**: 可选

**响应**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": { /* 同列表中的单条动态结构 */ }
}
```

**错误码**: `404` 动态不存在

---

### DELETE `/v2/posts/:postId` — 删除动态

**认证**: 必须（只能删除自己的动态）

**响应**

```json
{ "code": 200, "message": "删除成功" }
```

**错误码**: `403` 无权删除 | `404` 动态不存在

---

### POST `/v2/posts/:postId/like` — 点赞/取消点赞动态

**认证**: 必须（切换状态）

**响应**

```json
{
  "code": 200,
  "message": "点赞成功",
  "data": { "postId": 1, "isLiked": true }
}
```

---

## 通用错误码

| 状态码 | 含义 |
|--------|------|
| 400 | 参数错误 |
| 401 | 未登录或 token 已过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（重复操作） |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 文件上传说明

- 上传接口均为 `multipart/form-data`
- 支持格式：`image/jpeg`、`image/png`、`image/webp`
- 单文件最大 5MB
- 上传后通过 `/uploads/...` 路径访问（已启用静态文件服务）