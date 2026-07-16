#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
向前端index.html添加新功能模块：
1. 收款管理
2. 工单模板
3. 项目管理
4. 物料库存
5. 客户设备档案
6. 巡检维护计划
7. 增强统计
8. 消息通知
"""

import re
import os

INDEX_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')

with open(INDEX_PATH, 'r', encoding='utf-8') as f:
    html = f.read()


# ========== 1. 在导航菜单中添加新入口 ==========

# 在"业务"下拉菜单中添加工单模板
old_business_menu = '''<li><a class="dropdown-item" href="#" onclick="switchTab('tab-pending')"><i class="bi bi-clock-history me-2"></i>报修待办 <span class="badge bg-danger rounded-pill ms-1 is-12" id="pendingBadge">0</span></a></li>
</ul>'''

new_business_menu = '''<li><a class="dropdown-item" href="#" onclick="switchTab('tab-pending')"><i class="bi bi-clock-history me-2"></i>报修待办 <span class="badge bg-danger rounded-pill ms-1 is-12" id="pendingBadge">0</span></a></li>
<li><a class="dropdown-item" href="#" onclick="switchTab('tab-templates')"><i class="bi bi-journal-plus me-2"></i>工单模板</a></li>
<li><a class="dropdown-item" href="#" onclick="switchTab('tab-maintenance')"><i class="bi bi-calendar-check me-2"></i>巡检计划</a></li>
</ul>'''

html = html.replace(old_business_menu, new_business_menu)


# 在"查询统计"下拉菜单中添加收款和增强统计
old_insight_menu = '''<li><a class="dropdown-item" href="#" onclick="switchTab('tab-stats')"><i class="bi bi-graph-up me-2"></i>经营统计</a></li>
</ul>'''

new_insight_menu = '''<li><a class="dropdown-item" href="#" onclick="switchTab('tab-stats')"><i class="bi bi-graph-up me-2"></i>经营统计</a></li>
<li><a class="dropdown-item" href="#" onclick="switchTab('tab-payments')"><i class="bi bi-credit-card me-2"></i>收款管理</a></li>
<li><a class="dropdown-item" href="#" onclick="switchTab('tab-advanced-stats')"><i class="bi bi-pie-chart me-2"></i>高级统计</a></li>
</ul>'''

html = html.replace(old_insight_menu, new_insight_menu)


# 在"管理"下拉菜单中添加项目、物料、设备
old_manage_menu = '''<li><a class="dropdown-item" href="#" onclick="switchTab('tab-salary')"><i class="bi bi-cash-coin me-2"></i>工资</a></li>
</ul>'''

new_manage_menu = '''<li><a class="dropdown-item" href="#" onclick="switchTab('tab-salary')"><i class="bi bi-cash-coin me-2"></i>工资</a></li>
<li><a class="dropdown-item" href="#" onclick="switchTab('tab-projects')"><i class="bi bi-folder-symlink me-2"></i>项目管理</a></li>
<li><a class="dropdown-item" href="#" onclick="switchTab('tab-materials')"><i class="bi bi-box-seam me-2"></i>物料库存</a></li>
<li><a class="dropdown-item" href="#" onclick="switchTab('tab-equipments')"><i class="bi bi-device-hdd me-2"></i>设备档案</a></li>
</ul>'''

html = html.replace(old_manage_menu, new_manage_menu)


# 在"设置"下拉菜单中添加消息通知配置
old_settings_menu = '''<li id="oplogMenuLink"><a class="dropdown-item" href="#" onclick="switchTab('tab-oplogs')"><i class="bi bi-clock-history me-2"></i>操作日志</a></li>'''

new_settings_menu = '''<li id="oplogMenuLink"><a class="dropdown-item" href="#" onclick="switchTab('tab-oplogs')"><i class="bi bi-clock-history me-2"></i>操作日志</a></li>
<li><a class="dropdown-item" href="#" onclick="switchTab('tab-notifications')"><i class="bi bi-bell me-2"></i>消息通知</a></li>'''

html = html.replace(old_settings_menu, new_settings_menu)


# ========== 2. 在tab-content中添加新页面 ==========

# 找到tab-oplogs的位置，在它后面添加新的tab页面
oplogs_tab_end = '</div>\n\n\n<!-- ====== 工作台 ====== -->'

new_tabs_html = '''</div>

<!-- ====== 收款管理 ====== -->
<div class="tab-pane fade" id="tab-payments">
<div class="container py-3">
<div class="row g-3 mb-3">
<div class="col-md-3"><div class="card card-accent-green h-100"><div class="card-body"><div class="small text-muted">累计已收款</div><div class="fs-4 fw-bold text-success" id="payTotalReceived">¥0.00</div></div></div></div>
<div class="col-md-3"><div class="card card-accent-orange h-100"><div class="card-body"><div class="small text-muted">应收账款</div><div class="fs-4 fw-bold text-orange" id="payTotalReceivable">¥0.00</div></div></div></div>
<div class="col-md-6"><div class="card h-100"><div class="card-body"><div class="small text-muted mb-2">客户应收TOP10</div><div id="payCustomerReceivable" class="d-flex flex-column gap-1 small"></div></div></div></div>
</div>
<div class="card shadow-sm">
<div class="card-header d-flex align-items-center justify-content-between">
<div class="d-flex align-items-center gap-2"><i class="bi bi-credit-card"></i><span class="fw-semibold">收款记录</span></div>
<div class="d-flex gap-2">
<input type="date" class="form-control form-control-sm" id="payStartDate" onchange="loadPayments()">
<input type="date" class="form-control form-control-sm" id="payEndDate" onchange="loadPayments()">
<input type="text" class="form-control form-control-sm" id="paySearch" placeholder="搜索客户..." oninput="loadPayments()">
</div>
</div>
<div class="card-body p-0">
<div class="table-responsive">
<table class="table table-hover mb-0">
<thead><tr><th>日期</th><th>客户</th><th>金额</th><th>方式</th><th>备注</th><th>操作人</th></tr></thead>
<tbody id="paymentsTableBody"><tr><td colspan="6" class="text-center py-4 text-muted">加载中...</td></tr></tbody>
</table>
</div>
</div>
<div class="card-footer d-flex align-items-center justify-content-between">
<span class="small text-muted" id="paymentsTotalInfo">共 0 条</span>
<nav id="paymentsPagination"></nav>
</div>
</div>
</div>
</div>

<!-- ====== 工单模板 ====== -->
<div class="tab-pane fade" id="tab-templates">
<div class="container py-3">
<div class="d-flex justify-content-between align-items-center mb-3">
<h5 class="mb-0"><i class="bi bi-journal-plus me-2"></i>工单模板</h5>
<button class="btn btn-primary btn-sm" onclick="openTemplateModal()"><i class="bi bi-plus-lg me-1"></i>新建模板</button>
</div>
<div class="d-flex gap-2 mb-3">
<button class="btn btn-sm btn-outline-primary active" onclick="filterTemplates('all', this)">全部</button>
<button class="btn btn-sm btn-outline-secondary" onclick="filterTemplates('construction', this)">施工模板</button>
<button class="btn btn-sm btn-outline-secondary" onclick="filterTemplates('repair', this)">维修模板</button>
<input type="text" class="form-control form-control-sm ms-auto" style="max-width:200px" id="tplSearch" placeholder="搜索模板..." oninput="loadTemplates()">
</div>
<div class="row g-3" id="templatesGrid"></div>
<div class="text-center py-3" id="templatesEmpty" style="display:none"><div class="text-muted">暂无模板，点击右上角新建</div></div>
</div>
</div>

<!-- ====== 项目管理 ====== -->
<div class="tab-pane fade" id="tab-projects">
<div class="container py-3">
<div class="d-flex justify-content-between align-items-center mb-3">
<h5 class="mb-0"><i class="bi bi-folder-symlink me-2"></i>项目管理</h5>
<button class="btn btn-primary btn-sm" onclick="openProjectModal()"><i class="bi bi-plus-lg me-1"></i>新建项目</button>
</div>
<div class="d-flex gap-2 mb-3">
<select class="form-select form-select-sm" style="max-width:150px" id="projStatusFilter" onchange="loadProjects()">
<option value="">全部状态</option>
<option value="pending">待启动</option>
<option value="in_progress">进行中</option>
<option value="completed">已完成</option>
<option value="settled">已结算</option>
</select>
<input type="text" class="form-control form-control-sm ms-auto" style="max-width:250px" id="projSearch" placeholder="搜索项目名称/合同号..." oninput="loadProjects()">
</div>
<div class="card shadow-sm">
<div class="card-body p-0">
<div class="table-responsive">
<table class="table table-hover mb-0">
<thead><tr><th>项目编号</th><th>项目名称</th><th>客户</th><th>类型</th><th>状态</th><th>合同金额</th><th>负责人</th><th>操作</th></tr></thead>
<tbody id="projectsTableBody"><tr><td colspan="8" class="text-center py-4 text-muted">加载中...</td></tr></tbody>
</table>
</div>
</div>
<div class="card-footer d-flex align-items-center justify-content-between">
<span class="small text-muted" id="projectsTotalInfo">共 0 条</span>
<nav id="projectsPagination"></nav>
</div>
</div>
</div>
</div>

<!-- ====== 物料库存 ====== -->
<div class="tab-pane fade" id="tab-materials">
<div class="container py-3">
<div class="row g-3 mb-3">
<div class="col-md-3"><div class="card card-accent-blue h-100"><div class="card-body"><div class="small text-muted">物料总数</div><div class="fs-4 fw-bold" id="matTotalCount">0</div></div></div></div>
<div class="col-md-3"><div class="card card-accent-red h-100"><div class="card-body"><div class="small text-muted">库存预警</div><div class="fs-4 fw-bold text-danger" id="matLowStockCount">0</div></div></div></div>
<div class="col-md-6"><div class="card h-100"><div class="card-body d-flex align-items-center gap-3">
<div class="d-flex flex-wrap gap-2" id="matCategoryTags"></div>
</div></div></div>
</div>
<div class="d-flex justify-content-between align-items-center mb-3">
<h5 class="mb-0"><i class="bi bi-box-seam me-2"></i>物料列表</h5>
<div class="d-flex gap-2">
<div class="form-check form-switch">
<input class="form-check-input" type="checkbox" id="matLowStockOnly" onchange="loadMaterials()">
<label class="form-check-label small" for="matLowStockOnly">仅看预警</label>
</div>
<button class="btn btn-primary btn-sm" onclick="openMaterialModal()"><i class="bi bi-plus-lg me-1"></i>新增物料</button>
</div>
</div>
<div class="card shadow-sm">
<div class="card-body p-0">
<div class="table-responsive">
<table class="table table-hover mb-0">
<thead><tr><th>物料编号</th><th>名称</th><th>分类</th><th>规格型号</th><th>单位</th><th>单价</th><th>库存</th><th>操作</th></tr></thead>
<tbody id="materialsTableBody"><tr><td colspan="8" class="text-center py-4 text-muted">加载中...</td></tr></tbody>
</table>
</div>
</div>
<div class="card-footer d-flex align-items-center justify-content-between">
<span class="small text-muted" id="materialsTotalInfo">共 0 条</span>
<nav id="materialsPagination"></nav>
</div>
</div>
</div>
</div>

<!-- ====== 客户设备档案 ====== -->
<div class="tab-pane fade" id="tab-equipments">
<div class="container py-3">
<div class="d-flex justify-content-between align-items-center mb-3">
<h5 class="mb-0"><i class="bi bi-device-hdd me-2"></i>客户设备档案</h5>
<button class="btn btn-primary btn-sm" onclick="openEquipmentModal()"><i class="bi bi-plus-lg me-1"></i>新增设备</button>
</div>
<div class="d-flex gap-2 mb-3">
<select class="form-select form-select-sm" style="max-width:150px" id="eqStatusFilter" onchange="loadEquipments()">
<option value="">全部状态</option>
<option value="normal">正常</option>
<option value="faulty">故障</option>
<option value="scrapped">已报废</option>
</select>
<div class="form-check form-switch d-flex align-items-center">
<input class="form-check-input" type="checkbox" id="eqWarrantyOnly" onchange="loadEquipments()">
<label class="form-check-label small ms-1" for="eqWarrantyOnly">保修期内</label>
</div>
<div class="form-check form-switch d-flex align-items-center">
<input class="form-check-input" type="checkbox" id="eqDueMaintOnly" onchange="loadEquipments()">
<label class="form-check-label small ms-1" for="eqDueMaintOnly">待维护</label>
</div>
<input type="text" class="form-control form-control-sm ms-auto" style="max-width:250px" id="eqSearch" placeholder="搜索客户/品牌型号..." oninput="loadEquipments()">
</div>
<div class="card shadow-sm">
<div class="card-body p-0">
<div class="table-responsive">
<table class="table table-hover mb-0">
<thead><tr><th>客户</th><th>设备类型</th><th>品牌型号</th><th>数量</th><th>安装日期</th><th>保修到期</th><th>状态</th><th>操作</th></tr></thead>
<tbody id="equipmentsTableBody"><tr><td colspan="8" class="text-center py-4 text-muted">加载中...</td></tr></tbody>
</table>
</div>
</div>
<div class="card-footer d-flex align-items-center justify-content-between">
<span class="small text-muted" id="equipmentsTotalInfo">共 0 条</span>
<nav id="equipmentsPagination"></nav>
</div>
</div>
</div>
</div>

<!-- ====== 巡检维护计划 ====== -->
<div class="tab-pane fade" id="tab-maintenance">
<div class="container py-3">
<div class="d-flex justify-content-between align-items-center mb-3">
<h5 class="mb-0"><i class="bi bi-calendar-check me-2"></i>巡检维护计划</h5>
<div class="d-flex gap-2">
<button class="btn btn-outline-success btn-sm" onclick="generateMaintenanceTodos()"><i class="bi bi-play-circle me-1"></i>生成待办</button>
<button class="btn btn-primary btn-sm" onclick="openMaintenanceModal()"><i class="bi bi-plus-lg me-1"></i>新建计划</button>
</div>
</div>
<div class="d-flex gap-2 mb-3">
<select class="form-select form-select-sm" style="max-width:150px" id="maintStatusFilter" onchange="loadMaintenancePlans()">
<option value="">全部状态</option>
<option value="active">启用中</option>
<option value="paused">已暂停</option>
<option value="completed">已结束</option>
</select>
<input type="text" class="form-control form-control-sm ms-auto" style="max-width:250px" id="maintSearch" placeholder="搜索计划/客户..." oninput="loadMaintenancePlans()">
</div>
<div class="card shadow-sm">
<div class="card-body p-0">
<div class="table-responsive">
<table class="table table-hover mb-0">
<thead><tr><th>计划名称</th><th>客户</th><th>周期</th><th>负责人</th><th>下次执行</th><th>状态</th><th>操作</th></tr></thead>
<tbody id="maintenanceTableBody"><tr><td colspan="7" class="text-center py-4 text-muted">加载中...</td></tr></tbody>
</table>
</div>
</div>
<div class="card-footer d-flex align-items-center justify-content-between">
<span class="small text-muted" id="maintenanceTotalInfo">共 0 条</span>
<nav id="maintenancePagination"></nav>
</div>
</div>
</div>
</div>

<!-- ====== 高级统计 ====== -->
<div class="tab-pane fade" id="tab-advanced-stats">
<div class="container py-3">
<div class="d-flex gap-2 mb-3 align-items-center">
<h5 class="mb-0 me-3"><i class="bi bi-pie-chart me-2"></i>高级统计分析</h5>
<input type="date" class="form-control form-control-sm" style="max-width:150px" id="advStartDate" onchange="loadAdvancedStats()">
<span class="text-muted">至</span>
<input type="date" class="form-control form-control-sm" style="max-width:150px" id="advEndDate" onchange="loadAdvancedStats()">
</div>
<div class="row g-3 mb-3">
<div class="col-md-3"><div class="card card-accent-blue h-100"><div class="card-body"><div class="small text-muted">总工单数</div><div class="fs-4 fw-bold" id="advTotalCount">0</div></div></div></div>
<div class="col-md-3"><div class="card card-accent-green h-100"><div class="card-body"><div class="small text-muted">总营收</div><div class="fs-4 fw-bold text-success" id="advTotalFee">¥0.00</div></div></div></div>
<div class="col-md-3"><div class="card card-accent-orange h-100"><div class="card-body"><div class="small text-muted">已收款</div><div class="fs-4 fw-bold text-orange" id="advPaidAmount">¥0.00</div></div></div></div>
<div class="col-md-3"><div class="card card-accent-red h-100"><div class="card-body"><div class="small text-muted">未收款</div><div class="fs-4 fw-bold text-danger" id="advUnpaidAmount">¥0.00</div></div></div></div>
</div>
<div class="row g-3 mb-3">
<div class="col-md-6"><div class="card h-100"><div class="card-header"><i class="bi bi-bar-chart me-1"></i>按类型统计</div><div class="card-body" id="advByType"></div></div></div>
<div class="col-md-6"><div class="card h-100"><div class="card-header"><i class="bi bi-people me-1"></i>客户TOP10</div><div class="card-body" id="advTopCustomers"></div></div></div>
</div>
<div class="row g-3 mb-3">
<div class="col-md-6"><div class="card h-100"><div class="card-header"><i class="bi bi-person-badge me-1"></i>员工TOP10</div><div class="card-body" id="advTopStaff"></div></div></div>
<div class="col-md-6"><div class="card h-100"><div class="card-header"><i class="bi bi-piggy-bank me-1"></i>利润分析 <span class="badge bg-info ms-1" id="advNetMargin">0%</span></div><div class="card-body" id="advProfit"></div></div></div>
</div>
<div class="card"><div class="card-header"><i class="bi bi-pie-chart me-1"></i>费用构成</div><div class="card-body"><div class="row g-2" id="advFeeBreakdown"></div></div></div>
</div>
</div>

<!-- ====== 消息通知配置 ====== -->
<div class="tab-pane fade" id="tab-notifications">
<div class="container py-3">
<h5 class="mb-3"><i class="bi bi-bell me-2"></i>消息通知配置</h5>
<div class="row">
<div class="col-md-6">
<div class="card shadow-sm">
<div class="card-header">Webhook 配置</div>
<div class="card-body">
<div class="mb-3">
<label class="form-label">通知平台</label>
<select class="form-select" id="notifyPlatform">
<option value="wework">企业微信</option>
<option value="dingtalk">钉钉</option>
</select>
</div>
<div class="mb-3">
<label class="form-label">Webhook 地址</label>
<input type="text" class="form-control" id="notifyWebhookUrl" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...">
<div class="form-text">输入企业微信或钉钉机器人的Webhook地址</div>
</div>
<button class="btn btn-primary me-2" onclick="saveNotifySettings()"><i class="bi bi-save me-1"></i>保存配置</button>
<button class="btn btn-outline-secondary" onclick="testNotification()"><i class="bi bi-send me-1"></i>发送测试</button>
</div>
</div>
</div>
<div class="col-md-6">
<div class="card shadow-sm">
<div class="card-header">通知说明</div>
<div class="card-body">
<div class="small text-muted">
<p><strong>支持的通知场景：</strong></p>
<ul>
<li>新工单创建通知</li>
<li>工单状态变更通知</li>
<li>待办事项提醒</li>
<li>库存预警通知</li>
<li>设备保修到期提醒</li>
</ul>
<p><strong>配置步骤：</strong></p>
<ol>
<li>在企业微信/钉钉群中添加机器人</li>
<li>复制机器人Webhook地址</li>
<li>粘贴到上方输入框并保存</li>
<li>点击"发送测试"验证配置</li>
</ol>
</div>
</div>
</div>
</div>
</div>
</div>
</div>


<!-- ====== 工作台 ====== -->'''

html = html.replace(oplogs_tab_end, new_tabs_html)


# ========== 3. 在script标签前添加新的JavaScript代码 ==========

script_marker = '<script src="js/app.min.js"></script>'

new_js = '''<!-- 新功能模块JS -->
<script>
// ========== 收款管理 ==========
let paymentsPage = 1;
let tplFilterType = 'all';
let templatesPage = 1;
let projectsPage = 1;
let materialsPage = 1;
let equipmentsPage = 1;
let maintenancePage = 1;
let matCurrentCategory = '';

function loadPaymentStats() {
    apiFetch('/api/payments/stats').then(r => {
        if (!r.error) {
            document.getElementById('payTotalReceived').textContent = '¥' + r.total_received.toFixed(2);
            document.getElementById('payTotalReceivable').textContent = '¥' + r.total_receivable.toFixed(2);
            const container = document.getElementById('payCustomerReceivable');
            if (r.customer_receivable && r.customer_receivable.length) {
                container.innerHTML = r.customer_receivable.map(c => `
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-truncate" style="max-width:60%">${c.customer_name}</span>
                        <span class="fw-semibold text-orange">¥${c.amount.toFixed(0)}</span>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="text-muted">暂无数据</div>';
            }
        }
    });
}

function loadPayments() {
    const params = new URLSearchParams({
        page: paymentsPage,
        per_page: 20,
        customer_name: document.getElementById('paySearch').value,
        start_date: document.getElementById('payStartDate').value,
        end_date: document.getElementById('payEndDate').value
    });
    apiFetch('/api/payments?' + params.toString()).then(r => {
        const tbody = document.getElementById('paymentsTableBody');
        if (r.error || !r.records || r.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">暂无收款记录</td></tr>';
            document.getElementById('paymentsTotalInfo').textContent = '共 0 条';
            document.getElementById('paymentsPagination').innerHTML = '';
            return;
        }
        const methods = {cash: '现金', bank: '银行转账', wechat: '微信', alipay: '支付宝', other: '其他'};
        tbody.innerHTML = r.records.map(p => `
            <tr>
                <td>${p.payment_date || ''}</td>
                <td>${p.customer_name || ''}</td>
                <td class="fw-semibold text-success">¥${p.amount.toFixed(2)}</td>
                <td>${methods[p.payment_method] || p.payment_method || '-'}</td>
                <td class="text-muted small">${p.remark || '-'}</td>
                <td class="small">${p.created_by || '-'}</td>
            </tr>
        `).join('');
        document.getElementById('paymentsTotalInfo').textContent = `共 ${r.total} 条，合计 ¥${r.total_amount.toFixed(2)}`;
        _renderSimplePagination('paymentsPagination', r.page, r.pages, loadPayments, (p) => { paymentsPage = p; });
    });
}

// ========== 工单模板 ==========
function loadTemplates() {
    const params = new URLSearchParams({keyword: document.getElementById('tplSearch').value});
    if (tplFilterType !== 'all') params.set('template_type', tplFilterType);
    apiFetch('/api/templates?' + params.toString()).then(r => {
        const grid = document.getElementById('templatesGrid');
        const empty = document.getElementById('templatesEmpty');
        if (r.error || r.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        grid.innerHTML = r.map(t => `
            <div class="col-md-4 col-lg-3">
                <div class="card h-100 template-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="mb-0">${t.name}</h6>
                            <span class="badge ${t.template_type === 'construction' ? 'bg-primary' : 'bg-success'}">${t.template_type === 'construction' ? '施工' : '维修'}</span>
                        </div>
                        <div class="small text-muted mb-2">${t.category || '未分类'}</div>
                        <div class="small mb-2 text-truncate" title="${t.work_content || t.fault_description || ''}">${t.work_content || t.fault_description || '暂无内容'}</div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-semibold text-orange">¥${(t.labor_fee + t.material_fee + t.transport_fee + t.other_fee).toFixed(0)}</span>
                            <button class="btn btn-sm btn-primary" onclick="applyTemplate(${t.id})">使用</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    });
}

function filterTemplates(type, btn) {
    tplFilterType = type;
    document.querySelectorAll('#tab-templates .btn-outline-primary, #tab-templates .btn-outline-secondary').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline-secondary');
    });
    btn.classList.add('active', 'btn-primary');
    btn.classList.remove('btn-outline-secondary');
    loadTemplates();
}

function openTemplateModal() {
    alert('模板编辑功能请在设置中配置');
}

function applyTemplate(id) {
    const customer = prompt('请输入客户名称：');
    if (!customer) return;
    apiFetch('/api/templates/' + id + '/apply', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({customer_name: customer})
    }).then(r => {
        if (!r.error) {
            alert('工单已创建！');
            switchTab('tab-query');
        } else {
            alert('创建失败：' + r.error);
        }
    });
}

// ========== 项目管理 ==========
function loadProjects() {
    const params = new URLSearchParams({
        page: projectsPage,
        per_page: 20,
        status: document.getElementById('projStatusFilter').value,
        keyword: document.getElementById('projSearch').value
    });
    apiFetch('/api/projects?' + params.toString()).then(r => {
        const tbody = document.getElementById('projectsTableBody');
        if (r.error || !r.records || r.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">暂无项目</td></tr>';
            document.getElementById('projectsTotalInfo').textContent = '共 0 条';
            document.getElementById('projectsPagination').innerHTML = '';
            return;
        }
        const statusMap = {pending: '待启动', in_progress: '进行中', completed: '已完成', settled: '已结算', cancelled: '已取消'};
        const statusClass = {pending: 'bg-secondary', in_progress: 'bg-primary', completed: 'bg-success', settled: 'bg-info', cancelled: 'bg-danger'};
        tbody.innerHTML = r.records.map(p => `
            <tr>
                <td><code class="small">${p.project_no}</code></td>
                <td class="fw-semibold">${p.name}</td>
                <td>${p.customer_name || '-'}</td>
                <td>${p.project_type || '-'}</td>
                <td><span class="badge ${statusClass[p.status] || 'bg-secondary'}">${statusMap[p.status] || p.status}</span></td>
                <td>¥${p.contract_amount.toFixed(0)}</td>
                <td>${p.manager || '-'}</td>
                <td><button class="btn btn-sm btn-outline-primary" onclick="viewProject(${p.id})">查看</button></td>
            </tr>
        `).join('');
        document.getElementById('projectsTotalInfo').textContent = `共 ${r.total} 条`;
        _renderSimplePagination('projectsPagination', r.page, r.pages, loadProjects, (p) => { projectsPage = p; });
    });
}

function openProjectModal() { alert('新建项目功能开发中...'); }
function viewProject(id) { alert('项目详情功能开发中...'); }

// ========== 物料库存 ==========
function loadMaterials() {
    const params = new URLSearchParams({
        page: materialsPage,
        per_page: 20,
        keyword: document.getElementById('matSearch') ? document.getElementById('matSearch').value : '',
        low_stock_only: document.getElementById('matLowStockOnly').checked,
        category: matCurrentCategory
    });
    apiFetch('/api/materials?' + params.toString()).then(r => {
        const tbody = document.getElementById('materialsTableBody');
        if (r.error || !r.records || r.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">暂无物料</td></tr>';
            document.getElementById('materialsTotalInfo').textContent = '共 0 条';
            document.getElementById('materialsPagination').innerHTML = '';
            return;
        }
        tbody.innerHTML = r.records.map(m => `
            <tr class="${m.is_low_stock ? 'table-warning' : ''}">
                <td><code class="small">${m.material_no}</code></td>
                <td class="fw-semibold">${m.name}</td>
                <td><span class="badge bg-light text-dark">${m.category || '-'}</span></td>
                <td class="small text-muted">${m.brand || ''} ${m.model || ''} ${m.spec || ''}</td>
                <td>${m.unit}</td>
                <td>¥${m.unit_price.toFixed(2)}</td>
                <td class="${m.is_low_stock ? 'text-danger fw-bold' : ''}">${m.stock} ${m.unit}${m.is_low_stock ? ' ⚠️' : ''}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="stockIn(${m.id})">入库</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="stockOut(${m.id})">出库</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('materialsTotalInfo').textContent = `共 ${r.total} 条`;
        document.getElementById('matTotalCount').textContent = r.total;
        if (r.categories) {
            const tags = document.getElementById('matCategoryTags');
            tags.innerHTML = '<button class="btn btn-sm ' + (matCurrentCategory === '' ? 'btn-primary' : 'btn-outline-secondary') + '" onclick="filterByCategory(\\'\\', this)">全部</button>' +
                r.categories.map(c => '<button class="btn btn-sm ' + (matCurrentCategory === c ? 'btn-primary' : 'btn-outline-secondary') + '" onclick="filterByCategory(\\'' + c + '\\', this)">' + c + '</button>').join('');
        }
        _renderSimplePagination('materialsPagination', r.page, r.pages, loadMaterials, (p) => { materialsPage = p; });
    });
}

function filterByCategory(cat, btn) {
    matCurrentCategory = cat;
    loadMaterials();
}

function openMaterialModal() { alert('新增物料功能开发中...'); }
function stockIn(id) {
    const qty = prompt('请输入入库数量：');
    if (!qty || isNaN(qty)) return;
    apiFetch('/api/materials/' + id + '/stock', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({log_type: 'in', quantity: parseFloat(qty)})
    }).then(r => {
        if (!r.error) { alert('入库成功！'); loadMaterials(); }
        else alert('操作失败：' + r.error);
    });
}
function stockOut(id) {
    const qty = prompt('请输入出库数量：');
    if (!qty || isNaN(qty)) return;
    apiFetch('/api/materials/' + id + '/stock', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({log_type: 'out', quantity: parseFloat(qty)})
    }).then(r => {
        if (!r.error) { alert('出库成功！'); loadMaterials(); }
        else alert('操作失败：' + r.error);
    });
}

// ========== 客户设备档案 ==========
function loadEquipments() {
    const params = new URLSearchParams({
        page: equipmentsPage,
        per_page: 20,
        status: document.getElementById('eqStatusFilter').value,
        keyword: document.getElementById('eqSearch').value,
        warranty_only: document.getElementById('eqWarrantyOnly').checked,
        due_maintenance_only: document.getElementById('eqDueMaintOnly').checked
    });
    apiFetch('/api/customer-equipments?' + params.toString()).then(r => {
        const tbody = document.getElementById('equipmentsTableBody');
        if (r.error || !r.records || r.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">暂无设备</td></tr>';
            document.getElementById('equipmentsTotalInfo').textContent = '共 0 条';
            document.getElementById('equipmentsPagination').innerHTML = '';
            return;
        }
        const statusMap = {normal: '正常', faulty: '故障', scrapped: '已报废'};
        const statusClass = {normal: 'bg-success', faulty: 'bg-warning', scrapped: 'bg-secondary'};
        tbody.innerHTML = r.records.map(e => `
            <tr>
                <td>${e.customer_name}</td>
                <td>${e.equipment_type || e.system_type || '-'}</td>
                <td class="small">${e.brand || ''} ${e.model || ''}</td>
                <td>${e.quantity}</td>
                <td class="small">${e.install_date || '-'}</td>
                <td class="small">
                    ${e.warranty_end || '-'}
                    ${e.is_warranty ? '<span class="badge bg-success ms-1">保修中</span>' : ''}
                </td>
                <td><span class="badge ${statusClass[e.status] || 'bg-secondary'}">${statusMap[e.status] || e.status}</span></td>
                <td><button class="btn btn-sm btn-outline-primary" onclick="editEquipment(${e.id})">编辑</button></td>
            </tr>
        `).join('');
        document.getElementById('equipmentsTotalInfo').textContent = `共 ${r.total} 条`;
        _renderSimplePagination('equipmentsPagination', r.page, r.pages, loadEquipments, (p) => { equipmentsPage = p; });
    });
}

function openEquipmentModal() { alert('新增设备功能开发中...'); }
function editEquipment(id) { alert('设备详情功能开发中...'); }

// ========== 巡检维护计划 ==========
function loadMaintenancePlans() {
    const params = new URLSearchParams({
        page: maintenancePage,
        per_page: 20,
        status: document.getElementById('maintStatusFilter').value,
        customer_name: document.getElementById('maintSearch').value
    });
    apiFetch('/api/maintenance-plans?' + params.toString()).then(r => {
        const tbody = document.getElementById('maintenanceTableBody');
        if (r.error || !r.records || r.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">暂无计划</td></tr>';
            document.getElementById('maintenanceTotalInfo').textContent = '共 0 条';
            document.getElementById('maintenancePagination').innerHTML = '';
            return;
        }
        const cycleMap = {day: '天', week: '周', month: '月', quarter: '季度', year: '年'};
        const statusMap = {active: '启用中', paused: '已暂停', completed: '已结束'};
        const statusClass = {active: 'bg-success', paused: 'bg-warning', completed: 'bg-secondary'};
        tbody.innerHTML = r.records.map(p => `
            <tr>
                <td class="fw-semibold">${p.plan_name}</td>
                <td>${p.customer_name || '-'}</td>
                <td>每${p.cycle_value}${cycleMap[p.cycle_type] || '月'}</td>
                <td>${p.staff_name || '-'}</td>
                <td class="${new Date(p.next_date) < new Date() ? 'text-danger fw-bold' : ''}">${p.next_date || '-'}</td>
                <td><span class="badge ${statusClass[p.status] || 'bg-secondary'}">${statusMap[p.status] || p.status}</span></td>
                <td><button class="btn btn-sm btn-outline-primary" onclick="editMaintenance(${p.id})">编辑</button></td>
            </tr>
        `).join('');
        document.getElementById('maintenanceTotalInfo').textContent = `共 ${r.total} 条`;
        _renderSimplePagination('maintenancePagination', r.page, r.pages, loadMaintenancePlans, (p) => { maintenancePage = p; });
    });
}

function openMaintenanceModal() { alert('新建计划功能开发中...'); }
function editMaintenance(id) { alert('计划详情功能开发中...'); }
function generateMaintenanceTodos() {
    if (!confirm('确定要生成到期的巡检待办吗？')) return;
    apiFetch('/api/maintenance-plans/generate-todos', {method: 'POST'}).then(r => {
        if (!r.error) {
            alert('已生成 ' + r.count + ' 条待办事项！');
            loadMaintenancePlans();
        } else {
            alert('生成失败：' + r.error);
        }
    });
}

// ========== 高级统计 ==========
function loadAdvancedStats() {
    const start = document.getElementById('advStartDate').value;
    const end = document.getElementById('advEndDate').value;
    const params = new URLSearchParams();
    if (start) params.set('start_date', start);
    if (end) params.set('end_date', end);
    
    apiFetch('/api/statistics/advanced?' + params.toString()).then(r => {
        if (r.error) return;
        document.getElementById('advTotalCount').textContent = r.totals.count;
        document.getElementById('advTotalFee').textContent = '¥' + r.totals.total_fee.toFixed(2);
        document.getElementById('advPaidAmount').textContent = '¥' + r.totals.paid_amount.toFixed(2);
        document.getElementById('advUnpaidAmount').textContent = '¥' + r.totals.unpaid_amount.toFixed(2);
        
        const typeLabels = {construction: '施工', repair: '维修'};
        document.getElementById('advByType').innerHTML = r.by_type.map(t => {
            const pct = r.totals.total_fee > 0 ? (t.amount / r.totals.total_fee * 100).toFixed(1) : 0;
            return `<div class="mb-2">
                <div class="d-flex justify-content-between small mb-1">
                    <span>${typeLabels[t.type] || t.type}</span>
                    <span>¥${t.amount.toFixed(0)} (${pct}%)</span>
                </div>
                <div class="progress" style="height:6px"><div class="progress-bar" style="width:${pct}%"></div></div>
            </div>`;
        }).join('');
        
        document.getElementById('advTopCustomers').innerHTML = r.top_customers.map((c, i) => `
            <div class="d-flex justify-content-between align-items-center py-1 border-bottom small">
                <span>${i+1}. ${c.customer_name}</span>
                <span class="fw-semibold">¥${c.amount.toFixed(0)}</span>
            </div>
        `).join('');
        
        document.getElementById('advTopStaff').innerHTML = r.top_staff.map((s, i) => `
            <div class="d-flex justify-content-between align-items-center py-1 border-bottom small">
                <span>${i+1}. ${s.staff_name}</span>
                <span class="fw-semibold">¥${s.amount.toFixed(0)}</span>
            </div>
        `).join('');
        
        const total = r.totals.total_fee || 1;
        document.getElementById('advFeeBreakdown').innerHTML = [
            {label: '人工费', val: r.totals.labor_fee, color: 'bg-primary'},
            {label: '材料费', val: r.totals.material_fee, color: 'bg-success'},
            {label: '交通费', val: r.totals.transport_fee, color: 'bg-info'},
            {label: '其他费', val: r.totals.other_fee, color: 'bg-warning'},
            {label: '税费', val: r.totals.tax_amount, color: 'bg-danger'},
        ].map(f => `
            <div class="col-6 col-md-4 col-lg-2">
                <div class="text-center">
                    <div class="small text-muted">${f.label}</div>
                    <div class="fw-semibold">¥${f.val.toFixed(0)}</div>
                    <div class="small text-muted">${(f.val/total*100).toFixed(1)}%</div>
                </div>
            </div>
        `).join('');
    });
    
    apiFetch('/api/statistics/profit?' + params.toString()).then(r => {
        if (r.error) return;
        document.getElementById('advNetMargin').textContent = r.net_margin + '%';
        document.getElementById('advProfit').innerHTML = `
            <div class="row g-2">
                <div class="col-6"><div class="text-center"><div class="small text-muted">毛利润</div><div class="fw-bold text-success fs-5">¥${r.gross_profit.toFixed(0)}</div><div class="small text-muted">毛利率 ${r.gross_margin}%</div></div></div>
                <div class="col-6"><div class="text-center"><div class="small text-muted">净利润</div><div class="fw-bold text-primary fs-5">¥${r.net_profit.toFixed(0)}</div><div class="small text-muted">净利率 ${r.net_margin}%</div></div></div>
                <div class="col-12 mt-2"><div class="small text-muted">* 净利润 = 总收入 - 材料成本 - 人工工资 - 交通 - 其他 - 税费</div></div>
            </div>
        `;
    });
}

// ========== 消息通知 ==========
function loadNotifySettings() {
    apiFetch('/api/settings').then(r => {
        if (!r.error) {
            document.getElementById('notifyPlatform').value = r.notify_platform || 'wework';
            document.getElementById('notifyWebhookUrl').value = r.notify_webhook_url || '';
        }
    });
}

function saveNotifySettings() {
    const data = {
        notify_platform: document.getElementById('notifyPlatform').value,
        notify_webhook_url: document.getElementById('notifyWebhookUrl').value
    };
    apiFetch('/api/settings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(r => {
        if (!r.error) alert('配置已保存！');
        else alert('保存失败：' + r.error);
    });
}

function testNotification() {
    apiFetch('/api/notifications/test', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            platform: document.getElementById('notifyPlatform').value,
            webhook_url: document.getElementById('notifyWebhookUrl').value,
            content: '这是一条来自瑞翼工作台的测试消息 🎉'
        })
    }).then(r => {
        if (r.success) alert('测试消息发送成功！');
        else alert('发送失败：' + (r.error || '未知错误'));
    });
}

// ========== 简化分页组件 ==========
function _renderSimplePagination(containerId, currentPage, totalPages, loadFn, setPageFn) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    let html = '<ul class="pagination pagination-sm mb-0">';
    html += `<li class="page-item ${currentPage <= 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="return false;" data-page="${currentPage - 1}">上一页</a></li>`;
    const maxShow = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxShow - 1);
    if (end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);
    for (let i = start; i <= end; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="return false;" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="return false;" data-page="${currentPage + 1}">下一页</a></li>`;
    html += '</ul>';
    container.innerHTML = html;
    container.querySelectorAll('.page-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const p = parseInt(link.dataset.page);
            if (p > 0 && p <= totalPages) {
                setPageFn(p);
                loadFn();
            }
        });
    });
}
</script>

<script src="js/app.min.js"></script>'''

html = html.replace(script_marker, new_js)


# ========== 4. 更新CSS版本号 ==========
css_version = 'v=20260714-linear-v22'
new_css_version = 'v=20260715-linear-v23'
html = html.replace(css_version, new_css_version)


with open(INDEX_PATH, 'w', encoding='utf-8') as f:
    f.write(html)

print('✅ 前端功能模块添加完成！')
print(f'   CSS 版本: {new_css_version}')
print('   新增页面: 收款管理、工单模板、项目管理、物料库存、设备档案、巡检计划、高级统计、消息通知')
