# 全栈网页应用管理平台

## 产品定位
中文团队内部使用的轻量级网页应用托管与治理系统。同事把做好的网页应用交上来，平台负责账号、权限、门户、数据与历史版本。

## 技术栈
- 后端：NestJS + Drizzle ORM + PostgreSQL
- 前端：React 19 + TypeScript + Tailwind CSS
- 认证：自实现邮箱+密码账号体系（非平台 userContext）
- 所有权限校验在后端接口层强制执行

## 设计规范

### 视觉风格
- 扁平科技风
- 深蓝 #0A2540 打底
- 青色 #22C3D6 点缀线
- 亮蓝 #2563EB 作链接/焦点色
- 白卡片细边框、无阴影无渐变

### 主题色（六种可选）
- 海蓝（默认）：primary #2563EB
- 青碧：primary #22C3D6
- 翠绿：primary #10B981
- 紫罗兰：primary #8B5CF6
- 蜜橙：primary #F97316
- 玫红：primary #EC4899

主题切换按钮在页面右下角🎨，localStorage 记忆。

### 界面明暗模式（ThemeSwitcher 面板内）
- 三档：跟随系统（默认）/ 亮色 / 暗色，localStorage（app_theme_mode）记忆
- 实现：`.dark` 类挂 html 根元素，覆盖 tailwind-theme.css 的语义变量；跟随系统监听 prefers-color-scheme
- 所有用户（含未登录页）均可设置，纯前端本地偏好，不走服务端
- 图表/画布类（ECharts 的 label、tooltip、legend、lineStyle）不吃 Tailwind 语义变量，主题默认色在暗色下会变成深字配深底：必须按 `html.dark` 提供两套 palette，用 MutationObserver 监听根元素 class 切换后重设 option，参考 `OrganizationGraph` 的 `useIsDark` + `LIGHT_PALETTE`/`DARK_PALETTE`

### 布局
- 左侧导航栏 + 右侧内容区
- 响应式适配手机

## 用户与权限

### 角色
- 超级管理员（super_admin）：系统内置，绕过所有业务规则
- 一级管理员（level_1）：全局管理员，管理全部门户、模板、用户、分组，审核账号
- 二级管理员（level_2）：组长，只能管理本组的门户和项目，不能管模板
- 三级用户（level_3）：普通成员，按权限使用门户和项目

### 注册与审核
- 自助注册（邮箱+密码+昵称），状态为"未审核"
- 未审核用户可登录，但看不到任何门户、模板、业务数据，也不能写入
- 管理员后台审核通过后正常使用
- 超级管理员 / 一级管理员可在用户管理页直接创建账号（`POST /api/admin/users`）：创建即审核通过，可指定级别（level_1/level_2/level_3）与分组，邮箱唯一冲突返回 409
- 防提权：注册和用户自改资料时，不能自己改 level/approved/group 字段
- 邮箱找回密码、自助改密
- 站点设置中配置 SMTP 发件邮箱后，找回密码自动向注册邮箱发送重置链接

### 可见性四档（门户和模板共用）
1. all：全部已审核用户可见
2. group：指定组成员可见
3. users：名单内的人可见
4. owner：仅负责人可见

恒定规则：一级管理员总能看到全部；负责人总能看到自己的资源。

### 指定组可见支持多选
- 门户用 `pages.visible_group_ids`（uuid 数组）存可见分组，前端 `GroupMultiSelect` 复选框多选；为空时回退按归属分组 `group_id` 判定，兼容存量数据
- 命中规则：用户主分组（users.group_id）或交叉分组成员（group_members）任一在可见分组内即可见；列表 SQL 与 `PermissionService.canViewPage` 同规则

### 项目制应用权限
- read_scope: all / group / owner / users
- edit_scope: owner / group / all / users
- 能编辑的人必须先能看到
- 不可读的人在列表里看不到、打不开、直调接口也是404

## 数据模型
- users: 邮箱、密码、昵称、头像、level、group_id、approved、created、updated
- groups: 名称、备注、leader、created、updated
- pages: 标题、slug、图标、类型(html/link)、url、html内容、可见性、可见用户名单、排序、是否启用、关联分组、负责人、是否软删、是否数据应用模式、关联模板、created、updated
- templates: 名称、类型(html/app)、图标、说明、HTML内容或URL、可见性、可见用户名单、可见分组名单、排序、负责人、created、updated
- app_data: 应用标识(app)、标题、内容、负责人、可读范围、可读用户名单、编辑范围、编辑用户名单、关联项目(自关联)、created、updated
- jizhang_records: 日期、收支类型、分类、金额、备注、记录人、是否软删、负责人、关联项目、created、updated
- history: 目标集合名、目标记录ID、目标标题、关联项目、快照JSON、操作类型、操作人、created
- audit_logs: 操作人、动作、目标、详情、created
- settings: key-value结构（含 smtp_config 发件邮箱配置，内含授权码，仅管理员接口读取，脱敏返回）

## 模块划分
- auth: 注册/登录/审核/改密/找回密码
- users: 用户管理
- groups: 分组管理
- templates: 模板管理
- pages: 门户管理
- jizhang: 记账本应用
- history: 历史版本
- audit: 操作日志
- email: 发件邮箱 SMTP 配置与发信（管理员配置、测试发送、找回密码发信）
- settings: 站点设置
- common: 基础能力（审计日志写入 AuditService、权限判定 PermissionService、JwtService、AuthGuard、异常过滤器）；AuditService/PermissionService 由 CommonModule 统一提供并导出，业务模块只 import CommonModule，不再各自写进 providers

## 前后端约定

- 人员选择统一用 `client/src/components/AppUserSelect.tsx`（远程搜索应用内已审核用户），不使用平台 UserSelect（平台 ID 与应用 users.id 不是同一空间）
- 人员目录接口 `GET /api/users/directory?keyword=|ids=`（需登录，仅返回已审核用户的 id/昵称/级别，不下发邮箱）
- 前端隐藏写入口的判定必须与后端 `PermissionService` 同分支对齐：super_admin / level_1 对所有资源可读写，不能只按 owner/编辑范围判断
- `PATCH /api/admin/settings/:key` 只开放白名单（如 site-name）；jwt_secret、smtp_config 走各自专用接口，避免被通用写接口覆盖
- `/openapi` 由平台网关 API Key 鉴权，页面列表不下发 htmlContent，仅返回启用中的记录
