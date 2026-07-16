# 切换到模块化 Blueprints 指南

> 目标：将 `backend/routes.py`（单体大文件 ~263KB）切换为 `backend/blueprints/` 模块化路由，提升可维护性。  
> 适用仓库：`feng-fei/worklog-system`  
> 编写日期：2026-07-17

---

## 一、当前状态分析

### 1.1 注册逻辑（`backend/__init__.py`）

```python
# 方式一：传统单体路由（默认启用）
from .routes import api_bp
app.register_blueprint(api_bp, url_prefix='/api')

# 方式二：模块化蓝图（需环境变量开启）
if os.environ.get('USE_MODULAR_BLUEPRINTS', 'false').lower() == 'true':
    from .blueprints import (
        auth_bp, records_bp, pending_bp, customers_bp, staffs_bp,
        finance_bp, projects_bp, materials_bp, templates_bp,
        statistics_bp, system_bp
    )
    app.register_blueprint(auth_bp, url_prefix='/api')
    # ... 其他蓝图
```

**注意**：注释里写着「启用后会与单体路由路径冲突，需同时移除单体路由注册」。实际代码中两者可以同时注册，但**路径会冲突**（后注册的会覆盖前注册的，或产生重复路由警告）。

### 1.2 Blueprints 目录结构

```
backend/blueprints/
├── __init__.py              # 定义所有 Blueprint 对象 + import 各 *_routes
├── auth_routes.py
├── records_routes.py        # 最大，含工单 CRUD、导出、日历、批量等
├── pending_routes.py
├── customers_routes.py
├── staffs_routes.py
├── finance_routes.py
├── projects_routes.py
├── materials_routes.py
├── templates_routes.py
├── statistics_routes.py
└── system_routes.py
```

### 1.3 关键发现（切换前必须知晓）

| 问题 | 说明 | 风险等级 |
|------|------|----------|
| **前后端数据格式不一致** | Vue 前端 `RecordCreate` 使用 **JSON body** + 独立 `/api/upload` 上传照片；而 `records_routes.py` 的 `create_record` 仍按旧版 **multipart/form-data**（`request.form` + `request.files`）编写 | **高** |
| 路由覆盖完整性 | 蓝图已覆盖大部分核心路由，但单体 `routes.py` 可能有后期新增接口未同步到蓝图 | 中 |
| 共享工具函数 | 权限过滤 `_apply_record_permission`、同步工资 `_sync_salary_records_for_work`、设备明细 `_sync_equipment_details` 等均从 `..utils` 导入，目前可用 | 低 |
| 同时注册冲突 | 直接开 `USE_MODULAR_BLUEPRINTS=true` 而不注释单体注册，会出现路由重复 | 中 |

---

## 二、推荐切换步骤（安全渐进式）

### 阶段 0：准备工作（必做）

1. **备份当前代码与数据库**
   ```bash
   # 在本地或 NAS 上
   cp -r /path/to/worklog-system /path/to/worklog-system.bak.$(date +%Y%m%d)
   # 数据库（SQLite）也备份
   cp /path/to/data/worklog.db /path/to/data/worklog.db.bak
   ```

2. **确认当前运行版本**  
   访问系统，记录几个关键接口是否正常（登录、新建工单、工单列表、上传照片、项目详情）。

3. **本地克隆最新代码**，在本地做切换测试（强烈建议先在本地跑通，再推到 NAS）。

### 阶段 1：完善 Blueprints（核心工作）

#### 1.1 修复工单创建/更新的数据格式兼容

当前最大障碍是 `create_record` / `update_record` 与 Vue 前端不匹配。

**建议改造方向（推荐 JSON 优先）**：

```python
# records_routes.py 示例思路
@records_bp.route('/records', methods=['POST'])
@login_required
def create_record():
    try:
        # 同时支持 JSON 和 form-data
        if request.is_json:
            data = request.get_json() or {}
            # 从 data 取字段
            customer_name = data.get('customer_name')
            # 照片已通过 /api/upload 上传，直接用 data.get('work_photos') 或列表
            photo_paths = data.get('work_photos') or []
            if isinstance(photo_paths, list):
                photo_paths = ','.join([p.get('url') if isinstance(p, dict) else p for p in photo_paths])
        else:
            # 兼容旧 multipart
            data = request.form
            customer_name = data.get('customer_name')
            # ... 原有 files 处理逻辑
            ...

        # 后续统一用 data.get() 取值
        ...
```

同样改造 `PUT /records/<id>`。

**或者更干净的做法**：
- 彻底让蓝图只支持 JSON body。
- 照片统一走 `/api/upload`（已存在）。
- 删除旧 multipart 照片处理逻辑（减少重复代码）。

#### 1.2 检查所有蓝图路由是否完整

建议用脚本或手动对比：

```bash
# 提取单体路由
grep -E "@api_bp\.route\(" backend/routes.py | sort > /tmp/mono_routes.txt

# 提取所有蓝图路由
grep -E "@\w+_bp\.route\(" backend/blueprints/*.py | sort > /tmp/bp_routes.txt

# 对比差异
diff /tmp/mono_routes.txt /tmp/bp_routes.txt
```

重点关注：
- `/api/dashboard`
- `/api/upload`
- `/api/health`
- 财务相关统计接口
- 项目阶段更新、工资结算等
- 操作日志清理、备份相关

缺失的路由需要补到对应蓝图文件中。

#### 1.3 统一权限与工具函数

确认以下函数都在 `utils.py` 或可被所有蓝图正确导入：
- `login_required` / `admin_required`（auth.py）
- `_apply_record_permission` / `_can_access_record`
- `_sync_salary_records_for_work`
- `_sync_equipment_details` / `_adjust_material_stock`
- `_log_operation` / `_create_notification`
- `_generate_record_no` / `_validate_status_transition`
- `create_token` / `get_login_user_name` 等

如果有函数仍写在 `routes.py` 里，请迁移到 `utils.py`。

### 阶段 2：切换注册方式

修改 `backend/__init__.py`：

```python
# ========== 推荐最终写法 ==========
USE_MODULAR = os.environ.get('USE_MODULAR_BLUEPRINTS', 'false').lower() == 'true'

if USE_MODULAR:
    from .blueprints import (
        auth_bp, records_bp, pending_bp, customers_bp, staffs_bp,
        finance_bp, projects_bp, materials_bp, templates_bp,
        statistics_bp, system_bp
    )
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(records_bp, url_prefix='/api')
    app.register_blueprint(pending_bp, url_prefix='/api')
    app.register_blueprint(customers_bp, url_prefix='/api')
    app.register_blueprint(staffs_bp, url_prefix='/api')
    app.register_blueprint(finance_bp, url_prefix='/api')
    app.register_blueprint(projects_bp, url_prefix='/api')
    app.register_blueprint(materials_bp, url_prefix='/api')
    app.register_blueprint(templates_bp, url_prefix='/api')
    app.register_blueprint(statistics_bp, url_prefix='/api')
    app.register_blueprint(system_bp, url_prefix='/api')
    print("✅ 已启用模块化 Blueprints")
else:
    from .routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    print("✅ 使用传统单体 routes.py")
```

**切换方式**：
- 本地测试：`export USE_MODULAR_BLUEPRINTS=true` 后启动
- Docker / NAS：在 `docker-compose.yml` 或启动脚本中加环境变量  
  ```yaml
  environment:
    - USE_MODULAR_BLUEPRINTS=true
  ```

### 阶段 3：验证清单（必须全部通过）

启动后按以下顺序测试：

1. **基础**
   - [ ] `/api/health` 或登录接口返回正常
   - [ ] 登录成功，拿到 token
   - [ ] `/api/auth/me` 正确

2. **工单核心**
   - [ ] 新建工单（JSON + 已上传照片 URL）成功
   - [ ] 工单列表分页、筛选正常
   - [ ] 工单详情、编辑、删除
   - [ ] 状态流转合法校验
   - [ ] 批量操作
   - [ ] 导出 CSV / PDF

3. **关联业务**
   - [ ] 客户 CRUD + 360 视图
   - [ ] 员工、账号管理
   - [ ] 项目创建、阶段更新、关联工单/费用/工资
   - [ ] 物料出入库 + 库存预警
   - [ ] 收款、支出、工资结算
   - [ ] 待办、维护计划、模板应用
   - [ ] 仪表盘数据、日历、统计报表

4. **系统功能**
   - [ ] 操作日志查询与清理
   - [ ] 备份创建/下载/恢复
   - [ ] 通知中心
   - [ ] 系统设置

5. **权限**
   - [ ] worker 角色只能看到自己相关数据
   - [ ] adminOnly 路由对普通用户拦截

### 阶段 4：清理与固化

1. 确认蓝图完全稳定后，可考虑：
   - 把 `routes.py` 重命名为 `routes.py.bak` 或移到 `archive/`
   - 默认把 `USE_MODULAR_BLUEPRINTS` 改为 `true`（或直接硬编码使用蓝图）
2. 更新 README 和 SKILL.md 中的相关说明。
3. 提交 git，打 tag（如 `v3.x-blueprints`）。

---

## 三、额外建议

### 3.1 短期（切换期间）

- 在蓝图入口文件顶部加版本注释，方便排查：
  ```python
  # records_routes.py - 模块化版本，支持 JSON + 兼容 form-data
  ```
- 日志中打印当前使用的是哪套路由，方便线上确认。

### 3.2 中期优化

- 把共享业务逻辑（状态机校验、费用重算、库存调整、工资同步）进一步抽到 `services/` 目录，蓝图只负责参数解析与响应。
- 给关键接口补简单的单元测试（pytest + Flask test client）。
- 统一错误返回格式：`{"error": "...", "code": "xxx"}`。

### 3.3 风险控制

- **不要在生产环境直接改环境变量后重启**。先在本地/测试容器完整跑通验证清单。
- 如果切换后出现 404 或参数错误，第一时间把 `USE_MODULAR_BLUEPRINTS` 改回 `false` 回滚。
- 工单创建失败时重点看后端日志里是否还在用 `request.form`。

---

## 四、快速回滚命令

```bash
# Docker 环境示例
export USE_MODULAR_BLUEPRINTS=false
docker compose down && docker compose up -d

# 或直接改 docker-compose.yml 后重建
```

---

## 五、给本地 AI 的提示词建议

你可以把下面这段话一起喂给本地 AI：

> 请根据 `switch-to-blueprints.md` 文档，帮我完成以下工作：  
> 1. 检查 `backend/blueprints/records_routes.py` 的 create/update 是否支持当前 Vue 前端发送的 JSON 格式（含 work_photos 数组）。  
> 2. 如不支持，给出最小改动的兼容补丁（优先支持 JSON，同时兼容 form-data）。  
> 3. 对比 `routes.py` 与所有 blueprints，列出缺失的路由清单。  
> 4. 给出最终修改后的 `__init__.py` 注册代码。  
> 要求：保持现有业务逻辑不变，只做结构迁移与格式兼容。

---

**完成以上步骤后，系统将正式运行在模块化蓝图架构上，后续新增功能可直接写在对应 `*_routes.py`，维护成本大幅降低。**

如有具体蓝图文件需要我进一步拆解或写补丁代码，请继续告知。