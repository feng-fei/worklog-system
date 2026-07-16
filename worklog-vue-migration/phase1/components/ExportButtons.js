// =============================================
// ExportButtons.js - 导出按钮组件（Excel / PDF）
// =============================================
// 功能：支持导出维修单为 Excel 或 PDF
// =============================================

const ExportButtons = {
  template: `
    <div class="export-buttons">
      <el-dropdown trigger="click" @command="handleCommand">
        <el-button type="success" size="small">
          <el-icon><Download /></el-icon>
          导出维修单
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="excel">
              <el-icon><Document /></el-icon>
              导出为 Excel
            </el-dropdown-item>
            <el-dropdown-item command="pdf">
              <el-icon><Document /></el-icon>
              导出为 PDF
            </el-dropdown-item>
            <el-dropdown-item command="preview" divided>
              <el-icon><View /></el-icon>
              预览 Excel
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  `,

  props: {
    // 当前工单数据
    record: {
      type: Object,
      required: true
    },
    // 导出接口（可选）
    exportApi: {
      type: Function,
      default: null
    }
  },

  emits: ['export-success', 'export-error'],

  setup(props, { emit }) {
    const { ElMessage } = ElementPlus;

    const handleCommand = async (command) => {
      if (!props.record || !props.record.id) {
        ElMessage.error('工单数据不完整，无法导出');
        return;
      }

      try {
        if (command === 'excel') {
          await exportToExcel();
        } else if (command === 'pdf') {
          await exportToPdf();
        } else if (command === 'preview') {
          await previewExcel();
        }
      } catch (e) {
        console.error('导出失败', e);
        ElMessage.error('导出失败，请稍后重试');
        emit('export-error', e);
      }
    };

    // 导出 Excel
    const exportToExcel = async () => {
      ElMessage.info('正在生成 Excel，请稍候...');

      if (props.exportApi) {
        // 使用传入的 API 方法
        await props.exportApi(props.record.id, 'excel');
      } else {
        // 默认调用后端接口
        const res = await fetch(`/api/records/${props.record.id}/export/excel`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!res.ok) throw new Error('导出失败');

        const blob = await res.blob();
        downloadFile(blob, `维修单-${props.record.order_no || props.record.id}.xlsx`);
      }

      ElMessage.success('Excel 导出成功');
      emit('export-success', { type: 'excel', recordId: props.record.id });
    };

    // 导出 PDF
    const exportToPdf = async () => {
      ElMessage.info('正在生成 PDF，请稍候...');

      if (props.exportApi) {
        await props.exportApi(props.record.id, 'pdf');
      } else {
        const res = await fetch(`/api/records/${props.record.id}/export/pdf`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!res.ok) throw new Error('导出失败');

        const blob = await res.blob();
        downloadFile(blob, `维修单-${props.record.order_no || props.record.id}.pdf`);
      }

      ElMessage.success('PDF 导出成功');
      emit('export-success', { type: 'pdf', recordId: props.record.id });
    };

    // 预览 Excel（通常是下载后用 Excel 打开，或使用在线预览）
    const previewExcel = async () => {
      // 这里简化处理：直接下载，用户用 Excel 打开即可
      // 如需在线预览可集成 SheetJS + LuckySheet 等
      await exportToExcel();
      ElMessage.success('已下载 Excel，请用 Excel 软件打开预览');
    };

    // 下载文件辅助函数
    const downloadFile = (blob, filename) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    };

    return {
      handleCommand
    };
  }
};

window.ExportButtons = ExportButtons;
ExportButtons;