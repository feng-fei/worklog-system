// =============================================
// BatchActions.js - 批量操作组件
// =============================================
// 功能：支持工单列表批量选择、批量更新状态、批量删除
// =============================================

const BatchActions = {
  template: `
    <div class="batch-actions" v-if="selectedRows.length > 0">
      <el-card shadow="never" class="batch-card">
        <div class="batch-header">
          <span class="batch-info">
            已选择 <strong>{{ selectedRows.length }}</strong> 条记录
          </span>
          <el-button type="danger" size="small" @click="handleBatchDelete" :loading="deleting">
            批量删除
          </el-button>
        </div>

        <div class="batch-body">
          <el-select
            v-model="batchStatus"
            placeholder="选择新状态"
            style="width: 160px; margin-right: 12px;"
            size="small"
          >
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>

          <el-button
            type="primary"
            size="small"
            @click="handleBatchUpdateStatus"
            :loading="updating"
            :disabled="!batchStatus"
          >
            批量更新状态
          </el-button>

          <el-button size="small" @click="clearSelection">取消选择</el-button>
        </div>
      </el-card>
    </div>
  `,

  props: {
    selectedRows: {
      type: Array,
      default: () => []
    },
    // 可选：传入自定义状态选项
    statusOptions: {
      type: Array,
      default: () => [
        { label: '待处理', value: 'pending' },
        { label: '处理中', value: 'in_progress' },
        { label: '已完成', value: 'completed' },
        { label: '已取消', value: 'cancelled' }
      ]
    }
  },

  emits: ['update-status', 'delete', 'clear-selection'],

  setup(props, { emit }) {
    const { ref } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const batchStatus = ref('');
    const updating = ref(false);
    const deleting = ref(false);

    // 批量更新状态
    const handleBatchUpdateStatus = async () => {
      if (!batchStatus.value) return;

      try {
        await ElMessageBox.confirm(
          `确定将选中的 ${props.selectedRows.length} 条工单状态更新为「${getStatusLabel(batchStatus.value)}」吗？`,
          '批量更新确认',
          { type: 'warning' }
        );

        updating.value = true;

        // 触发父组件处理实际更新逻辑
        emit('update-status', {
          ids: props.selectedRows.map(r => r.id),
          status: batchStatus.value
        });

        ElMessage.success('批量更新请求已发送');
        batchStatus.value = '';
      } catch (e) {
        // 用户取消
      } finally {
        updating.value = false;
      }
    };

    // 批量删除
    const handleBatchDelete = async () => {
      try {
        await ElMessageBox.confirm(
          `确定删除选中的 ${props.selectedRows.length} 条工单吗？此操作不可恢复！`,
          '批量删除确认',
          { type: 'error' }
        );

        deleting.value = true;

        emit('delete', {
          ids: props.selectedRows.map(r => r.id)
        });

        ElMessage.success('批量删除请求已发送');
      } catch (e) {
        // 取消
      } finally {
        deleting.value = false;
      }
    };

    const getStatusLabel = (value) => {
      const found = props.statusOptions.find(s => s.value === value);
      return found ? found.label : value;
    };

    const clearSelection = () => {
      emit('clear-selection');
    };

    return {
      batchStatus,
      updating,
      deleting,
      handleBatchUpdateStatus,
      handleBatchDelete,
      clearSelection
    };
  }
};

window.BatchActions = BatchActions;
BatchActions;