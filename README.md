# novel-api-server

基于 Express + TypeScript 的小说数据接口服务，通过爬取 bqge.org 提供书籍、章节、搜索等接口。

## 技术栈

- Node.js + Express 5
- TypeScript（严格模式）
- Axios + Cheerio（爬虫）
- 内存缓存（带 TTL）
- express-rate-limit（限流）

## 快速开始

```bash
npm install
npm run dev
# 服务启动于 http://localhost:3000
```

生产构建：

```bash
npm run build
npm start
```

端口默认 `3000`，可通过环境变量 `PORT` 覆盖。

---

## 统一响应格式

所有接口均返回以下结构：

```json
{
  "code": 200,
  "message": "请求成功",
  "data": {}
}
```

错误时：

```json
{
  "code": 400,
  "message": "keyword 不能为空"
}
```

---

## 接口文档

### 书籍列表

```
GET /api/books
```

**Query 参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页数量 |
| category | string | — | 分类筛选，见下方分类表 |

支持的分类值：`玄幻小说` `修真小说` `都市小说` `历史小说` `网游小说` `科幻小说` `其他小说`

- 不传 `category` 时返回首页最近更新列表
- 传 `category` 时走对应分类页，每页约 30 条，`total` 为估算值（总页数 × 30）

**响应 data：**

```json
{
  "list": [
    {
      "id": "99084",
      "title": "斗破苍穹",
      "author": "天蚕土豆",
      "cover": "https://www.bqge.org/img/99084.jpg",
      "description": "",
      "category": "玄幻小说",
      "chapterCount": 0,
      "latestChapter": "第1648章 番外",
      "updatedAt": "2024-01-01"
    }
  ],
  "total": 900,
  "page": 1,
  "pageSize": 20
}
```

**示例：**

```
GET /api/books?page=1&pageSize=20
GET /api/books?category=玄幻小说&page=2&pageSize=30
```

---

### 书籍详情

```
GET /api/books/:id
```

返回书籍基本信息及完整章节列表（不分页）。章节数量较多的书籍首次请求耗时较长，结果会缓存 30 分钟。

**响应 data：**

```json
{
  "id": "99084",
  "title": "斗破苍穹",
  "author": "天蚕土豆",
  "cover": "https://www.bqge.org/img/99084.jpg",
  "description": "这里是斗气大陆...",
  "category": "玄幻小说",
  "chapterCount": 1648,
  "latestChapter": "第1648章 番外",
  "updatedAt": "2024-01-01",
  "chapters": [
    { "id": "82082413", "bookId": "99084", "title": "第一章 陨落的天才", "order": 1 }
  ]
}
```

**示例：**

```
GET /api/books/99084
```

---

### 章节列表（分页）

```
GET /api/books/:bookId/chapters
```

返回指定书籍的章节列表，支持分页。全量章节会缓存 30 分钟，分页在内存中切片，不会重复爬取。

**Query 参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页数量 |

**响应 data：**

```json
{
  "list": [
    { "id": "82082413", "bookId": "99084", "title": "第一章 陨落的天才", "order": 1 },
    { "id": "82082414", "bookId": "99084", "title": "第二章 ...", "order": 2 }
  ],
  "total": 1648,
  "page": 1,
  "pageSize": 20
}
```

**示例：**

```
GET /api/books/99084/chapters?page=1&pageSize=50
```

---

### 章节内容

```
GET /api/books/:bookId/chapters/:chapterId
```

返回章节正文内容。若章节原页面分多页，服务端会自动合并所有分页内容（最多 20 页），一次性返回完整正文。

**响应 data：**

```json
{
  "id": "82082413",
  "bookId": "99084",
  "title": "第一章 陨落的天才",
  "order": 0,
  "content": "萧炎，斗之气三段...",
  "prevChapterId": null,
  "nextChapterId": "82082414"
}
```

| 字段 | 说明 |
|------|------|
| content | 正文，段落间以 `\n` 分隔，已过滤广告文本 |
| prevChapterId | 上一章 ID，第一章时为 `undefined` |
| nextChapterId | 下一章 ID，最后一章时为 `undefined` |

**示例：**

```
GET /api/books/99084/chapters/82082413
```

---

### 首页推荐

```
GET /api/home
```

返回首页的「本期强推」和「最新入库小说」两个列表，结果缓存 10 分钟。

**响应 data：**

```json
{
  "featured": [
    {
      "id": "27",
      "title": "紫星大帝",
      "author": "至尊辉少",
      "category": "玄幻"
    }
  ],
  "newBooks": [
    {
      "id": "103240",
      "title": "精灵：完虐主角！你管这叫废物？",
      "author": "北八",
      "category": "科幻"
    }
  ]
}
```

| 字段 | 说明 |
|------|------|
| featured | 本期强推列表 |
| newBooks | 最新入库小说列表 |

**示例：**

```
GET /api/home
```

---

### 搜索

```
GET /api/search
```

按关键词搜索书籍。搜索结果按关键词缓存 5 分钟，分页在内存中切片。

**Query 参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| keyword | string | — | 搜索关键词，**必填** |
| page | number | 1 | 页码 |
| pageSize | number | 10 | 每页数量 |

keyword 为空时返回 HTTP 400。

**响应 data：**

```json
{
  "list": [
    {
      "id": "99084",
      "title": "斗破苍穹",
      "author": "天蚕土豆",
      "cover": "https://www.bqge.org/img/99084.jpg",
      "description": "",
      "category": "玄幻小说",
      "chapterCount": 0,
      "latestChapter": "第1648章 番外",
      "updatedAt": ""
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 10
}
```

**示例：**

```
GET /api/search?keyword=斗破苍穹
GET /api/search?keyword=天蚕土豆&page=1&pageSize=5
```

---

## 缓存策略

| 数据类型 | TTL |
|----------|-----|
| 章节内容 | 24 小时 |
| 书籍详情 / 章节列表 | 30 分钟 |
| 书籍列表 / 分类列表 / 首页推荐 | 10 分钟 |
| 搜索结果 | 5 分钟 |

缓存为进程内存缓存，服务重启后清空。

---

## 限流

每个 IP 每分钟最多 60 次请求，超出返回 HTTP 429。

---

## 目录结构

```
src/
├── index.ts              # 入口
├── app.ts                # Express 配置、限流
├── config/               # 环境配置（PORT 等）
├── routes/               # 路由层
├── controllers/          # 控制器层（参数解析、响应）
├── services/             # 业务逻辑 + 爬虫
├── types/                # TypeScript 类型定义
├── utils/
│   ├── cache.ts          # 内存缓存（TTL）
│   ├── scraper.ts        # HTTP 爬虫封装
│   └── response.ts       # 统一响应格式
└── middlewares/          # 日志、错误处理
```
