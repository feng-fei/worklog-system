
// ========== 收款管理 ==========
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

// 包装switchTab函数以添加数据加载
if (typeof window.switchTab === 'function') {
    var _originalSwitchTab = window.switchTab;
    window.switchTab = function(tabId) {
        _originalSwitchTab.apply(this, arguments);
        // 延迟加载各页面数据
        setTimeout(function() {
            if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
            if (tabId === 'tab-templates') { loadTemplates(); }
            if (tabId === 'tab-projects') { loadProjects(); }
            if (tabId === 'tab-materials') { loadMaterials(); }
            if (tabId === 'tab-equipments') { loadEquipments(); }
            if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
            if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
            if (tabId === 'tab-notifications') { loadNotifySettings(); }
        }, 50);
    };
}

// 初始化模态框
document.addEventListener('DOMContentLoaded', function() {
    _initModals();
});


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

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


function editTemplate(id) {
    if (!_templateModal) _initModals();

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


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

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


function editProject(id) {
    if (!_projectModal) _initModals();

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


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

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


function editMaterial(id) {
    if (!_materialModal) _initModals();

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


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

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


function stockOut(id) {
    if (!_stockModal) _initModals();

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


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

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


function editEquipment(id) {
    if (!_equipmentModal) _initModals();

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


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

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


function editMaintenance(id) {
    if (!_maintenanceModal) _initModals();

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


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

// ========== 简化分页组件 ==========// ========== 简化分页组件 ==========
function _renderSimplePagination(containerId, currentPage, totalPages, loadFn, setPageFn) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    let html_pg = '<ul class="pagination pagination-sm mb-0">';
    html_pg += `<li class="page-item ${currentPage <= 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="return false;" data-page="${currentPage - 1}">上一页</a></li>`;
    const maxShow = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxShow - 1);
    if (end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);
    for (let i = start; i <= end; i++) {
        html_pg += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="return false;" data-page="${i}">${i}</a></li>`;
    }
    html_pg += `<li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="return false;" data-page="${currentPage + 1}">下一页</a></li>`;
    html_pg += '</ul>';
    container.innerHTML = html_pg;
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

// 初始化模态框
document.addEventListener('DOMContentLoaded', function() {
    _initModals();

    // 包装switchTab函数以添加数据加载
    if (typeof window.switchTab === 'function') {
        var _originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            _originalSwitchTab.apply(this, arguments);
            // 延迟加载各页面数据
            setTimeout(function() {
                if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
                if (tabId === 'tab-templates') { loadTemplates(); }
                if (tabId === 'tab-projects') { loadProjects(); }
                if (tabId === 'tab-materials') { loadMaterials(); }
                if (tabId === 'tab-equipments') { loadEquipments(); }
                if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
                if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
                if (tabId === 'tab-notifications') { loadNotifySettings(); }
            }, 50);
        };
    }
});


// ========== 批量操作 ==========
let _selectedRecordIds = [];
let _batchObserver = null;

function _initBatchOperation() {
    // 监听查询结果变化，自动添加复选框
    const target = document.getElementById('queryResults');
    if (!target) return;
    
    if (_batchObserver) _batchObserver.disconnect();
    
    _batchObserver = new MutationObserver(function() {
        _addCheckboxesToCards();
    });
    _batchObserver.observe(target, { childList: true, subtree: true });
    
    // 初始添加一次
    setTimeout(_addCheckboxesToCards, 300);
}

function _addCheckboxesToCards() {
    const cards = document.querySelectorAll('#queryResults .record-card');
    if (!cards.length) return;
    
    let hasCheckbox = false;
    cards.forEach(function(card) {
        if (card.querySelector('.batch-checkbox')) {
            hasCheckbox = true;
            return;
        }
        
        const recordId = card.getAttribute('data-id') || card.getAttribute('data-record-id');
        if (!recordId) return;
        
        const checkbox = document.createElement('div');
        checkbox.className = 'batch-checkbox';
        checkbox.style.cssText = 'position:absolute;top:8px;left:8px;z-index:10;';
        checkbox.innerHTML = '<input type="checkbox" class="form-check-input" value="' + recordId + '" onchange="_toggleRecordSelect(' + recordId + ', this.checked)">';
        card.style.position = 'relative';
        card.insertBefore(checkbox, card.firstChild);
    });
    
    // 更新选中状态
    _updateBatchUI();
}

function _toggleRecordSelect(id, checked) {
    if (checked) {
        if (_selectedRecordIds.indexOf(id) === -1) {
            _selectedRecordIds.push(id);
        }
    } else {
        _selectedRecordIds = _selectedRecordIds.filter(function(x) { return x != id; });
    }
    _updateBatchUI();
}

function _updateBatchUI() {
    const dropdown = document.getElementById('batchActionsDropdown');
    const countEl = document.getElementById('batchSelectedCount');
    if (dropdown) {
        dropdown.style.display = _selectedRecordIds.length > 0 ? 'inline-block' : 'none';
    }
    if (countEl) {
        countEl.textContent = _selectedRecordIds.length;
    }
}

function batchUpdateStatus(status) {
    if (_selectedRecordIds.length === 0) {
        alert('请先选择要操作的工单');
        return;
    }
    if (!confirm('确定要将选中的 ' + _selectedRecordIds.length + ' 条工单状态更新为 ' + status + ' 吗？')) return;
    
    apiFetch('/api/records/batch', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            ids: _selectedRecordIds,
            operation: 'update_status',
            status: status
        })
    }).then(function(r) {
        if (!r.error) {
            alert('批量更新成功，共 ' + r.success_count + ' 条');
            _selectedRecordIds = [];
            _updateBatchUI();
            queryRecords();
        } else {
            alert('操作失败：' + r.error);
        }
    });
}

function batchDeleteRecords() {
    if (_selectedRecordIds.length === 0) {
        alert('请先选择要删除的工单');
        return;
    }
    if (!confirm('确定要删除选中的 ' + _selectedRecordIds.length + ' 条工单吗？此操作不可恢复！')) return;
    
    apiFetch('/api/records/batch', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            ids: _selectedRecordIds,
            operation: 'delete'
        })
    }).then(function(r) {
        if (!r.error) {
            alert('批量删除成功，共 ' + r.success_count + ' 条');
            _selectedRecordIds = [];
            _updateBatchUI();
            queryRecords();
        } else {
            alert('操作失败：' + r.error);
        }
    });
}

// 初始化批量操作
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(_initBatchOperation, 500);
});

// 模板费用计算绑定
document.addEventListener('DOMContentLoaded', function() {
    ['templateLaborFee', 'templateMaterialFee', 'templateTransportFee', 'templateOtherFee', 'templateTaxType', 'templateTaxRate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', _calcTemplateTotal);
    });
    const tplType = document.getElementById('templateType');
    if (tplType) tplType.addEventListener('change', _toggleTemplateType);
});

    document.getElementById('paymentId').value = '';
    document.getElementById('paymentRecordId').value = recordId || '';
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentMethod').value = 'cash';
    document.getElementById('paymentRemark').value = '';
    document.getElementById('paymentModalTitle').textContent = '新增收款';
    _paymentModal.show();
}
