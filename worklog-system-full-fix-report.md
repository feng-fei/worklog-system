# worklog-system 全量代码预演 + Bug 修复报告 + 多端 UI 修复任务清单

> 基于仓库分支：`feature/modern-tech-ui`  
> 适用范围：`frontend-vue`（主前端）+ `backend/blueprints/records_routes.py` 等核心接口  
> 目标：同一套前端在 **手机 / 平板 / 桌面** 可用；先修致命数据通路，再修多端 UI  
> 使用方式：整份文档可直接提交给本地 AI 按阶段执行

---

## 目录

1. [总体结论](#1-总体结论)
2. [严重 Bug（数据 / 接口层）](#2-严重-bug数据--接口层)
3. [中优先级问题](#3-中优先级问题)
4. [UI 预演问题（多端）](#4-ui-预演问题多端)
5. [数据层修复步骤](#5-数据层修复步骤)
6. [多端 UI 修复任务清单](#6-多端-ui-修复任务清单)
7. [实施顺序与验收](#7-实施顺序与验收)
8. [给本地 AI 的完整执行指令](#8-给本地-ai-的完整执行指令)

---

## 1. 总体结论

| 维度 | 评价 |
|------|------|
| UI / 科技感 | 较好（玻璃拟态、发光、布局已成型） |
| 页面覆盖 | 中等（核心页有，财务/工资/模板等仍偏弱） |
| **前后端字段对齐** | **差（大量字段名不一致）** |
| **照片上传** | **严重 Bug（会误创建工单）** |
| 费用支出 | 前端有，映射到后端不完整 |
| 多端适配 | 偏移动端，桌面/平板未系统化 |
| 可上线程度 | **当前不建议正式使用，需先修高优 Bug + P0 UI** |

适配原则（全文统一）：

- **Mobile（<768px）**：单列、底栏、大触控、少信息密度
- **Tablet（768–1023px）**：双列/侧栏收缩、触控+鼠标兼顾
- **Desktop（≥1024px）**：侧栏常驻、表格优先、快捷键与悬停可用

---

## 2. 严重 Bug（数据 / 接口层）

### Bug 1：照片上传会误创建工单（致命）

**位置**：`frontend-vue/src/components/PhotoUpload.vue`

```ts
// 错误：上传照片时调用了创建工单接口
const res = await recordsApi.create(formData)
```

**后果**：

- 每选一次照片，都会 `POST /api/records` 创建一条空/残缺工单
- 数据库会堆积垃圾数据

**正确做法**：

1. 使用独立上传接口（如 `POST /api/records/upload` 或 `/api/upload`）
2. 前端已有 `recordsApi.uploadPhotos`，应改为调用它
3. 后端若无该接口，需新增并返回 `{ photos: string[] }`

---

### Bug 2：新建工单字段名与后端严重不一致（致命）

**位置**：`frontend-vue/src/views/CreateRecordView.vue` ↔ `backend/blueprints/records_routes.py`

| 前端发送 | 后端期望 |
|----------|----------|
| `contact_person` | `contact_name` |
| `contact_phone` | `customer_phone` |
| `address` | `work_address` |
| `appointment_date` | `work_date` |
| `labour_fee` | `labor_fee` |
| `travel_fee` | `transport_fee` |
| `fault_phenomenon` | `fault_description` |
| `fault_judgment` | `fault_diagnosis` |

**后果**：客户电话、地址、日期、费用等大量字段写入失败，工单数据残缺。

---

### Bug 3：`record_type` 映射错误

前端：

```ts
case 'short': return 'maintenance'  // 后端不认
```

后端主要识别：`construction` / `repair`。

**建议**：

- 项目施工 → `construction` + `project_id`
- 简短施工 → `construction`
- 维修/抢修 → `repair`

---

### Bug 4：费用支出数据丢失关键字段

- `ExpenseRecorder` 有：`staff_name`、`receipt_photos`、`expense_date`
- `CreateRecordView` 转换时只保留 `category / amount / remark`
- 报销人员、票据照片全部丢失

---

### Bug 5：员工列表永远为空

```ts
const staffList = computed(() => [])  // 写死空数组
```

支出人员、负责人无法选择，只能手填。

---

### Bug 6：列表地址字段显示错误

**位置**：`RecordsView.vue` 等

模板使用 `record.address`，后端/类型多为 `work_address`。  
**预演**：卡片地址区域经常空白。

---

## 3. 中优先级问题

| 编号 | 问题 | 影响 |
|------|------|------|
| M1 | 无独立照片上传接口 `/records/upload` | 照片流程无法正确工作 |
| M2 | 项目选择只有文本框，无项目列表下拉 | 项目施工单无法正确关联 |
| M3 | `work_photos` 提交格式与后端解析不完全一致 | 照片可能存不对 |
| M4 | 双前端（`frontend-vue` + `frontend-web`）并存 | 维护混乱、行为分裂 |
| M5 | 待办、客户等 API 返回结构与前端解析不完全一致 | 列表偶发空白/报错 |
| M6 | Dashboard 待办区写死假数据（3/5/12/8） | 用户一眼看出是假的 |
| M7 | MobileHeader 搜索/通知按钮无 `@click` | 点了没反应 |
| M8 | 通知红点写死常显 | 无消息也显示红点 |

---

## 4. UI 预演问题（多端）

### 4.1 全局布局

1. **路由 Transition 使用 `position: absolute`**（手机）：切换闪动、叠层、滚动错乱；桌面虽改为 static，需统一策略。
2. **Header / 内容 / BottomNav 占位冲突**：可能双重 safe-area；列表底部被 FAB 遮挡（`pb-20` 不够）。
3. **FAB 实际占用约 84px+**，内容预留不足。
4. **全局 Card hover 上浮**：表单 Card 也抬升，误导为可点击。
5. **登录页强制深色**，与主题开关割裂。
6. **光效过重**：低端机可能掉帧；业务信息层级被抢。

### 4.2 工作台 Dashboard

- 待办事项整块假数据，点击无跳转。
- 统计卡有 `cursor-pointer` 但无点击事件。
- 快捷入口仅 4 个，桌面/侧边栏能力不对齐。

### 4.3 工单列表

- 地址字段错误导致空白。
- 手机状态 Tab 默认折叠，首次像「没有筛选」。
- 搜索仅依赖 Enter，缺按钮与防抖。
- 滚动加载与 PullRefresh 容器可能冲突。
- 视图模式：手机应强制卡片；桌面默认表格。

### 4.4 新建工单

- 手机步骤条弱，进度不清晰。
- Step1 错误提示不明显。
- 「添加人员」空按钮。
- 项目无真实选择器。
- 「向客户收费」与「报销支出」两套费用并列，认知混乱。
- 原生 `<select>` 与设计体系割裂。
- 模板保存使用 `prompt()`，不适合移动端。

### 4.5 导航与 Header

- 待办无角标数字。
- FAB 只能新建工单，不能选待办/客户。
- Header 搜索/通知无事件；红点写死。
- Header 按钮约 36px，低于 44px 触控建议。

### 4.6 打开后预演脚本（摘要）

1. 登录 → 工作台：假待办数字；点卡片无反应；点 Header 铃铛无反应。
2. 工单列表：地址常空；状态 Tab 需先点过滤；底 FAB 挡最后一条。
3. 新建：步骤不清；费用含义不清；上传照片可能误建工单。

---

## 5. 数据层修复步骤

### 阶段 A：致命 Bug（优先）

#### A1. 修复 PhotoUpload

1. 后端新增或确认：

```text
POST /api/records/upload
→ { "photos": ["/uploads/xxx.jpg", ...] }
```

2. `PhotoUpload.vue` 改为调用 `recordsApi.uploadPhotos(files)`，**禁止**再调用 `recordsApi.create`。

#### A2. 统一新建工单字段映射

在 `handleSubmit` 中按后端字段提交：

```ts
submitData.append('contact_name', form.value.contact_person)
submitData.append('customer_phone', form.value.contact_phone)
submitData.append('work_address', form.value.address)
submitData.append('work_date', form.value.appointment_date?.slice(0, 10) || '')
submitData.append('labor_fee', String(form.value.labour_fee || 0))
submitData.append('transport_fee', String(form.value.travel_fee || 0))
submitData.append('fault_description', form.value.fault_phenomenon)
submitData.append('fault_diagnosis', form.value.fault_judgment)
```

#### A3. 修正 record_type

```ts
const mapRecordTypeToApi = (type: string) => {
  if (type === 'repair') return 'repair'
  return 'construction' // project / short
}
// project 时务必带 project_id
```

#### A4. 费用支出完整提交

```ts
// 不要再做丢失字段的 convertToOldFormat
submitData.append('expense_items', JSON.stringify(expenseItems.value))
// 每项包含：expense_type, amount, description, staff_name, receipt_photos, expense_date
```

#### A5. 加载员工列表

```ts
onMounted(async () => {
  const res = await staffsApi.list({ per_page: 200 })
  staffList.value = (res.records || []).map((s: any) => s.name)
})
```

#### A6. 列表地址显示

```ts
// 兼容
record.work_address || record.address || ''
```

### 阶段 B：接口与结构补齐

1. 确认 `POST /api/records/upload`
2. 项目下拉：`GET /api/projects`（进行中优先）
3. 统一列表返回：`{ records, total, page, per_page }`
4. 照片 URL 约定前后端一致（逗号分隔或 JSON 数组二选一）

### 阶段 C：架构清理

1. 明确以 `frontend-vue` 为主（或合并 `frontend-web`），避免双前端
2. 新建成功后刷新列表
3. 错误统一 toast

### 数据层验证清单

- [ ] 上传照片 → 只返回 URL，**不创建工单**
- [ ] 新建简短施工 → 地址/电话/日期/费用正确入库
- [ ] 新建项目施工 → `project_id` 有值，支出能进项目费用
- [ ] 新建维修单 → `fault_description` 等正确
- [ ] 费用支出带「经手人 + 票据」能保存
- [ ] 员工下拉有数据
- [ ] 列表、详情、待办主流程无报错

---

## 6. 多端 UI 修复任务清单

### 0. 全局规范

| 编号 | 任务 | 多端要求 | 验收标准 |
|------|------|----------|----------|
| G01 | 定义断点与布局模式 | sm/md/lg/xl 统一 | 三端切换无布局塌陷 |
| G02 | 安全区与固定栏占位公式 | 顶：headerH+safe-top；底：navH+fabExtra+safe-bottom | 列表最后一项不被挡 |
| G03 | 触控目标最小尺寸 | 手机/平板 ≥44px；桌面可 36px | 不误触 |
| G04 | Card 全局 hover 策略 | 表单 Card **禁止**上浮 | 表单不像按钮 |
| G05 | 路由 Transition | 手机轻滑；桌面淡入；禁止 absolute 抢流 | 不闪、不叠层 |
| G06 | 主题一致性 | 登录页跟随主题 | 深浅色全站统一 |
| G07 | 空状态组件统一 | 图示+文案+主按钮 | 三端一致 |
| G08 | 加载/错误/空 三态 | 每个列表页必须有 | 无白屏、无假数据 |

### 1. P0 — 立刻修

#### 1.1 布局骨架

| 编号 | 任务 | 文件 | 多端行为 |
|------|------|------|----------|
| L01 | 修正 main 内边距 | `AppLayout.vue` | 手机顶+底固定；平板侧栏或底栏；桌面仅侧栏+顶栏 |
| L02 | FAB 遮挡：底边距 ≥96–112px | AppLayout / 列表页 | 仅有 FAB 时生效 |
| L03 | BottomNav 仅 `<md` | `BottomNav.vue` | 桌面零干扰 |
| L04 | Sidebar：md 可折叠，lg 展开 | `Sidebar.vue` | 平板省空间 |
| L05 | Header 搜索/通知可跳转 | `MobileHeader.vue` | 通知→/notifications |
| L06 | 红点绑定未读数 | Header + store | 0 则隐藏 |
| L07 | Header 触控区 ≥44px（手机） | Header 组件 | 桌面可紧凑 |

#### 1.2 工作台

| 编号 | 任务 | 多端 |
|------|------|------|
| D01 | 待办去假数据，接 API | 三端同一数据源 |
| D02 | 待办卡片可点击跳转 | 三端 |
| D03 | 统计卡可点进列表/报表 | 三端 |
| D04 | 快捷入口：手机 4 个；平板/桌面 6–8 个 | 含项目/团队/统计 |
| D05 | 布局：手机单列→平板 2 列→桌面 4 列+分栏 | 响应式 grid |

#### 1.3 工单列表

| 编号 | 任务 | 多端 |
|------|------|------|
| R01 | 地址 `work_address` 兼容显示 | 三端 |
| R02 | 状态 Tab 默认可见 | 手机横向滚；桌面常驻 |
| R03 | 搜索：按钮 + Enter + 防抖 | 三端 |
| R04 | 视图：手机卡片；桌面默认表 | 平板可切换 |
| R05 | 滚动加载与 PullRefresh 协调 | 避免双滚动条 |
| R06 | 筛选：手机 Drawer；桌面顶栏/侧栏 | 三端 |

#### 1.4 新建工单

| 编号 | 任务 | 多端 |
|------|------|------|
| C01 | 步骤条三端清晰 | 桌面左侧步骤；手机顶进度 |
| C02 | Step1 错误条可见 | 三端 |
| C03 | 添加人员真实多选 | 手机全屏选；桌面 Dialog |
| C04 | 项目搜索下拉写 `project_id` | 三端 |
| C05 | 费用文案：收款 vs 报销 | 手机上下；桌面可分栏 |
| C06 | 原生 select 换统一组件 | 三端 |
| C07 | 模板保存用 Dialog，禁 prompt | 三端 |

### 2. P1 — 体验完整

| 编号 | 任务 | 说明 |
|------|------|------|
| N01 | FAB 菜单：工单/待办/客户 | 触控端；桌面顶栏「+新建」下拉 |
| N02 | 桌面 AppHeader：搜索、通知、新建 | 与手机能力对齐 |
| N03 | 路由 meta：showHeader/showNav/layout | 创建/详情可藏底栏 |
| N04 | 详情返回：手机 back；桌面保持列表筛选 | |
| P01 | 统一 ListPage 骨架 | 搜索+筛选+列表+分页 |
| P02 | 表格列响应式隐藏 | 窄屏藏次要列 |
| P03 | 详情：手机全页；桌面右侧 Drawer | |
| P04 | 状态色/类型色 token 化 | |
| F01 | 表单桌面两列、手机单列 | |
| F02 | 底栏：手机固定；桌面跟表单或粘顶 | |
| F03 | 键盘弹起底栏避让（visualViewport） | 主要手机 |

### 3. P2 — 视觉与性能

| 编号 | 任务 |
|------|------|
| V01 | 减弱光效；手机减少 blur |
| V02 | 登录跟主题；版权年份动态 |
| V03 | 密码显示/隐藏 |
| V04 | 骨架屏替代纯 Spinner |
| V05 | `prefers-reduced-motion` 降级 |
| V06 | 打印/导出主入口在桌面 |

### 4. 布局矩阵（对照表）

| 模块 | Mobile | Tablet | Desktop |
|------|--------|--------|---------|
| 主导航 | BottomNav + FAB | 底栏或窄侧栏 | Sidebar 展开 |
| 顶栏 | MobileHeader | 简化顶栏 | AppHeader 全功能 |
| 工作台 | 2×2 统计 + 单列 | 4 统计 + 2 列 | 4 统计 + 左右分栏 |
| 工单列表 | 卡片 + 顶 Tab | 卡片/表可切 | 默认表 + 筛选 |
| 新建工单 | 全屏分步 | 分步加宽 | 左步骤+右表单 |
| 详情 | 全屏 | 全屏或分栏 | 列表+右侧详情 |
| 筛选 | 底 Drawer | 中等面板 | 顶栏/右侧常驻 |

---

## 7. 实施顺序与验收

### 建议批次

| 批次 | 内容 | 预估 |
|------|------|------|
| 第 0 批 | 数据致命 Bug A1–A6 | 优先当天 |
| 第 1 批 | G01–G05，L01–L07 骨架 | 1–2 天 |
| 第 2 批 | D01–D05，R01–R06 | 1–2 天 |
| 第 3 批 | C01–C07，F01–F03 | 2–3 天 |
| 第 4 批 | N/P/V 体验与视觉 | 持续 |

### 每批必测宽度

- 390×844（手机）
- 768×1024（平板竖）
- 1280×800 / 1440×900（桌面）

### 综合验收清单

- [ ] 上传照片不创建工单
- [ ] 新建三种类型字段正确入库
- [ ] 费用支出含经手人/票据
- [ ] 员工、项目可选择
- [ ] 手机：底栏+FAB 不挡内容
- [ ] 平板：无双滚动条、导航合理
- [ ] 桌面：无 BottomNav，表格可读，筛选可见
- [ ] 无写死假数字、无可点无事件按钮
- [ ] 空/加载/错误态齐全
- [ ] 深浅色登录/列表/表单/侧栏一致
- [ ] 通知红点与未读一致；Header 可跳转

---

## 8. 给本地 AI 的完整执行指令

```text
你是资深全栈工程师。请在 worklog-system 仓库（优先 feature/modern-tech-ui 分支）按本文档修复 frontend-vue + 必要后端接口。

【硬性要求】
1. 多端适配：mobile <768、tablet 768–1023、desktop ≥1024。禁止只改移动端。
2. 先修数据致命 Bug，再修 UI P0，再 P1/P2。
3. 每完成一批：列出修改文件、自测三种宽度结果、残留风险。
4. 不要引入第二套 UI 框架；在现有 shadcn-vue + Tailwind 上修。
5. 不要用假数据充数；禁止保留点了没反应的按钮。

【第 0 批：数据致命】
1. PhotoUpload.vue：禁止 recordsApi.create 上传照片；改用 uploadPhotos；后端无 /records/upload 则补齐。
2. CreateRecordView handleSubmit 字段对齐：
   contact_person→contact_name
   contact_phone→customer_phone
   address→work_address
   appointment_date→work_date（日期部分）
   labour_fee→labor_fee
   travel_fee→transport_fee
   fault_phenomenon→fault_description
   fault_judgment→fault_diagnosis
3. record_type：project/short→construction，repair→repair；项目必须带 project_id。
4. expense_items 完整提交（staff_name、receipt_photos、expense_date），禁止丢字段转换。
5. staffsApi.list 填充 staffList。
6. 列表地址显示 work_address || address。

【第 1 批：布局骨架】
1. AppLayout：修正 header/bottom 占位；transition 桌面淡入、手机轻滑，不用 absolute 破坏文档流。
2. BottomNav 仅 <md；桌面 Sidebar md 可折叠、lg 展开。
3. MobileHeader：搜索/通知可跳转；红点接未读数；触控 ≥44px。
4. 全局：表单 Card 禁止 hover 上浮；有 FAB 时内容底边距 ≥96px。

【第 2 批：工作台+列表】
1. Dashboard：去掉假待办；接 API；卡片/统计可跳转；快捷入口桌面更多。
2. RecordsView：地址字段；状态 Tab 默认显示；搜索按钮+防抖；手机卡片/桌面表格；筛选多端形态。

【第 3 批：新建工单 UI】
1. 三端步骤条清晰；Step1 错误可见。
2. 人员/项目真实选择器。
3. 费用文案区分「向客户收费」vs「报销支出」。
4. 统一 Select；模板保存用 Dialog，禁用 prompt()。

【验收】
按文档第 7 节清单自测 mobile/tablet/desktop，输出勾选结果。

开始执行第 0 批，完成后汇报再进入第 1 批。
```

---

## 附录：关键文件索引

| 用途 | 路径 |
|------|------|
| API 客户端 | `frontend-vue/src/api/index.ts` |
| 路由 | `frontend-vue/src/router/index.ts` |
| 新建工单 | `frontend-vue/src/views/CreateRecordView.vue` |
| 工单列表 | `frontend-vue/src/views/RecordsView.vue` |
| 工作台 | `frontend-vue/src/views/DashboardView.vue` |
| 登录 | `frontend-vue/src/views/LoginView.vue` |
| 布局 | `frontend-vue/src/components/layout/AppLayout.vue` |
| 底栏 | `frontend-vue/src/components/layout/BottomNav.vue` |
| 侧栏 | `frontend-vue/src/components/layout/Sidebar.vue` |
| 手机顶栏 | `frontend-vue/src/components/layout/MobileHeader.vue` |
| 照片上传 | `frontend-vue/src/components/PhotoUpload.vue` |
| 费用支出 | `frontend-vue/src/components/ExpenseRecorder.vue` |
| 全局样式 | `frontend-vue/src/style.css` |
| 工单后端 | `backend/blueprints/records_routes.py` |

---

*文档结束。按第 8 节指令交给本地 AI 分批执行即可。*
