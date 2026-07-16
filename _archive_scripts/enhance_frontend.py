#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强前端功能：添加所有新模块的模态框和完整交互
"""

import re
import os

INDEX_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')

with open(INDEX_PATH, 'r', encoding='utf-8') as f:
    html = f.read()

# ========== 1. 添加模态框 HTML（在 photoViewerModal 之前） ==========

modals_html = '''
<!-- ====== 收款模态框 ====== -->
<div class="modal fade" id="paymentModal" tabindex="-1">
<div class="modal-dialog"><div class="modal-content">
<div class="modal-header">
<h5 class="modal-title"><i class="bi bi-credit-card me-1"></i><span id="paymentModalTitle">新增收款</span></h5>
<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
</div>
<div class="modal-body">
<form id="paymentForm">
<input type="hidden" id="paymentId">
<div class="row g-3">
<div class="col-md-6">
<label class="form-label">关联工单ID <span class="text-danger">*</span></label>
<input type="number" class="form-control" id="paymentRecordId" required>
</div>
<div class="col-md-6">
<label class="form-label">收款金额 <span class="text-danger">*</span></label>
<input type="number" step="0.01" class="form-control" id="paymentAmount" required>
</div>
<div class="col-md-6">
<label class="form-label">收款日期</label>
<input type="date" class="form-control" id="paymentDate">
</div>
<div class="col-md-6">
<label class="form-label">收款方式</label>
<select class="form-select" id="paymentMethod">
<option value="cash">现金</option>
<option value="bank">银行转账</option>
<option value="wechat">微信</option>
<option value="alipay">支付宝</option>
<option value="other">其他</option>
</select>
</div>
<div class="col-12">
<label class="form-label">备注</label>
<textarea class="form-control" id="paymentRemark" rows="2"></textarea>
</div>
</div>
</form>
</div>
<div class="modal-footer">
<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
<button type="button" class="btn btn-primary" onclick="savePayment()">保存</button>
</div>
</div></div>
</div>

<!-- ====== 工单模板模态框 ====== -->
<div class="modal fade" id="templateModal" tabindex="-1">
<div class="modal-dialog modal-lg"><div class="modal-content">
<div class="modal-header">
<h5 class="modal-title"><i class="bi bi-journal-plus me-1"></i><span id="templateModalTitle">新建模板</span></h5>
<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
</div>
<div class="modal-body">
<form id="templateForm">
<input type="hidden" id="templateId">
<div class="row g-3">
<div class="col-md-6">
<label class="form-label">模板名称 <span class="text-danger">*</span></label>
<input type="text" class="form-control" id="templateName" required>
</div>
<div class="col-md-3">
<label class="form-label">模板类型</label>
<select class="form-select" id="templateType">
<option value="construction">施工模板</option>
<option value="repair">维修模板</option>
</select>
</div>
<div class="col-md-3">
<label class="form-label">分类</label>
<input type="text" class="form-control" id="templateCategory" placeholder="如：安防、网络">
</div>
<div class="col-md-6">
<label class="form-label">工单类型</label>
<input type="text" class="form-control" id="templateSubtype" placeholder="如：监控安装、门禁维修">
</div>
<div class="col-md-6">
<label class="form-label">优先级</label>
<select class="form-select" id="templatePriority">
<option value="low">低</option>
<option value="normal" selected>普通</option>
<option value="high">高</option>
<option value="urgent">紧急</option>
</select>
</div>
<div class="col-12">
<label class="form-label">默认员工（逗号分隔）</label>
<input type="text" class="form-control" id="templateStaff" placeholder="张三,李四">
</div>
<div class="col-md-12" id="templateWorkContentRow">
<label class="form-label">施工内容</label>
<textarea class="form-control" id="templateWorkContent" rows="3"></textarea>
</div>
<div class="col-md-12" id="templateFaultDescRow" style="display:none">
<label class="form-label">故障描述</label>
<textarea class="form-control" id="templateFaultDesc" rows="3"></textarea>
</div>
<div class="col-md-3">
<label class="form-label">人工费</label>
<input type="number" step="0.01" class="form-control" id="templateLaborFee" value="0">
</div>
<div class="col-md-3">
<label class="form-label">材料费</label>
<input type="number" step="0.01" class="form-control" id="templateMaterialFee" value="0">
</div>
<div class="col-md-3">
<label class="form-label">交通费</label>
<input type="number" step="0.01" class="form-control" id="templateTransportFee" value="0">
</div>
<div class="col-md-3">
<label class="form-label">其他费用</label>
<input type="number" step="0.01" class="form-control" id="templateOtherFee" value="0">
</div>
<div class="col-md-3">
<label class="form-label">税费类型</label>
<select class="form-select" id="templateTaxType">
<option value="no">不含税</option>
<option value="tax">含税</option>
</select>
</div>
<div class="col-md-3">
<label class="form-label">税率(%)</label>
<input type="number" step="0.01" class="form-control" id="templateTaxRate" value="3">
</div>
<div class="col-md-6">
<label class="form-label">预计总费用</label>
<input type="text" class="form-control" id="templateTotalFee" readonly>
</div>
<div class="col-12">
<label class="form-label">备注</label>
<textarea class="form-control" id="templateRemark" rows="2"></textarea>
</div>
<div class="col-12">
<div class="form-check form-switch">
<input class="form-check-input" type="checkbox" id="templateIsPublic" checked>
<label class="form-check-label">公开模板（所有人可见）</label>
</div>
</div>
</div>
</form>
</div>
<div class="modal-footer">
<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
<button type="button" class="btn btn-primary" onclick="saveTemplate()">保存</button>
</div>
</div></div>
</div>

<!-- ====== 项目模态框 ====== -->
<div class="modal fade" id="projectModal" tabindex="-1">
<div class="modal-dialog modal-lg"><div class="modal-content">
<div class="modal-header">
<h5 class="modal-title"><i class="bi bi-folder-symlink me-1"></i><span id="projectModalTitle">新建项目</span></h5>
<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
</div>
<div class="modal-body">
<form id="projectForm">
<input type="hidden" id="projectId">
<div class="row g-3">
<div class="col-md-6">
<label class="form-label">项目名称 <span class="text-danger">*</span></label>
<input type="text" class="form-control" id="projectName" required>
</div>
<div class="col-md-6">
<label class="form-label">客户名称</label>
<input type="text" class="form-control" id="projectCustomer">
</div>
<div class="col-md-4">
<label class="form-label">项目类型</label>
<input type="text" class="form-control" id="projectType" placeholder="弱电/智能化/安防等">
</div>
<div class="col-md-4">
<label class="form-label">合同编号</label>
<input type="text" class="form-control" id="projectContractNo">
</div>
<div class="col-md-4">
<label class="form-label">项目负责人</label>
<input type="text" class="form-control" id="projectManager">
</div>
<div class="col-12">
<label class="form-label">项目地址</label>
<input type="text" class="form-control" id="projectAddress">
</div>
<div class="col-md-3">
<label class="form-label">联系人</label>
<input type="text" class="form-control" id="projectContactName">
</div>
<div class="col-md-3">
<label class="form-label">联系电话</label>
<input type="text" class="form-control" id="projectContactPhone">
</div>
<div class="col-md-3">
<label class="form-label">开始日期</label>
<input type="date" class="form-control" id="projectStartDate">
</div>
<div class="col-md-3">
<label class="form-label">结束日期</label>
<input type="date" class="form-control" id="projectEndDate">
</div>
<div class="col-md-4">
<label class="form-label">合同金额</label>
<input type="number" step="0.01" class="form-control" id="projectContractAmount" value="0">
</div>
<div class="col-md-4">
<label class="form-label">预算金额</label>
<input type="number" step="0.01" class="form-control" id="projectBudgetAmount" value="0">
</div>
<div class="col-md-4">
<label class="form-label">实际金额</label>
<input type="number" step="0.01" class="form-control" id="projectActualAmount" value="0">
</div>
<div class="col-md-4">
<label class="form-label">项目状态</label>
<select class="form-select" id="projectStatus">
<option value="pending">待启动</option>
<option value="in_progress">进行中</option>
<option value="completed">已完成</option>
<option value="settled">已结算</option>
<option value="cancelled">已取消</option>
</select>
</div>
<div class="col-12">
<label class="form-label">项目描述</label>
<textarea class="form-control" id="projectDescription" rows="3"></textarea>
</div>
<div class="col-12">
<label class="form-label">备注</label>
<textarea class="form-control" id="projectRemark" rows="2"></textarea>
</div>
</div>
</form>
</div>
<div class="modal-footer">
<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
<button type="button" class="btn btn-primary" onclick="saveProject()">保存</button>
</div>
</div></div>
</div>

<!-- ====== 物料模态框 ====== -->
<div class="modal fade" id="materialModal" tabindex="-1">
<div class="modal-dialog modal-lg"><div class="modal-content">
<div class="modal-header">
<h5 class="modal-title"><i class="bi bi-box-seam me-1"></i><span id="materialModalTitle">新增物料</span></h5>
<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
</div>
<div class="modal-body">
<form id="materialForm">
<input type="hidden" id="materialId">
<div class="row g-3">
<div class="col-md-6">
<label class="form-label">物料名称 <span class="text-danger">*</span></label>
<input type="text" class="form-control" id="materialName" required>
</div>
<div class="col-md-3">
<label class="form-label">分类</label>
<input type="text" class="form-control" id="materialCategory" placeholder="线缆/设备/配件">
</div>
<div class="col-md-3">
<label class="form-label">单位</label>
<input type="text" class="form-control" id="materialUnit" value="个">
</div>
<div class="col-md-4">
<label class="form-label">品牌</label>
<input type="text" class="form-control" id="materialBrand">
</div>
<div class="col-md-4">
<label class="form-label">型号</label>
<input type="text" class="form-control" id="materialModel">
</div>
<div class="col-md-4">
<label class="form-label">规格</label>
<input type="text" class="form-control" id="materialSpec">
</div>
<div class="col-md-3">
<label class="form-label">单价</label>
<input type="number" step="0.01" class="form-control" id="materialUnitPrice" value="0">
</div>
<div class="col-md-3">
<label class="form-label">当前库存</label>
<input type="number" step="0.01" class="form-control" id="materialStock" value="0">
</div>
<div class="col-md-3">
<label class="form-label">最低库存预警</label>
<input type="number" step="0.01" class="form-control" id="materialMinStock" value="0">
</div>
<div class="col-md-3">
<label class="form-label">最高库存</label>
<input type="number" step="0.01" class="form-control" id="materialMaxStock" value="0">
</div>
<div class="col-md-6">
<label class="form-label">存放位置</label>
<input type="text" class="form-control" id="materialLocation">
</div>
<div class="col-md-6">
<label class="form-label">供应商</label>
<input type="text" class="form-control" id="materialSupplier">
</div>
<div class="col-12">
<label class="form-label">备注</label>
<textarea class="form-control" id="materialRemark" rows="2"></textarea>
</div>
</div>
</form>
</div>
<div class="modal-footer">
<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
<button type="button" class="btn btn-primary" onclick="saveMaterial()">保存</button>
</div>
</div></div>
</div>

<!-- ====== 库存出入库模态框 ====== -->
<div class="modal fade" id="stockModal" tabindex="-1">
<div class="modal-dialog modal-sm"><div class="modal-content">
<div class="modal-header">
<h5 class="modal-title"><i class="bi bi-arrow-down-up me-1"></i><span id="stockModalTitle">库存操作</span></h5>
<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
</div>
<div class="modal-body">
<form id="stockForm">
<input type="hidden" id="stockMaterialId">
<input type="hidden" id="stockType">
<div class="mb-3">
<label class="form-label">数量 <span class="text-danger">*</span></label>
<input type="number" step="0.01" class="form-control" id="stockQuantity" required min="0.01">
</div>
<div class="mb-3">
<label class="form-label">单价</label>
<input type="number" step="0.01" class="form-control" id="stockUnitPrice" value="0">
</div>
<div class="mb-3">
<label class="form-label">关联工单号</label>
<input type="text" class="form-control" id="stockRelatedNo">
</div>
<div class="mb-3">
<label class="form-label">备注</label>
<textarea class="form-control" id="stockRemark" rows="2"></textarea>
</div>
</form>
</div>
<div class="modal-footer">
<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
<button type="button" class="btn btn-primary" onclick="confirmStockOperation()">确认</button>
</div>
</div></div>
</div>

<!-- ====== 客户设备模态框 ====== -->
<div class="modal fade" id="equipmentModal" tabindex="-1">
<div class="modal-dialog modal-lg"><div class="modal-content">
<div class="modal-header">
<h5 class="modal-title"><i class="bi bi-device-hdd me-1"></i><span id="equipmentModalTitle">新增设备</span></h5>
<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
</div>
<div class="modal-body">
<form id="equipmentForm">
<input type="hidden" id="equipmentId">
<div class="row g-3">
<div class="col-md-6">
<label class="form-label">客户名称 <span class="text-danger">*</span></label>
<input type="text" class="form-control" id="equipmentCustomer" required>
</div>
<div class="col-md-3">
<label class="form-label">设备类型</label>
<input type="text" class="form-control" id="equipmentType" placeholder="摄像头/交换机等">
</div>
<div class="col-md-3">
<label class="form-label">系统类型</label>
<input type="text" class="form-control" id="equipmentSystem" placeholder="监控系统/门禁系统">
</div>
<div class="col-md-4">
<label class="form-label">品牌</label>
<input type="text" class="form-control" id="equipmentBrand">
</div>
<div class="col-md-4">
<label class="form-label">型号</label>
<input type="text" class="form-control" id="equipmentModel">
</div>
<div class="col-md-4">
<label class="form-label">序列号</label>
<input type="text" class="form-control" id="equipmentSerialNo">
</div>
<div class="col-md-3">
<label class="form-label">数量</label>
<input type="number" class="form-control" id="equipmentQuantity" value="1">
</div>
<div class="col-md-3">
<label class="form-label">安装日期</label>
<input type="date" class="form-control" id="equipmentInstallDate">
</div>
<div class="col-md-3">
<label class="form-label">保修开始</label>
<input type="date" class="form-control" id="equipmentWarrantyStart">
</div>
<div class="col-md-3">
<label class="form-label">保修到期</label>
<input type="date" class="form-control" id="equipmentWarrantyEnd">
</div>
<div class="col-12">
<label class="form-label">安装位置</label>
<input type="text" class="form-control" id="equipmentLocation">
</div>
<div class="col-md-4">
<label class="form-label">联系人</label>
<input type="text" class="form-control" id="equipmentContactName">
</div>
<div class="col-md-4">
<label class="form-label">联系电话</label>
<input type="text" class="form-control" id="equipmentContactPhone">
</div>
<div class="col-md-4">
<label class="form-label">设备状态</label>
<select class="form-select" id="equipmentStatus">
<option value="normal">正常</option>
<option value="faulty">故障</option>
<option value="scrapped">已报废</option>
</select>
</div>
<div class="col-md-4">
<label class="form-label">维护周期(天)</label>
<input type="number" class="form-control" id="equipmentMaintCycle" value="0">
</div>
<div class="col-md-4">
<label class="form-label">上次维护</label>
<input type="date" class="form-control" id="equipmentLastMaint">
</div>
<div class="col-md-4">
<label class="form-label">下次维护</label>
<input type="date" class="form-control" id="equipmentNextMaint">
</div>
<div class="col-12">
<label class="form-label">备注</label>
<textarea class="form-control" id="equipmentRemark" rows="2"></textarea>
</div>
</div>
</form>
</div>
<div class="modal-footer">
<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
<button type="button" class="btn btn-primary" onclick="saveEquipment()">保存</button>
</div>
</div></div>
</div>

<!-- ====== 巡检计划模态框 ====== -->
<div class="modal fade" id="maintenanceModal" tabindex="-1">
<div class="modal-dialog modal-lg"><div class="modal-content">
<div class="modal-header">
<h5 class="modal-title"><i class="bi bi-calendar-check me-1"></i><span id="maintenanceModalTitle">新建巡检计划</span></h5>
<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
</div>
<div class="modal-body">
<form id="maintenanceForm">
<input type="hidden" id="maintenanceId">
<div class="row g-3">
<div class="col-md-6">
<label class="form-label">计划名称 <span class="text-danger">*</span></label>
<input type="text" class="form-control" id="maintenanceName" required>
</div>
<div class="col-md-3">
<label class="form-label">计划类型</label>
<select class="form-select" id="maintenancePlanType">
<option value="periodic">周期性</option>
<option value="once">一次性</option>
</select>
</div>
<div class="col-md-3">
<label class="form-label">优先级</label>
<select class="form-select" id="maintenancePriority">
<option value="low">低</option>
<option value="normal" selected>普通</option>
<option value="high">高</option>
<option value="urgent">紧急</option>
</select>
</div>
<div class="col-md-6">
<label class="form-label">客户名称</label>
<input type="text" class="form-control" id="maintenanceCustomer">
</div>
<div class="col-md-6">
<label class="form-label">负责人</label>
<input type="text" class="form-control" id="maintenanceStaff">
</div>
<div class="col-md-4">
<label class="form-label">系统类型</label>
<input type="text" class="form-control" id="maintenanceSystem" placeholder="监控系统/门禁系统">
</div>
<div class="col-md-4">
<label class="form-label">周期类型</label>
<select class="form-select" id="maintenanceCycleType">
<option value="day">天</option>
<option value="week">周</option>
<option value="month" selected>月</option>
<option value="quarter">季度</option>
<option value="year">年</option>
</select>
</div>
<div class="col-md-4">
<label class="form-label">周期值</label>
<input type="number" class="form-control" id="maintenanceCycleValue" value="1">
</div>
<div class="col-md-6">
<label class="form-label">开始日期</label>
<input type="date" class="form-control" id="maintenanceStartDate">
</div>
<div class="col-md-6">
<label class="form-label">结束日期</label>
<input type="date" class="form-control" id="maintenanceEndDate">
</div>
<div class="col-12">
<label class="form-label">巡检内容</label>
<textarea class="form-control" id="maintenanceContent" rows="4" placeholder="详细描述巡检维护的工作内容..."></textarea>
</div>
<div class="col-md-4">
<label class="form-label">状态</label>
<select class="form-select" id="maintenanceStatus">
<option value="active">启用中</option>
<option value="paused">已暂停</option>
<option value="completed">已结束</option>
</select>
</div>
<div class="col-12">
<label class="form-label">备注</label>
<textarea class="form-control" id="maintenanceRemark" rows="2"></textarea>
</div>
</div>
</form>
</div>
<div class="modal-footer">
<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
<button type="button" class="btn btn-primary" onclick="saveMaintenance()">保存</button>
</div>
</div></div>
</div>

'''

# 插入到photoViewerModal之前
photo_marker = '<div id="photoViewerModal" class="is-19">'
html = html.replace(photo_marker, modals_html + photo_marker)


# ========== 2. 增强JavaScript功能 ==========

# 找到旧的JS代码并替换为增强版
old_js_start = '// ========== 收款管理 =========='
old_js_end = '// ========== 简化分页组件 =========='

new_js = '''// ========== 收款管理 ==========
let paymentsPage = 1;
let tplFilterType = 'all';
let templatesPage = 1;
let projectsPage = 1;
let materialsPage = 1;
let equipmentsPage = 1;
let maintenancePage = 1;
let matCurrentCategory = '';
let _paymentModal = null;
let _templateModal = null;
let _projectModal = null;
let _materialModal = null;
let _stockModal = null;
let _equipmentModal = null;
let _maintenanceModal = null;

function _initModals() {
    if (typeof bootstrap !== 'undefined') {
        _paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
        _templateModal = new bootstrap.Modal(document.getElementById('templateModal'));
        _projectModal = new bootstrap.Modal(document.getElementById('projectModal'));
        _materialModal = new bootstrap.Modal(document.getElementById('materialModal'));
        _stockModal = new bootstrap.Modal(document.getElementById('stockModal'));
        _equipmentModal = new bootstrap.Modal(document.getElementById('equipmentModal'));
        _maintenanceModal = new bootstrap.Modal(document.getElementById('maintenanceModal'));
    }
}

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
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">暂无收款记录</td></tr>';
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
                <td><button class="btn btn-sm btn-outline-danger" onclick="deletePayment(${p.id})">删除</button></td>
            </tr>
        `).join('');
        document.getElementById('paymentsTotalInfo').textContent = `共 ${r.total} 条，合计 ¥${r.total_amount.toFixed(2)}`;
        _renderSimplePagination('paymentsPagination', r.page, r.pages, loadPayments, (p) => { paymentsPage = p; });
    });
}

function openPaymentModal(recordId) {
    if (!_paymentModal) _initModals();
    document.getElementById('paymentId').value = '';
    document.getElementById('paymentRecordId').value = recordId || '';
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentMethod').value = 'cash';
    document.getElementById('paymentRemark').value = '';
    document.getElementById('paymentModalTitle').textContent = '新增收款';
    _paymentModal.show();
}

function savePayment() {
    const recordId = document.getElementById('paymentRecordId').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value || 0);
    if (!recordId || amount <= 0) {
        alert('请填写工单ID和收款金额');
        return;
    }
    const data = {
        record_id: parseInt(recordId),
        amount: amount,
        payment_date: document.getElementById('paymentDate').value,
        payment_method: document.getElementById('paymentMethod').value,
        remark: document.getElementById('paymentRemark').value
    };
    apiFetch('/api/payments', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(r => {
        if (!r.error) {
            alert('收款成功！');
            _paymentModal.hide();
            loadPayments();
            loadPaymentStats();
        } else {
            alert('保存失败：' + r.error);
        }
    });
}

function deletePayment(id) {
    if (!confirm('确定删除这条收款记录吗？')) return;
    apiFetch('/api/payments/' + id, {method: 'DELETE'}).then(r => {
        if (!r.error) {
            alert('删除成功');
            loadPayments();
            loadPaymentStats();
        } else {
            alert('删除失败：' + r.error);
        }
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
                            <div class="d-flex gap-1">
                                <button class="btn btn-sm btn-outline-secondary" onclick="editTemplate(${t.id})">编辑</button>
                                <button class="btn btn-sm btn-primary" onclick="applyTemplate(${t.id})">使用</button>
                            </div>
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
    if (!_templateModal) _initModals();
    document.getElementById('templateId').value = '';
    document.getElementById('templateName').value = '';
    document.getElementById('templateType').value = 'construction';
    document.getElementById('templateCategory').value = '';
    document.getElementById('templateSubtype').value = '';
    document.getElementById('templatePriority').value = 'normal';
    document.getElementById('templateStaff').value = '';
    document.getElementById('templateWorkContent').value = '';
    document.getElementById('templateFaultDesc').value = '';
    document.getElementById('templateLaborFee').value = 0;
    document.getElementById('templateMaterialFee').value = 0;
    document.getElementById('templateTransportFee').value = 0;
    document.getElementById('templateOtherFee').value = 0;
    document.getElementById('templateTaxType').value = 'no';
    document.getElementById('templateTaxRate').value = 3;
    document.getElementById('templateRemark').value = '';
    document.getElementById('templateIsPublic').checked = true;
    document.getElementById('templateModalTitle').textContent = '新建模板';
    _toggleTemplateType();
    _calcTemplateTotal();
    _templateModal.show();
}

function editTemplate(id) {
    if (!_templateModal) _initModals();
    apiFetch('/api/templates/' + id).then(r => {
        if (r.error) {
            alert('获取模板失败：' + r.error);
            return;
        }
        document.getElementById('templateId').value = r.id;
        document.getElementById('templateName').value = r.name;
        document.getElementById('templateType').value = r.template_type;
        document.getElementById('templateCategory').value = r.category;
        document.getElementById('templateSubtype').value = r.work_subtype;
        document.getElementById('templatePriority').value = r.priority;
        document.getElementById('templateStaff').value = (r.staff_names || []).join(',');
        document.getElementById('templateWorkContent').value = r.work_content;
        document.getElementById('templateFaultDesc').value = r.fault_description;
        document.getElementById('templateLaborFee').value = r.labor_fee;
        document.getElementById('templateMaterialFee').value = r.material_fee;
        document.getElementById('templateTransportFee').value = r.transport_fee;
        document.getElementById('templateOtherFee').value = r.other_fee;
        document.getElementById('templateTaxType').value = r.tax_type;
        document.getElementById('templateTaxRate').value = r.tax_rate;
        document.getElementById('templateRemark').value = r.remark;
        document.getElementById('templateIsPublic').checked = r.is_public;
        document.getElementById('templateModalTitle').textContent = '编辑模板';
        _toggleTemplateType();
        _calcTemplateTotal();
        _templateModal.show();
    });
}

function _toggleTemplateType() {
    const type = document.getElementById('templateType').value;
    document.getElementById('templateWorkContentRow').style.display = type === 'construction' ? 'block' : 'none';
    document.getElementById('templateFaultDescRow').style.display = type === 'repair' ? 'block' : 'none';
}

function _calcTemplateTotal() {
    const labor = parseFloat(document.getElementById('templateLaborFee').value || 0);
    const material = parseFloat(document.getElementById('templateMaterialFee').value || 0);
    const transport = parseFloat(document.getElementById('templateTransportFee').value || 0);
    const other = parseFloat(document.getElementById('templateOtherFee').value || 0);
    const taxType = document.getElementById('templateTaxType').value;
    const taxRate = parseFloat(document.getElementById('templateTaxRate').value || 0) / 100;
    let total = labor + material + transport + other;
    if (taxType === 'tax') total = total * (1 + taxRate);
    document.getElementById('templateTotalFee').value = '¥' + total.toFixed(2);
}

function saveTemplate() {
    const name = document.getElementById('templateName').value.trim();
    if (!name) {
        alert('请输入模板名称');
        return;
    }
    const staffStr = document.getElementById('templateStaff').value;
    const staff_names = staffStr ? staffStr.split(',').map(s => s.trim()).filter(s => s) : [];
    const data = {
        name: name,
        template_type: document.getElementById('templateType').value,
        category: document.getElementById('templateCategory').value,
        work_subtype: document.getElementById('templateSubtype').value,
        priority: document.getElementById('templatePriority').value,
        staff_names: staff_names,
        work_content: document.getElementById('templateWorkContent').value,
        fault_description: document.getElementById('templateFaultDesc').value,
        labor_fee: parseFloat(document.getElementById('templateLaborFee').value || 0),
        material_fee: parseFloat(document.getElementById('templateMaterialFee').value || 0),
        transport_fee: parseFloat(document.getElementById('templateTransportFee').value || 0),
        other_fee: parseFloat(document.getElementById('templateOtherFee').value || 0),
        tax_type: document.getElementById('templateTaxType').value,
        tax_rate: parseFloat(document.getElementById('templateTaxRate').value || 0),
        remark: document.getElementById('templateRemark').value,
        is_public: document.getElementById('templateIsPublic').checked
    };
    const id = document.getElementById('templateId').value;
    const url = id ? '/api/templates/' + id : '/api/templates';
    const method = id ? 'PUT' : 'POST';
    apiFetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(r => {
        if (!r.error) {
            alert('保存成功');
            _templateModal.hide();
            loadTemplates();
        } else {
            alert('保存失败：' + r.error);
        }
    });
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
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editProject(${p.id})">编辑</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProject(${p.id})">删除</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('projectsTotalInfo').textContent = `共 ${r.total} 条`;
        _renderSimplePagination('projectsPagination', r.page, r.pages, loadProjects, (p) => { projectsPage = p; });
    });
}

function openProjectModal() {
    if (!_projectModal) _initModals();
    document.getElementById('projectId').value = '';
    document.getElementById('projectName').value = '';
    document.getElementById('projectCustomer').value = '';
    document.getElementById('projectType').value = '';
    document.getElementById('projectContractNo').value = '';
    document.getElementById('projectManager').value = '';
    document.getElementById('projectAddress').value = '';
    document.getElementById('projectContactName').value = '';
    document.getElementById('projectContactPhone').value = '';
    document.getElementById('projectStartDate').value = '';
    document.getElementById('projectEndDate').value = '';
    document.getElementById('projectContractAmount').value = 0;
    document.getElementById('projectBudgetAmount').value = 0;
    document.getElementById('projectActualAmount').value = 0;
    document.getElementById('projectStatus').value = 'pending';
    document.getElementById('projectDescription').value = '';
    document.getElementById('projectRemark').value = '';
    document.getElementById('projectModalTitle').textContent = '新建项目';
    _projectModal.show();
}

function editProject(id) {
    if (!_projectModal) _initModals();
    apiFetch('/api/projects/' + id).then(r => {
        if (r.error) {
            alert('获取项目失败：' + r.error);
            return;
        }
        const p = r.project || r;
        document.getElementById('projectId').value = p.id;
        document.getElementById('projectName').value = p.name;
        document.getElementById('projectCustomer').value = p.customer_name || '';
        document.getElementById('projectType').value = p.project_type || '';
        document.getElementById('projectContractNo').value = p.contract_no || '';
        document.getElementById('projectManager').value = p.manager || '';
        document.getElementById('projectAddress').value = p.project_address || '';
        document.getElementById('projectContactName').value = p.contact_name || '';
        document.getElementById('projectContactPhone').value = p.contact_phone || '';
        document.getElementById('projectStartDate').value = p.start_date || '';
        document.getElementById('projectEndDate').value = p.end_date || '';
        document.getElementById('projectContractAmount').value = p.contract_amount || 0;
        document.getElementById('projectBudgetAmount').value = p.budget_amount || 0;
        document.getElementById('projectActualAmount').value = p.actual_amount || 0;
        document.getElementById('projectStatus').value = p.status || 'pending';
        document.getElementById('projectDescription').value = p.description || '';
        document.getElementById('projectRemark').value = p.remark || '';
        document.getElementById('projectModalTitle').textContent = '编辑项目';
        _projectModal.show();
    });
}

function saveProject() {
    const name = document.getElementById('projectName').value.trim();
    if (!name) {
        alert('请输入项目名称');
        return;
    }
    const data = {
        name: name,
        customer_name: document.getElementById('projectCustomer').value,
        project_type: document.getElementById('projectType').value,
        contract_no: document.getElementById('projectContractNo').value,
        manager: document.getElementById('projectManager').value,
        project_address: document.getElementById('projectAddress').value,
        contact_name: document.getElementById('projectContactName').value,
        contact_phone: document.getElementById('projectContactPhone').value,
        start_date: document.getElementById('projectStartDate').value,
        end_date: document.getElementById('projectEndDate').value,
        contract_amount: parseFloat(document.getElementById('projectContractAmount').value || 0),
        budget_amount: parseFloat(document.getElementById('projectBudgetAmount').value || 0),
        actual_amount: parseFloat(document.getElementById('projectActualAmount').value || 0),
        status: document.getElementById('projectStatus').value,
        description: document.getElementById('projectDescription').value,
        remark: document.getElementById('projectRemark').value
    };
    const id = document.getElementById('projectId').value;
    const url = id ? '/api/projects/' + id : '/api/projects';
    const method = id ? 'PUT' : 'POST';
    apiFetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(r => {
        if (!r.error) {
            alert('保存成功');
            _projectModal.hide();
            loadProjects();
        } else {
            alert('保存失败：' + r.error);
        }
    });
}

function deleteProject(id) {
    if (!confirm('确定删除这个项目吗？')) return;
    apiFetch('/api/projects/' + id, {method: 'DELETE'}).then(r => {
        if (!r.error) {
            alert('删除成功');
            loadProjects();
        } else {
            alert('删除失败：' + r.error);
        }
    });
}

function viewProject(id) {
    editProject(id);
}

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
                    <button class="btn btn-sm btn-outline-success" onclick="stockIn(${m.id})">入库</button>
                    <button class="btn btn-sm btn-outline-warning" onclick="stockOut(${m.id})">出库</button>
                    <button class="btn btn-sm btn-outline-primary" onclick="editMaterial(${m.id})">编辑</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('materialsTotalInfo').textContent = `共 ${r.total} 条`;
        document.getElementById('matTotalCount').textContent = r.total;
        let lowStock = 0;
        if (r.records) {
            lowStock = r.records.filter(m => m.is_low_stock).length;
        }
        document.getElementById('matLowStockCount').textContent = lowStock;
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

function openMaterialModal() {
    if (!_materialModal) _initModals();
    document.getElementById('materialId').value = '';
    document.getElementById('materialName').value = '';
    document.getElementById('materialCategory').value = '';
    document.getElementById('materialUnit').value = '个';
    document.getElementById('materialBrand').value = '';
    document.getElementById('materialModel').value = '';
    document.getElementById('materialSpec').value = '';
    document.getElementById('materialUnitPrice').value = 0;
    document.getElementById('materialStock').value = 0;
    document.getElementById('materialMinStock').value = 0;
    document.getElementById('materialMaxStock').value = 0;
    document.getElementById('materialLocation').value = '';
    document.getElementById('materialSupplier').value = '';
    document.getElementById('materialRemark').value = '';
    document.getElementById('materialModalTitle').textContent = '新增物料';
    _materialModal.show();
}

function editMaterial(id) {
    if (!_materialModal) _initModals();
    apiFetch('/api/materials/' + id).then(r => {
        if (r.error) {
            alert('获取物料失败：' + r.error);
            return;
        }
        const m = r.material || r;
        document.getElementById('materialId').value = m.id;
        document.getElementById('materialName').value = m.name;
        document.getElementById('materialCategory').value = m.category || '';
        document.getElementById('materialUnit').value = m.unit || '个';
        document.getElementById('materialBrand').value = m.brand || '';
        document.getElementById('materialModel').value = m.model || '';
        document.getElementById('materialSpec').value = m.spec || '';
        document.getElementById('materialUnitPrice').value = m.unit_price || 0;
        document.getElementById('materialStock').value = m.stock || 0;
        document.getElementById('materialMinStock').value = m.min_stock || 0;
        document.getElementById('materialMaxStock').value = m.max_stock || 0;
        document.getElementById('materialLocation').value = m.location || '';
        document.getElementById('materialSupplier').value = m.supplier || '';
        document.getElementById('materialRemark').value = m.remark || '';
        document.getElementById('materialModalTitle').textContent = '编辑物料';
        _materialModal.show();
    });
}

function saveMaterial() {
    const name = document.getElementById('materialName').value.trim();
    if (!name) {
        alert('请输入物料名称');
        return;
    }
    const data = {
        name: name,
        category: document.getElementById('materialCategory').value,
        unit: document.getElementById('materialUnit').value,
        brand: document.getElementById('materialBrand').value,
        model: document.getElementById('materialModel').value,
        spec: document.getElementById('materialSpec').value,
        unit_price: parseFloat(document.getElementById('materialUnitPrice').value || 0),
        stock: parseFloat(document.getElementById('materialStock').value || 0),
        min_stock: parseFloat(document.getElementById('materialMinStock').value || 0),
        max_stock: parseFloat(document.getElementById('materialMaxStock').value || 0),
        location: document.getElementById('materialLocation').value,
        supplier: document.getElementById('materialSupplier').value,
        remark: document.getElementById('materialRemark').value
    };
    const id = document.getElementById('materialId').value;
    const url = id ? '/api/materials/' + id : '/api/materials';
    const method = id ? 'PUT' : 'POST';
    apiFetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(r => {
        if (!r.error) {
            alert('保存成功');
            _materialModal.hide();
            loadMaterials();
        } else {
            alert('保存失败：' + r.error);
        }
    });
}

function stockIn(id) {
    if (!_stockModal) _initModals();
    document.getElementById('stockMaterialId').value = id;
    document.getElementById('stockType').value = 'in';
    document.getElementById('stockQuantity').value = '';
    document.getElementById('stockUnitPrice').value = 0;
    document.getElementById('stockRelatedNo').value = '';
    document.getElementById('stockRemark').value = '';
    document.getElementById('stockModalTitle').textContent = '物料入库';
    _stockModal.show();
}

function stockOut(id) {
    if (!_stockModal) _initModals();
    document.getElementById('stockMaterialId').value = id;
    document.getElementById('stockType').value = 'out';
    document.getElementById('stockQuantity').value = '';
    document.getElementById('stockUnitPrice').value = 0;
    document.getElementById('stockRelatedNo').value = '';
    document.getElementById('stockRemark').value = '';
    document.getElementById('stockModalTitle').textContent = '物料出库';
    _stockModal.show();
}

function confirmStockOperation() {
    const id = document.getElementById('stockMaterialId').value;
    const type = document.getElementById('stockType').value;
    const qty = parseFloat(document.getElementById('stockQuantity').value || 0);
    if (qty <= 0) {
        alert('请输入数量');
        return;
    }
    const data = {
        log_type: type,
        quantity: qty,
        unit_price: parseFloat(document.getElementById('stockUnitPrice').value || 0),
        related_no: document.getElementById('stockRelatedNo').value,
        remark: document.getElementById('stockRemark').value
    };
    apiFetch('/api/materials/' + id + '/stock', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(r => {
        if (!r.error) {
            alert((type === 'in' ? '入库' : '出库') + '成功！');
            _stockModal.hide();
            loadMaterials();
        } else {
            alert('操作失败：' + r.error);
        }
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
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editEquipment(${e.id})">编辑</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteEquipment(${e.id})">删除</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('equipmentsTotalInfo').textContent = `共 ${r.total} 条`;
        _renderSimplePagination('equipmentsPagination', r.page, r.pages, loadEquipments, (p) => { equipmentsPage = p; });
    });
}

function openEquipmentModal() {
    if (!_equipmentModal) _initModals();
    document.getElementById('equipmentId').value = '';
    document.getElementById('equipmentCustomer').value = '';
    document.getElementById('equipmentType').value = '';
    document.getElementById('equipmentSystem').value = '';
    document.getElementById('equipmentBrand').value = '';
    document.getElementById('equipmentModel').value = '';
    document.getElementById('equipmentSerialNo').value = '';
    document.getElementById('equipmentQuantity').value = 1;
    document.getElementById('equipmentInstallDate').value = '';
    document.getElementById('equipmentWarrantyStart').value = '';
    document.getElementById('equipmentWarrantyEnd').value = '';
    document.getElementById('equipmentLocation').value = '';
    document.getElementById('equipmentContactName').value = '';
    document.getElementById('equipmentContactPhone').value = '';
    document.getElementById('equipmentStatus').value = 'normal';
    document.getElementById('equipmentMaintCycle').value = 0;
    document.getElementById('equipmentLastMaint').value = '';
    document.getElementById('equipmentNextMaint').value = '';
    document.getElementById('equipmentRemark').value = '';
    document.getElementById('equipmentModalTitle').textContent = '新增设备';
    _equipmentModal.show();
}

function editEquipment(id) {
    if (!_equipmentModal) _initModals();
    apiFetch('/api/customer-equipments/' + id).then(r => {
        if (r.error) {
            alert('获取设备失败：' + r.error);
            return;
        }
        const e = r;
        document.getElementById('equipmentId').value = e.id;
        document.getElementById('equipmentCustomer').value = e.customer_name || '';
        document.getElementById('equipmentType').value = e.equipment_type || '';
        document.getElementById('equipmentSystem').value = e.system_type || '';
        document.getElementById('equipmentBrand').value = e.brand || '';
        document.getElementById('equipmentModel').value = e.model || '';
        document.getElementById('equipmentSerialNo').value = e.serial_no || '';
        document.getElementById('equipmentQuantity').value = e.quantity || 1;
        document.getElementById('equipmentInstallDate').value = e.install_date || '';
        document.getElementById('equipmentWarrantyStart').value = e.warranty_start || '';
        document.getElementById('equipmentWarrantyEnd').value = e.warranty_end || '';
        document.getElementById('equipmentLocation').value = e.location || '';
        document.getElementById('equipmentContactName').value = e.contact_name || '';
        document.getElementById('equipmentContactPhone').value = e.contact_phone || '';
        document.getElementById('equipmentStatus').value = e.status || 'normal';
        document.getElementById('equipmentMaintCycle').value = e.maintenance_cycle || 0;
        document.getElementById('equipmentLastMaint').value = e.last_maintenance || '';
        document.getElementById('equipmentNextMaint').value = e.next_maintenance || '';
        document.getElementById('equipmentRemark').value = e.remark || '';
        document.getElementById('equipmentModalTitle').textContent = '编辑设备';
        _equipmentModal.show();
    });
}

function saveEquipment() {
    const customer = document.getElementById('equipmentCustomer').value.trim();
    if (!customer) {
        alert('请输入客户名称');
        return;
    }
    const data = {
        customer_name: customer,
        equipment_type: document.getElementById('equipmentType').value,
        system_type: document.getElementById('equipmentSystem').value,
        brand: document.getElementById('equipmentBrand').value,
        model: document.getElementById('equipmentModel').value,
        serial_no: document.getElementById('equipmentSerialNo').value,
        quantity: parseInt(document.getElementById('equipmentQuantity').value || 1),
        install_date: document.getElementById('equipmentInstallDate').value,
        warranty_start: document.getElementById('equipmentWarrantyStart').value,
        warranty_end: document.getElementById('equipmentWarrantyEnd').value,
        location: document.getElementById('equipmentLocation').value,
        contact_name: document.getElementById('equipmentContactName').value,
        contact_phone: document.getElementById('equipmentContactPhone').value,
        status: document.getElementById('equipmentStatus').value,
        maintenance_cycle: parseInt(document.getElementById('equipmentMaintCycle').value || 0),
        last_maintenance: document.getElementById('equipmentLastMaint').value,
        next_maintenance: document.getElementById('equipmentNextMaint').value,
        remark: document.getElementById('equipmentRemark').value
    };
    const id = document.getElementById('equipmentId').value;
    const url = id ? '/api/customer-equipments/' + id : '/api/customer-equipments';
    const method = id ? 'PUT' : 'POST';
    apiFetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(r => {
        if (!r.error) {
            alert('保存成功');
            _equipmentModal.hide();
            loadEquipments();
        } else {
            alert('保存失败：' + r.error);
        }
    });
}

function deleteEquipment(id) {
    if (!confirm('确定删除这个设备记录吗？')) return;
    apiFetch('/api/customer-equipments/' + id, {method: 'DELETE'}).then(r => {
        if (!r.error) {
            alert('删除成功');
            loadEquipments();
        } else {
            alert('删除失败：' + r.error);
        }
    });
}

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
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editMaintenance(${p.id})">编辑</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMaintenance(${p.id})">删除</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('maintenanceTotalInfo').textContent = `共 ${r.total} 条`;
        _renderSimplePagination('maintenancePagination', r.page, r.pages, loadMaintenancePlans, (p) => { maintenancePage = p; });
    });
}

function openMaintenanceModal() {
    if (!_maintenanceModal) _initModals();
    document.getElementById('maintenanceId').value = '';
    document.getElementById('maintenanceName').value = '';
    document.getElementById('maintenancePlanType').value = 'periodic';
    document.getElementById('maintenanceCustomer').value = '';
    document.getElementById('maintenanceStaff').value = '';
    document.getElementById('maintenanceSystem').value = '';
    document.getElementById('maintenanceCycleType').value = 'month';
    document.getElementById('maintenanceCycleValue').value = 1;
    document.getElementById('maintenanceStartDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('maintenanceEndDate').value = '';
    document.getElementById('maintenanceContent').value = '';
    document.getElementById('maintenancePriority').value = 'normal';
    document.getElementById('maintenanceStatus').value = 'active';
    document.getElementById('maintenanceRemark').value = '';
    document.getElementById('maintenanceModalTitle').textContent = '新建巡检计划';
    _maintenanceModal.show();
}

function editMaintenance(id) {
    if (!_maintenanceModal) _initModals();
    apiFetch('/api/maintenance-plans/' + id).then(r => {
        if (r.error) {
            alert('获取计划失败：' + r.error);
            return;
        }
        const p = r;
        document.getElementById('maintenanceId').value = p.id;
        document.getElementById('maintenanceName').value = p.plan_name;
        document.getElementById('maintenancePlanType').value = p.plan_type || 'periodic';
        document.getElementById('maintenanceCustomer').value = p.customer_name || '';
        document.getElementById('maintenanceStaff').value = p.staff_name || '';
        document.getElementById('maintenanceSystem').value = p.system_type || '';
        document.getElementById('maintenanceCycleType').value = p.cycle_type || 'month';
        document.getElementById('maintenanceCycleValue').value = p.cycle_value || 1;
        document.getElementById('maintenanceStartDate').value = p.start_date || '';
        document.getElementById('maintenanceEndDate').value = p.end_date || '';
        document.getElementById('maintenanceContent').value = p.work_content || '';
        document.getElementById('maintenancePriority').value = p.priority || 'normal';
        document.getElementById('maintenanceStatus').value = p.status || 'active';
        document.getElementById('maintenanceRemark').value = p.remark || '';
        document.getElementById('maintenanceModalTitle').textContent = '编辑巡检计划';
        _maintenanceModal.show();
    });
}

function saveMaintenance() {
    const name = document.getElementById('maintenanceName').value.trim();
    if (!name) {
        alert('请输入计划名称');
        return;
    }
    const data = {
        plan_name: name,
        plan_type: document.getElementById('maintenancePlanType').value,
        customer_name: document.getElementById('maintenanceCustomer').value,
        staff_name: document.getElementById('maintenanceStaff').value,
        system_type: document.getElementById('maintenanceSystem').value,
        cycle_type: document.getElementById('maintenanceCycleType').value,
        cycle_value: parseInt(document.getElementById('maintenanceCycleValue').value || 1),
        start_date: document.getElementById('maintenanceStartDate').value,
        end_date: document.getElementById('maintenanceEndDate').value,
        work_content: document.getElementById('maintenanceContent').value,
        priority: document.getElementById('maintenancePriority').value,
        status: document.getElementById('maintenanceStatus').value,
        remark: document.getElementById('maintenanceRemark').value
    };
    const id = document.getElementById('maintenanceId').value;
    const url = id ? '/api/maintenance-plans/' + id : '/api/maintenance-plans';
    const method = id ? 'PUT' : 'POST';
    apiFetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(r => {
        if (!r.error) {
            alert('保存成功');
            _maintenanceModal.hide();
            loadMaintenancePlans();
        } else {
            alert('保存失败：' + r.error);
        }
    });
}

function deleteMaintenance(id) {
    if (!confirm('确定删除这个巡检计划吗？')) return;
    apiFetch('/api/maintenance-plans/' + id, {method: 'DELETE'}).then(r => {
        if (!r.error) {
            alert('删除成功');
            loadMaintenancePlans();
        } else {
            alert('删除失败：' + r.error);
        }
    });
}

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

// ========== 简化分页组件 =========='''

# 找到旧JS代码的起止位置并替换
# 用正则找到这段代码
import re
pattern = re.compile(r'// ========== 收款管理 ==========.*?// ========== 简化分页组件 ==========', re.DOTALL)
html = pattern.sub(new_js, html)


# ========== 3. 在各页面添加"新增"按钮（收款管理页面补充） ==========

# 收款管理页面头部添加新增按钮
old_pay_header = '''<div class="d-flex gap-2">
<input type="date" class="form-control form-control-sm" id="payStartDate" onchange="loadPayments()">
<input type="date" class="form-control form-control-sm" id="payEndDate" onchange="loadPayments()">
<input type="text" class="form-control form-control-sm" id="paySearch" placeholder="搜索客户..." oninput="loadPayments()">
</div>'''

new_pay_header = '''<div class="d-flex gap-2">
<button class="btn btn-primary btn-sm" onclick="openPaymentModal()"><i class="bi bi-plus-lg me-1"></i>新增收款</button>
<input type="date" class="form-control form-control-sm" id="payStartDate" onchange="loadPayments()">
<input type="date" class="form-control form-control-sm" id="payEndDate" onchange="loadPayments()">
<input type="text" class="form-control form-control-sm" id="paySearch" placeholder="搜索客户..." oninput="loadPayments()">
</div>'''

html = html.replace(old_pay_header, new_pay_header)


# ========== 4. 添加tab切换时加载数据的逻辑 ==========

# 找到switchTab函数附近，添加初始化逻辑
old_switch = 'function switchTab(tabId) {'

new_switch = '''function switchTab(tabId) {
    // 延迟加载各页面数据
    setTimeout(() => {
        if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
        if (tabId === 'tab-templates') { loadTemplates(); }
        if (tabId === 'tab-projects') { loadProjects(); }
        if (tabId === 'tab-materials') { loadMaterials(); }
        if (tabId === 'tab-equipments') { loadEquipments(); }
        if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
        if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
        if (tabId === 'tab-notifications') { loadNotifySettings(); }
    }, 50);
'''

html = html.replace(old_switch, new_switch)


# ========== 5. 添加工单模板费用计算事件 ==========

# 在JS末尾添加模板计算事件绑定
calc_event_js = '''
// 模板费用计算绑定
document.addEventListener('DOMContentLoaded', function() {
    ['templateLaborFee', 'templateMaterialFee', 'templateTransportFee', 'templateOtherFee', 'templateTaxType', 'templateTaxRate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', _calcTemplateTotal);
    });
    const tplType = document.getElementById('templateType');
    if (tplType) tplType.addEventListener('change', _toggleTemplateType);
});
'''

# 找到script结束标签前的位置，在_renderSimplePagination函数之后添加
pagination_end = '    });\n}\n</script>\n\n<script src="js/app.min.js"></script>'

if pagination_end in html:
    html = html.replace(pagination_end, pagination_end + calc_event_js)


# 保存
with open(INDEX_PATH, 'w', encoding='utf-8') as f:
    f.write(html)

print('✅ 前端功能增强完成！')
print('   新增模态框: 收款、工单模板、项目、物料、出入库、设备档案、巡检计划')
print('   完整功能: 增删改查、出入库、统计报表、消息通知配置')
