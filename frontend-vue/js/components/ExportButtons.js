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
              导出为 Excel (CSV)
            </el-dropdown-item>
            <el-dropdown-item command="pdf">
              <el-icon><Document /></el-icon>
              导出为 PDF
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  `,

  props: {
    record: {
      type: Object,
      required: true
    },
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
        }
      } catch (e) {
        console.error('导出失败', e);
        ElMessage.error('导出失败，请稍后重试');
        emit('export-error', e);
      }
    };

    const exportToExcel = async () => {
      ElMessage.info('正在生成导出文件，请稍候...');

      if (props.exportApi) {
        await props.exportApi(props.record.id, 'excel');
      } else {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/export/records?keyword=${encodeURIComponent(props.record.record_no || props.record.id)}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('导出失败');

        const blob = await res.blob();
        downloadFile(blob, `维修单-${props.record.record_no || props.record.id}.csv`);
      }

      ElMessage.success('导出成功');
      emit('export-success', { type: 'excel', recordId: props.record.id });
    };

    const exportToPdf = async () => {
      ElMessage.info('正在生成 PDF，请稍候...');

      if (props.exportApi) {
        await props.exportApi(props.record.id, 'pdf');
      } else {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/export/pdf/${props.record.id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('导出失败');

        const blob = await res.blob();
        downloadFile(blob, `维修单-${props.record.record_no || props.record.id}.pdf`);
      }

      ElMessage.success('PDF 导出成功');
      emit('export-success', { type: 'pdf', recordId: props.record.id });
    };

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
