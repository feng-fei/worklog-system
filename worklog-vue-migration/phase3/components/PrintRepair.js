// =============================================
// PrintRepair.js - 维修单增强打印组件
// =============================================
// 功能：生成美化后的维修单打印内容（替代简单 window.print）

const PrintRepair = {
  template: `
    <el-button type="success" @click="handlePrint" v-if="record">
      <el-icon><Printer /></el-icon>
      打印维修单
    </el-button>
  `,

  props: {
    record: {
      type: Object,
      required: true
    }
  },

  setup(props) {
    const handlePrint = () => {
      const printContent = generatePrintHTML(props.record);
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // 等待内容加载后打印
      setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // 可选：打印后自动关闭
      }, 300);
    };

    const generatePrintHTML = (record) => {
      const feeTotal = (record.fee_items || []).reduce((sum, item) => {
        return sum + (item.quantity || 0) * (item.unit_price || 0);
      }, 0);

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>维修单 - ${record.order_no}</title>
          <style>
            body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 40px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .title { font-size: 24px; font-weight: bold; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 8px 12px; border: 1px solid #ddd; }
            .section-title { font-size: 16px; font-weight: bold; margin: 20px 0 10px; border-left: 4px solid #409eff; padding-left: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f7fa; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 15px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">维修服务单</div>
            <div>工单编号：${record.order_no || ''}</div>
          </div>

          <table class="info-table">
            <tr>
              <td width="25%"><strong>客户名称</strong></td>
              <td width="25%">${record.customer_name || '-'}</td>
              <td width="25%"><strong>联系电话</strong></td>
              <td width="25%">${record.contact_phone || '-'}</td>
            </tr>
            <tr>
              <td><strong>服务地址</strong></td>
              <td colspan="3">${record.service_address || '-'}</td>
            </tr>
            <tr>
              <td><strong>预约时间</strong></td>
              <td>${record.appointment_time || '-'}</td>
              <td><strong>负责人</strong></td>
              <td>${(record.staff_names || []).join(', ') || '-'}</td>
            </tr>
          </table>

          <div class="section-title">故障描述 / 服务内容</div>
          <div style="min-height: 80px; border: 1px solid #ddd; padding: 12px; margin-bottom: 20px;">
            ${record.fault_description || record.construction_content || record.service_content || '无'}
          </div>

          ${(record.fee_items && record.fee_items.length > 0) ? `
          <div class="section-title">费用明细</div>
          <table>
            <thead>
              <tr><th>项目名称</th><th>数量</th><th>单价</th><th>小计</th></tr>
            </thead>
            <tbody>
              ${record.fee_items.map(item => `
                <tr>
                  <td>${item.name || ''}</td>
                  <td>${item.quantity || 0}</td>
                  <td>¥${(item.unit_price || 0).toFixed(2)}</td>
                  <td>¥${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">费用合计：¥${feeTotal.toFixed(2)}</div>
          ` : ''}

          <div class="footer">
            打印时间：${new Date().toLocaleString('zh-CN')}<br>
            本维修单仅供参考，最终费用以实际结算为准
          </div>
        </body>
        </html>
      `;
    };

    return {
      handlePrint
    };
  }
};

window.PrintRepair = PrintRepair;
PrintRepair;