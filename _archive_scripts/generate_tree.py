
import os

def generate_tree(startpath, exclude_dirs=None, exclude_files=None, exclude_patterns=None, prefix=""):
    if exclude_dirs is None:
        exclude_dirs = ['__pycache__', '.git', 'node_modules', 'backups']
    if exclude_files is None:
        exclude_files = ['.DS_Store']
    if exclude_patterns is None:
        exclude_patterns = ['*.pyc', '*.split_backup']
    
    lines = []
    items = sorted(os.listdir(startpath))
    
    # 过滤掉排除的目录和文件
    filtered_items = []
    for item in items:
        item_path = os.path.join(startpath, item)
        if os.path.isdir(item_path):
            if item not in exclude_dirs and not item.startswith('.'):
                filtered_items.append(item)
        else:
            excluded = False
            # 精确文件名匹配
            if item in exclude_files:
                excluded = True
            # 通配符模式匹配
            for pat in exclude_patterns:
                if pat.startswith('*'):
                    if item.endswith(pat[1:]):
                        excluded = True
                        break
                elif pat == item:
                    excluded = True
                    break
            if not excluded and not item.startswith('.'):
                filtered_items.append(item)
    
    for i, item in enumerate(filtered_items):
        item_path = os.path.join(startpath, item)
        is_last = (i == len(filtered_items) - 1)
        
        connector = "└── " if is_last else "├── "
        lines.append(prefix + connector + item)
        
        if os.path.isdir(item_path):
            extension = "    " if is_last else "│   "
            sub_lines = generate_tree(item_path, exclude_dirs, exclude_files, exclude_patterns, prefix + extension)
            lines.extend(sub_lines)
    
    return lines

def format_size(size):
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size/1024:.1f} KB"
    else:
        return f"{size/(1024*1024):.1f} MB"

# 生成目录树
tree_lines = generate_tree('/app')

# 统计各模块文件
routes_dir = '/app/app/routes'
js_dir = '/app/frontend/js'

routes_files = []
if os.path.isdir(routes_dir):
    for f in sorted(os.listdir(routes_dir)):
        if f.endswith('.py') and not f.endswith('.split_backup'):
            fpath = os.path.join(routes_dir, f)
            size = os.path.getsize(fpath)
            routes_files.append((f, size))

js_files = []
if os.path.isdir(js_dir):
    for f in sorted(os.listdir(js_dir)):
        if f.endswith('.js') and not f.endswith('.min.js') and not f.endswith('.split_backup'):
            fpath = os.path.join(js_dir, f)
            size = os.path.getsize(fpath)
            js_files.append((f, size))

# 生成 Markdown 内容
content = f"""# Worklog 工单系统 - 项目目录树

## 项目概述
Worklog 是基于 Flask + SQLite 的工单管理系统，支持工单创建、查询、待办处理、工资管理等功能，采用响应式设计，适配移动端。

## 运行环境
- **容器**: Docker (worklog)
- **后端**: Python Flask + SQLAlchemy（模块化路由）
- **前端**: 原生 JS + Bootstrap 5（模块化拆分）
- **数据库**: SQLite
- **端口**: 8085

## 目录结构

```
/app/
"""

for line in tree_lines:
    content += line + "\n"

content += """```

> **说明**: 目录树中已隐藏 `.split_backup` 备份文件（代码拆分前的原始文件备份）。

## 后端模块说明

### 路由模块（app/routes/）
后端采用 Flask Blueprint 模块化架构，将原有的单文件 routes.py 拆分为 12 个功能模块：

| 文件 | 功能说明 | 主要接口 |
|------|---------|---------|
"""

for fname, fsize in routes_files:
    if fname == '__init__.py':
        desc = '蓝图注册入口，统一管理所有路由模块'
        apis = 'register_blueprints()'
    elif fname == 'auth_routes.py':
        desc = '用户认证模块'
        apis = '登录、修改密码、获取用户信息'
    elif fname == 'customers_routes.py':
        desc = '客户管理模块'
        apis = '客户增删改查、搜索'
    elif fname == 'staff_routes.py':
        desc = '员工管理模块'
        apis = '员工增删改查'
    elif fname == 'records_routes.py':
        desc = '工作记录管理模块'
        apis = '工单增删改查、状态更新'
    elif fname == 'pending_routes.py':
        desc = '待办事项模块'
        apis = '待办增删改查、完成状态'
    elif fname == 'salary_routes.py':
        desc = '工资记录模块'
        apis = '工资记录增删改查、结算'
    elif fname == 'statistics_routes.py':
        desc = '统计数据模块'
        apis = '月度统计、人员统计'
    elif fname == 'export_routes.py':
        desc = '导出功能模块'
        apis = 'CSV导出、PDF导出'
    elif fname == 'files_routes.py':
        desc = '文件上传模块'
        apis = '照片上传、文件访问'
    elif fname == 'settings_routes.py':
        desc = '系统设置模块'
        apis = '设置获取、保存'
    elif fname == 'backup_routes.py':
        desc = '数据库备份模块'
        apis = '备份列表、创建、恢复、删除'
    elif fname == 'dashboard_routes.py':
        desc = '仪表盘模块'
        apis = '日历数据、工作台数据'
    else:
        desc = '功能模块'
        apis = '-'
    
    content += f"| {fname} | {desc} | {apis} |\n"

content += f"""
### 核心后端文件
| 文件 | 说明 |
|------|------|
| app/__init__.py | Flask 应用初始化，注册蓝图 |
| app/auth.py | JWT 认证、登录/权限装饰器 |
| app/models.py | SQLAlchemy 数据模型定义 |
| app/utils.py | 工具函数 |
| app/static_handler.py | 静态文件处理 |
| run.py | 应用启动入口 |

### 后端模块调用关系
```
run.py → app/__init__.py → app/routes/__init__.py → 各 *_routes.py
                          → app/auth.py
                          → app/models.py
                          → app/utils.py
```

## 前端模块说明

### JS 模块（frontend/js/）
前端采用模块化拆分，将原有的单文件 script.js 拆分为 11 个功能模块 + 1 个入口文件：

| 文件 | 功能说明 | 主要函数/变量 |
|------|---------|-------------|
"""

for fname, fsize in js_files:
    if fname == 'bootstrap.bundle.min.js':
        continue
    elif fname == 'common.js':
        desc = '公共工具函数和 API 封装'
        funcs = 'apiFetch, showModal, todayStr, formatMoney, escapeHtml'
    elif fname == 'auth.js':
        desc = '认证模块'
        funcs = 'login, logout, restoreSession, showLoginPage, initLoginForm'
    elif fname == 'dashboard.js':
        desc = '仪表盘/工作台模块'
        funcs = 'loadDashboard, renderCalendar, initDashboardTabs'
    elif fname == 'customers.js':
        desc = '客户管理模块'
        funcs = 'loadCustomers, addCustomer, editCustomer, deleteCustomer'
    elif fname == 'staff.js':
        desc = '员工管理模块'
        funcs = 'loadStaffs, addStaff, editStaff, deleteStaff'
    elif fname == 'records.js':
        desc = '工作记录模块'
        funcs = 'loadRecords, submitWorkRecord, queryRecords, openRecordDetail'
    elif fname == 'pending.js':
        desc = '待办事项模块'
        funcs = 'loadPendingWorks, addPendingWork, completePendingWork'
    elif fname == 'salary.js':
        desc = '工资管理模块'
        funcs = 'loadSalaryRecords, addSalaryRecord, settleSalary'
    elif fname == 'statistics.js':
        desc = '统计模块'
        funcs = 'loadStatistics, renderStatsChart'
    elif fname == 'settings.js':
        desc = '系统设置模块'
        funcs = 'loadSettings, saveSettings, loadBackups, createBackup'
    elif fname == 'photos.js':
        desc = '照片上传管理模块'
        funcs = 'uploadPhoto, deletePhoto, renderPhotoPreview'
    elif fname == 'app.js':
        desc = '应用入口和初始化'
        funcs = 'DOMContentLoaded 事件、导航切换、全局事件绑定'
    else:
        desc = '功能模块'
        funcs = '-'
    
    content += f"| {fname} | {desc} | {funcs} |\n"

content += f"""
### 前端核心文件
| 文件 | 说明 |
|------|------|
| frontend/index.html | 单页应用主 HTML，包含所有页面结构 |
| frontend/style.css | 自定义样式，包含移动端适配 |
| frontend/manifest.json | PWA 应用清单 |
| frontend/sw.js | Service Worker（PWA 离线支持） |
| frontend/css/bootstrap.min.css | Bootstrap 5 样式 |
| frontend/fonts/ | Bootstrap 图标字体 |

### JS 加载顺序
1. bootstrap.bundle.min.js（Bootstrap 框架）
2. common.js（公共工具）
3. photos.js（照片管理）
4. staff.js（员工管理）
5. customers.js（客户管理）
6. records.js（工单记录）
7. pending.js（待办事项）
8. salary.js（工资管理）
9. statistics.js（统计）
10. settings.js（系统设置）
11. dashboard.js（仪表盘）
12. auth.js（认证）
13. app.js（应用入口）

### 前端模块依赖关系
```
app.js（入口）
  ├── common.js（基础工具，所有模块依赖）
  ├── auth.js（认证）
  ├── dashboard.js（仪表盘）
  │   ├── records.js
  │   ├── pending.js
  │   └── staff.js
  ├── records.js（工单）
  │   ├── customers.js
  │   ├── staff.js
  │   └── photos.js
  ├── pending.js（待办）
  │   ├── customers.js
  │   └── staff.js
  ├── salary.js（工资）
  │   └── staff.js
  ├── customers.js（客户）
  ├── staff.js（员工）
  ├── statistics.js（统计）
  ├── settings.js（设置）
  └── photos.js（照片）
```

## 数据库表结构
- **worker_users** - 用户表（登录账号）
- **work_records** - 工单记录表
- **customers** - 客户表
- **staff** - 人员/员工表
- **salary_records** - 工资记录表
- **pending_works** - 待办事项表
- **system_settings** - 系统设置表

## API 接口一览

### 认证
- POST /api/auth/login - 登录
- POST /api/auth/change-password - 修改密码
- GET /api/auth/me - 获取当前用户信息

### 工单
- GET /api/records - 查询工单列表
- GET /api/records/:id - 获取工单详情
- POST /api/records - 创建工单
- PUT /api/records/:id - 更新工单
- DELETE /api/records/:id - 删除工单

### 待办
- GET /api/pending-works - 待办列表
- POST /api/pending-works - 创建待办
- PUT /api/pending-works/:id - 更新待办
- POST /api/pending-works/:id/complete - 完成待办

### 客户
- GET /api/customers - 客户列表
- POST /api/customers - 创建客户
- PUT /api/customers/:id - 更新客户
- DELETE /api/customers/:id - 删除客户

### 工资
- GET /api/salary - 工资记录
- POST /api/salary - 添加工资记录

### 统计
- GET /api/statistics/monthly - 月度统计
- GET /api/statistics/staff - 人员统计

### 导出
- GET /api/export/csv - CSV 导出
- GET /api/export/pdf - PDF 导出

### 文件
- POST /api/upload - 文件上传
- GET /api/photos/:filename - 照片访问

### 设置
- GET /api/settings - 获取设置
- PUT /api/settings - 保存设置

### 备份
- GET /api/backups - 备份列表
- POST /api/backups - 创建备份
- POST /api/backups/:id/restore - 恢复备份
- DELETE /api/backups/:id - 删除备份

### 仪表盘
- GET /api/dashboard/summary - 工作台汇总
- GET /api/dashboard/calendar - 日历数据

## 开发规范

### 版本号规则
- CSS 版本号：v=YYYYMMDD-appXX（如 v=20260711-app49）
- JS 版本号：同上，与 CSS 保持同步
- 修改前端文件后必须更新版本号，强制浏览器刷新缓存

### 移动端断点
- 主断点：768px（max-width: 768px）
- 超小屏：480px

### 常用全局函数
- showModal(title, bodyHtml) - 显示全局模态框
- apiFetch(url, options) - 封装的 fetch 请求（自动带 token）
- openRecordDetail(id) - 打开工单详情
- queryRecords() - 查询工单列表
- todayStr() - 获取今天日期字符串（YYYY-MM-DD）

### 前端页面结构
- 工作台（Dashboard）- #tab-dashboard
- 新增工单 - #addWork / #tab-work
- 待办事项 - #pendingTab / #tab-pending
- 工单查询 - #queryTab / #tab-query
- 工资管理 - #salaryTab / #tab-salary

## 版本历史
- v2026.05 - 初始版本
- v2026.06 - 功能完善版本
- 2026-07-11 - 移动端布局优化、日期选择器美化、照片上传美化、模态框 BUG 修复
- 2026-07-11 - **代码模块化拆分**：后端 routes.py 拆分为 12 个 Blueprint 模块，前端 script.js 拆分为 11 个功能模块
"""

# 写入文件
output_path = '/app/PROJECT_TREE.md'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ 目录树文件已生成：{output_path}")
print(f"文件行数：约 {len(content.splitlines())} 行")
print(f"文件大小：{format_size(len(content.encode('utf-8')))}")
print()
print("📋 包含内容：")
print("  - 完整目录树结构")
print("  - 后端 12 个路由模块说明")
print("  - 前端 12 个 JS 模块说明")
print("  - 模块依赖关系图")
print("  - API 接口一览")
print("  - 数据库表结构")
print("  - 开发规范")
