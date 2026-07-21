# worklog-system 地毯式全盘诊断报告（本地 AI 可执行版）

> **诊断基准**  
> - 仓库：https://github.com/feng-fei/worklog-system  
> - 分支：`feature/modern-tech-ui`  
> - HEAD：`89725c3`（fix: 侧边栏收起图标截断）  
> - 核心大修：`2af60ff`（+3638 / -968，数据通路 + 多端 UI）  
> - 诊断范围：`frontend-vue` + `backend`（对照历史 `frontend-web` 能力）  
> - 维度：UI · 后端 · 功能/数据 · 多端 · 架构/其它  
> - 日期：2026-07-22  

**使用方式**：整份交给本地 AI，按「已修复确认 → 残留 P0 → 分批任务」执行；每批输出改动文件与三端自测结果。

---

## 0. 执行摘要

| 维度 | 上次(33c1cca) | 本次(89725c3) | 说明 |
|------|---------------|---------------|------|
| 数据通路致命 Bug | 2/10 | **7/10** | 照片/字段/type/员工/地址已修；仍有日期解析与支出字段落库缺口 |
| 移动端 UI | 5/10 | **7.5/10** | Dashboard/列表/新建大幅改善 |
| 桌面端 UI | 4/10 | **7/10** | Sidebar 折叠、AppHeader、分栏详情已有 |
| 业务覆盖 | 5/10 | **7/10** | 新增 Finance/Equipment/ProjectDetail/CreateProject |
| 架构 | 3/10 | **6/10** | 统一 frontend-vue 部署方向明确；历史 web 可能仍在仓库 |
| **上线建议** | 否 | **有条件试运行** | 须先修 **work_date 解析** 与 **支出经手人落库**，再小范围试用 |

### 相对上次报告：已修复项（勿重复劳动）

| 原编号 | 问题 | 状态 | 证据 |
|--------|------|------|------|
| F-01 | PhotoUpload 误调 create | ✅ 已修 | `recordsApi.uploadPhotos` + 后端 `POST /records/upload` |
| F-02 | 新建字段名错位 | ✅ 已修 | `contact_name/customer_phone/work_address/labor_fee/transport_fee/fault_*` |
| F-03 | record_type→maintenance | ✅ 已修 | `project/short→construction`，`repair→repair` |
| F-04 | 费用丢字段（前端） | ✅ 前端已完整 JSON | 仍见后端 Expense 未写 staff_name/票据 |
| F-05 | staffList 空 | ✅ 已修 | `staffsApi.list` |
| F-06 | 列表 address | ✅ 应已兼容 | 需抽测 `work_address \|\| address` |
| D01–D03 | Dashboard 假数据/不可点 | ✅ 已修 | 真实 pending + 统计跳转 |
| N01–N02 | Header 空点击/假红点 | ✅ 声称已修 | 需联调 unreadCount |
| C03–C07 | 人员/项目/Select/模板 | ✅ 已修 | Dialog + 搜索下拉 + Select + 禁 prompt |
| 布局 P0 | BottomNav/Sidebar/FAB | ✅ 大部已修 | 侧栏收起截断已再修 89725c3 |

---

## 1. 架构现状

### 1.1 前端

- **主前端**：`frontend-vue`（shadcn-vue + Tailwind，统一根路径 `/`）
- **页面（views，22 个）**：  
  Login / Dashboard / Records / RecordDetail / CreateRecord /  
  Pending / PendingDetail / CreatePending /  
  Customers / CustomerDetail / CreateCustomer /  
  Materials / MaterialDetail / Staffs /  
  Projects / ProjectDetail / CreateProject /  
  Finance / Equipment / Notifications / Profile / Statistics  
- **新增能力组件**：Skeleton、EmptyState、ui/select、ExpenseRecorder、PhotoUpload  

### 1.2 后端

- Blueprints：records / pending / customers / materials / staffs / projects / finance / statistics / system / templates / auth  
- 工单创建：费用项、expense_items、项目支出/工资同步、未完成维修转待办、权限过滤  
- **已新增**：`POST /api/records/upload`  

### 1.3 部署

- 方向：Flask 静态服务 `frontend-vue/dist`，不再依赖 `/m/`  
- 注意：构建产物与 Docker 复制路径必须与当前统一前端一致  

---

## 2. 残留致命 / 高优问题（代码级）

### P0-1：`work_date` 格式不兼容 — 填了预约时间可能直接 500

**前端**（`CreateRecordView.vue`）：

```html
<input type="datetime-local" v-model="form.work_date" />
```

提交：

```ts
submitData.append('work_date', form.value.work_date)  // 可能是 2026-07-22T14:30
```

**后端**（`create_record` / `update_record`）：

```python
work_date = datetime.strptime(work_date_str, '%Y-%m-%d') if work_date_str else datetime.now()
```

**表现**：用户一旦选择日期时间，创建失败（strptime ValueError → 500）。

**修复（二选一或双修）**：

1. 前端提交前：`work_date.slice(0, 10)`  
2. 后端兼容：

```python
def parse_work_date(s):
    if not s:
        return datetime.now()
    s = s.strip().replace('T', ' ')
    for fmt in ('%Y-%m-%d %H:%M', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
        try:
            return datetime.strptime(s[:19] if len(s) > 10 else s, fmt)
        except ValueError:
            continue
    return datetime.now()
```

---

### P0-2：支出 `staff_name` / `receipt_photos` 后端未落库

**前端** `ExpenseRecorder` 提交结构含：

- `expense_type` / `category` / `amount` / `description` / `staff_name` / `receipt_photos` / `expense_date`

**后端** 创建 Expense 时：

```python
expense = Expense(
    category_id=...,
    category=...,
    title=...,
    amount=...,
    expense_date=...,
    remark=exp_desc,
    record_id=...,
    project_id=...,
    ...
)
# 未写入 staff_name / receipt_photos（若模型有字段）
```

且 `category` 前端传字符串 `'material'`，后端试图 `int(cat_id)` 失败变 `None`，category 列可能变成空/乱。

**修复**：

1. 查 `Expense` 模型是否有 `staff_name`、`receipt_photos`（或 `photos`）；有则赋值  
2. category 映射：字符串类型 → 分类名或 category_id 查表  
3. 票据路径 JSON 序列化入库  

---

### P0-3：Step1 校验错误条未展示

`nextStep` 在 step===1 时设 `errorMsg`，但 **step===1 模板无 errorMsg 条**（仅 step2/3 有）。

**表现**：未填客户点下一步，可能无可见提示（仅靠按钮 disabled）。

**修复**：step1 顶部复用与 step2 相同错误条。

---

### P1-1：列表搜索参数可能对不齐

前端列表常用 `keyword`；后端 records 列表主过滤是 `customer_name` / `staff_name` / `status` 等。

**修复**：前端 `params.keyword` 映射为 `customer_name`，或后端增加：

```python
keyword = request.args.get('keyword')
if keyword:
    query = query.filter(or_(
        WorkRecord.customer_name.like(f'%{keyword}%'),
        WorkRecord.order_no.like(f'%{keyword}%'),
        WorkRecord.work_address.like(f'%{keyword}%'),
        WorkRecord.work_content.like(f'%{keyword}%'),
    ))
```

---

### P1-2：本地预览照片不会随工单提交

PhotoUpload 上传失败时写入 `localPreviews`（DataURL），但 **create 只提交 `workPhotos` URL 数组**，本地预览不会带上。

**修复**：提交前若仍有 localPreviews，先 upload 再 append；或禁止「仅本地预览」状态点提交。

---

### P1-3：新建页表单 Card 仍强制 hover 上浮

`CreateRecordView` scoped 仍有：

```css
:deep([data-slot="card"]:hover) {
  transform: translateY(-6px) scale(1.01);
}
```

与「表单禁止上浮」冲突，表单像可点击块。

**修复**：表单页去掉 hover transform，或仅 `.card-interactive` 启用。

---

### P1-4：项目施工支出同步路径偏旧

`_sync_project_expenses_and_salary` 主要吃 `fee_items`（中文 type），前端现走 `expense_items`。  
有 `project_id` 时，项目侧 `ProjectExpense` 可能**不同步**日常 Expense 已写、项目核算缺项。

**修复**：create 时若 `project_id`，对每个 `expense_item` 同步 `ProjectExpense`（类型映射 material→material 等）。

---

### P1-5：Finance / Statistics 深度不足

- `FinanceView` / `StatisticsView` 存在但能力可能弱于历史 frontend-web（发票、工资结算、多维报表）  
- Dashboard 快捷入口已指向 `/finance`，需保证路由与 API 真通  

---

### P2 体验与架构

| ID | 问题 |
|----|------|
| P2-1 | 模板仍 localStorage，未接 `/templates` API |
| P2-2 | 工单编辑页是否齐全（仅详情+状态？） |
| P2-3 | 双前端目录若仍存在需标注废弃或删除 |
| P2-4 | 后端大量 `str(e)` 回前端，生产应脱敏 |
| P2-5 | 缺创建工单契约测试（字段快照） |
| P2-6 | 光效/深色对比度、无障碍仍可打磨 |
| P2-7 | 侧栏折叠状态与主内容 padding 在极端宽度需再测（89725c3 已修截断） |

---

## 3. UI / 多端预演（当前代码）

### 3.1 布局

| 项 | 手机 | 平板 | 桌面 | 结论 |
|----|------|------|------|------|
| BottomNav | 有 | 视断点 | 无 | 符合 |
| Sidebar 折叠 | 无 | 可折叠 | 展开/收起 | 截断已修，需实机确认 |
| AppHeader | 弱/MobileHeader | 中 | 全功能 | 声称完成 |
| 新建独立顶栏 | 有 | 有 | 左步骤+右表单 | 良好 |
| FAB/底栏遮挡 | 列表页需抽测 pb | — | 无 FAB | 抽测 |

### 3.2 工作台

- ✅ 真实统计 + 最近工单 + 最近待办  
- ✅ 统计卡跳转 records/pending/customers/finance  
- ✅ 8 快捷入口（含财务/设备/项目）  
- ⚠️ 加载态仍 Spinner，可换 Skeleton  

### 3.3 工单列表

- 状态 Tab、搜索防抖、卡片/表 — 提交说明已做  
- ⚠️ keyword 与后端对齐（P1-1）  
- ⚠️ 地址字段抽测  

### 3.4 新建工单

- ✅ 三类型、三步、人员 Dialog、项目搜索、费用分组、利润预估、Select、模板 Dialog  
- ❌ work_date datetime 炸后端（P0-1）  
- ❌ Step1 错误条（P0-3）  
- ⚠️ 表单 Card hover（P1-3）  
- ⚠️ 本地预览不入库（P1-2）  

### 3.5 详情

- 桌面左右分栏、照片查看 — 提交说明已做；需抽测照片 URL、支出列表展示是否含经手人  

---

## 4. 后端专项

### 4.1 已对齐

- upload 独立接口  
- create 字段名与前端一致  
- expense_items 循环写入 Expense  
- staff_names JSON 序列化工具  

### 4.2 风险点

1. **work_date 只认 `%Y-%m-%d`**  
2. **Expense 分类/经手人/票据** 映射不全  
3. **项目核算** 仍偏 `fee_items` 旧协议  
4. 列表无统一 `keyword`  
5. create 成功后「status=pending 且 not completed」可能额外建 PendingWork — 确认产品是否每次新建都生成待办（可能噪音）  

```python
if (... ) or (status == 'pending' and not is_completed):
    pending = PendingWork(...)
```

默认 status=`pending` → **每次新建工单都可能自动插一条待办**。若非产品意图，应改为仅 repair incomplete 或显式 flag。

---

## 5. 功能流预演

| 流程 | 预期 | 当前代码预判 |
|------|------|----------------|
| 登录 → 工作台 | 真数据 | 通 |
| 新建短工（不填日期） | 入库 | 通（work_date 空则 now） |
| 新建短工（填预约时间） | 入库 | **失败 P0-1** |
| 新建+照片 | 仅 URL，不误建 | 通 |
| 新建+支出经手人 | 可报销核对 | **经手人可能丢 P0-2** |
| 新建项目单+project_id | 项目费用同步 | 部分（expense_items→ProjectExpense 弱） |
| 待办列表/详情 | CRUD | 页面在，抽测 API |
| 财务入口 | 列表/录入 | 有页，深度待验 |
| 设备/项目详情 | 可用 | 有页，抽测 |

---

## 6. 分批修复任务（本地 AI）

### 第 0 批 — 必须当天（阻塞试用）

1. **work_date 兼容**（前端 slice 或后端多格式 parse，建议双修）  
2. **Expense 落库**：staff_name、receipt_photos、category 字符串映射  
3. **Step1 展示 errorMsg**  
4. **确认 create 是否误生成 PendingWork**；按产品改条件  

### 第 1 批 — 数据与列表

1. records 列表 `keyword` 多字段搜索  
2. 提交前清空/上传 localPreviews  
3. project_id 时 expense_items → ProjectExpense 同步  
4. 列表/详情展示支出经手人与票据  

### 第 2 批 — UI 多端收尾

1. 去掉新建页 Card hover 上浮  
2. 各列表统一 Skeleton + EmptyState  
3. Header 未读数与 notificationsApi.unreadCount 联调  
4. 390 / 768 / 1280 三端走查遮挡与侧栏  

### 第 3 批 — 业务加深

1. Finance：支出/收款/简单发票与与后端对齐  
2. 工资：固定工 + 项目临时工入口  
3. 模板改 API  
4. 工单编辑完整流  
5. 删除或归档 frontend-web  

### 第 4 批 — 质量

1. 创建工单 API 契约测试  
2. 错误信息脱敏  
3. 性能：大列表虚拟滚动（可选）  
4. PWA / 离线策略复核  

---

## 7. 给本地 AI 的完整执行指令

```text
【角色】全栈工程师。仓库 feng-fei/worklog-system，分支 feature/modern-tech-ui，HEAD≈89725c3。

【背景】2af60ff 已修复：PhotoUpload、字段映射、record_type、员工列表、Dashboard 真数据、多端列表/新建 UI、/records/upload 等。不要重复已修项。

【硬性】
- 多端：mobile<768 / tablet 768–1023 / desktop≥1024
- 先 P0 再 P1
- 每批：改动文件、三端自测、残留风险

【第 0 批】
1. work_date：
   - 前端提交前 form.work_date 若含 T，取前 10 位日期；若需时间另传 start_time
   - 后端 create/update 兼容 %Y-%m-%d、%Y-%m-%dTHH:MM、%Y-%m-%d HH:MM
2. Expense 创建/更新：写入 staff_name、receipt_photos（JSON）；category 字符串 material/equipment/... 映射到可读名或 category_id；勿 int('material')
3. CreateRecordView step===1 显示 errorMsg 条
4. 检查 create_record 末尾自动建 PendingWork 的条件；默认 status=pending 不应每次都建待办，除非产品确认

【第 1 批】
1. GET /records 支持 keyword 模糊（客户/单号/地址/内容）
2. 提交工单前处理 PhotoUpload localPreviews（先 upload 或拦截提交）
3. 有 project_id 时 expense_items 同步 ProjectExpense
4. 详情页展示支出经手人与票据缩略图

【第 2 批】
1. 去掉 CreateRecordView 表单 Card:hover translateY
2. Skeleton/EmptyState 列表全覆盖
3. 未读角标联调
4. 三端视觉走查

【验收】
- 填预约时间能建单
- 支出带经手人能查到
- 上传照片不新建空单
- 390/768/1280 主路径无阻断
- 无假数据、无可点无事件按钮

立即执行第 0 批，完成后汇报。
```

---

## 8. 验收清单

### 数据

- [ ] 预约时间填写后创建成功  
- [ ] 不填时间创建成功（默认当天）  
- [ ] 照片上传只返回 URL，不产生工单  
- [ ] 支出含经手人、日期、票据可查  
- [ ] 项目单 project_id + 支出进项目核算  
- [ ] 员工/项目可选  

### UI 多端

- [ ] 手机：底栏不挡主按钮；新建步骤可见；Step1 错误可见  
- [ ] 平板：侧栏折叠不截图标  
- [ ] 桌面：无 BottomNav；表头筛选可用；详情分栏  
- [ ] 表单 Card 无错误上浮暗示  
- [ ] Dashboard 无假数字  

### 系统

- [ ] 部署只挂 frontend-vue  
- [ ] 登录→工作台→新建→列表→详情→待办 闭环  
- [ ] 财务入口可打开且 API 无 404  

---

## 9. 关键文件索引

| 用途 | 路径 |
|------|------|
| 新建工单 | `frontend-vue/src/views/CreateRecordView.vue` |
| 照片 | `frontend-vue/src/components/PhotoUpload.vue` |
| 支出 | `frontend-vue/src/components/ExpenseRecorder.vue` |
| API | `frontend-vue/src/api/index.ts` |
| 工作台 | `frontend-vue/src/views/DashboardView.vue` |
| 工单列表 | `frontend-vue/src/views/RecordsView.vue` |
| 布局 | `frontend-vue/src/components/layout/*` |
| 工单后端 | `backend/blueprints/records_routes.py`（含 upload） |
| 模型 | `backend/models.py`（Expense 字段） |
| 财务页 | `frontend-vue/src/views/FinanceView.vue` |

---

## 10. 总结论

**2af60ff 是一次高质量集中修复**，此前诊断的致命前端数据问题大部分已落地，系统从「不可用原型」提升到「接近可试用」。

**当前拦路虎只有少数契约缝隙**：

1. `datetime-local` vs `%Y-%m-%d`  
2. 支出经手人/票据/分类未完整落库  
3. 可能误建待办  
4. 列表 keyword  

修完第 0 批即可内部试运行；财务/工资/模板 API 化放在第 3 批加深。

---

*报告结束。本地 AI 从第 7 节第 0 批开始执行。*
