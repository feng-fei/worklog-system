---
name: "worklog-system"
description: "工单管理系统全栈开发与部署技能。涵盖Vue3+shadcn-vue前端开发、Flask后端API、NAS Docker部署等。在处理工单系统相关需求（前端功能、后端接口、部署更新）时自动调用。"
---

# 工单管理系统（Worklog System）

工单记录、待办任务、客户管理、财务统计、工资结算的全栈管理系统。

## 技术栈

- **前端（新版）**: Vue 3 + TypeScript + Vite + Pinia + shadcn-vue + Tailwind CSS v4 + Lucide Vue
- **前端（旧版）**: Vue 3 + Vue Router + Element Plus + Axios + Day.js
- **后端**: Python Flask + SQLAlchemy + Gunicorn
- **数据库**: SQLite（挂载持久化）
- **部署**: Docker（NAS环境）
- **样式**: Tailwind CSS + CSS变量主题（深色/浅色模式自适应）
- **PWA**: vite-plugin-pwa（支持离线访问和桌面安装）

## 项目结构

```
traework/
├── backend/                    # Flask后端
│   ├── blueprints/             # 模块化蓝图（已启用）
│   │   ├── auth_routes.py
│   │   ├── records_routes.py
│   │   ├── customers_routes.py
│   │   ├── materials_routes.py
│   │   ├── pending_routes.py
│   │   ├── finance_routes.py
│   │   ├── projects_routes.py
│   │   ├── staffs_routes.py
│   │   ├── statistics_routes.py
│   │   ├── system_routes.py
│   │   └── templates_routes.py
│   ├── models.py               # 数据模型
│   ├── auth.py                 # 认证逻辑
│   ├── utils.py                # 工具函数
│   └── static_handler.py       # 前端静态文件服务
├── frontend-vue/               # 新版前端（shadcn-vue + 移动端优先）
│   ├── src/
│   │   ├── api/index.ts        # API调用封装（Axios）
│   │   ├── views/              # 页面视图
│   │   ├── components/
│   │   │   ├── ui/             # shadcn-vue组件
│   │   │   ├── layout/         # 布局组件
│   │   │   └── business/       # 业务组件
│   │   ├── stores/             # Pinia状态管理
│   │   ├── router/             # Vue Router
│   │   ├── composables/        # 组合式函数
│   │   ├── types/              # TypeScript类型定义
│   │   └── lib/utils.ts        # 工具函数
│   ├── mock/                   # Mock数据（开发用）
│   ├── vite.config.ts          # Vite配置（含PWA）
│   └── tailwind.config.js      # Tailwind配置
├── frontend-web/               # 备用前端版本
├── deploy_nas.py               # NAS一键部署脚本
├── Dockerfile.flask            # Docker镜像构建
├── docker-compose.yml          # Docker Compose配置
└── run.py                      # 应用入口
```

## 新版前端开发规范（frontend-vue）

### 技术要点
- **组件库**: shadcn-vue（New York风格，Slate基础色）
- **样式**: Tailwind CSS v4 + CSS变量
- **状态管理**: Pinia（`src/stores/`）
- **路由**: Vue Router 4（`src/router/index.ts`）
- **API**: Axios封装（`src/api/index.ts`），baseURL = `/api`
- **类型**: TypeScript（`src/types/index.ts`）

### 布局系统
- **移动端（≤768px）**: 底部导航（BottomNav）+ 顶部栏（MobileHeader）
- **PC端（>768px）**: 左侧边栏（Sidebar）+ 顶部栏（AppHeader）
- **响应式**: Tailwind `md:`、`lg:` 断点切换
- **安全区域**: 适配刘海屏/底部手势条

### 页面列表（已实现）
1. 登录页 - `LoginView.vue`
2. 工作台 - `DashboardView.vue`
3. 工单列表 - `RecordsView.vue`
4. 工单详情 - `RecordDetailView.vue`
5. 新建工单 - `CreateRecordView.vue`（分步表单 + 费用记录 + 照片上传）
6. 待办列表 - `PendingView.vue`
7. 待办详情 - `PendingDetailView.vue`
8. 新建待办 - `CreatePendingView.vue`
9. 客户列表 - `CustomersView.vue`
10. 客户详情 - `CustomerDetailView.vue`
11. 物料列表 - `MaterialsView.vue`
12. 物料详情 - `MaterialDetailView.vue`
13. 项目列表 - `ProjectsView.vue`
14. 团队成员 - `StaffsView.vue`
15. 统计报表 - `StatisticsView.vue`
16. 通知中心 - `NotificationsView.vue`
17. 个人中心 - `ProfileView.vue`

### API调用规范
统一使用 `src/api/index.ts` 封装的方法：
```typescript
import { recordsApi, statisticsApi } from '@/api'

// 列表接口返回格式：{ records: [], total: number, page: number, pages: number }
const res = await recordsApi.list({ page: 1, per_page: 20 })

// 详情接口
const record = await recordsApi.get(id)
```

### 列表页通用模式
使用 `useList` composable（`src/composables/useList.ts`）：
```typescript
const { list, loading, finished, loadMore, refresh, params } = useList<WorkRecord>({
  fetchFn: recordsApi.list,
  defaultParams: { per_page: 20 }
})
```

### 设计规范
- **风格**: Linear风格 - 克制的表面层次、强排版和间距、少颜色、信息密集但可读
- **深色模式**: 跟随系统 `prefers-color-scheme`，支持手动切换
- **卡片**: 仅在卡片是交互对象时使用
- **圆角**: 统一使用 `rounded-lg`（8px）或 `rounded-md`（6px）

## 后端开发规范

### 路由
- 所有路由在 `backend/blueprints/` 目录下，模块化蓝图
- API前缀: `/api`
- 认证方式: Token-based（请求头 `Authorization: Bearer <token>`）

### 权限控制（严格执行）
- **写操作**（创建/更新/删除）: 必须验证 `admin` 权限
- **列表接口**: worker用户只能查看自己相关的数据
- **详情接口**: 必须进行权限过滤，防止ID遍历
- **特殊字段**: 物料列表/详情对worker隐藏 `unit_price`、`supplier`、库存流水

### 数据模型（主要）
- WorkRecord - 工单记录
- PendingWork - 待办任务
- Customer - 客户
- CustomerEquipment - 客户设备
- Material - 物料
- MaterialStockLog - 物料库存日志
- Staff - 员工
- Project - 项目
- Salary - 工资记录
- Expense - 支出
- ExpenseCategory - 支出分类
- WorkerUser - 系统用户
- Notification - 通知
- WorkTemplate - 工单模板
- MaintenancePlan - 巡检计划
- OperationLog - 操作日志

### 删除约束
删除以下数据时必须检查关联引用，阻止删除或级联清理：
- 客户、员工、物料、支出分类
- 客户设备、巡检计划
- 项目施工记录、项目支出

## NAS部署流程

### 服务器信息
- IP: `172.28.10.2`
- 用户: `root`，密码: `feng1021`
- 项目路径: `/vol1/1000/docker/work-log-system/`
- 访问地址: `http://172.28.10.2:8085/`
- 数据卷: `db/`（数据库）+ `uploads/`（上传文件）

### 一键部署
项目根目录有 `deploy_nas.py` 脚本，直接运行：
```bash
python deploy_nas.py
```

脚本自动完成：
1. 备份旧前端
2. SFTP上传后端代码 + 前端dist
3. 停止旧容器
4. 重新构建Docker镜像
5. 启动新容器
6. 验证状态和日志

### 手动部署步骤
1. **构建前端**:
   ```bash
   cd frontend-vue
   npm run build
   ```

2. **上传文件**（Python paramiko）:
   ```python
   import paramiko
   ssh = paramiko.SSHClient()
   ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
   ssh.connect('172.28.10.2', username='root', password='feng1021', timeout=30)
   sftp = ssh.open_sftp()
   # 上传 backend/、frontend-vue/dist/、Dockerfile.flask、docker-compose.yml、run.py
   sftp.close()
   ```

3. **构建镜像**（必须禁用BuildKit）:
   ```bash
   cd /vol1/1000/docker/work-log-system
   DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t worklog-flask:alpine3 .
   ```

4. **启动容器**:
   ```bash
   docker run -d --name worklog -p 8085:5000 \
     -v /vol1/1000/docker/work-log-system/db:/app/data \
     -v /vol1/1000/docker/work-log-system/uploads:/app/uploads \
     --restart unless-stopped \
     worklog-flask:alpine3
   ```

### 部署注意事项
- **BuildKit不可用**: 必须用 `DOCKER_BUILDKIT=0` 构建
- **Windows环境**: 用Python paramiko连接SSH，不要用sshpass或scp命令
- **数据库持久化**: 通过volume挂载，重建容器不丢失
- **前端静态文件**: 构建进Docker镜像，不挂载
- **容器重启策略**: `unless-stopped`

## 重要约束与坑点（必须遵守）

### 硬约束
1. **CSS文件只能追加，不能重写**（旧版前端）
2. **CSS修改必须更新 `?v=` 参数**处理缓存
3. **app.min.js绝对不能修改**（旧版前端，会导致功能崩溃）
4. **模板文件必须存放在 `/app/data/templates/`** 挂载目录
5. **所有写操作必须验证admin权限**
6. **所有GET接口必须进行权限过滤**

### 常见坑点
1. 修改压缩JS文件（app.min.js）会导致语法错误和功能崩溃
2. 重写CSS风险高，应该恢复原始CSS后增量添加
3. 移动端横屏模式不要用左侧悬浮dock和浮动圆形汉堡按钮
4. 父容器 `overflow: hidden` 会导致横向滚动内容被裁剪
5. 多个初始化模块不做登录检查会导致401循环
6. API响应格式不统一（有的返回 `items`，有的返回 `records`）
- 统一标准: `{ records: [], total: int, page: int, pages: int }`
7. 直接写入Excel合并单元格的非起始格会报错
8. 前端文件是构建进镜像的，快速部署脚本没用，必须重建镜像

## 关键文件速查

| 功能 | 文件 |
|------|------|
| API封装 | frontend-vue/src/api/index.ts |
| 类型定义 | frontend-vue/src/types/index.ts |
| 状态管理 | frontend-vue/src/stores/user.ts |
| 路由配置 | frontend-vue/src/router/index.ts |
| 列表composable | frontend-vue/src/composables/useList.ts |
| 主布局 | frontend-vue/src/components/layout/AppLayout.vue |
| 底部导航 | frontend-vue/src/components/layout/BottomNav.vue |
| 新建工单 | frontend-vue/src/views/CreateRecordView.vue |
| 费用记录组件 | frontend-vue/src/components/ExpenseRecorder.vue |
| 认证路由 | backend/blueprints/auth_routes.py |
| 工单路由 | backend/blueprints/records_routes.py |
| 静态文件服务 | backend/static_handler.py |
| 部署脚本 | deploy_nas.py |
| Dockerfile | Dockerfile.flask |
