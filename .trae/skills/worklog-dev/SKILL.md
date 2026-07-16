---
name: "worklog-dev"
description: "开发运维 NAS 上 worklog Docker 容器（Flask 工单系统）。当用户提到 worklog、NAS 工单系统、修改容器前端代码、移动端优化时自动调用。"
---

# Worklog 容器开发技能

## 概述

用于操作 NAS（172.28.10.2）上运行的 worklog Docker 容器（Flask 工单系统）。

## 连接信息

| 项目 | 值 |
|------|-----|
| NAS IP | 172.28.10.2 |
| SSH 用户名 | root |
| SSH 密码 | feng1021 |
| 容器名 | worklog |
| 服务端口 | 8085 |
| 登录账号 | admin / admin123 |

## 容器完整目录树

```
/app/
├── run.py                          # 入口
├── app/                            # 后端代码
│   ├── __init__.py                 # Flask 工厂 (url_prefix='/api')
│   ├── models.py                   # 所有数据模型 (~698行)
│   ├── routes.py                   # 所有路由 单体文件 (~4161行)
│   ├── auth.py                     # 认证工具
│   ├── static_handler.py           # 静态文件 + Jinja2 模板渲染
│   └── utils.py                    # 工具函数
├── frontend/                       # 前端代码
│   ├── index.html                  # 主页面 (~300KB)
│   ├── app.min.js                  # 压缩 JS (~118KB, 不可修改)
│   ├── script.js                   # 未压缩 JS (~149KB)
│   ├── style-app.css               # 当前使用的样式表 (~163KB)
│   ├── style.css                   # 老样式表 (~131KB, 不再使用)
│   ├── partials/                   # 前端分片目录
│   ├── css/bootstrap.min.css       # Bootstrap 5
│   ├── fonts/bootstrap-icons.css   # Bootstrap Icons
│   └── js/bootstrap.bundle.min.js  # Bootstrap JS
└── data/
    ├── worklog.db                  # SQLite 数据库
    ├── templates/repair_template.xlsx
    └── backups/                    # 代码+数据库备份
```

## 本地 ↔ 容器文件映射

| 本地文件 | 容器路径 | 说明 |
|----------|----------|------|
| `index.html` | `/app/frontend/index.html` | 直接覆盖 |
| `style-app.css` | `/app/frontend/style-app.css` | 直接覆盖（**不是** style.css） |
| `backend/models.py` | `/app/app/models.py` | 后端模型 |
| `backend/routes.py` | `/app/app/routes.py` | 后端路由 |

## SSH 连接（Paramiko，windows 下唯一可靠方案）

```python
import paramiko, os, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021')
sftp = ssh.open_sftp()

def upload(local_path, container_path):
    """上传文件到容器"""
    tmp = '/tmp/' + os.path.basename(local_path)
    sftp.put(local_path, tmp)
    ssh.exec_command(f'docker cp {tmp} worklog:{container_path}')

# 执行命令
def exec_cmd(cmd):
    _, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode(), stderr.read().decode()
```

## 部署流程

### 只改前端 → 无需重启容器

```python
upload('index.html', '/app/frontend/index.html')
upload('style-app.css', '/app/frontend/style-app.css')
# 浏览器 Ctrl+F5 刷新即可
```

### 改后端 → 必须重启容器

```python
# 1. 备份
exec_cmd('docker exec worklog cp /app/app/routes.py /app/app/routes.py.bak')
exec_cmd('docker exec worklog cp /app/app/models.py /app/app/models.py.bak')

# 2. 上传
upload('backend/routes.py', '/app/app/routes.py')
upload('backend/models.py', '/app/app/models.py')

# 3. 重启
exec_cmd('docker restart worklog')
time.sleep(10)
```

## CSS 修改规则

- 容器内当前使用的 CSS 文件是 **`style-app.css`**（不是 `style.css`）
- `style-app.css` 是多行格式（可正常编辑），**只能追加不能重写**
- 每次修改 CSS 后必须更新 `index.html` 中的版本号：`style-app.css?v=YYYYMMDD-vNN`
- 浏览器缓存强，必须 Ctrl+F5

## 容器内文件操作

```bash
# 搜索
docker exec worklog sh -c "grep -n 'keyword' /app/frontend/index.html"

# 文件大小
docker exec worklog sh -c "wc -c /app/frontend/index.html"

# 备份
docker exec worklog cp /app/frontend/index.html /app/frontend/index.html.YYYYMMDD-backup
```

## API 验证

容器内无 `curl`，用 Python urllib 验证。登录端点是 `POST /api/auth/login`。

## 易错点

1. **容器后端路径是 `/app/app/`**，不是 `/app/backend/`
2. **CSS 文件名是 `style-app.css`**，不是之前的 `style.css`
3. **容器内无 curl / sshpass**，只能用 Python urllib / paramiko
4. **app.min.js 不可修改**，是压缩文件
5. **后端 Python 修改后必须重启容器**
6. **apiFetch 返回 Response 对象**：`app.min.js` 中的 `apiFetch` 返回原生 `fetch` 的 Response 对象，不是自动解析的 JSON。`index.html` 中部署了全局包装器自动 `.json()`，并给返回对象附加 `.json()` 兼容方法。
7. **app.min.js 会覆盖 inline 函数**：详见下方"前端代码架构"章节。

## 前端代码架构

### 文件结构

| 文件 | 大小 | 说明 |
|------|------|------|
| `/app/frontend/index.html` | ~300KB, ~6400行 | 主页面，含全部 HTML + 内联 JS |
| `/app/frontend/app.min.js` | ~118KB, 1行 | 压缩 JS，核心框架（**不可修改**） |
| `/app/frontend/script.js` | ~149KB | 未压缩备份，**未被 index.html 引用** |
| `/app/frontend/style-app.css` | ~163KB | 当前使用的样式表 |

### Script 加载顺序

```
1. bootstrap.bundle.min.js     (Bootstrap 5)
2. index.html <script> 块       (行2261-4203, ~1944行内联JS)
   ├── 全局变量声明 (_customerList, _customerLoaded, paymentsPage 等)
   ├── 客户/收款/支出/物料/设备/巡检/统计/通知等页面函数
   ├── 保存 inline 函数引用
   └── </script>
3. <script> 保存 inline 函数     (行4205)
   ├── var _inlineLoadDashboard = window.loadDashboard;
   └── var _inlineShowCustomerDropdown = window.showCustomerDropdown;
4. app.min.js                   (行4207, 覆盖部分 inline 函数)
5. <script> 恢复 + 包装器        (行4208-4253)
   ├── 恢复 inline 版 loadDashboard 和 showCustomerDropdown
   ├── apiFetch 全局包装器 (自动 .json() + 兼容方法)
   └── switchTab 包装器 (扩展 tab 切换数据加载)
6. <script> 登录/主题/PWA        (行4257-末尾)
```

### app.min.js 定义的核心函数（130+）

app.min.js 是压缩后的框架代码，定义了大量全局函数：

| 分类 | 函数 |
|------|------|
| **认证** | `getToken`, `setToken`, `clearToken`, `restoreSession`, `doLogout` |
| **Tab切换** | `switchTab` |
| **工单** | `openNewWork`, `submitWorkRecord`, `editRecord`, `deleteRecord` |
| **客户** | `loadCustomers`, `selectCustomer`, `showCustomerDropdown`, `submitCustomer` |
| **员工** | `loadStaffs`, `submitStaff`, `deleteStaff` |
| **仪表盘** | `loadDashboard` |
| **待处理** | `loadPendingWorks`, `submitPendingWork`, `completePending` |
| **工资** | `loadSalaries`, `submitSalary`, `settleSalary` |
| **日历/统计** | `renderCalendar`, `loadCalendarData`, `loadStatistics` |
| **工具** | `apiFetch`, `escapeHtml`, `showModal`, `debounce` |

### index.html 中定义的独有函数

这些函数**只在 index.html 中定义**，app.min.js 中没有：

| 分类 | 函数 |
|------|------|
| **收款** | `loadPayments`, `loadPaymentStats`, `savePayment`, `deletePayment`, `onPaymentCustomerChange` |
| **支出** | `loadExpenses`, `loadExpenseCategories`, `saveExpense`, `deleteExpense` |
| **物料** | `loadMaterials`, `editMaterial`, `saveMaterial`, `saveStock`, `loadStockLogs` |
| **设备** | `loadEquipments`, `editEquipment`, `saveEquipment`, `deleteEquipment` |
| **巡检** | `loadMaintenancePlans`, `editMaintenance`, `saveMaintenance` |
| **项目** | `loadProjects`, `editProject`, `saveProject`, `deleteProject` |
| **模板** | `loadTemplates`, `editTemplate`, `saveTemplate`, `applyTemplate` |
| **统计** | `loadAdvancedStats` |
| **通知** | `loadNotifications`, `loadNotifySettings`, `saveNotifySettings` |
| **日志** | `loadOpLogs` |
| **批量** | `batchUpdateStatus`, `batchDeleteRecords` |

### 函数冲突（同名函数出现在两处）

| 函数 | app.min.js | index.html | 解决方案 |
|------|-----------|------------|----------|
| `loadDashboard` | ✅ 精简版（缺少 dsCustomerCount 等） | ✅ 完整版 | 保存/恢复 inline 版 |
| `switchTab` | ✅ 基础版（8个tab） | ✅ 扩展版 | 包装器扩展 |
| `showCustomerDropdown` | ✅ 基础版 | ✅ 扩展版 | 保存/恢复 inline 版 |
| `selectCustomer` | ✅ | ❌ | 无冲突 |

### apiFetch 包装器

`app.min.js` 的 `apiFetch` 返回原生 Response 对象，inline 函数期望拿到 JSON 数据。

**解决方案**（在 app.min.js 加载后部署）：
```javascript
(function(){
    var _orig = apiFetch;
    apiFetch = function(url, options) {
        return _orig(url, options).then(function(resp) {
            if (resp && typeof resp.json === 'function') {
                return resp.json().then(function(data) {
                    // 兼容 app.min.js 内部的 await r.json() 调用
                    if (data && typeof data === 'object') data.json = function() { return this; };
                    return data;
                });
            }
            return resp;
        });
    };
})();
```

### inline 函数保存/恢复模式

app.min.js 加载会覆盖 inline 版本的 `loadDashboard` 和 `showCustomerDropdown`。

**解决方案**：在 app.min.js 加载前保存，加载后恢复：
```html
<script>
var _inlineLoadDashboard = window.loadDashboard;
var _inlineShowCustomerDropdown = window.showCustomerDropdown;
</script>
<script src="app.min.js?v=..."></script>
<script>
if (typeof _inlineLoadDashboard === 'function') window.loadDashboard = _inlineLoadDashboard;
if (typeof _inlineShowCustomerDropdown === 'function') window.showCustomerDropdown = _inlineShowCustomerDropdown;
</script>
```

### switchTab 包装器

app.min.js 的 `switchTab` 只处理 8 个 tab，index.html 中定义了更多 tab 的数据加载函数。

**解决方案**：包装器在调用原始 switchTab 后，额外加载 index.html 中定义的 tab 数据：
```javascript
(function(){
    var origSwitchTab = window.switchTab;
    window.switchTab = function(tabId) {
        origSwitchTab.apply(this, arguments);
        setTimeout(function() {
            if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
            if (tabId === 'tab-expenses') { loadExpenses(); loadExpenseCategories(); }
            if (tabId === 'tab-materials') { loadMaterials(); }
            // ... 其他 tab
        }, 50);
    };
})();
```

### 开发新功能的原则

1. **不要修改 app.min.js**（压缩文件，不可维护）
2. **新功能代码放在 index.html 的内联 script 块中**（行2261-4203之间）
3. **如果新函数与 app.min.js 同名**，需要在 app.min.js 加载前保存、加载后恢复
4. **所有 apiFetch 调用**都能拿到 JSON 数据（包装器已处理）
5. **客户下拉用 `.customer-option` 类名**（app.min.js 生成），inline 版用 `.customer-dropdown-item`

## Dashboard API 字段

`/api/dashboard` 应返回：`today_count`, `today_records`, `urgent_pending`, `unpaid_amount`, `unpaid_salary`, `month_payment`, `month_expense`, `month_profit`, `low_stock_count`, `customer_count`, `active_project_count`, `recent_payments`, `recent_expenses`, `top_customers`
