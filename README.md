# 团队网页应用管理平台

网页应用托管与治理系统。基于 **NestJS + React 19 + PostgreSQL** 的全栈应用，面向团队内部提供统一的网页应用（门户）接入、审批、分发、审计与运营治理能力，并内置一套记账本（Jizhang）模块作为业务示例。

## 核心功能

- **账号体系与四级角色**
  - 注册 / 登录 / 登出、JWT 鉴权、找回密码（含管理员重置密码）
  - 用户审核（注册后需审批通过才可登录）
  - 四级角色：平台管理员 / 团队管理员 / 普通成员 / 访客，按角色控制管理端可见与操作范围
  - 分组（Groups）：分组创建、成员管理、组长指派、按组授权
- **门户（Pages）管理**
  - 基于模板创建网页应用门户，配置标题 / 图标 / 排序 / 归属人
  - 可见性控制：所有人 / 指定组 / 指定人 / 仅负责人
  - 启用 / 停用 / 回收站（软删除 + 物理删除）
- **模板（Templates）管理**
  - 模板列表、详情、可见范围配置（组 / 用户 / 负责人）
- **审计日志（Audit Logs）**
  - 记录关键操作的操作者、动作、时间、对象，支持按操作者 / 动作 / 时间范围筛选
- **历史版本回溯（History）**
  - 对业务记录自动留存历史版本，支持按对象 / 项目查询与一键还原
- **站点设置与邮件（Email/SMTP）**
  - 站点名称配置（前端实时读取、瞬时故障自动重试）
  - SMTP 邮件服务器配置、发送测试邮件
- **记账本模块（Jizhang）**
  - 项目 / 记录管理，收支分类汇总，回收站还原，CSV 导出
- **多主题**
  - 六套主题色（海蓝 / 青碧 / 翠绿 / 紫罗兰 / 蜜橙 / 玫红）+ 明暗模式（跟随系统 / 亮 / 暗）

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router 7 · TanStack Query / React Form · shadcn/ui（Radix UI）· ECharts · Recharts |
| 后端 | NestJS 10 · TypeScript · class-validator · class-transformer · Nodemailer |
| 数据库 | PostgreSQL · Drizzle ORM |
| 其他 | npm workspaces 单仓 · SWC · ESLint 9 · Stylelint · SWC 加速构建 |

## 项目结构

```
├── client/                 # React 前端
│   └── src/
│       ├── api/            # 前端 API 封装（鉴权、用户、分组、门户、模板、审计、设置、记账本、历史）
│       ├── components/     # UI 组件库（ui/ 基础组件 + business-ui/ 业务组件）
│       ├── contexts/       # Auth、Theme 上下文
│       ├── hooks/          # 自定义 Hooks（主题、站点名、移动端判断等）
│       ├── lib/            # 工具函数（cn 等）
│       ├── pages/          # 页面：Admin、登录/注册、门户、历史、记账本、404 等
│       ├── types/          # 前端类型声明
│       └── utils/          # 占位图资源、记账本常量等
├── server/                 # NestJS 后端
│   ├── app.module.ts
│   ├── main.ts
│   ├── common/             # 审计、鉴权、常量、装饰器、过滤器、权限、工具
│   ├── database/           # 数据库 Schema
│   └── modules/            # 业务模块：auth、users、groups、pages、templates、audit、history、email、settings、jizhang、view 等
├── shared/                 # 前后端共享类型（api.interface.ts）
├── scripts/                # 开发 / 构建 / 运行 / 检查脚本
├── docs/                   # OpenAPI 文档等
└── package.json
```

## 环境要求

- Node.js >= 22
- npm >= 10
- PostgreSQL 数据库

## 快速开始

1. **安装依赖**

   ```bash
   npm install
   ```

2. **配置环境变量**

   复制 `.env.example`（如有）为 `.env`，或按部署环境设置以下关键变量（示例值仅为占位，请替换为你自己的配置）：

   ```bash
   # 数据库连接（替换为真实连接串）
   DATABASE_URL=postgresql://user:password@localhost:5432/team_web_app

   # JWT 签名密钥（务必替换为强随机字符串）
   JWT_SECRET=your-secret

   # 日志开关
   LOG_DIR=./logs
   LOG_REQUEST_BODY=true
   LOG_RESPONSE_BODY=false
   ```

   > 生产环境请使用强随机密钥并通过密钥管理系统注入，不要将真实密钥提交到仓库。

3. **初始化数据库 Schema**

   ```bash
   npm run gen:db-schema
   ```

4. **本地开发**

   ```bash
   npm run dev
   ```

   前端与后端会分别以热更新方式启动，前端默认由 Vite 提供，后端默认监听 `process.env.PORT`（默认见 `server/main.ts`）。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动前后端开发环境 |
| `npm run dev:server` | 仅启动后端（watch 模式） |
| `npm run dev:client` | 仅启动前端（Vite watch） |
| `npm run build` | 执行构建（scripts/build.sh） |
| `npm run build:server` | 构建后端（Nest build） |
| `npm run build:client` | 构建前端（Vite build） |
| `npm run start` | 生产模式启动（node main.js） |
| `npm run type:check` | 前后端 TypeScript 类型检查 |
| `npm run eslint` | ESLint 检查 |
| `npm run stylelint` | 前端样式检查 |
| `npm run lint` | 统一 lint 入口 |
| `npm run gen:db-schema` | 同步数据库 Schema |

## 部署

生产构建后，将构建产物部署到你的 Node 服务环境即可：

```bash
npm ci --omit=dev
npm run build
npm run start
```

- 前端构建产物位于 `client/dist`，由后端静态托管或由独立静态服务器 / CDN 提供。
- 后端服务监听端口由 `PORT` 环境变量控制；`CLIENT_BASE_PATH` 可用于配置前端路由前缀（例如部署在子路径时）。
- 数据库连接、JWT 密钥等敏感配置一律通过环境变量注入，禁止写死在源码中。
- 日志默认输出到 `LOG_DIR` 指定目录。

## 贡献

欢迎通过 Issue 反馈问题或提交 Pull Request。提交前请先通过 `npm run lint` 与 `npm run type:check`。

## 授权

本项目源码随仓库提供，请遵循仓库中声明的许可协议使用。
