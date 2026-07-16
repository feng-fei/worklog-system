# Phase 1 集成指南

## 已生成文件清单

### Components（组件）
- `components/PhotoUpload.js` — 照片上传组件（支持多图、预览、删除）
- `components/BatchActions.js` — 批量操作组件
- `components/ExportButtons.js` — 导出 Excel/PDF 按钮

### Views（视图）
- `views/RecordCreate.js` — 新建工单完整表单（含动态费用明细 + 物料明细 + 照片上传 + 模板应用）

---

## 集成步骤

### 1. 复制文件

将 `phase1/components/` 和 `phase1/views/` 下的 `.js` 文件复制到你的项目：

```
frontend-vue/js/
├── components/          ← 新建此目录（如果没有）
│   ├── PhotoUpload.js
│   ├── BatchActions.js
│   └── ExportButtons.js
└── views/
    └── RecordCreate.js
```

### 2. 在 app.js 中注册路由（可选）

如果想把新建工单做成独立页面，可以在 `app.js` 的 routes 里添加：

```js
{
  path: 'records/create',
  name: 'RecordCreate',
  component: RecordCreate,
  meta: { title: '新建工单' }
}
```

### 3. 在 RecordList.js 中使用

在工单列表页的「新建工单」按钮中调用：

```js
const handleCreate = () => {
  // 方式一：跳转页面
  router.push('/records/create');

  // 方式二：弹窗形式（推荐）
  // 使用 ElDialog + RecordCreate 组件
};
```

### 4. 在 RecordDetail.js 中集成照片上传

在详情页的「附件」或新建 Tab 中使用：

```vue
<PhotoUpload v-model="form.photos" :max-count="9" />
```

### 5. 在列表页集成批量操作

在 RecordList 的表格上方添加：

```vue
<BatchActions
  :selected-rows="selectedRecords"
  @update-status="handleBatchUpdateStatus"
  @delete="handleBatchDelete"
  @clear-selection="clearSelection"
/>
```

并在表格列中添加复选框：

```vue
<el-table-column type="selection" width="55" />
```

### 6. 在详情页集成导出按钮

```vue
<ExportButtons :record="recordInfo" />
```

---

## 注意事项

- 所有组件均使用 Element Plus + Composition API
- PhotoUpload 默认调用 `/api/upload/photo`，请根据实际后端接口调整
- RecordCreate 中的 API 调用使用了 `apiService`，请确保你的项目中已全局挂载
- 建议先在本地测试，再逐步替换 Legacy 代码

---

生成日期: 2026-07-16
阶段: Phase 1（核心高频功能）