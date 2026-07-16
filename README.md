# Worklog System (NAS 工单管理系统)

基于 Flask + Vue3 + Bootstrap 的工单管理系统，部署在 NAS Docker 容器中。

## 功能模块

- **工单管理**：施工记录、维修工单（含设备明细、费用明细）
- **收款管理**：收款记录、客户账单
- **客户管理**：客户信息、设备档案、360视图
- **员工管理**：员工信息、工资核算、状态管理
- **项目管理**：项目进度、合同金额、收款
- **库存管理**：物料出入库、库存预警
- **统计报表**：收支利润、客户分析
- **系统功能**：操作日志、自动备份、健康检查

## 技术栈

| 模块 | 技术 |
|------|------|
| 后端 | Flask + SQLAlchemy + SQLite + JWT |
| 前端 | Vue 3 (CDN) + Bootstrap 5 |
| 部署 | Docker (NAS 172.28.10.2:8085) |

## API 接口

- `POST /api/auth/login` - 登录认证
- `GET /api/health` - 系统健康检查
- `GET /api/dashboard` - 仪表盘数据
- `GET /api/customers/<id>/overview` - 客户360视图
- `GET /api/staffs` - 员工列表（支持状态过滤）
- `GET /api/operation-logs` - 操作日志（支持归档）

## 快速开始

```bash
# 启动后端
cd backend
pip install -r requirements.txt
python run.py

# 前端无需构建，直接访问
# http://localhost:8000/
```

## Docker 部署

```bash
docker run -d --name worklog -p 8085:8085 \
  -v /path/to/data:/app/data \
  worklog:latest
```
