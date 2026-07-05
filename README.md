# 善断计划 · 判断力训练系统

基于校准方法论，用 AI 辅助提升你的判断精度。参照善断计划 / Metaculus 训练框架。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **数据库**: SQLite (via libSQL/Turso + Drizzle ORM)
- **AI**: DeepSeek / OpenAI
- **认证**: NextAuth.js (匿名游客模式)
- **样式**: Tailwind CSS 4 + shadcn/ui

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建环境配置

项目支持三个运行环境：**开发 (dev)**、**测试 (test)**、**生产 (prod)**。

复制对应的模板文件，填写实际值：

```bash
# 开发环境（推荐）
cp .env.example .env.dev

# 或测试环境
cp .env.example .env.test

# 或生产环境
cp .env.example .env.prod
```

编辑 `.env.dev`（或对应的环境文件），填入必要变量：

```env
APP_ENV="dev"
DATABASE_URL="file:./data/judgment-trainer.db"
AUTH_SECRET="your-random-secret-here"
AUTH_URL="http://localhost:3000"
AI_PROVIDER="deepseek"
```

> **注意**: `.env.*` 文件包含敏感信息，已被 `.gitignore` 忽略，**不会**提交到 git。

### 3. 初始化数据库

创建 SQLite 数据库和表结构：

```bash
npx drizzle-kit push
```

执行后会在 `data/` 目录下生成 `judgment-trainer.db` 文件。

> 如果 `data/` 目录不存在，drizzle-kit 会自动创建。

### 4. 启动服务

**开发环境：**
```bash
npm run dev
```

**测试环境：**
```bash
npm run dev:test
```

**生产构建：**
```bash
npm run build:prod
npm run start:prod
```

访问 [http://localhost:3000](http://localhost:3000)

### 5. 配置 API Key

启动后打开「设置」页面：

- **开发模式**: 在页面中填写 API Key，仅存于浏览器本地，不加密，用于功能调试
- **测试/生产模式**: API Key 经 AES-256-GCM 加密后存储在数据库中，按用户隔离

## 三环境说明

| 维度 | 开发版 (dev) | 测试版 (test) | 生产版 (prod) |
|------|-------------|--------------|--------------|
| APP_ENV | `dev` | `test` | `prod` |
| 登录方式 | 游客按钮 / 默认进入 | 需要登录 | 需要登录 |
| API Key | 全局变量，不加密，自动填写 | 加密存 DB，按用户隔离 | 加密存 DB，按用户隔离 |
| 适用场景 | 本地功能调试 | 功能验证 | 正式部署 |

## 项目脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发环境 (`APP_ENV=dev`) |
| `npm run dev:test` | 启动测试环境 (`APP_ENV=test`) |
| `npm run build:prod` | 生产构建 (`APP_ENV=prod`) |
| `npm run start:prod` | 生产启动 (`APP_ENV=prod`) |
| `npm run lint` | 代码检查 |

## 数据库管理

```bash
# 推送 schema 变更到数据库
npx drizzle-kit push

# 生成迁移文件
npx drizzle-kit generate

# 应用迁移
npx drizzle-kit migrate

# 查看数据库内容
npx drizzle-kit studio
```

## 项目结构

```
├── src/
│   ├── app/
│   │   ├── (app)/          # 主应用页面（需登录）
│   │   ├── (auth)/         # 登录页面
│   │   └── api/            # API 路由
│   ├── components/         # UI 组件
│   └── lib/
│       ├── ai/             # AI 提供商封装
│       ├── db/             # 数据库 schema 和 client
│       ├── env/            # 环境检测中间层
│       └── utils/          # 工具函数
├── data/                   # SQLite 数据库文件（git 忽略）
└── .env.{dev,test,prod}    # 环境配置（git 忽略）
```

## 安全说明

- 所有 `.env.*` 文件均被 `.gitignore` 忽略，不会提交到版本控制
- 数据库文件位于 `data/` 目录，同样被 git 忽略
- 测试/生产模式下，API Key 使用 AES-256-GCM 加密后存储在数据库中
- 开发模式下，API Key 仅存于浏览器 localStorage，服务端不持久化
