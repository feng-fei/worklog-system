const ProjectView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <div class="section-title" style="margin:0;">项目管理</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate" v-if="isAdmin">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新增项目
            </el-button>
            <el-button @click="loadData">
              <el-icon style="margin-right:4px;"><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <div class="filter-bar">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索项目名称/编号/合同号/客户"
            clearable
            style="width:280px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.status" placeholder="状态" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option label="待启动" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已结算" value="settled" />
            <el-option label="已取消" value="cancelled" />
          </el-select>

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="projects" v-loading="loading" stripe>
          <el-table-column prop="project_no" label="项目编号" width="140" />
          <el-table-column prop="name" label="项目名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="customer_name" label="客户" width="140" show-overflow-tooltip />
          <el-table-column prop="manager" label="项目经理" width="100" />
          <el-table-column label="合同金额" width="120" align="right">
            <template #default="{ row }">¥{{ (row.contract_amount || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="已收款" width="120" align="right">
            <template #default="{ row }">¥{{ (row.receipt_amount || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="项目阶段" width="100">
            <template #default="{ row }">
              <el-tag type="info" size="small">{{ getStageText(row.project_stage) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="start_date" label="开始日期" width="110">
            <template #default="{ row }">{{ row.start_date || '-' }}</template>
          </el-table-column>
          <el-table-column prop="end_date" label="结束日期" width="110">
            <template #default="{ row }">{{ row.end_date || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
              <el-button link type="primary" size="small" @click="handleEdit(row)" v-if="isAdmin">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)" v-if="isAdmin">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-bar">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.per_page"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="780px" @closed="resetForm">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="项目名称" prop="name">
                <el-input v-model="form.name" placeholder="请输入项目名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目编号">
                <el-input v-model="form.project_no" placeholder="自动生成" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="客户名称" prop="customer_name">
                <el-input v-model="form.customer_name" placeholder="请输入客户名称" list="customer-list" />
                <datalist id="customer-list">
                  <option v-for="c in customerOptions" :key="c.id" :value="c.name">{{ c.short_name || c.name }}</option>
                </datalist>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="合同号">
                <el-input v-model="form.contract_no" placeholder="请输入合同号" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目类型">
                <el-select v-model="form.project_type" placeholder="请选择项目类型" style="width:100%;">
                  <el-option label="弱电" value="弱电" />
                  <el-option label="智能化" value="智能化" />
                  <el-option label="安防" value="安防" />
                  <el-option label="其他" value="其他" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目状态" prop="status">
                <el-select v-model="form.status" placeholder="请选择状态" style="width:100%;">
                  <el-option label="待启动" value="pending" />
                  <el-option label="进行中" value="in_progress" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="已结算" value="settled" />
                  <el-option label="已取消" value="cancelled" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目经理" prop="manager">
                <el-input v-model="form.manager" placeholder="请输入项目经理姓名" list="staff-list" />
                <datalist id="staff-list">
                  <option v-for="s in staffOptions" :key="s.id" :value="s.name">{{ s.position || '' }}</option>
                </datalist>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系人">
                <el-input v-model="form.contact_name" placeholder="请输入联系人" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="form.contact_phone" placeholder="请输入联系电话" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结算方式">
                <el-select v-model="form.billing_type" placeholder="请选择结算方式" style="width:100%;">
                  <el-option label="包工包料" value="lump_sum" />
                  <el-option label="包工不包料" value="labor_only" />
                  <el-option label="按工时" value="hourly" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目阶段">
                <el-select v-model="form.project_stage" placeholder="请选择项目阶段" style="width:100%;">
                  <el-option label="准备" value="preparation" />
                  <el-option label="备料" value="material_prep" />
                  <el-option label="施工" value="in_progress" />
                  <el-option label="完工" value="completed" />
                  <el-option label="验收" value="acceptance" />
                  <el-option label="结算" value="settled" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="施工阶段">
                <el-select v-model="form.construction_phase" placeholder="请选择施工阶段" style="width:100%;">
                  <el-option label="布管" value="piping" />
                  <el-option label="穿线" value="wiring" />
                  <el-option label="设备安装" value="equipment_install" />
                  <el-option label="设备调试" value="equipment_debug" />
                  <el-option label="系统测试" value="system_test" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="合同金额">
                <el-input-number v-model="form.contract_amount" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="预算金额">
                <el-input-number v-model="form.budget_amount" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="实际金额">
                <el-input-number v-model="form.actual_amount" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="已收款">
                <el-input-number v-model="form.receipt_amount" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="质保金">
                <el-input-number v-model="form.warranty_amount" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="含税">
                <el-switch v-model="form.tax_type" active-value="tax" inactive-value="no" active-text="是" inactive-text="否" />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="form.tax_type === 'tax'">
              <el-form-item label="税率(%)">
                <el-input-number v-model="form.tax_rate" :min="0" :max="100" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="form.tax_type === 'tax'">
              <el-form-item label="税额">
                <el-input :model-value="calculatedTaxAmount" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="开始日期">
                <el-date-picker v-model="form.start_date" type="date" placeholder="选择开始日期" value-format="YYYY-MM-DD" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结束日期">
                <el-date-picker v-model="form.end_date" type="date" placeholder="选择结束日期" value-format="YYYY-MM-DD" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="实际开工">
                <el-date-picker v-model="form.actual_start_date" type="date" placeholder="实际开工日期" value-format="YYYY-MM-DD" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="实际竣工">
                <el-date-picker v-model="form.actual_end_date" type="date" placeholder="实际竣工日期" value-format="YYYY-MM-DD" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="项目地址">
                <el-input v-model="form.project_address" placeholder="请输入项目地址" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="参与人员">
                <el-input v-model="form.staff_names" type="textarea" :rows="2" placeholder="参与人员，多个用逗号分隔" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="项目描述">
                <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入项目描述" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
        </template>
      </el-dialog>

      <el-drawer v-model="detailVisible" title="项目详情" size="800px">
        <div v-if="currentProject" style="padding:0 10px;">
          <div style="margin-bottom:16px;">
            <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">{{ currentProject.name }}</div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
              <span style="color:#909399;font-size:13px;">{{ currentProject.project_no }}</span>
              <el-tag :type="getStatusType(currentProject.status)" size="small">{{ getStatusText(currentProject.status) }}</el-tag>
              <el-tag type="info" size="small">{{ getStageText(currentProject.project_stage) }}</el-tag>
            </div>
          </div>

          <el-tabs v-model="activeTab" @tab-change="handleTabChange">
            <el-tab-pane label="基本信息" name="basic">
              <el-descriptions :column="2" border size="small" style="margin-top:10px;">
                <el-descriptions-item label="项目编号">{{ currentProject.project_no || '-' }}</el-descriptions-item>
                <el-descriptions-item label="项目名称">{{ currentProject.name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="客户名称">{{ currentProject.customer_name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="合同号">{{ currentProject.contract_no || '-' }}</el-descriptions-item>
                <el-descriptions-item label="项目类型">{{ currentProject.project_type || '-' }}</el-descriptions-item>
                <el-descriptions-item label="项目状态">
                  <el-tag :type="getStatusType(currentProject.status)" size="small">{{ getStatusText(currentProject.status) }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="项目经理">{{ currentProject.manager || '-' }}</el-descriptions-item>
                <el-descriptions-item label="联系人">{{ currentProject.contact_name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="联系电话">{{ currentProject.contact_phone || '-' }}</el-descriptions-item>
                <el-descriptions-item label="结算方式">{{ getBillingTypeText(currentProject.billing_type) }}</el-descriptions-item>
                <el-descriptions-item label="项目阶段">{{ getStageText(currentProject.project_stage) }}</el-descriptions-item>
                <el-descriptions-item label="施工阶段">{{ getConstructionPhaseText(currentProject.construction_phase) }}</el-descriptions-item>
                <el-descriptions-item label="合同金额">¥{{ (currentProject.contract_amount || 0).toFixed(2) }}</el-descriptions-item>
                <el-descriptions-item label="预算金额">¥{{ (currentProject.budget_amount || 0).toFixed(2) }}</el-descriptions-item>
                <el-descriptions-item label="实际金额">¥{{ (currentProject.actual_amount || 0).toFixed(2) }}</el-descriptions-item>
                <el-descriptions-item label="已收款">¥{{ (currentProject.receipt_amount || 0).toFixed(2) }}</el-descriptions-item>
                <el-descriptions-item label="质保金">¥{{ (currentProject.warranty_amount || 0).toFixed(2) }}</el-descriptions-item>
                <el-descriptions-item label="含税">{{ currentProject.tax_type === 'tax' ? '是' : '否' }}</el-descriptions-item>
                <el-descriptions-item label="税率" v-if="currentProject.tax_type === 'tax'">{{ ((currentProject.tax_rate || 0) * 100).toFixed(2) }}%</el-descriptions-item>
                <el-descriptions-item label="税额" v-if="currentProject.tax_type === 'tax'">¥{{ (currentProject.tax_amount || 0).toFixed(2) }}</el-descriptions-item>
                <el-descriptions-item label="开始日期">{{ currentProject.start_date || '-' }}</el-descriptions-item>
                <el-descriptions-item label="结束日期">{{ currentProject.end_date || '-' }}</el-descriptions-item>
                <el-descriptions-item label="实际开工">{{ currentProject.actual_start_date || '-' }}</el-descriptions-item>
                <el-descriptions-item label="实际竣工">{{ currentProject.actual_end_date || '-' }}</el-descriptions-item>
                <el-descriptions-item label="参与人员" :span="2">{{ currentProject.staff_names || '-' }}</el-descriptions-item>
                <el-descriptions-item label="项目地址" :span="2">{{ currentProject.project_address || '-' }}</el-descriptions-item>
                <el-descriptions-item label="创建时间">{{ formatDateTime(currentProject.created_at) }}</el-descriptions-item>
                <el-descriptions-item label="更新时间">{{ formatDateTime(currentProject.updated_at) }}</el-descriptions-item>
              </el-descriptions>
              <div style="margin-top:16px;" v-if="currentProject.description">
                <div style="font-weight:bold;margin-bottom:8px;">项目描述</div>
                <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">{{ currentProject.description }}</div>
              </div>
              <div style="margin-top:16px;" v-if="currentProject.remark">
                <div style="font-weight:bold;margin-bottom:8px;">备注</div>
                <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">{{ currentProject.remark }}</div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="支出记录" name="expenses">
              <div style="margin:10px 0;">
                <el-button type="primary" size="small" @click="handleAddExpense" v-if="isAdmin">
                  <el-icon style="margin-right:4px;"><Plus /></el-icon>新增支出
                </el-button>
              </div>
              <el-table :data="expenses" v-loading="expensesLoading" stripe size="small">
                <el-table-column prop="expense_date" label="日期" width="110" />
                <el-table-column prop="expense_type" label="类型" width="100">
                  <template #default="{ row }">{{ getExpenseTypeText(row.expense_type) }}</template>
                </el-table-column>
                <el-table-column prop="category" label="分类" width="100" />
                <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
                <el-table-column label="金额" width="110" align="right">
                  <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
                </el-table-column>
                <el-table-column prop="supplier" label="供应商" width="120" show-overflow-tooltip />
                <el-table-column prop="payment_method" label="支付方式" width="100">
                  <template #default="{ row }">{{ getPaymentMethodText(row.payment_method) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="140" fixed="right" v-if="isAdmin">
                  <template #default="{ row }">
                    <el-button link type="primary" size="small" @click="handleEditExpense(row)">编辑</el-button>
                    <el-button link type="danger" size="small" @click="handleDeleteExpense(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="工资记录" name="salaries">
              <div style="margin:10px 0;">
                <el-button type="primary" size="small" @click="handleAddSalary" v-if="isAdmin">
                  <el-icon style="margin-right:4px;"><Plus /></el-icon>新增工资
                </el-button>
              </div>
              <el-table :data="salaries" v-loading="salariesLoading" stripe size="small">
                <el-table-column prop="work_date" label="日期" width="110" />
                <el-table-column prop="staff_name" label="员工" width="100" />
                <el-table-column prop="staff_type" label="类型" width="80">
                  <template #default="{ row }">{{ row.staff_type === 'fixed' ? '固定工' : '临时工' }}</template>
                </el-table-column>
                <el-table-column prop="work_content" label="工作内容" min-width="120" show-overflow-tooltip />
                <el-table-column prop="salary_type" label="薪资类型" width="90">
                  <template #default="{ row }">{{ getSalaryTypeText(row.salary_type) }}</template>
                </el-table-column>
                <el-table-column label="应发" width="100" align="right">
                  <template #default="{ row }">¥{{ (row.payable_amount || 0).toFixed(2) }}</template>
                </el-table-column>
                <el-table-column label="已发" width="100" align="right">
                  <template #default="{ row }">¥{{ (row.paid_amount || 0).toFixed(2) }}</template>
                </el-table-column>
                <el-table-column label="状态" width="90">
                  <template #default="{ row }">
                    <el-tag :type="getSalaryStatusType(row.status)" size="small">{{ getSalaryStatusText(row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="140" fixed="right" v-if="isAdmin">
                  <template #default="{ row }">
                    <el-button link type="primary" size="small" @click="handleEditSalary(row)">编辑</el-button>
                    <el-button link type="danger" size="small" @click="handleDeleteSalary(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="施工记录" name="records">
              <div style="margin:10px 0;">
                <el-button type="primary" size="small" @click="handleAddRecord" v-if="isAdmin">
                  <el-icon style="margin-right:4px;"><Plus /></el-icon>新增记录
                </el-button>
              </div>
              <el-table :data="workRecords" v-loading="recordsLoading" stripe size="small">
                <el-table-column prop="record_no" label="记录编号" width="130" />
                <el-table-column prop="work_date" label="日期" width="110" />
                <el-table-column prop="work_type" label="类型" width="100" />
                <el-table-column prop="work_content" label="工作内容" min-width="140" show-overflow-tooltip />
                <el-table-column prop="staff_names" label="参与人员" width="140" show-overflow-tooltip />
                <el-table-column prop="work_hours" label="工时" width="80" align="right" />
                <el-table-column label="合计费用" width="110" align="right">
                  <template #default="{ row }">¥{{ (row.total_fee || 0).toFixed(2) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="140" fixed="right" v-if="isAdmin">
                  <template #default="{ row }">
                    <el-button link type="primary" size="small" @click="handleEditRecord(row)">编辑</el-button>
                    <el-button link type="danger" size="small" @click="handleDeleteRecord(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>

          <el-divider />
          <div style="padding:12px;background:#f0f9ff;border-radius:6px;">
            <div style="font-weight:bold;margin-bottom:12px;color:#303133;">项目财务汇总</div>
            <el-row :gutter="16">
              <el-col :span="6">
                <div style="text-align:center;">
                  <div style="color:#909399;font-size:12px;">合同金额</div>
                  <div style="font-size:18px;font-weight:bold;color:#409eff;">¥{{ (currentProject.contract_amount || 0).toFixed(2) }}</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div style="text-align:center;">
                  <div style="color:#909399;font-size:12px;">总支出</div>
                  <div style="font-size:18px;font-weight:bold;color:#e6a23c;">¥{{ totalExpenses.toFixed(2) }}</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div style="text-align:center;">
                  <div style="color:#909399;font-size:12px;">总工资</div>
                  <div style="font-size:18px;font-weight:bold;color:#e6a23c;">¥{{ totalSalaries.toFixed(2) }}</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div style="text-align:center;">
                  <div style="color:#909399;font-size:12px;">预估利润</div>
                  <div style="font-size:18px;font-weight:bold;" :style="{color: profit >= 0 ? '#67c23a' : '#f56c6c'}">¥{{ profit.toFixed(2) }}</div>
                </div>
              </el-col>
            </el-row>
            <el-divider style="margin:12px 0;" />
            <el-row :gutter="16">
              <el-col :span="8">
                <div style="text-align:center;">
                  <div style="color:#909399;font-size:12px;">已收款</div>
                  <div style="font-size:16px;font-weight:bold;color:#67c23a;">¥{{ (currentProject.receipt_amount || 0).toFixed(2) }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div style="text-align:center;">
                  <div style="color:#909399;font-size:12px;">待收款</div>
                  <div style="font-size:16px;font-weight:bold;color:#f56c6c;">¥{{ pendingReceipt.toFixed(2) }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div style="text-align:center;">
                  <div style="color:#909399;font-size:12px;">收款进度</div>
                  <div style="font-size:16px;font-weight:bold;">{{ receiptProgress }}%</div>
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-drawer>

      <el-dialog v-model="expenseDialogVisible" :title="expenseDialogTitle" width="600px" @closed="resetExpenseForm">
        <el-form :model="expenseForm" :rules="expenseRules" ref="expenseFormRef" label-width="100px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="支出类型" prop="expense_type">
                <el-select v-model="expenseForm.expense_type" placeholder="请选择" style="width:100%;">
                  <el-option label="材料" value="material" />
                  <el-option label="工具" value="tool" />
                  <el-option label="设备租赁" value="equipment_rental" />
                  <el-option label="运输" value="transport" />
                  <el-option label="餐饮" value="meal" />
                  <el-option label="住宿" value="accommodation" />
                  <el-option label="招待" value="entertainment" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="分类">
                <el-input v-model="expenseForm.category" placeholder="请输入分类" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="标题" prop="title">
                <el-input v-model="expenseForm.title" placeholder="请输入标题" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="金额" prop="amount">
                <el-input-number v-model="expenseForm.amount" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="日期" prop="expense_date">
                <el-date-picker v-model="expenseForm.expense_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="供应商">
                <el-input v-model="expenseForm.supplier" placeholder="请输入供应商" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="支付方式">
                <el-select v-model="expenseForm.payment_method" placeholder="请选择" style="width:100%;">
                  <el-option label="现金" value="cash" />
                  <el-option label="银行转账" value="bank" />
                  <el-option label="微信" value="wechat" />
                  <el-option label="支付宝" value="alipay" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input v-model="expenseForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button @click="expenseDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitExpense" :loading="expenseSubmitting">确定</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="salaryDialogVisible" :title="salaryDialogTitle" width="680px" @closed="resetSalaryForm">
        <el-form :model="salaryForm" :rules="salaryRules" ref="salaryFormRef" label-width="100px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="员工名" prop="staff_name">
                <el-input v-model="salaryForm.staff_name" placeholder="请输入员工姓名" list="salary-staff-list" />
                <datalist id="salary-staff-list">
                  <option v-for="s in staffOptions" :key="s.id" :value="s.name">{{ s.position || '' }}</option>
                </datalist>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="员工类型" prop="staff_type">
                <el-select v-model="salaryForm.staff_type" placeholder="请选择" style="width:100%;">
                  <el-option label="固定工" value="fixed" />
                  <el-option label="临时工" value="temp" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="日期" prop="work_date">
                <el-date-picker v-model="salaryForm.work_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="工作内容">
                <el-input v-model="salaryForm.work_content" placeholder="请输入工作内容" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="薪资类型" prop="salary_type">
                <el-select v-model="salaryForm.salary_type" placeholder="请选择" style="width:100%;" @change="handleSalaryTypeChange">
                  <el-option label="按小时" value="hourly" />
                  <el-option label="按日" value="daily" />
                  <el-option label="计件" value="piece" />
                  <el-option label="预支" value="advance" />
                  <el-option label="奖金" value="bonus" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-select v-model="salaryForm.status" placeholder="请选择" style="width:100%;">
                  <el-option label="未结算" value="unsettled" />
                  <el-option label="已结算" value="settled" />
                  <el-option label="预支" value="advance" />
                </el-select>
              </el-form-item>
            </el-col>
            <template v-if="salaryForm.salary_type === 'hourly'">
              <el-col :span="12">
                <el-form-item label="小时费率">
                  <el-input-number v-model="salaryForm.hourly_rate" :min="0" :precision="2" style="width:100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="工作小时">
                  <el-input-number v-model="salaryForm.work_hours" :min="0" :precision="1" style="width:100%;" />
                </el-form-item>
              </el-col>
            </template>
            <template v-if="salaryForm.salary_type === 'daily'">
              <el-col :span="12">
                <el-form-item label="日薪">
                  <el-input-number v-model="salaryForm.daily_wage" :min="0" :precision="2" style="width:100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="工作天数">
                  <el-input-number v-model="salaryForm.work_days" :min="0" :precision="1" style="width:100%;" />
                </el-form-item>
              </el-col>
            </template>
            <template v-if="salaryForm.salary_type === 'piece'">
              <el-col :span="12">
                <el-form-item label="单件价格">
                  <el-input-number v-model="salaryForm.piece_price" :min="0" :precision="2" style="width:100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="数量">
                  <el-input-number v-model="salaryForm.piece_quantity" :min="0" :precision="0" style="width:100%;" />
                </el-form-item>
              </el-col>
            </template>
            <el-col :span="12">
              <el-form-item label="补贴">
                <el-input-number v-model="salaryForm.subsidy" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="扣款">
                <el-input-number v-model="salaryForm.deduction" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="应发金额">
                <el-input :model-value="calculatedSalaryAmount" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="已发金额">
                <el-input-number v-model="salaryForm.paid_amount" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="支付方式">
                <el-select v-model="salaryForm.payment_method" placeholder="请选择" style="width:100%;">
                  <el-option label="现金" value="cash" />
                  <el-option label="银行转账" value="bank" />
                  <el-option label="微信" value="wechat" />
                  <el-option label="支付宝" value="alipay" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input v-model="salaryForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button @click="salaryDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitSalary" :loading="salarySubmitting">确定</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="recordDialogVisible" :title="recordDialogTitle" width="680px" @closed="resetRecordForm">
        <el-form :model="recordForm" :rules="recordRules" ref="recordFormRef" label-width="100px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="日期" prop="work_date">
                <el-date-picker v-model="recordForm.work_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="工作类型">
                <el-input v-model="recordForm.work_type" placeholder="请输入工作类型" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="客户名称">
                <el-input v-model="recordForm.customer_name" placeholder="请输入客户名称" list="record-customer-list" />
                <datalist id="record-customer-list">
                  <option v-for="c in customerOptions" :key="c.id" :value="c.name">{{ c.short_name || c.name }}</option>
                </datalist>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="工作地址">
                <el-input v-model="recordForm.work_address" placeholder="请输入工作地址" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="工作内容" prop="work_content">
                <el-input v-model="recordForm.work_content" type="textarea" :rows="2" placeholder="请输入工作内容" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="参与人员">
                <el-input v-model="recordForm.staff_names" placeholder="多个用逗号分隔" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="工时">
                <el-input-number v-model="recordForm.work_hours" :min="0" :precision="1" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="材料费">
                <el-input-number v-model="recordForm.material_fee" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="人工费">
                <el-input-number v-model="recordForm.labor_fee" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="其他费">
                <el-input-number v-model="recordForm.other_fee" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="合计费用">
                <el-input :model-value="calculatedRecordTotal" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结算方式">
                <el-select v-model="recordForm.billing_type" placeholder="请选择" style="width:100%;">
                  <el-option label="包工包料" value="lump_sum" />
                  <el-option label="包工不包料" value="labor_only" />
                  <el-option label="按工时" value="hourly" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input v-model="recordForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button @click="recordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitRecord" :loading="recordSubmitting">确定</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted, nextTick } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const projects = ref([]);
    const customerOptions = ref([]);
    const staffOptions = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const detailVisible = ref(false);
    const isEdit = ref(false);
    const currentProject = ref(null);
    const formRef = ref(null);
    const activeTab = ref('basic');
    const tabLoaded = reactive({ basic: false, expenses: false, salaries: false, records: false });

    const expenses = ref([]);
    const expensesLoading = ref(false);
    const expenseDialogVisible = ref(false);
    const expenseSubmitting = ref(false);
    const isEditExpense = ref(false);
    const expenseFormRef = ref(null);

    const salaries = ref([]);
    const salariesLoading = ref(false);
    const salaryDialogVisible = ref(false);
    const salarySubmitting = ref(false);
    const isEditSalary = ref(false);
    const salaryFormRef = ref(null);

    const workRecords = ref([]);
    const recordsLoading = ref(false);
    const recordDialogVisible = ref(false);
    const recordSubmitting = ref(false);
    const isEditRecord = ref(false);
    const recordFormRef = ref(null);

    const filters = reactive({
      keyword: '',
      status: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const defaultForm = () => ({
      id: null,
      project_no: '',
      name: '',
      customer_name: '',
      contract_no: '',
      project_type: '',
      project_address: '',
      contact_name: '',
      contact_phone: '',
      start_date: '',
      end_date: '',
      contract_amount: 0,
      budget_amount: 0,
      actual_amount: 0,
      tax_type: 'no',
      tax_rate: 3,
      tax_amount: 0,
      status: 'pending',
      manager: '',
      description: '',
      remark: '',
      billing_type: '',
      project_stage: '',
      construction_phase: '',
      actual_start_date: '',
      actual_end_date: '',
      staff_names: '',
      receipt_amount: 0,
      warranty_amount: 0,
    });

    const form = reactive(defaultForm());

    const rules = {
      name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
      customer_name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
      manager: [{ required: true, message: '请输入项目经理', trigger: 'blur' }],
    };

    const defaultExpenseForm = () => ({
      id: null,
      expense_type: 'material',
      category: '',
      title: '',
      amount: 0,
      expense_date: '',
      supplier: '',
      payment_method: 'cash',
      receipt_photos: '',
      remark: '',
    });

    const expenseForm = reactive(defaultExpenseForm());

    const expenseRules = {
      expense_type: [{ required: true, message: '请选择支出类型', trigger: 'change' }],
      title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
      amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
      expense_date: [{ required: true, message: '请选择日期', trigger: 'change' }],
    };

    const defaultSalaryForm = () => ({
      id: null,
      staff_name: '',
      staff_type: 'temp',
      work_date: '',
      work_record_id: null,
      work_content: '',
      salary_type: 'daily',
      hourly_rate: 0,
      work_hours: 0,
      daily_wage: 0,
      work_days: 0,
      piece_price: 0,
      piece_quantity: 0,
      base_amount: 0,
      subsidy: 0,
      deduction: 0,
      payable_amount: 0,
      paid_amount: 0,
      status: 'unsettled',
      payment_method: 'cash',
      remark: '',
    });

    const salaryForm = reactive(defaultSalaryForm());

    const salaryRules = {
      staff_name: [{ required: true, message: '请输入员工姓名', trigger: 'blur' }],
      staff_type: [{ required: true, message: '请选择员工类型', trigger: 'change' }],
      work_date: [{ required: true, message: '请选择日期', trigger: 'change' }],
      salary_type: [{ required: true, message: '请选择薪资类型', trigger: 'change' }],
    };

    const defaultRecordForm = () => ({
      id: null,
      record_no: '',
      work_date: '',
      work_type: '',
      work_content: '',
      customer_name: '',
      work_address: '',
      staff_names: '',
      work_hours: 0,
      material_fee: 0,
      labor_fee: 0,
      other_fee: 0,
      total_fee: 0,
      photos: '',
      remark: '',
      status: 'completed',
      billing_type: '',
    });

    const recordForm = reactive(defaultRecordForm());

    const recordRules = {
      work_date: [{ required: true, message: '请选择日期', trigger: 'change' }],
      work_content: [{ required: true, message: '请输入工作内容', trigger: 'blur' }],
    };

    const isAdmin = computed(() => appStore.isAdmin.value);
    const dialogTitle = computed(() => (isEdit.value ? '编辑项目' : '新增项目'));
    const expenseDialogTitle = computed(() => (isEditExpense.value ? '编辑支出' : '新增支出'));
    const salaryDialogTitle = computed(() => (isEditSalary.value ? '编辑工资' : '新增工资'));
    const recordDialogTitle = computed(() => (isEditRecord.value ? '编辑施工记录' : '新增施工记录'));

    const calculatedTaxAmount = computed(() => {
      if (form.tax_type !== 'tax') return '0.00';
      const rate = Number(form.tax_rate) || 0;
      const amount = Number(form.contract_amount) || 0;
      return (amount * rate / 100).toFixed(2);
    });

    const calculatedSalaryAmount = computed(() => {
      let base = 0;
      if (salaryForm.salary_type === 'hourly') {
        base = (Number(salaryForm.hourly_rate) || 0) * (Number(salaryForm.work_hours) || 0);
      } else if (salaryForm.salary_type === 'daily') {
        base = (Number(salaryForm.daily_wage) || 0) * (Number(salaryForm.work_days) || 0);
      } else if (salaryForm.salary_type === 'piece') {
        base = (Number(salaryForm.piece_price) || 0) * (Number(salaryForm.piece_quantity) || 0);
      }
      const total = base + (Number(salaryForm.subsidy) || 0) - (Number(salaryForm.deduction) || 0);
      return total.toFixed(2);
    });

    const calculatedRecordTotal = computed(() => {
      const total = (Number(recordForm.material_fee) || 0) + (Number(recordForm.labor_fee) || 0) + (Number(recordForm.other_fee) || 0);
      return total.toFixed(2);
    });

    const totalExpenses = computed(() => {
      return expenses.value.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    });

    const totalSalaries = computed(() => {
      return salaries.value.reduce((sum, s) => sum + (Number(s.payable_amount) || 0), 0);
    });

    const profit = computed(() => {
      return (Number(currentProject.value?.contract_amount) || 0) - totalExpenses.value - totalSalaries.value;
    });

    const pendingReceipt = computed(() => {
      return (Number(currentProject.value?.contract_amount) || 0) - (Number(currentProject.value?.receipt_amount) || 0);
    });

    const receiptProgress = computed(() => {
      const contract = Number(currentProject.value?.contract_amount) || 0;
      const receipt = Number(currentProject.value?.receipt_amount) || 0;
      if (contract <= 0) return 0;
      return Math.min(100, (receipt / contract * 100)).toFixed(1);
    });

    const getStatusText = (status) => {
      const map = { pending: '待启动', in_progress: '进行中', completed: '已完成', settled: '已结算', cancelled: '已取消' };
      return map[status] || status;
    };

    const getStatusType = (status) => {
      const map = { pending: 'info', in_progress: 'primary', completed: 'success', settled: 'success', cancelled: 'danger' };
      return map[status] || 'info';
    };

    const getStageText = (stage) => {
      const map = { preparation: '准备', material_prep: '备料', in_progress: '施工', completed: '完工', acceptance: '验收', settled: '结算' };
      return map[stage] || '-';
    };

    const getConstructionPhaseText = (phase) => {
      const map = { piping: '布管', wiring: '穿线', equipment_install: '设备安装', equipment_debug: '设备调试', system_test: '系统测试' };
      return map[phase] || '-';
    };

    const getBillingTypeText = (type) => {
      const map = { lump_sum: '包工包料', labor_only: '包工不包料', hourly: '按工时' };
      return map[type] || '-';
    };

    const getExpenseTypeText = (type) => {
      const map = { material: '材料', tool: '工具', equipment_rental: '设备租赁', transport: '运输', meal: '餐饮', accommodation: '住宿', entertainment: '招待', other: '其他' };
      return map[type] || type;
    };

    const getPaymentMethodText = (method) => {
      const map = { cash: '现金', bank: '银行', wechat: '微信', alipay: '支付宝', other: '其他' };
      return map[method] || method;
    };

    const getSalaryTypeText = (type) => {
      const map = { hourly: '按小时', daily: '按日', piece: '计件', advance: '预支', bonus: '奖金' };
      return map[type] || type;
    };

    const getSalaryStatusText = (status) => {
      const map = { unsettled: '未结算', settled: '已结算', advance: '预支' };
      return map[status] || status;
    };

    const getSalaryStatusType = (status) => {
      const map = { unsettled: 'warning', settled: 'success', advance: 'info' };
      return map[status] || 'info';
    };

    const loadData = () => {
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
      };
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status) params.status = filters.status;
      apiService.getProjects(params)
        .then((res) => {
          const { list, total } = parseListResponse(res);
          projects.value = list;
          pagination.total = total;
        })
        .catch(() => {
          ElMessage.error('加载项目列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const loadCustomers = () => {
      apiService.getCustomers()
        .then((res) => {
          const { list } = parseListResponse(res);
          customerOptions.value = list;
        })
        .catch(() => {});
    };

    const loadStaffs = () => {
      apiService.getStaffs()
        .then((res) => {
          const { list } = parseListResponse(res);
          staffOptions.value = list;
        })
        .catch(() => {});
    };

    const loadExpenses = () => {
      if (!currentProject.value) return;
      expensesLoading.value = true;
      apiService.getProjectExpenses(currentProject.value.id)
        .then((res) => {
          const { list } = parseListResponse(res);
          expenses.value = list;
        })
        .catch(() => {
          ElMessage.error('加载支出记录失败');
        })
        .finally(() => {
          expensesLoading.value = false;
        });
    };

    const loadSalaries = () => {
      if (!currentProject.value) return;
      salariesLoading.value = true;
      apiService.getProjectSalaries(currentProject.value.id)
        .then((res) => {
          const { list } = parseListResponse(res);
          salaries.value = list;
        })
        .catch(() => {
          ElMessage.error('加载工资记录失败');
        })
        .finally(() => {
          salariesLoading.value = false;
        });
    };

    const loadRecords = () => {
      if (!currentProject.value) return;
      recordsLoading.value = true;
      apiService.getProjectRecords(currentProject.value.id)
        .then((res) => {
          const { list } = parseListResponse(res);
          workRecords.value = list;
        })
        .catch(() => {
          ElMessage.error('加载施工记录失败');
        })
        .finally(() => {
          recordsLoading.value = false;
        });
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.status = '';
      pagination.page = 1;
      loadData();
    };

    const handleSizeChange = (size) => {
      pagination.per_page = size;
      pagination.page = 1;
      loadData();
    };

    const handlePageChange = (page) => {
      pagination.page = page;
      loadData();
    };

    const resetForm = () => {
      Object.assign(form, defaultForm());
      nextTick(() => {
        if (formRef.value) {
          formRef.value.clearValidate();
          formRef.value.resetFields();
        }
      });
    };

    const handleCreate = () => {
      Object.assign(form, defaultForm());
      isEdit.value = false;
      dialogVisible.value = true;
      nextTick(() => formRef.value && formRef.value.clearValidate());
    };

    const handleEdit = (row) => {
      Object.assign(form, defaultForm(), {
        id: row.id,
        project_no: row.project_no || '',
        name: row.name || '',
        customer_name: row.customer_name || '',
        contract_no: row.contract_no || '',
        project_type: row.project_type || '',
        status: row.status || 'pending',
        contract_amount: row.contract_amount || 0,
        budget_amount: row.budget_amount || 0,
        actual_amount: row.actual_amount || 0,
        start_date: row.start_date || '',
        end_date: row.end_date || '',
        manager: row.manager || '',
        project_address: row.project_address || '',
        contact_name: row.contact_name || '',
        contact_phone: row.contact_phone || '',
        billing_type: row.billing_type || '',
        project_stage: row.project_stage || '',
        construction_phase: row.construction_phase || '',
        actual_start_date: row.actual_start_date || '',
        actual_end_date: row.actual_end_date || '',
        staff_names: row.staff_names || '',
        receipt_amount: row.receipt_amount || 0,
        warranty_amount: row.warranty_amount || 0,
        tax_type: row.tax_type || 'no',
        tax_rate: row.tax_rate ? (row.tax_rate * 100) : 3,
        tax_amount: row.tax_amount || 0,
        description: row.description || '',
        remark: row.remark || '',
      });
      isEdit.value = true;
      dialogVisible.value = true;
      nextTick(() => formRef.value && formRef.value.clearValidate());
    };

    const handleView = (row) => {
      currentProject.value = row;
      activeTab.value = 'basic';
      tabLoaded.basic = true;
      tabLoaded.expenses = false;
      tabLoaded.salaries = false;
      tabLoaded.records = false;
      expenses.value = [];
      salaries.value = [];
      workRecords.value = [];
      detailVisible.value = true;
    };

    const handleTabChange = (tab) => {
      if (tab === 'expenses' && !tabLoaded.expenses) {
        tabLoaded.expenses = true;
        loadExpenses();
      } else if (tab === 'salaries' && !tabLoaded.salaries) {
        tabLoaded.salaries = true;
        loadSalaries();
      } else if (tab === 'records' && !tabLoaded.records) {
        tabLoaded.records = true;
        loadRecords();
      }
    };

    const handleSubmit = async () => {
      if (!formRef.value) return;
      try {
        await formRef.value.validate();
      } catch (e) {
        return;
      }
      submitting.value = true;
      try {
        const data = { ...form };
        delete data.id;
        if (data.tax_type === 'tax') {
          data.tax_rate = Number(data.tax_rate) / 100;
          data.tax_amount = Number(calculatedTaxAmount.value);
        } else {
          data.tax_rate = 0;
          data.tax_amount = 0;
        }
        if (isEdit.value) {
          await apiService.updateProject(form.id, data);
          ElMessage.success('更新成功');
        } else {
          await apiService.createProject(data);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadData();
      } catch (e) {
      } finally {
        submitting.value = false;
      }
    };

    const handleDelete = (row) => {
      ElMessageBox.confirm(`确定要删除项目「${row.name}」吗？此操作不可恢复。`, '警告', { type: 'warning' })
        .then(async () => {
          try {
            await apiService.deleteProject(row.id);
            ElMessage.success('删除成功');
            loadData();
          } catch (e) {}
        })
        .catch(() => {});
    };

    const resetExpenseForm = () => {
      Object.assign(expenseForm, defaultExpenseForm());
      nextTick(() => {
        if (expenseFormRef.value) {
          expenseFormRef.value.clearValidate();
          expenseFormRef.value.resetFields();
        }
      });
    };

    const handleAddExpense = () => {
      Object.assign(expenseForm, defaultExpenseForm());
      expenseForm.expense_date = dayjs().format('YYYY-MM-DD');
      isEditExpense.value = false;
      expenseDialogVisible.value = true;
      nextTick(() => expenseFormRef.value && expenseFormRef.value.clearValidate());
    };

    const handleEditExpense = (row) => {
      Object.assign(expenseForm, defaultExpenseForm(), {
        id: row.id,
        expense_type: row.expense_type || 'material',
        category: row.category || '',
        title: row.title || '',
        amount: row.amount || 0,
        expense_date: row.expense_date || '',
        supplier: row.supplier || '',
        payment_method: row.payment_method || 'cash',
        receipt_photos: row.receipt_photos || '',
        remark: row.remark || '',
      });
      isEditExpense.value = true;
      expenseDialogVisible.value = true;
      nextTick(() => expenseFormRef.value && expenseFormRef.value.clearValidate());
    };

    const handleSubmitExpense = async () => {
      if (!expenseFormRef.value) return;
      try {
        await expenseFormRef.value.validate();
      } catch (e) {
        return;
      }
      expenseSubmitting.value = true;
      try {
        const data = { ...expenseForm };
        delete data.id;
        if (isEditExpense.value) {
          await apiService.updateProjectExpense(currentProject.value.id, expenseForm.id, data);
          ElMessage.success('更新成功');
        } else {
          await apiService.addProjectExpense(currentProject.value.id, data);
          ElMessage.success('添加成功');
        }
        expenseDialogVisible.value = false;
        loadExpenses();
      } catch (e) {
      } finally {
        expenseSubmitting.value = false;
      }
    };

    const handleDeleteExpense = (row) => {
      ElMessageBox.confirm(`确定要删除这条支出记录吗？`, '警告', { type: 'warning' })
        .then(async () => {
          try {
            await apiService.deleteProjectExpense(currentProject.value.id, row.id);
            ElMessage.success('删除成功');
            loadExpenses();
          } catch (e) {}
        })
        .catch(() => {});
    };

    const resetSalaryForm = () => {
      Object.assign(salaryForm, defaultSalaryForm());
      nextTick(() => {
        if (salaryFormRef.value) {
          salaryFormRef.value.clearValidate();
          salaryFormRef.value.resetFields();
        }
      });
    };

    const handleSalaryTypeChange = () => {
      salaryForm.hourly_rate = 0;
      salaryForm.work_hours = 0;
      salaryForm.daily_wage = 0;
      salaryForm.work_days = 0;
      salaryForm.piece_price = 0;
      salaryForm.piece_quantity = 0;
    };

    const handleAddSalary = () => {
      Object.assign(salaryForm, defaultSalaryForm());
      salaryForm.work_date = dayjs().format('YYYY-MM-DD');
      isEditSalary.value = false;
      salaryDialogVisible.value = true;
      nextTick(() => salaryFormRef.value && salaryFormRef.value.clearValidate());
    };

    const handleEditSalary = (row) => {
      Object.assign(salaryForm, defaultSalaryForm(), {
        id: row.id,
        staff_name: row.staff_name || '',
        staff_type: row.staff_type || 'temp',
        work_date: row.work_date || '',
        work_record_id: row.work_record_id || null,
        work_content: row.work_content || '',
        salary_type: row.salary_type || 'daily',
        hourly_rate: row.hourly_rate || 0,
        work_hours: row.work_hours || 0,
        daily_wage: row.daily_wage || 0,
        work_days: row.work_days || 0,
        piece_price: row.piece_price || 0,
        piece_quantity: row.piece_quantity || 0,
        base_amount: row.base_amount || 0,
        subsidy: row.subsidy || 0,
        deduction: row.deduction || 0,
        payable_amount: row.payable_amount || 0,
        paid_amount: row.paid_amount || 0,
        status: row.status || 'unsettled',
        payment_method: row.payment_method || 'cash',
        remark: row.remark || '',
      });
      isEditSalary.value = true;
      salaryDialogVisible.value = true;
      nextTick(() => salaryFormRef.value && salaryFormRef.value.clearValidate());
    };

    const handleSubmitSalary = async () => {
      if (!salaryFormRef.value) return;
      try {
        await salaryFormRef.value.validate();
      } catch (e) {
        return;
      }
      salarySubmitting.value = true;
      try {
        const data = { ...salaryForm };
        delete data.id;
        data.payable_amount = Number(calculatedSalaryAmount.value);
        if (isEditSalary.value) {
          await apiService.updateProjectSalary(currentProject.value.id, salaryForm.id, data);
          ElMessage.success('更新成功');
        } else {
          await apiService.addProjectSalary(currentProject.value.id, data);
          ElMessage.success('添加成功');
        }
        salaryDialogVisible.value = false;
        loadSalaries();
      } catch (e) {
      } finally {
        salarySubmitting.value = false;
      }
    };

    const handleDeleteSalary = (row) => {
      ElMessageBox.confirm(`确定要删除这条工资记录吗？`, '警告', { type: 'warning' })
        .then(async () => {
          try {
            await apiService.deleteProjectSalary(currentProject.value.id, row.id);
            ElMessage.success('删除成功');
            loadSalaries();
          } catch (e) {}
        })
        .catch(() => {});
    };

    const resetRecordForm = () => {
      Object.assign(recordForm, defaultRecordForm());
      nextTick(() => {
        if (recordFormRef.value) {
          recordFormRef.value.clearValidate();
          recordFormRef.value.resetFields();
        }
      });
    };

    const handleAddRecord = () => {
      Object.assign(recordForm, defaultRecordForm());
      recordForm.work_date = dayjs().format('YYYY-MM-DD');
      recordForm.customer_name = currentProject.value?.customer_name || '';
      recordForm.work_address = currentProject.value?.project_address || '';
      recordForm.staff_names = currentProject.value?.staff_names || '';
      isEditRecord.value = false;
      recordDialogVisible.value = true;
      nextTick(() => recordFormRef.value && recordFormRef.value.clearValidate());
    };

    const handleEditRecord = (row) => {
      Object.assign(recordForm, defaultRecordForm(), {
        id: row.id,
        record_no: row.record_no || '',
        work_date: row.work_date || '',
        work_type: row.work_type || '',
        work_content: row.work_content || '',
        customer_name: row.customer_name || '',
        work_address: row.work_address || '',
        staff_names: row.staff_names || '',
        work_hours: row.work_hours || 0,
        material_fee: row.material_fee || 0,
        labor_fee: row.labor_fee || 0,
        other_fee: row.other_fee || 0,
        total_fee: row.total_fee || 0,
        photos: row.photos || '',
        remark: row.remark || '',
        status: row.status || 'completed',
        billing_type: row.billing_type || '',
      });
      isEditRecord.value = true;
      recordDialogVisible.value = true;
      nextTick(() => recordFormRef.value && recordFormRef.value.clearValidate());
    };

    const handleSubmitRecord = async () => {
      if (!recordFormRef.value) return;
      try {
        await recordFormRef.value.validate();
      } catch (e) {
        return;
      }
      recordSubmitting.value = true;
      try {
        const data = { ...recordForm };
        delete data.id;
        data.total_fee = Number(calculatedRecordTotal.value);
        data.status = 'completed';
        if (isEditRecord.value) {
          await apiService.updateProjectRecord(currentProject.value.id, recordForm.id, data);
          ElMessage.success('更新成功');
        } else {
          await apiService.addProjectRecord(currentProject.value.id, data);
          ElMessage.success('添加成功');
        }
        recordDialogVisible.value = false;
        loadRecords();
      } catch (e) {
      } finally {
        recordSubmitting.value = false;
      }
    };

    const handleDeleteRecord = (row) => {
      ElMessageBox.confirm(`确定要删除这条施工记录吗？`, '警告', { type: 'warning' })
        .then(async () => {
          try {
            await apiService.deleteProjectRecord(currentProject.value.id, row.id);
            ElMessage.success('删除成功');
            loadRecords();
          } catch (e) {}
        })
        .catch(() => {});
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '-';
      try {
        return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
      } catch (e) {
        return dateStr;
      }
    };

    onMounted(() => {
      loadData();
      loadCustomers();
      loadStaffs();
    });

    return {
      projects,
      customerOptions,
      staffOptions,
      loading,
      submitting,
      dialogVisible,
      detailVisible,
      isEdit,
      currentProject,
      formRef,
      activeTab,
      expenses,
      expensesLoading,
      expenseDialogVisible,
      expenseSubmitting,
      isEditExpense,
      expenseFormRef,
      salaries,
      salariesLoading,
      salaryDialogVisible,
      salarySubmitting,
      isEditSalary,
      salaryFormRef,
      workRecords,
      recordsLoading,
      recordDialogVisible,
      recordSubmitting,
      isEditRecord,
      recordFormRef,
      filters,
      pagination,
      form,
      rules,
      expenseForm,
      expenseRules,
      salaryForm,
      salaryRules,
      recordForm,
      recordRules,
      isAdmin,
      dialogTitle,
      expenseDialogTitle,
      salaryDialogTitle,
      recordDialogTitle,
      calculatedTaxAmount,
      calculatedSalaryAmount,
      calculatedRecordTotal,
      totalExpenses,
      totalSalaries,
      profit,
      pendingReceipt,
      receiptProgress,
      getStatusText,
      getStatusType,
      getStageText,
      getConstructionPhaseText,
      getBillingTypeText,
      getExpenseTypeText,
      getPaymentMethodText,
      getSalaryTypeText,
      getSalaryStatusText,
      getSalaryStatusType,
      loadData,
      resetFilters,
      handleSizeChange,
      handlePageChange,
      resetForm,
      handleCreate,
      handleEdit,
      handleView,
      handleTabChange,
      handleSubmit,
      handleDelete,
      resetExpenseForm,
      handleAddExpense,
      handleEditExpense,
      handleSubmitExpense,
      handleDeleteExpense,
      resetSalaryForm,
      handleSalaryTypeChange,
      handleAddSalary,
      handleEditSalary,
      handleSubmitSalary,
      handleDeleteSalary,
      resetRecordForm,
      handleAddRecord,
      handleEditRecord,
      handleSubmitRecord,
      handleDeleteRecord,
      formatDateTime,
    };
  },
};

window.ProjectView = ProjectView;
