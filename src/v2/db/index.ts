import fs from 'fs';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'app.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    NOT NULL UNIQUE,
    password  TEXT    NOT NULL,
    nickname  TEXT,
    avatar    TEXT,
    bio       TEXT,
    createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bookId    TEXT    NOT NULL,
    createdAt TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(userId, bookId)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title     TEXT,
    content   TEXT    NOT NULL,
    createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS post_images (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    path   TEXT    NOT NULL,
    sort   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS post_likes (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    postId INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(userId, postId)
  );

  CREATE TABLE IF NOT EXISTS book_comments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bookId    TEXT    NOT NULL,
    content   TEXT    NOT NULL,
    createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS book_comment_images (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    commentId INTEGER NOT NULL REFERENCES book_comments(id) ON DELETE CASCADE,
    path      TEXT    NOT NULL,
    sort      INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS book_comment_likes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    commentId INTEGER NOT NULL REFERENCES book_comments(id) ON DELETE CASCADE,
    UNIQUE(userId, commentId)
  );

  CREATE TABLE IF NOT EXISTS book_ratings (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    userId  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bookId  TEXT    NOT NULL,
    rating  INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    UNIQUE(userId, bookId)
  );

  CREATE TABLE IF NOT EXISTS post_comments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    postId    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content   TEXT    NOT NULL,
    createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// 迁移：为已存在的 posts 表补加 title 列
const postCols = db.pragma('table_info(posts)') as { name: string }[];
if (!postCols.some(c => c.name === 'title')) {
  db.exec('ALTER TABLE posts ADD COLUMN title TEXT');
}

export default db;