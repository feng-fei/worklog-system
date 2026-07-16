const FinanceView = {
  template: `
    <div>
      <div class="page-card" style="margin-bottom:16px;">
        <div class="section-title" style="margin-bottom:12px;">财务概览</div>
        <el-row :gutter="16">
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-label">本月收入</div>
              <div class="stat-value success">¥{{ formatMoney(stats.month_income || 0) }}</div>
              <div class="stat-sub">当月实际收款</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-label">本月支出</div>
              <div class="stat-value danger">¥{{ formatMoney(stats.month_expense || 0) }}</div>
              <div class="stat-sub">当月实际支出</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-label">本月利润</div>
              <div class="stat-value primary">¥{{ formatMoney(stats.month_profit || 0) }}</div>
              <div class="stat-sub">收入 - 支出</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-label">应收账款</div>
              <div class="stat-value warning">¥{{ formatMoney(stats.receivable || 0) }}</div>
              <div class="stat-sub">待收工单款项</div>
            </div>
          </el-col>
        </el-row>
      </div>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="收款管理" name="payments">
          <div class="page-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <div class="section-title" style="margin:0;">收款记录</div>
              <div style="display:flex;gap:8px;">
                <el-button type="primary" @click="handleCreatePayment" v-if="isAdmin">
                  <el-icon style="margin-right:4px;"><Plus /></el-icon>
                  新增收款
                </el-button>
                <el-button @click="loadPayments">
                  <el-icon style="margin-right:4px;"><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </div>

            <div class="filter-bar">
              <el-input
                v-model="paymentFilters.keyword"
                placeholder="搜索客户/备注"
                clearable
                style="width:200px;"
                @keyup.enter="loadPayments"
              >
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>

              <el-select v-model="paymentFilters.payment_method" placeholder="支付方式" clearable style="width:120px;">
                <el-option label="全部" value="" />
                <el-option label="现金" value="cash" />
                <el-option label="银行转账" value="bank" />
                <el-option label="微信" value="wechat" />
                <el-option label="支付宝" value="alipay" />
              </el-select>

              <el-date-picker
                v-model="paymentDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width:260px;"
              />

              <el-button type="primary" @click="loadPayments">查询</el-button>
              <el-button @click="resetPaymentFilters">重置</el-button>
            </div>

            <el-table :data="payments" style="width:100%;" v-loading="paymentLoading" stripe>
              <el-table-column prop="payment_date" label="收款日期" width="120">
                <template #default="{ row }">
                  {{ formatDate(row.payment_date) }}
                </template>
              </el-table-column>
              <el-table-column prop="customer_name" label="客户名称" min-width="140" show-overflow-tooltip />
              <el-table-column prop="amount" label="金额" width="120" align="right">
                <template #default="{ row }">
                  <span style="color:#67c23a;font-weight:600;">¥{{ formatMoney(row.amount) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="payment_method" label="支付方式" width="100">
                <template #default="{ row }">
                  {{ getPaymentMethodLabel(row.payment_method) }}
                </template>
              </el-table-column>
              <el-table-column prop="record_id" label="关联工单" width="120">
                <template #default="{ row }">
                  {{ row.record_id ? '工单#' + row.record_id : '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="is_invoiced" label="开票" width="70" align="center">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.is_invoiced ? 'success' : 'info'">
                    {{ row.is_invoiced ? '已开' : '未开' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
              <el-table-column prop="created_by" label="操作人" width="90" />
              <el-table-column label="操作" width="150" fixed="right" v-if="isAdmin">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="handleEditPayment(row)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="handleDeletePayment(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-bar">
              <el-pagination
                v-model:current-page="paymentPagination.page"
                v-model:page-size="paymentPagination.per_page"
                :page-sizes="[10, 20, 50, 100]"
                :total="paymentPagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handlePaymentSizeChange"
                @current-change="handlePaymentPageChange"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="支出管理" name="expenses" v-if="isAdmin">
          <div class="page-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <div class="section-title" style="margin:0;">支出记录</div>
              <div style="display:flex;gap:8px;">
                <el-button type="primary" @click="handleCreateExpense">
                  <el-icon style="margin-right:4px;"><Plus /></el-icon>
                  新增支出
                </el-button>
                <el-button @click="loadExpenses">
                  <el-icon style="margin-right:4px;"><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </div>

            <div class="filter-bar">
              <el-input
                v-model="expenseFilters.keyword"
                placeholder="搜索标题/供应商/备注"
                clearable
                style="width:200px;"
                @keyup.enter="loadExpenses"
              >
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>

              <el-select v-model="expenseFilters.expense_type" placeholder="支出类型" clearable style="width:120px;">
                <el-option label="全部" value="" />
                <el-option label="物料采购" value="purchase" />
                <el-option label="工资支出" value="salary" />
                <el-option label="日常支出" value="daily" />
                <el-option label="其他" value="other" />
              </el-select>

              <el-date-picker
                v-model="expenseDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width:260px;"
              />

              <el-button type="primary" @click="loadExpenses">查询</el-button>
              <el-button @click="resetExpenseFilters">重置</el-button>
            </div>

            <el-table :data="expenses" style="width:100%;" v-loading="expenseLoading" stripe>
              <el-table-column prop="expense_date" label="支出日期" width="120">
                <template #default="{ row }">
                  {{ formatDate(row.expense_date) }}
                </template>
              </el-table-column>
              <el-table-column prop="title" label="支出标题" min-width="150" show-overflow-tooltip />
              <el-table-column prop="expense_type" label="类型" width="100">
                <template #default="{ row }">
                  <el-tag size="small">{{ getExpenseTypeLabel(row.expense_type) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="category" label="分类" width="100" />
              <el-table-column prop="amount" label="金额" width="120" align="right">
                <template #default="{ row }">
                  <span style="color:#f56c6c;font-weight:600;">¥{{ formatMoney(row.amount) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="supplier" label="供应商" width="120" show-overflow-tooltip />
              <el-table-column prop="payment_method" label="支付方式" width="100">
                <template #default="{ row }">
                  {{ getPaymentMethodLabel(row.payment_method) }}
                </template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="handleEditExpense(row)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="handleDeleteExpense(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-bar">
              <el-pagination
                v-model:current-page="expensePagination.page"
                v-model:page-size="expensePagination.per_page"
                :page-sizes="[10, 20, 50, 100]"
                :total="expensePagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleExpenseSizeChange"
                @current-change="handleExpensePageChange"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="利润统计" name="profit" v-if="isAdmin">
          <div class="page-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <div class="section-title" style="margin:0;">利润统计</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <el-date-picker
                  v-model="profitDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  style="width:260px;"
                  @change="loadProfitStats"
                />
                <el-button type="primary" @click="loadProfitStats">
                  <el-icon style="margin-right:4px;"><Refresh /></el-icon>
                  查询
                </el-button>
              </div>
            </div>

            <el-descriptions :column="2" border style="margin-bottom:24px;">
              <el-descriptions-item label="总收入">
                <span style="color:#67c23a;font-size:18px;font-weight:600;">¥{{ formatMoney(profitStats.total_income || 0) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="总支出">
                <span style="color:#f56c6c;font-size:18px;font-weight:600;">¥{{ formatMoney(profitStats.total_expense || 0) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="毛利润">
                <span style="color:#409eff;font-size:18px;font-weight:600;">¥{{ formatMoney(profitStats.gross_profit || 0) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="毛利率">
                <span style="font-size:18px;font-weight:600;">{{ profitStats.gross_margin || 0 }}%</span>
              </el-descriptions-item>
            </el-descriptions>

            <el-row :gutter="16">
              <el-col :span="12">
                <div class="section-title" style="margin-bottom:12px;">收入构成</div>
                <el-table :data="incomeBreakdown || []" size="small" border>
                  <el-table-column prop="name" label="项目" />
                  <el-table-column prop="amount" label="金额" align="right">
                    <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
                  </el-table-column>
                  <el-table-column prop="percent" label="占比" width="100" align="right">
                    <template #default="{ row }">{{ row.percent }}%</template>
                  </el-table-column>
                </el-table>
              </el-col>
              <el-col :span="12">
                <div class="section-title" style="margin-bottom:12px;">支出构成</div>
                <el-table :data="expenseBreakdown || []" size="small" border>
                  <el-table-column prop="name" label="项目" />
                  <el-table-column prop="amount" label="金额" align="right">
                    <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
                  </el-table-column>
                  <el-table-column prop="percent" label="占比" width="100" align="right">
                    <template #default="{ row }">{{ row.percent }}%</template>
                  </el-table-column>
                </el-table>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>
      </el-tabs>

      <el-dialog v-model="paymentDialogVisible" :title="paymentDialogTitle" width="500px">
        <el-form :model="paymentForm" :rules="paymentRules" ref="paymentFormRef" label-width="100px">
          <el-form-item label="收款日期" prop="payment_date">
            <el-date-picker
              v-model="paymentForm.payment_date"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="客户名称" prop="customer_name">
            <el-input v-model="paymentForm.customer_name" placeholder="请输入客户名称" />
          </el-form-item>
          <el-form-item label="金额" prop="amount">
            <el-input-number v-model="paymentForm.amount" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="支付方式">
            <el-select v-model="paymentForm.payment_method" style="width:100%;">
              <el-option label="现金" value="cash" />
              <el-option label="银行转账" value="bank" />
              <el-option label="微信" value="wechat" />
              <el-option label="支付宝" value="alipay" />
            </el-select>
          </el-form-item>
          <el-form-item label="关联工单ID">
            <el-input-number v-model="paymentForm.record_id" :min="0" style="width:100%;" />
          </el-form-item>
          <el-form-item label="是否开票">
            <el-switch v-model="paymentForm.is_invoiced" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="paymentForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="paymentDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handlePaymentSubmit" :loading="paymentSubmitting">确定</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="expenseDialogVisible" :title="expenseDialogTitle" width="500px">
        <el-form :model="expenseForm" :rules="expenseRules" ref="expenseFormRef" label-width="100px">
          <el-form-item label="支出日期" prop="expense_date">
            <el-date-picker
              v-model="expenseForm.expense_date"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="支出标题" prop="title">
            <el-input v-model="expenseForm.title" placeholder="请输入支出标题" />
          </el-form-item>
          <el-form-item label="支出类型" prop="expense_type">
            <el-select v-model="expenseForm.expense_type" style="width:100%;">
              <el-option label="物料采购" value="purchase" />
              <el-option label="工资支出" value="salary" />
              <el-option label="日常支出" value="daily" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="分类">
            <el-input v-model="expenseForm.category" placeholder="请输入分类" />
          </el-form-item>
          <el-form-item label="金额" prop="amount">
            <el-input-number v-model="expenseForm.amount" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="供应商">
            <el-input v-model="expenseForm.supplier" placeholder="请输入供应商" />
          </el-form-item>
          <el-form-item label="支付方式">
            <el-select v-model="expenseForm.payment_method" style="width:100%;">
              <el-option label="现金" value="cash" />
              <el-option label="银行转账" value="bank" />
              <el-option label="微信" value="wechat" />
              <el-option label="支付宝" value="alipay" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="expenseForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="expenseDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleExpenseSubmit" :loading="expenseSubmitting">确定</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const activeTab = ref('payments');
    const isAdmin = computed(() => appStore.isAdmin.value);

    const stats = ref({});

    const payments = ref([]);
    const paymentLoading = ref(false);
    const paymentDateRange = ref([]);
    const paymentDialogVisible = ref(false);
    const paymentDialogTitle = ref('新增收款');
    const paymentFormRef = ref(null);
    const paymentSubmitting = ref(false);
    const isPaymentEdit = ref(false);

    const paymentFilters = reactive({
      keyword: '',
      payment_method: '',
    });

    const paymentPagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const paymentForm = reactive({
      id: null,
      payment_date: '',
      customer_name: '',
      amount: 0,
      payment_method: 'cash',
      record_id: null,
      is_invoiced: false,
      remark: '',
    });

    const paymentRules = {
      payment_date: [{ required: true, message: '请选择收款日期', trigger: 'change' }],
      customer_name: [
        { required: true, message: '请输入客户名称', trigger: 'blur' },
        { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
      ],
      amount: Validators.amount(true, 0.01, 99999999),
    };

    const expenses = ref([]);
    const expenseLoading = ref(false);
    const expenseDateRange = ref([]);
    const expenseDialogVisible = ref(false);
    const expenseDialogTitle = ref('新增支出');
    const expenseFormRef = ref(null);
    const expenseSubmitting = ref(false);
    const isExpenseEdit = ref(false);

    const expenseFilters = reactive({
      keyword: '',
      expense_type: '',
    });

    const expensePagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const expenseForm = reactive({
      id: null,
      expense_date: '',
      title: '',
      expense_type: 'other',
      category: '',
      amount: 0,
      supplier: '',
      payment_method: 'cash',
      remark: '',
    });

    const expenseRules = {
      expense_date: [{ required: true, message: '请选择支出日期', trigger: 'change' }],
      title: [
        { required: true, message: '请输入支出标题', trigger: 'blur' },
        { min: 1, max: 200, message: '长度在 1 到 200 个字符', trigger: 'blur' }
      ],
      amount: Validators.amount(true, 0.01, 99999999),
      category: Validators.length(0, 100, '类别不超过 100 个字符'),
      supplier: Validators.length(0, 100, '供应商不超过 100 个字符')
    };

    const profitStats = ref({});
    const profitDateRange = ref([]);
    const incomeBreakdown = ref([]);
    const expenseBreakdown = ref([]);

    const formatMoney = (val) => {
      const num = parseFloat(val) || 0;
      return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleDateString('zh-CN');
    };

    const getPaymentMethodLabel = (method) => {
      const map = { cash: '现金', bank: '银行转账', wechat: '微信', alipay: '支付宝' };
      return map[method] || method || '-';
    };

    const getExpenseTypeLabel = (type) => {
      const map = { purchase: '物料采购', salary: '工资支出', daily: '日常支出', other: '其他' };
      return map[type] || type || '-';
    };

    const handleTabChange = (tab) => {
      if (tab === 'payments') {
        loadPayments();
      } else if (tab === 'expenses') {
        loadExpenses();
      } else if (tab === 'profit') {
        loadProfitStats();
      }
    };

    const loadOverview = async () => {
      try {
        const res = await apiService.getStatistics();
        stats.value = res || {};
      } catch (e) {
        console.error('加载财务概览失败', e);
      }
    };

    const loadPayments = async () => {
      paymentLoading.value = true;
      try {
        const params = {
          page: paymentPagination.page,
          per_page: paymentPagination.per_page,
        };
        if (paymentFilters.keyword) params.keyword = paymentFilters.keyword;
        if (paymentFilters.payment_method) params.payment_method = paymentFilters.payment_method;
        if (paymentDateRange.value && paymentDateRange.value.length === 2) {
          params.start_date = paymentDateRange.value[0];
          params.end_date = paymentDateRange.value[1];
        }
        const res = await apiService.getPayments(params);
        payments.value = res.records || res.data || [];
        paymentPagination.total = res.total || 0;
      } catch (e) {
        console.error('加载收款列表失败', e);
      } finally {
        paymentLoading.value = false;
      }
    };

    const resetPaymentFilters = () => {
      paymentFilters.keyword = '';
      paymentFilters.payment_method = '';
      paymentDateRange.value = [];
      paymentPagination.page = 1;
      loadPayments();
    };

    const handlePaymentPageChange = (page) => {
      paymentPagination.page = page;
      loadPayments();
    };

    const handlePaymentSizeChange = (size) => {
      paymentPagination.per_page = size;
      paymentPagination.page = 1;
      loadPayments();
    };

    const handleCreatePayment = () => {
      isPaymentEdit.value = false;
      paymentDialogTitle.value = '新增收款';
      Object.assign(paymentForm, {
        id: null,
        payment_date: new Date().toISOString().split('T')[0],
        customer_name: '',
        amount: 0,
        payment_method: 'cash',
        record_id: null,
        is_invoiced: false,
        remark: '',
      });
      paymentDialogVisible.value = true;
    };

    const handleEditPayment = (row) => {
      isPaymentEdit.value = true;
      paymentDialogTitle.value = '编辑收款';
      Object.assign(paymentForm, { ...row });
      paymentDialogVisible.value = true;
    };

    const handleDeletePayment = async (row) => {
      try {
        await ElMessageBox.confirm(`确定删除该收款记录吗？删除后将同步更新工单收款状态。`, '提示', {
          type: 'warning',
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
        });
        await apiService.deletePayment(row.id);
        ElMessage.success('删除成功');
        loadPayments();
        loadOverview();
      } catch (e) {
        // 取消
      }
    };

    const handlePaymentSubmit = async () => {
      if (!paymentFormRef.value) return;
      try {
        await paymentFormRef.value.validate();
      } catch (e) {
        return;
      }
      paymentSubmitting.value = true;
      try {
        if (isPaymentEdit.value) {
          await apiService.updatePayment(paymentForm.id, paymentForm);
          ElMessage.success('更新成功');
        } else {
          await apiService.createPayment(paymentForm);
          ElMessage.success('创建成功');
        }
        paymentDialogVisible.value = false;
        loadPayments();
        loadOverview();
      } catch (e) {
        console.error('提交失败', e);
      } finally {
        paymentSubmitting.value = false;
      }
    };

    const loadExpenses = async () => {
      expenseLoading.value = true;
      try {
        const params = {
          page: expensePagination.page,
          per_page: expensePagination.per_page,
        };
        if (expenseFilters.keyword) params.keyword = expenseFilters.keyword;
        if (expenseFilters.expense_type) params.expense_type = expenseFilters.expense_type;
        if (expenseDateRange.value && expenseDateRange.value.length === 2) {
          params.start_date = expenseDateRange.value[0];
          params.end_date = expenseDateRange.value[1];
        }
        const res = await apiService.getExpenses(params);
        expenses.value = res.records || res.data || res.expenses || [];
        expensePagination.total = res.total || 0;
      } catch (e) {
        console.error('加载支出列表失败', e);
      } finally {
        expenseLoading.value = false;
      }
    };

    const resetExpenseFilters = () => {
      expenseFilters.keyword = '';
      expenseFilters.expense_type = '';
      expenseDateRange.value = [];
      expensePagination.page = 1;
      loadExpenses();
    };

    const handleExpensePageChange = (page) => {
      expensePagination.page = page;
      loadExpenses();
    };

    const handleExpenseSizeChange = (size) => {
      expensePagination.per_page = size;
      expensePagination.page = 1;
      loadExpenses();
    };

    const handleCreateExpense = () => {
      isExpenseEdit.value = false;
      expenseDialogTitle.value = '新增支出';
      Object.assign(expenseForm, {
        id: null,
        expense_date: new Date().toISOString().split('T')[0],
        title: '',
        expense_type: 'other',
        category: '',
        amount: 0,
        supplier: '',
        payment_method: 'cash',
        remark: '',
      });
      expenseDialogVisible.value = true;
    };

    const handleEditExpense = (row) => {
      isExpenseEdit.value = true;
      expenseDialogTitle.value = '编辑支出';
      Object.assign(expenseForm, { ...row });
      expenseDialogVisible.value = true;
    };

    const handleDeleteExpense = async (row) => {
      try {
        await ElMessageBox.confirm(`确定删除该支出记录吗？`, '提示', {
          type: 'warning',
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
        });
        await apiService.deleteExpense(row.id);
        ElMessage.success('删除成功');
        loadExpenses();
        loadOverview();
      } catch (e) {
        // 取消
      }
    };

    const handleExpenseSubmit = async () => {
      if (!expenseFormRef.value) return;
      try {
        await expenseFormRef.value.validate();
      } catch (e) {
        return;
      }
      expenseSubmitting.value = true;
      try {
        if (isExpenseEdit.value) {
          await apiService.updateExpense(expenseForm.id, expenseForm);
          ElMessage.success('更新成功');
        } else {
          await apiService.createExpense(expenseForm);
          ElMessage.success('创建成功');
        }
        expenseDialogVisible.value = false;
        loadExpenses();
        loadOverview();
      } catch (e) {
        console.error('提交失败', e);
      } finally {
        expenseSubmitting.value = false;
      }
    };

    const loadProfitStats = async () => {
      try {
        const params = {};
        if (profitDateRange.value && profitDateRange.value.length === 2) {
          params.start_date = profitDateRange.value[0];
          params.end_date = profitDateRange.value[1];
        }
        const res = await apiService.getProfitStatistics(params);
        profitStats.value = res || {};
        incomeBreakdown.value = res.income_breakdown || [];
        expenseBreakdown.value = res.expense_breakdown || [];
      } catch (e) {
        console.error('加载利润统计失败', e);
      }
    };

    onMounted(() => {
      loadOverview();
      loadPayments();
    });

    return {
      activeTab,
      isAdmin,
      stats,
      payments,
      paymentLoading,
      paymentFilters,
      paymentPagination,
      paymentDateRange,
      paymentDialogVisible,
      paymentDialogTitle,
      paymentFormRef,
      paymentSubmitting,
      paymentForm,
      paymentRules,
      expenses,
      expenseLoading,
      expenseFilters,
      expensePagination,
      expenseDateRange,
      expenseDialogVisible,
      expenseDialogTitle,
      expenseFormRef,
      expenseSubmitting,
      expenseForm,
      expenseRules,
      profitStats,
      profitDateRange,
      incomeBreakdown,
      expenseBreakdown,
      formatMoney,
      formatDate,
      getPaymentMethodLabel,
      getExpenseTypeLabel,
      handleTabChange,
      loadPayments,
      resetPaymentFilters,
      handlePaymentPageChange,
      handlePaymentSizeChange,
      handleCreatePayment,
      handleEditPayment,
      handleDeletePayment,
      handlePaymentSubmit,
      loadExpenses,
      resetExpenseFilters,
      handleExpensePageChange,
      handleExpenseSizeChange,
      handleCreateExpense,
      handleEditExpense,
      handleDeleteExpense,
      handleExpenseSubmit,
      loadProfitStats,
    };
  },
};

window.FinanceView = FinanceView;
