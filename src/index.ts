import fs from 'fs';
import path from 'path';
import app from './app';
import { config } from './config';
import { seed } from './seed';

// 确保运行时目录存在（Render 文件系统重启后会丢失）
const RUNTIME_DIRS = ['uploads/avatars', 'uploads/posts', 'uploads/comments'];
for (const dir of RUNTIME_DIRS) {
  fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
}

seed()
  .then(() => {
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${config.port}`);
    });
  })
  .catch(err => {
    console.error('启动失败:', err);
    process.exit(1);
  });