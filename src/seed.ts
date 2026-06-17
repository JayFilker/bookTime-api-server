import bcrypt from 'bcrypt';
import db from './v2/db';

const SEED_USERS = [
  { username: 'admin', password: '123456', nickname: '管理员', bio: '书海无涯，阅读为舟' },
  { username: 'demo_user', password: 'demo123456', nickname: '演示用户', bio: '这是一个演示账号' },
  { username: 'alice', password: 'alice123456', nickname: 'Alice', bio: '书虫一枚，最爱玄幻小说' },
  { username: 'bob', password: 'bob1234567', nickname: 'Bob', bio: '喜欢推理悬疑类' },
];

const SEED_POSTS = [
  {
    username: 'admin',
    title: '《剑帝》6000章了，还在追',
    content: '剑帝更新到6000章依然保持质量，青衫仗剑的文笔真的稳，推荐给喜欢玄幻的朋友！',
  },
  {
    username: 'admin',
    title: '凡人修仙系列推荐',
    content: '《凡人修仙：开局看守草药场》节奏不错，主角成长线扎实，没有无脑爽文的感觉，值得一看。',
  },
  {
    username: 'admin',
    title: '今日打卡',
    content: '连续阅读30天，养成好习惯！今天看完了《仙魂斗战》第二卷，剧情开始发力了。',
  },
  {
    username: 'alice',
    title: '最近在看《诛仙》',
    content: '已经看到第三册了，张小凡的成长线真的很细腻，强烈推荐给喜欢仙侠的朋友！',
  },
  {
    username: 'bob',
    title: '推荐一本神书',
    content: '《白夜行》太绝了，东野圭吾的叙事节奏拿捏得死死的，看完整个人都不好了。',
  },
  {
    username: 'demo_user',
    title: '新人打卡',
    content: '第一次在这里发帖，大家好！希望和各位书友多多交流。',
  },
  {
    username: 'alice',
    title: '今日阅读记录',
    content: '今天看了 50 页《斗破苍穹》，萧炎终于突破斗师了，感觉后面要爽了！',
  },
];

const SEED_COMMENTS = [
  { postTitle: '《剑帝》6000章了，还在追', username: 'alice', content: '剑帝我也在追！最近剧情太爽了' },
  { postTitle: '《剑帝》6000章了，还在追', username: 'bob', content: '6000章，佩服能追下来的读者' },
  { postTitle: '凡人修仙系列推荐', username: 'demo_user', content: '加入书单了，谢谢推荐！' },
  { postTitle: '最近在看《诛仙》', username: 'bob', content: '《诛仙》经典！鬼厉那条线我看哭了' },
  { postTitle: '推荐一本神书', username: 'alice', content: '东野圭吾的书我都看过，《解忧杂货店》也很好看' },
  { postTitle: '新人打卡', username: 'alice', content: '欢迎新人！这里氛围很好的' },
  { postTitle: '新人打卡', username: 'bob', content: '欢迎欢迎，多多分享好书！' },
];

export async function seed(): Promise<void> {
  // 检查是否已有数据，避免重复插入
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) {
    console.log('数据库已有数据，跳过种子插入');
    return;
  }

  console.log('开始插入演示数据...');

  // 插入用户
  const userIds = new Map<string, number>();
  for (const u of SEED_USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    const result = db
      .prepare('INSERT INTO users (username, password, nickname, bio) VALUES (?, ?, ?, ?)')
      .run(u.username, hashed, u.nickname, u.bio);
    userIds.set(u.username, result.lastInsertRowid as number);
  }

  // 插入动态
  const postIds = new Map<string, number>();
  for (const p of SEED_POSTS) {
    const userId = userIds.get(p.username)!;
    const result = db
      .prepare('INSERT INTO posts (userId, title, content) VALUES (?, ?, ?)')
      .run(userId, p.title, p.content);
    postIds.set(p.title, result.lastInsertRowid as number);
  }

  // 插入评论
  for (const c of SEED_COMMENTS) {
    const postId = postIds.get(c.postTitle);
    const userId = userIds.get(c.username);
    if (postId && userId) {
      db.prepare('INSERT INTO post_comments (postId, userId, content) VALUES (?, ?, ?)').run(postId, userId, c.content);
    }
  }

  // 插入点赞（alice 和 bob 互点）
  const aliceId = userIds.get('alice')!;
  const bobId = userIds.get('bob')!;
  const bobPostId = postIds.get('推荐一本神书')!;
  const alicePostId = postIds.get('最近在看《诛仙》')!;
  db.prepare('INSERT INTO post_likes (userId, postId) VALUES (?, ?)').run(aliceId, bobPostId);
  db.prepare('INSERT INTO post_likes (userId, postId) VALUES (?, ?)').run(bobId, alicePostId);

  // 插入 admin 收藏（books.json 中已有的书籍）
  const adminId = userIds.get('admin')!;
  const ADMIN_FAVORITES = ['67118', '67965', '65451']; // 剑帝、凡人修仙：开局看守草药场、仙魂斗战
  for (const bookId of ADMIN_FAVORITES) {
    db.prepare('INSERT INTO favorites (userId, bookId) VALUES (?, ?)').run(adminId, bookId);
  }

  // 插入 admin 书评
  const ADMIN_BOOK_COMMENTS = [
    { bookId: '67118', content: '剑帝是近年来玄幻小说里难得的佳作，主角成长路线清晰，战斗描写燃，强烈推荐！' },
    { bookId: '67965', content: '凡人修仙这个系列一直很喜欢，这本的草药场开局很有新意，后期爽点足。' },
    { bookId: '65451', content: '仙魂斗战世界观宏大，前期稍慢但越看越上头，第二卷开始节奏明显加快。' },
  ];
  for (const bc of ADMIN_BOOK_COMMENTS) {
    db.prepare('INSERT INTO book_comments (userId, bookId, content) VALUES (?, ?, ?)').run(adminId, bc.bookId, bc.content);
  }

  console.log('演示数据插入完成');
}