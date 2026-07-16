---
name: "worklog-system"
description: "工单管理系统全栈开发与部署技能。涵盖Vue3前端开发、Flask后端API、NAS Docker部署等。在处理工单系统相关需求（前端功能、后端接口、部署更新）时自动调用。"
---

# 工单管理系统（Worklog System）

工单记录、待办任务、客户管理、财务统计、工资结算的全栈管理系统。

## 技术栈

- **前端**: Vue 3 + Vue Router + Element Plus + Axios + Day.js
- **后端**: Python Flask + SQLAlchemy + Gunicorn
- **数据库**: SQLite（挂载持久化）
- **部署**: Docker + Docker Compose（NAS环境）
- **样式**: CSS变量主题（深色/浅色模式自适应）

## 项目结构

```
traework/
├── backend/                  # Flask后端
│   ├── __init__.py          # 应用创建、蓝图注册、数据库初始化
│   ├── routes.py            # 单体路由文件（api_bp）
│   ├── models.py            # 数据模型
│   ├── auth.py              # 认证逻辑
│   ├── utils.py             # 工具函数
│   ├── static_handler.py    # 前端静态文件服务
│   └── blueprints/          # 模块化蓝图（架构预留）
├── frontend/                # 旧版前端（Bootstrap + 原生JS）
└── frontend-vue/            # Vue3新版前端（主版本）
    ├── index.html           # 入口HTML
    ├── manifest.json        # PWA配置
    ├── css/style.css        # 全局样式（版本号?v=控制缓存）
    └── js/
        ├── api.js           # API调用封装
        ├── app.js           # Vue应用、路由配置
        ├── store.js         # 全局状态（用户、主题、权限）
        ├── validators.js    # 表单验证规则
        ├── components/      # 全局组件
        └── views/           # 页面视图
```

## 前端开发规范

### 组件编写方式
所有Vue组件使用 **全局注册 + window导出** 模式：
```javascript
const MyComponent = {
  setup() {
    const { ref, reactive, computed, onMounted } = Vue;
    const { useRouter, useRoute } = VueRouter;
    const { ElMessage, ElMessageBox } = ElementPlus;
    // ...
    return { /* 模板变量 */ };
  },
  template: `...`
};
window.MyComponent = MyComponent;
```
在 `app.js` 中用 `app.component('MyComponent', MyComponent)` 注册。

### 路由配置
- 路由定义在 `app.js` 的 `routes` 数组
- 路由守卫：`requiresAuth`（需登录）、`adminOnly`（需管理员）
- 默认首页：`/dashboard`

### API调用
统一使用 `api.js` 封装的方法，返回Promise：
```javascript
api.getRecords(params).then(data => { ... }).catch(err => { ... })
```
列表数据用 `parseListResponse(res)` 解析分页响应。

### 样式规范
- CSS变量主题，支持 `prefers-color-scheme` 自动切换深色/浅色
- 版本号控制缓存：`style.css?v=15`、`js/api.js?v=15`（所有JS/CSS文件同步版本号）
- 移动端底部导航内置在Layout.js中，不要重复添加MobileDock
- 响应式：PC多列网格 + 侧边栏，移动端单列 + 底部导航

## 后端开发规范

### 路由
- 主要路由在 `routes.py` 的 `api_bp` 蓝图，前缀 `/api`
- 模块化蓝图在 `blueprints/` 目录（需设置 `USE_MODULAR_BLUEPRINTS=true` 启用）
- 每个接口需进行权限验证（登录态 + 管理员检查）

### 数据模型
- 定义在 `models.py`，使用SQLAlchemy
- 主要模型：WorkRecord、PendingWork、Customer、Material、Staff、Project、Salary、WorkerUser、Notification、ExpenseCategory等

### 权限控制
- 所有写操作需验证 `admin` 权限
- 列表接口需根据角色过滤数据（worker用户只能看自己相关）
- 管理员角色判断：`role === 'admin'` 或 `is_admin === true`

## NAS部署流程

### 服务器信息
- IP: `172.28.10.2`
- 用户: `root`，密码: `feng1021`
- 项目路径: `/vol1/1000/docker/worklog-code/new-worklog0517/`
- 访问端口: `8085` → 容器内 `5000`
- 数据卷: `/vol1/1000/docker/work-log-system/`（db + uploads）

### 部署方式（Python Paramiko）
**重要：Windows环境下使用Python paramiko库连接NAS，不要用sshpass或scp命令**

项目根目录已有 `deploy_nas.py` 脚本，可直接运行：
```python
python deploy_nas.py
```

如需手动编写：
```python
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021', timeout=30)

# SFTP上传文件
sftp = ssh.open_sftp()
sftp.put(local_path, remote_path)
sftp.close()

# 执行命令
stdin, stdout, stderr = ssh.exec_command('cd /path && docker compose down && docker compose up -d', get_pty=True)
for line in stdout:
    print(line.strip())

ssh.close()
```

### 部署步骤
1. **上传文件**：使用SFTP上传修改的文件
   - 前端文件 → `frontend-vue/` 目录
   - 后端文件 → `backend/app/` 目录
2. **构建镜像**：`DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t worklog-flask:alpine3 .`
   - 必须禁用BuildKit（NAS上BuildKit有resolv.conf问题）
3. **重启容器**：`docker compose down && docker compose up -d`
4. **验证**：检查容器状态、日志、API测试

### 注意事项
- BuildKit不可用，必须用 `DOCKER_BUILDKIT=0` 构建
- 数据库和上传文件通过volume挂载持久化，不会因重建丢失
- 前端静态文件通过镜像内COPY方式打包，不在volume中挂载
- 旧前端保留在 `/app/frontend/` 作为回退，访问 `/old/` 路径
- Windows PowerShell下sshpass命令不可用，必须用paramiko

## 常见问题排查

### 页面空白
- 检查控制台JS错误，通常是组件名不匹配或导出名错误
- 检查版本号是否更新（浏览器缓存问题）
- 确认所有script标签顺序正确（Vue → Router → Element Plus → 组件 → app.js）

### API 404
- 确认后端routes.py是否包含该路由
- 确认路由前缀是否正确（/api/xxx）
- 检查容器日志：`docker compose logs`

### 权限问题
- 检查store.js中isAdmin的判断逻辑
- 检查后端接口的权限装饰器
- worker用户看不到数据是正常的（权限过滤）

### Docker构建失败
- 确保使用 `DOCKER_BUILDKIT=0`
- 检查Dockerfile.flask中的COPY路径是否正确
- 确认NAS上文件目录结构完整

## 关键文件速查

| 功能 | 文件 |
|------|------|
| 登录认证 | views/Login.js, auth.py |
| 工单列表 | views/RecordList.js, routes.py /api/records |
| 新建工单 | views/RecordCreate.js, routes.py /api/records POST |
| 工单详情 | views/RecordDetail.js |
| 日历视图 | views/CalendarView.js |
| 统计报表 | views/ReportView.js |
| 用户管理 | views/User.js |
| 客户管理 | views/Customer.js |
| 员工管理 | views/Staff.js |
| 财务管理 | views/Finance.js |
| 物料管理 | views/Material.js |
| 项目管理 | views/Project.js |
| 工资管理 | views/Salary.js |
| 通知中心 | views/Notification.js |
| 工单模板 | views/Template.js |
| 设备管理 | views/Equipment.js |
| 支出分类 | views/ExpenseCategory.js |
| 操作日志 | views/OpLog.js |
| 待办任务 | views/PendingWork.js |
| 巡检计划 | views/MaintenancePlan.js |
| 系统设置 | views/Settings.js |
| 布局/导航 | views/Layout.js |
