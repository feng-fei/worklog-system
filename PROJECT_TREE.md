# Worklog 工单系统 - 项目目录树

## 项目概述
Worklog 是基于 Flask 的工单管理系统，运行在 NAS 的 Docker 容器中，支持工单创建、查询、待办处理、工资管理等功能。

## 连接信息
- **NAS IP**: 172.28.10.2
- **SSH 用户名**: root
- **容器名**: worklog
- **服务端口**: 8085
- **前端目录**: /app/frontend/ (容器内)

## 本地项目目录结构

```
traework/
├── .trae/                          # TRAE 配置目录
│   └── skills/                     # 技能目录
│       └── worklog-dev/            # Worklog 开发技能
│           └── SKILL.md            # 技能说明文档
└── PROJECT_TREE.md                 # 项目目录树（本文件）
```

## 容器内项目目录结构

```
/app/
├── run.py                          # 应用启动入口
├── app/                            # 后端应用目录
│   ├── __init__.py                 # Flask 应用初始化
│   ├── auth.py                     # 认证模块（JWT token、登录装饰器）
│   ├── models.py                   # 数据模型（SQLAlchemy ORM）
│   ├── routes.py                   # API 路由（所有接口定义）
│   ├── static_handler.py           # 静态文件处理
│   ├── utils.py                    # 工具函数
│   └── __pycache__/                # Python 缓存（自动生成）
├── frontend/                       # 前端资源目录
│   ├── index.html                  # 主页面（所有页面 HTML 结构）
│   ├── style.css                   # 样式文件
│   ├── script.js                   # 未压缩的 JavaScript 源码
│   ├── app.min.js                  # 压缩后的 JavaScript（实际运行版本）
│   ├── js/                         # 第三方 JS 库
│   │   └── bootstrap.bundle.min.js # Bootstrap JS
│   └── css/                        # 第三方 CSS
├── data/                           # 数据目录
│   └── worklog.db                  # SQLite 数据库文件
└── uploads/                        # 上传文件目录（照片等）
```

## 数据库表结构
- **worker_users**: 用户表（登录账号）
- **work_records**: 工单记录表
- **customers**: 客户表
- **staff**: 人员/员工表
- **salary_records**: 工资记录表
- 等等...

## 关键文件说明

### 前端文件
| 文件 | 说明 |
|------|------|
| index.html | 单页应用主 HTML，包含所有表单和页面结构 |
| style.css | 自定义样式，包含移动端适配 |
| script.js | 未压缩源码，开发调试用 |
| app.min.js | 压缩版本，生产环境使用（带版本号缓存） |

### 后端文件
| 文件 | 说明 |
|------|------|
| routes.py | 所有 API 接口定义（/api/...） |
| auth.py | JWT 认证、登录/权限装饰器 |
| models.py | SQLAlchemy 数据模型 |

## 开发注意事项

1. **修改前端文件**
   - 修改 `script.js` 后需同步修改 `app.min.js`
   - 修改 CSS/JS 后需更新版本号强制刷新缓存
   - 版本号格式：`v=YYYYMMDD-appXX`

2. **常用操作**
   - 新增工单表单：`#workForm`
   - 待办工单表单：`#pendingForm`
   - 查询页面：`#queryTab`
   - 全局模态框：`#gModal` / `showModal()`

3. **移动端断点**
   - 主断点：768px（`max-width: 768px`）
   - 超小屏：480px

4. **数据库操作**
   - 使用 SQLite，文件在 `/app/data/worklog.db`
   - 备份文件在同目录

## 版本历史
- v2026.06 - 初始版本
- 2026-07-11 - 移动端布局优化、日期选择器美化、照片上传美化、模态框 BUG 修复
