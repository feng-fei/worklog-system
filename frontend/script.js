const API_URL = '/api';
let currentTab = 'tab-dashboard';
let allCustomers = [];
let queryRecordType = '';
let queryPaymentStatus = '';
let queryWorkStatus = '';
let lastQueryRecords = [];
let deferredInstallPrompt = null;

// ===================== 认证管理 =====================
function getToken() { return localStorage.getItem('auth_token'); }
function setToken(t) { localStorage.setItem('auth_token', t); }
function clearToken() { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user_name'); localStorage.removeItem('auth_user_role'); }
function getUserName() { return localStorage.getItem('auth_user_name') || ''; }
function getUserRole() { return localStorage.getItem('auth_user_role') || 'worker'; }
function isAdmin() { return getUserRole() === 'admin'; }

async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = options.headers || {};
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    const resp = await fetch(url, { ...options, headers });
    if (resp.status === 401) {
        // 登录接口本身返回 401 时，不要自动跳转
        const isLoginRequest = url.includes('/auth/login');
        if (!isLoginRequest) {
            const data = await resp.clone().json().catch(() => ({}));
            if (data.code === 'AUTH_REQUIRED' || data.code === 'TOKEN_EXPIRED') {
                console.warn('Token expired, clearing...');
                clearToken();
                // 不自动跳转登录页，让页面自行处理
                throw new Error('登录已过期');
            }
        }
    }
    return resp;
}

function updateWelcomeBar() {
    const name = getUserName();
    const company = (localStorage.getItem('companyName') || '瑞翼智能科技').replace(/\s*©\s*\d{4}.*/, '').trim();
    const title = company ? `${company} - 瑞翼工作台` : '瑞翼工作台';
    // 更新footer显示
    const footer = document.getElementById('footerCompanyName');
    if (footer) footer.textContent = company;
    const footerYear = document.getElementById('footerYear');
    if (footerYear) footerYear.textContent = new Date().getFullYear();
    const footerWelcome = document.getElementById('footerWelcome');
    if (footerWelcome && name) footerWelcome.textContent = `当前用户：${name}（${isAdmin() ? '管理员' : '员工'}）`;
}

function showApp(userRole) {
    // 移除 Bootstrap d-flex 类，防止 !important 覆盖 display:none
    const lp = document.getElementById('loginPage');
    lp.classList.remove('d-flex', 'align-items-center', 'justify-content-center');
    lp.style.display = 'none';
    document.getElementById('appContent').style.display = '';
    document.getElementById('dropdownUserInfo').textContent = getUserName() + ' [' + (isAdmin()?'管理员':'员工') + ']';
    // 更新欢迎栏
    updateWelcomeBar();
    updateMobileDockState(currentTab || 'tab-dashboard');
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('appContent').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
    const name = localStorage.getItem('companyName') || '瑞翼智能科技';
    document.getElementById('loginCompanyName').textContent = name;
}

function doLogout() {
    clearToken();
    showLoginPage();
}

function showChangePasswordModal() {
    document.getElementById('cpOld').value = '';
    document.getElementById('cpNew').value = '';
    document.getElementById('cpError').style.display = 'none';
    new bootstrap.Modal(document.getElementById('changePasswordModal')).show();
}

// 照片查看器状态
let pvPhotos = [];
let pvIdx = 0;
let pvZoom = 1;
let pvDrag = false;
let pvDragStart = { x: 0, y: 0 };
let pvTrans = { x: 0, y: 0 };

// ===================== 初始化 =====================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('workDate').value = todayStr();
    // 登录后才加载数据（由 restoreSession 或登录成功回调负责首次加载）
    if (getToken()) {
        loadStaffs(); loadPendingWorks(); loadCustomers(); updatePendingBadge(); loadDashboard();
    }
    // 回车键跳转到下一个输入框（不提交）
    document.querySelectorAll('form input:not([type=hidden]), form select').forEach(el => {
        el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && this.tagName !== 'BUTTON') {
                e.preventDefault();
                const form = this.form;
                const elements = Array.from(form.querySelectorAll('input, textarea, select'));
                const idx = elements.indexOf(this);
                for (let i = idx + 1; i < elements.length; i++) {
                    if (elements[i].type !== 'hidden' && !elements[i].disabled && elements[i].style.display !== 'none') {
                        elements[i].focus();
                        break;
                    }
                }
            }
        });
    });

    document.getElementById('workForm').addEventListener('submit', submitWorkRecord);
    document.getElementById('pendingForm').addEventListener('submit', submitPendingWork);
    document.getElementById('customerForm').addEventListener('submit', submitCustomer);
    document.getElementById('staffForm').addEventListener('submit', submitStaff);
    const sf = document.getElementById('salaryForm'); if (sf) sf.addEventListener('submit', submitSalary);
    document.getElementById('quickCustomerForm').addEventListener('submit', submitQuickCustomer);

    document.getElementById('woCustomerName').addEventListener('change', onCustomerSelect);
    document.getElementById('woCustomerName').addEventListener('blur', onCustomerSelect);
    const pendingCustomerInput = document.querySelector('#pendingForm [name="customer_name"]');
    if (pendingCustomerInput) {
        pendingCustomerInput.addEventListener('change', () => fillCustomerInfoToForm(document.getElementById('pendingForm'), pendingCustomerInput.value));
        pendingCustomerInput.addEventListener('blur', () => fillCustomerInfoToForm(document.getElementById('pendingForm'), pendingCustomerInput.value));
    }

    // 照片查看器 - 关闭方式：按ESC或点击背景
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') pvClose();
        if (document.getElementById('photoViewerModal').style.display === 'flex') {
            if (e.key === 'ArrowLeft') pvPrev();
            if (e.key === 'ArrowRight') pvNext();
        }
    });
    // 点击背景关闭
    document.getElementById('photoViewerModal').addEventListener('click', e => {
        if (e.target === document.getElementById('photoViewerModal')) pvClose();
    });

    const c = document.getElementById('pvContainer');
    c.addEventListener('mousedown', pvStartDrag);
    c.addEventListener('mousemove', pvMoveDrag);
    c.addEventListener('mouseup', pvEndDrag);
    c.addEventListener('mouseleave', pvEndDrag);
    c.addEventListener('touchstart', pvStartDragTouch);
    c.addEventListener('touchmove', pvMoveDragTouch);
    c.addEventListener('touchend', pvEndDrag);
    c.addEventListener('wheel', pvWheel, { passive: false });
    initPwa();
    initStaffEditForm();
    setupMobileNavMenu();
});

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'inline-flex';
});

function initPwa() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js?v=20260621-app44').catch(err => console.warn('SW 注册失败', err));
    }
}

async function installPwa() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'none';
}

const todayStr = () => new Date().toISOString().split('T')[0];
const photoUrl = p => {
    const fn = typeof p === 'string' ? p.split('/').pop() : p;
    return `${API_URL}/uploads/${encodeURIComponent(fn)}`;
};

// ===================== Tab 切换 =====================
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('show', 'active'));
    document.getElementById(tabId).classList.add('show', 'active');
    updateMobileDockState(tabId);
    if (tabId === 'tab-pending') { loadPendingWorks(); updatePendingBadge(); }
    if (tabId === 'tab-customer' || tabId === 'tab-work' || tabId === 'tab-pending') loadCustomers();
    if (tabId === 'tab-staff') loadStaffs();
    if (tabId === 'tab-salary') { loadStaffs(); loadSalaries(); }
    if (tabId === 'tab-dashboard') loadDashboard();
    updatePendingBadge();
    if (tabId === 'tab-calendar') loadCalendarData();
    if (tabId === 'tab-stats') loadStatistics();
    // 手机端自动收回菜单
    const nav = document.getElementById('navMenu');
    if (nav && nav.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(nav);
        if (bsCollapse) bsCollapse.hide();
    }
}

function updateMobileDockState(tabId) {
    document.querySelectorAll('.mobile-dock-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId || (tabId === 'tab-work' && btn.dataset.tab === 'tab-work'));
    });
}

// ===================== 全局模态框 =====================
function showModal(title, bodyHtml, extraClass) {
    let el = document.getElementById('gModal');
    if (!el) {
        el = document.createElement('div');
        el.className = 'modal fade'; el.id = 'gModal';
        el.innerHTML = `<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title" id="gModalTitle"></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body" id="gModalBody"></div>
        </div></div>`;
        document.body.appendChild(el);
    }
    document.getElementById('gModalTitle').textContent = title;
    document.getElementById('gModalBody').innerHTML = bodyHtml;
    new bootstrap.Modal(el).show();
}

function closeGlobalModal() {
    const el = document.getElementById('gModal');
    if (!el) return;
    bootstrap.Modal.getOrCreateInstance(el).hide();
    setTimeout(() => {
        if (el.classList.contains('show')) {
            el.classList.remove('show');
            el.style.display = 'none';
            el.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
            document.querySelectorAll('.modal-backdrop').forEach(x => x.remove());
        }
    }, 180);
}

// ===================== 员工管理 =====================
// ===================== 性能工具 =====================
const _debounce = {};
function debounce(id, fn, ms) {
    clearTimeout(_debounce[id]);
    _debounce[id] = setTimeout(fn, ms);
}

function debouncedLoadCustomers() {
    debounce('customerSearch', loadCustomers, 300);
}

let _customerLastFetched = 0;
const CUSTOMER_CACHE_TTL = 5000;

let staffUserMap = {};

async function loadStaffs() {
    try {
        const [r, ru] = await Promise.all([
            apiFetch(`${API_URL}/staffs`),
            isAdmin() ? apiFetch(`${API_URL}/auth/users`) : Promise.resolve(null)
        ]);
        const staffs = await r.json();
        _staffListCache = staffs;
        const users = ru ? await ru.json() : [];
        staffUserMap = {};
        users.forEach(u => { staffUserMap[u.staff_name] = u; });

        const allOpts = staffs.map(s => {
            const label = s.staff_type=='temp' ? `${s.name} (临时-¥${s.daily_wage}/天)` : s.name;
            return `<option value="${s.name}">${label}</option>`;
        }).join('');
        document.querySelectorAll('select[name="staff_name"]').forEach(sel => {
            sel.innerHTML = '<option value="">请选择</option>' + allOpts;
        });
        const qs = document.getElementById('qStaffName');
        if (qs) qs.innerHTML = '<option value="">不限</option>' + allOpts;

        const container = document.getElementById('staffListContainer');
        if (!container) return;
        if (staffs.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-people"></i>暂无员工</div>'; return;
        }
        container.innerHTML = staffs.map(s => {
            const u = staffUserMap[s.name];
            const uc = u
                ? `<div class="mt-1" style="font-size:.78rem">
                    <span class="badge bg-success me-1">🔑 ${u.username}</span>
                    ${u.role==='admin'?'<span class="badge bg-danger me-1">管理员</span>':'<span class="badge bg-info me-1">员工</span>'}
                    ${!u.enabled?'<span class="badge bg-secondary">已禁用</span>':''}
                   </div>`
                : `<div class="mt-1" style="font-size:.78rem"><span class="badge bg-secondary">未开通登录</span></div>`;
            return `<div class="staff-card">
                <div>
                    <span class="sc-name">${s.name}</span>
                    ${s.staff_type==='temp'?`<span class="badge bg-warning text-dark ms-1" style="font-size:.7rem">临时 ¥${s.daily_wage}/天</span>`:`<span class="badge bg-info ms-1" style="font-size:.7rem">固定</span>`}
                    ${s.phone?`<span class="sc-phone ms-2">${s.phone}</span>`:''}
                    ${isAdmin() ? uc : ''}
                </div>
                <div class="d-flex gap-1 align-items-start">
                    ${isAdmin() ? `<button class="btn btn-outline-secondary btn-sm" onclick="openStaffUser('${s.name}',${s.id})" title="账户管理"><i class="bi bi-shield-lock"></i></button>` : ''}
                    <button class="btn btn-outline-primary btn-sm" onclick="editStaffPrompt(${s.id})"><i class="bi bi-pencil"></i></button>
                    ${isAdmin() ? `<button class="btn btn-outline-danger btn-sm" onclick="deleteStaff(${s.id})"><i class="bi bi-trash"></i></button>` : ''}
                </div>
            </div>`;
        }).join('');
    } catch (e) { console.error(e); }
    renderStaffCheckboxes(_staffListCache); fillSalaryStaffOptions();
}

function onSuRoleChange() {
    const isAdmin = document.getElementById('suAdminCheck').checked;
    document.getElementById('suRole').value = isAdmin ? 'admin' : 'worker';
    document.getElementById('suAdminToggle').classList.toggle('active', isAdmin);
    document.getElementById('suAdminToggle').classList.toggle('btn-outline-danger', isAdmin);
    document.getElementById('suAdminToggle').classList.toggle('btn-outline-secondary', !isAdmin);
    document.getElementById('suAdminExtras').style.display = isAdmin ? '' : 'none';
}

function openStaffUser(staffName, staffId) {
    const u = staffUserMap[staffName];
    document.getElementById('suStaffName').value = staffName;
    document.getElementById('suStaffId').value = staffId;
    if (u) {
        document.getElementById('staffUserModalTitle').textContent = `账户管理 - ${staffName}`;
        document.getElementById('suUsername').value = u.username;
        document.getElementById('suPassword').value = '';
        document.getElementById('suPassword').placeholder = '留空则不修改';
        document.getElementById('suPassword').required = false;
        document.getElementById('suRole').value = u.role;
        document.getElementById('suAdminCheck').checked = u.role === 'admin';
        document.getElementById('suSubmitBtn').innerHTML = '<i class="bi bi-check-lg me-1"></i>更新账户';
        document.getElementById('suDeleteBtn').style.display = '';
    } else {
        document.getElementById('staffUserModalTitle').textContent = `开通账户 - ${staffName}`;
        document.getElementById('suUsername').value = '';
        document.getElementById('suPassword').value = '';
        document.getElementById('suPassword').placeholder = '最少4位';
        document.getElementById('suPassword').required = true;
        document.getElementById('suRole').value = 'worker';
        document.getElementById('suAdminCheck').checked = false;
        document.getElementById('suSubmitBtn').innerHTML = '<i class="bi bi-plus-lg me-1"></i>创建账户';
        document.getElementById('suDeleteBtn').style.display = 'none';
    }
    onSuRoleChange();
    new bootstrap.Modal(document.getElementById('staffUserModal')).show();
}

async function submitStaffUser(e) {
    e.preventDefault();
    const staffName = document.getElementById('suStaffName').value;
    const username = document.getElementById('suUsername').value.trim();
    const password = document.getElementById('suPassword').value;
    const role = document.getElementById('suRole').value;
    const existingUser = staffUserMap[staffName];
    try {
        let r;
        if (existingUser) {
            const body = { role };
            if (password) body.password = password;
            r = await apiFetch(`${API_URL}/auth/users/${existingUser.id}`, {
                method: 'PUT', body: JSON.stringify(body)
            });
        } else {
            if (!password || password.length < 4) return alert('密码至少4位');
            r = await apiFetch(`${API_URL}/auth/users`, {
                method: 'POST',
                body: JSON.stringify({ username, password, staff_name: staffName, role })
            });
        }
        if (r.ok) {
            bootstrap.Modal.getInstance(document.getElementById('staffUserModal')).hide();
            loadStaffs();
        } else {
            const d = await r.json();
            alert(d.error || '保存失败');
        }
    } catch(e) { alert('网络错误'); }
}

async function deleteStaffUser() {
    const u = staffUserMap[document.getElementById('suStaffName').value];
    if (!u) return;
    if (!confirm(`确认删除 ${document.getElementById('suStaffName').value} 的登录账户 (${u.username})？`)) return;
    try {
        const r = await apiFetch(`${API_URL}/auth/users/${u.id}`, { method: 'DELETE' });
        if (r.ok) {
            bootstrap.Modal.getInstance(document.getElementById('staffUserModal')).hide();
            loadStaffs();
        } else {
            const d = await r.json();
            alert(d.error || '删除失败');
        }
    } catch(e) { alert('网络错误'); }
}

async function submitStaff(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const staffType = fd.get('staff_type') || 'fixed';
    const data = {
        name: fd.get('name'),
        phone: fd.get('phone'),
        staff_type: staffType,
        daily_wage: parseFloat(fd.get('daily_wage')) || 0,
        monthly_salary: parseFloat(fd.get('monthly_salary')) || 0,
        position: fd.get('position') || '',
        id_card: fd.get('id_card') || '',
        hire_date: fd.get('hire_date') || '',
        remark: fd.get('remark') || ''
    };
    try {
        const r = await apiFetch(`${API_URL}/staffs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (r.ok) {
            // 固定工：创建登录账号
            if (staffType === 'fixed') {
                const uname = fd.get('acc_username');
                const upass = fd.get('acc_password');
                const urole = fd.get('acc_role') || 'worker';
                if (uname && upass && upass.length >= 4) {
                    await apiFetch(`${API_URL}/auth/users`, {
                        method: 'POST',
                        body: JSON.stringify({ username: uname, password: upass, staff_name: data.name, role: urole })
                    }).catch(() => {});
                }
            }
            e.target.reset();
            loadStaffs();
        } else { const j = await r.json(); alert(j.error || '添加失败'); }
    } catch (e) { alert('网络错误'); }
}

function onStaffAddTypeChange() {
    const t = document.getElementById('staffAddType').value;
    const accSec = document.getElementById('staffAddAccountSection');
    if (accSec) accSec.style.display = t === 'fixed' ? '' : 'none';
}

function staffAddCalcDaily() {
    const m = parseFloat(document.querySelector('#staffForm [name=monthly_salary]').value) || 0;
    if (m > 0) document.querySelector('#staffForm [name=daily_wage]').value = (m / 26).toFixed(0);
}

function staffAddCalcMonthly() {
    const d = parseFloat(document.querySelector('#staffForm [name=daily_wage]').value) || 0;
    if (d > 0) document.querySelector('#staffForm [name=monthly_salary]').value = (d * 26).toFixed(0);
}


let _staffListCache = [];

function renderStaffCheckboxes(staffs) {
    const render = (staffs || _staffListCache || []);
        const container = document.getElementById('staffPickPanel');
        if (!container) return;
        if (render.length === 0) {
            container.innerHTML = '<div class="text-muted small p-2">暂无员工</div>';
            return;
        }
        container.innerHTML = render.map(s => {
            const badgeCls = s.staff_type === 'temp' ? 'staff-tag-temp' : 'staff-tag-fixed';
            return `<label class="staff-row ${badgeCls}">
                <input type="checkbox" name="staff_check" value="${s.name}" data-type="${s.staff_type}" data-wage="${s.daily_wage}" onchange="onStaffCheckboxChange()">
                <i class="bi ${s.staff_type==='temp'?'bi-person-gear':'bi-person-check'}"></i>
                <span>${s.name}</span>
                <small>${s.staff_type==='temp'?'临时 ¥'+s.daily_wage+'/天':'固定'}</small>
            </label>`;
        }).join('');
}

function toggleStaffPicker() {
    const panel = document.getElementById('staffPickPanel');
    const trigger = document.getElementById('staffPickerTrigger');
    if (!panel) return;
    panel.classList.toggle('show');
    const isOpen = panel.classList.contains('show');
    if (trigger) trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen) {
        setTimeout(() => {
            document.addEventListener('click', closeStaffPickerOnClickOutside);
        }, 10);
    } else {
        document.removeEventListener('click', closeStaffPickerOnClickOutside);
    }
}

function closeStaffPickerOnClickOutside(e) {
    const picker = document.getElementById('staffPicker');
    if (!picker) return;
    if (!picker.contains(e.target)) {
        document.getElementById('staffPickPanel').classList.remove('show');
        document.getElementById('staffPickerTrigger')?.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', closeStaffPickerOnClickOutside);
    }
}

function onStaffCheckboxChange() {
    const checks = document.querySelectorAll('#staffPickPanel input[name="staff_check"]:checked');
    const tags = document.getElementById('selectedStaffTags');
    const names = [];
    const hasTemp = Array.from(checks).some(cb => cb.dataset.type === 'temp');
    
    tags.innerHTML = Array.from(checks).map(cb => {
        names.push(cb.value);
        const t = cb.dataset.type;
        const badge = t === 'temp' ? '<span style="background:#fef3c7;color:#92400e;font-size:.7rem;padding:0 4px;border-radius:3px">临时</span>'
            : '<span style="background:#e0e7ff;color:#3730a3;font-size:.7rem;padding:0 4px;border-radius:3px">固定</span>';
        return `<span class="badge d-flex align-items-center gap-1" style="background:var(--glass-bg-strong);border:1px solid var(--glass-border);color:var(--text-primary);padding:4px 8px;font-size:.8rem;cursor:pointer" onclick="deselectStaff('${cb.value}')">${badge} ${cb.value} <i class="bi bi-x"></i></span>`;
    }).join('');
    
    document.getElementById('woStaffNames').value = names.join(',');
    document.getElementById('woTempStaffFields').style.display = hasTemp ? '' : 'none';
    if (hasTemp) updateTempStaffRows();
    else { document.getElementById('woTempStaffRows').innerHTML = ''; document.getElementById('woTempStaffDetails').value = '[]'; }
    updateStaffPickerText();
    calcAutoLaborFee();
}

function updateStaffPickerText() {
    const n = document.querySelectorAll('#staffPickPanel input[name="staff_check"]:checked').length;
    const trigger = document.getElementById('staffPickerTrigger');
    if (trigger) trigger.innerHTML = n > 0
        ? `<i class="bi bi-people-fill"></i><span>已选 ${n} 人</span><i class="bi bi-chevron-down ms-auto"></i>`
        : '<i class="bi bi-people-fill"></i><span>选择人员</span><i class="bi bi-chevron-down ms-auto"></i>';
}

function deselectStaff(name) {
    const cb = document.querySelector(`#staffPickPanel input[value="${name}"]`);
    if (cb) cb.checked = false;
    onStaffCheckboxChange();
}

function updateTempStaffRows() {
    const checks = document.querySelectorAll('#staffPickPanel input[name="staff_check"]:checked');
    const tempStaff = Array.from(checks).filter(cb => cb.dataset.type === 'temp');
    const container = document.getElementById('woTempStaffRows');
    if (tempStaff.length === 0) { container.innerHTML = ''; document.getElementById('woTempStaffDetails').value = '[]'; return; }
    container.innerHTML = tempStaff.map(cb => {
        const name = cb.value;
        const wage = parseFloat(cb.dataset.wage) || 0;
        return `<div class="col-md-4 mb-1">
            <label class="small">${name}</label>
            <div class="input-group input-group-sm">
                <input type="number" class="form-control" data-temp-name="${name}" placeholder="工时(h)" min="0" step="0.5" onchange="collectTempStaffData()">
                <span class="input-group-text">h</span>
                <input type="number" class="form-control" data-temp-wage="${name}" value="${wage}" min="0" step="1" onchange="collectTempStaffData()">
                <span class="input-group-text">¥/天</span>
            </div>
        </div>`;
    }).join('');
    collectTempStaffData();
}

function collectTempStaffData() {
    const rows = document.querySelectorAll('#woTempStaffRows input[data-temp-name]');
    const details = Array.from(rows).map(inp => {
        const name = inp.dataset.tempName;
        const hours = parseFloat(inp.value) || 0;
        const wageInput = document.querySelector(`input[data-temp-wage="${name}"]`);
        const wage = parseFloat(wageInput ? wageInput.value : 0) || 0;
        return { name, hours, daily_wage: wage };
    });
    document.getElementById('woTempStaffDetails').value = JSON.stringify(details);
    calcAutoLaborFee();
}

function calcAutoLaborFee() {
    const checks = document.querySelectorAll('#staffPickPanel input[name="staff_check"]:checked');
    let totalLabor = 0;
    const startVal = document.querySelector('[name="start_time"]').value;
    const endVal = document.querySelector('[name="end_time"]').value;
    let workHours = 0;
    if (startVal && endVal) {
        const [sh, sm] = startVal.split(':').map(Number);
        const [eh, em] = endVal.split(':').map(Number);
        workHours = (eh * 60 + em - sh * 60 - sm) / 60;
    }
    checks.forEach(cb => {
        if (cb.dataset.type === 'fixed' && workHours > 0) {
            let daily = parseFloat(cb.dataset.wage) || 0;
            if (!daily) {
                daily = 200;
            }
            totalLabor += workHours <= 4 ? daily * 0.5 : daily;
        }
    });
    const tempDetails = JSON.parse(document.getElementById('woTempStaffDetails').value || '[]');
    tempDetails.forEach(t => {
        if (t.hours > 0 && t.daily_wage > 0) {
            totalLabor += (t.daily_wage / 8) * t.hours;
        }
    });
    if (totalLabor > 0 || checks.length > 0) {
        document.querySelector('[name="labor_fee"]').value = totalLabor.toFixed(2);
        calcWorkTotal();
    }
}

function editStaffPrompt(id) {
    apiFetch(`${API_URL}/staffs/${id}`).then(resp=>resp.json()).then(s => {
        document.getElementById('seId').value = s.id;
        document.getElementById('seName').value = s.name;
        document.getElementById('sePhone').value = s.phone||'';
        document.getElementById('seType').value = s.staff_type;
        onSeTypeChange();
        document.getElementById('seWage').value = s.daily_wage||0;
        document.getElementById('seMonthly').value = s.monthly_salary||0;
        document.getElementById('sePosition').value = s.position||'';
        document.getElementById('seProject').value = s.project||'';
        document.getElementById('seIdCard').value = s.id_card||'';
        document.getElementById('seHireDate').value = s.hire_date||'';
        document.getElementById('seRemark').value = s.remark||'';
        // 身份证照片
        const photoSection = document.getElementById('seIdPhotoSection');
        if (photoSection) {
            photoSection.style.display = '';
            if (s.id_photo) {
                document.getElementById('seIdPhotoPreview').src = photoUrl(s.id_photo);
                document.getElementById('seIdPhotoPreview').style.display = 'inline';
            } else {
                document.getElementById('seIdPhotoPreview').style.display = 'none';
            }
            if (s.cert_photo) {
                document.getElementById('seCertPhotoPreview').src = photoUrl(s.cert_photo);
                document.getElementById('seCertPhotoPreview').style.display = 'inline';
            } else {
                document.getElementById('seCertPhotoPreview').style.display = 'none';
            }
        }
        // 加载账号信息
        loadStaffAccountInfo(s.name, s.id);
        new bootstrap.Modal(document.getElementById('staffEditModal')).show();
    });
}


// 员工账号管理
function onSeTypeChange() {
    const t = document.getElementById('seType').value;
    const sec = document.getElementById('seAccountSection');
    if (sec) sec.style.display = t === 'fixed' ? '' : 'none';
}

function editCalcDaily() {
    const m = parseFloat(document.getElementById('seMonthly').value) || 0;
    if (m > 0) document.getElementById('seWage').value = (m / 26).toFixed(0);
}

function editCalcMonthly() {
    const d = parseFloat(document.getElementById('seWage').value) || 0;
    if (d > 0) document.getElementById('seMonthly').value = (d * 26).toFixed(0);
}

function onSeRoleChange() {
    const isAdmin = document.getElementById('seAdminCheck').checked;
    document.getElementById('seAccRole').value = isAdmin ? 'admin' : 'worker';
    document.getElementById('seAdminToggle').classList.toggle('active', isAdmin);
    document.getElementById('seAdminToggle').classList.toggle('btn-outline-danger', isAdmin);
    document.getElementById('seAdminToggle').classList.toggle('btn-outline-secondary', !isAdmin);
    document.getElementById('seAdminHint').style.display = isAdmin ? '' : 'none';
    document.getElementById('seRoleHint').style.display = isAdmin ? 'none' : '';
}

async function loadStaffAccountInfo(staffName, staffId) {
    const accSection = document.getElementById('seAccountSection');
    if (!accSection || !isAdmin()) {
        if (accSection) accSection.style.display = 'none';
        return;
    }
    accSection.style.display = '';
    document.getElementById('seAccUsername').value = '';
    document.getElementById('seAccPassword').value = '';
    document.getElementById('seAccRole').value = 'worker';
    document.getElementById('seAccEnabled').value = '1';
    document.getElementById('seAdminCheck').checked = false;
    // 优先使用已缓存的 staffUserMap，避免重复请求
    const u = staffUserMap[staffName];
    if (u) {
        document.getElementById('seAccUsername').value = u.username;
        document.getElementById('seAccRole').value = u.role;
        document.getElementById('seAdminCheck').checked = u.role === 'admin';
        document.getElementById('seAccEnabled').value = u.enabled ? '1' : '0';
    }
    onSeRoleChange();
}

async function saveStaffAccount(staffId) {
    if (!isAdmin()) return;
    const username = document.getElementById('seAccUsername').value.trim();
    const password = document.getElementById('seAccPassword').value.trim();
    if (!username && !password) return;
    const staffName = document.getElementById('seName').value;
    const role = document.getElementById('seAccRole').value;
    const enabled = document.getElementById('seAccEnabled').value === '1';
    
    try {
        // 检查用户是否已存在
        const r0 = await apiFetch(`${API_URL}/auth/users`);
        const users = await r0.json();
        const existing = users.find(u => u.staff_name === staffName);
        if (existing) {
            // 更新现有用户
            const body = { enabled, role };
            if (password) body.password = password;
            if (username) body.username = username;
            await apiFetch(`${API_URL}/auth/users/${existing.id}`, {
                method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
            });
        } else if (username && password) {
            // 创建新用户
            await apiFetch(`${API_URL}/auth/users`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username, password, staff_name: staffName, role, staff_id: staffId })
            });
        }
    } catch(e) { console.error(e); }
}

// 提交编辑员工表单
function initStaffEditForm() {
    const form = document.getElementById('staffEditForm');
    if (!form || form.dataset.ready === '1') return;
    form.dataset.ready = '1';
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('seId').value;
        const data = {
            name: document.getElementById('seName').value,
            phone: document.getElementById('sePhone').value,
            staff_type: document.getElementById('seType').value,
            daily_wage: parseFloat(document.getElementById('seWage').value) || 0,
            monthly_salary: parseFloat(document.getElementById('seMonthly').value) || 0,
            position: document.getElementById('sePosition').value,
            id_card: document.getElementById('seIdCard').value,
            hire_date: document.getElementById('seHireDate').value,
            remark: document.getElementById('seRemark').value
        };
        try {
            const r = await apiFetch(`${API_URL}/staffs/${id}`, {
                method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
            });
            if (r.ok) {
                // 处理账号设置
                await saveStaffAccount(id);
                bootstrap.Modal.getInstance(document.getElementById('staffEditModal')).hide();
                loadStaffs();
            } else alert('修改失败');
        } catch(e) { alert('网络错误'); }
    });
}


let editingStaffId = null;

function uploadStaffPhoto(type) {
    editingStaffId = document.getElementById('seId').value;
    if (!editingStaffId) return;
    const input = type === 'id_photo' ? document.getElementById('staffIdPhotoInput') : document.getElementById('staffCertPhotoInput');
    const file = input.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append(type, file);
    apiFetch(`${API_URL}/staffs/${editingStaffId}/${type}`, { method: 'POST', body: fd })
        .then(resp => resp.json()).then(data => {
            const url = photoUrl(data[type]);
            const previewId = type === 'id_photo' ? 'staffIdPhotoPreview' : 'staffCertPhotoPreview';
            document.getElementById(previewId).src = url;
            document.getElementById(previewId).style.display = 'inline';
        });
}

function uploadEditStaffPhoto(type) {
    const id = document.getElementById('seId').value;
    if (!id) return;
    const input = type === 'id_photo' ? document.getElementById('seIdPhotoInput') : document.getElementById('seCertPhotoInput');
    const file = input.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append(type, file);
    apiFetch(`${API_URL}/staffs/${id}/${type}`, { method: 'POST', body: fd })
        .then(resp => resp.json()).then(data => {
            const url = photoUrl(data[type]);
            const previewId = type === 'id_photo' ? 'seIdPhotoPreview' : 'seCertPhotoPreview';
            document.getElementById(previewId).src = url;
            document.getElementById(previewId).style.display = 'inline';
        });
}
async function deleteStaff(id) {
    if (!confirm('确认删除此员工？')) return;
    try { const r = await apiFetch(`${API_URL}/staffs/${id}`, {method:'DELETE'}); if (r.ok) loadStaffs(); else alert('删除失败'); }
    catch (e) { alert('网络错误'); }
}

// ===================== 客户管理 =====================
async function loadCustomers(force) {
    const now = Date.now();
    if (!force && now - _customerLastFetched < CUSTOMER_CACHE_TTL && !(document.getElementById('customerSearch')?.value || '')) return;
    _customerLastFetched = now;
    const q = (document.getElementById('customerSearch')?.value || '');
    try { const r = await apiFetch(`${API_URL}/customers?q=${encodeURIComponent(q)}`); allCustomers = await r.json(); } catch (e) { allCustomers = []; }
    const opts = allCustomers.map(c => `<option value="${c.name}">`).join('');
    // datalist removed - using custom dropdown instead
    renderCustomerList();
}

function renderCustomerList() {
    const container = document.getElementById('customerListContainer');
    if (!container) return;
    if (allCustomers.length === 0) { container.innerHTML = '<div class="empty-state"><i class="bi bi-people"></i>暂无客户</div>'; return; }
    const limit = Number(container.dataset.limit || 60);
    const list = allCustomers.slice(0, limit);
    container.innerHTML = '<div class="customer-list-modern">' + list.map(c => {
        const name = escapeHtml(c.short_name || c.name || '未命名客户');
        const full = escapeHtml(c.full_name || '');
        const code = escapeHtml(c.credit_code || '');
        const contact = escapeHtml(c.contact_name || '');
        const phone = escapeHtml(c.phone || '');
        const address = escapeHtml(c.address || '');
        const remark = escapeHtml(c.remark || '');
        return `<article class="customer-card-v2">
        <button type="button" class="customer-main" onclick="showCustomerDetail(${c.id})">
            <span class="customer-avatar">${name.charAt(0)}</span>
            <span class="customer-identity">
                <strong>${name}</strong>
                ${full && full !== name ? `<span>${full}</span>` : '<span>未填写客户全称</span>'}
            </span>
        </button>
        <div class="customer-fields">
            <div class="customer-field ${code ? '' : 'is-empty'}"><i class="bi bi-upc-scan"></i><span>${code || '未填写统一社会信用代码'}</span></div>
            <div class="customer-field ${contact ? '' : 'is-empty'}"><i class="bi bi-person-vcard"></i><span>${contact || '未填写联系人'}</span></div>
            <div class="customer-field ${phone ? '' : 'is-empty'}"><i class="bi bi-telephone"></i><span>${phone || '未填写电话'}</span></div>
            <div class="customer-field ${address ? '' : 'is-empty'}"><i class="bi bi-geo-alt"></i><span>${address || '未填写地址'}</span></div>
            ${remark ? `<div class="customer-field customer-remark"><i class="bi bi-chat-left-text"></i><span>${remark}</span></div>` : ''}
        </div>
        <div class="customer-actions-v2">
            <button class="btn btn-outline-primary btn-sm" onclick="openCustomerEdit(${c.id})"><i class="bi bi-pencil-square me-1"></i>编辑</button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteCustomer(${c.id})"><i class="bi bi-trash me-1"></i>删除</button>
        </div>
    </article>`;
    }).join('') + '</div>' + (allCustomers.length > limit ? `<div class="query-load-more"><button class="btn btn-outline-primary" onclick="showMoreCustomers()">显示更多 ${Math.min(60, allCustomers.length - limit)} 个客户（共 ${allCustomers.length} 个）</button></div>` : '');
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function attrHtml(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function showMoreCustomers() {
    const container = document.getElementById('customerListContainer');
    container.dataset.limit = String((Number(container.dataset.limit || 60)) + 60);
    renderCustomerList();
}


// ===== 自定义客户下拉选择 =====
let _activeCustomerInput = null;
let _quickCustomerTarget = 'work';

function showCustomerDropdown(input) {
    _activeCustomerInput = input;
    const wrap = input.closest('.customer-select-wrap');
    let dd = wrap ? wrap.querySelector('.customer-dropdown') : null;
    if (!dd) return;

    const val = input.value.trim().toLowerCase();
    const filtered = val
        ? allCustomers.filter(c => [c.name, c.short_name, c.full_name, c.credit_code, c.contact_name].some(x => (x || '').toLowerCase().includes(val)))
        : allCustomers;

    if (filtered.length === 0) {
        dd.style.display = 'none';
        return;
    }

    dd.innerHTML = filtered.slice(0, 15).map(c => {
        const displayName = c.short_name || c.name || c.full_name || '';
        const initial = displayName ? displayName.charAt(0) : '?';
        const phoneHtml = c.phone ? '<span><i class="bi bi-telephone-fill"></i>' + c.phone + '</span>' : '';
        const addrHtml = c.address ? '<span><i class="bi bi-geo-alt-fill"></i>' + c.address + '</span>' : '';
        const contactHtml = c.contact_name ? '<span><i class="bi bi-person-vcard"></i>' + c.contact_name + '</span>' : '';
        const fullHtml = c.full_name && c.full_name !== displayName ? '<span><i class="bi bi-building"></i>' + c.full_name + '</span>' : '';
        const codeHtml = c.credit_code ? '<span><i class="bi bi-upc-scan"></i>' + c.credit_code + '</span>' : '';
        const metaHtml = (fullHtml || codeHtml || contactHtml || phoneHtml || addrHtml) ? '<div class="co-meta">' + fullHtml + codeHtml + contactHtml + phoneHtml + addrHtml + '</div>' : '';
        return '<div class="customer-option" data-name="' + displayName.replace(/"/g, '&quot;') + '" onmousedown="selectCustomer(this)">' +
               '<div class="co-avatar">' + initial + '</div>' +
               '<div class="co-info">' +
               '<div class="co-name">' + displayName + '</div>' +
               metaHtml +
               '</div></div>';
    }).join('');
    dd.style.display = 'block';
}

function selectCustomer(el) {
    if (!_activeCustomerInput) return;
    const name = el.dataset.name || el.querySelector('.co-name').textContent;
    _activeCustomerInput.value = name;

    // Close dropdown
    const wrap = _activeCustomerInput.closest('.customer-select-wrap');
    if (wrap) {
        const dd = wrap.querySelector('.customer-dropdown');
        if (dd) dd.style.display = 'none';
    }

    if (_activeCustomerInput.id === 'woCustomerName') {
        onCustomerSelect();
    } else if (_activeCustomerInput.closest('#pendingForm')) {
        fillCustomerInfoToForm(_activeCustomerInput.closest('form'), name);
    }

    _activeCustomerInput.dispatchEvent(new Event('change', { bubbles: true }));
    _activeCustomerInput = null;
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.customer-select-wrap')) {
        document.querySelectorAll('.customer-dropdown').forEach(function(d) {
            d.style.display = 'none';
        });
    }
});

function onCustomerSelect() {
    const val = document.getElementById('woCustomerName').value;
    fillCustomerInfoToForm(document.getElementById('workForm'), val);
}

function fillCustomerInfoToForm(form, val) {
    if (!form || !val) return;
    const c = allCustomers.find(x => [x.name, x.short_name, x.full_name].includes(val));
    if (c) {
        const contact = form.querySelector('[name="contact_name"]');
        const phone = form.querySelector('[name="contact_phone"], [name="customer_phone"]');
        const phoneVisible = form.querySelector('#woCustomerPhoneVisible');
        const address = form.querySelector('[name="work_address"]');
        if (contact) contact.value = c.contact_name || '';
        if (phone) phone.value = c.phone || '';
        if (phoneVisible) phoneVisible.value = c.phone || '';
        if (address) address.value = c.address || '';
    }
}

function openCustomerQuickAdd(target) {
    _quickCustomerTarget = target || 'work';
    const m = new bootstrap.Modal(document.getElementById('quickCustomerModal'));
    document.getElementById('qcName').value = '';
    document.getElementById('qcFullName').value = '';
    document.getElementById('qcCreditCode').value = '';
    document.getElementById('qcContactName').value = '';
    document.getElementById('qcPhone').value = '';
    document.getElementById('qcAddress').value = '';
    m.show();
}

async function submitQuickCustomer(e) {
    e.preventDefault();
    const name = document.getElementById('qcName').value.trim();
    if (!name) return;
    try {
        const r = await apiFetch(`${API_URL}/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ short_name: name, full_name: document.getElementById('qcFullName').value.trim(), credit_code: document.getElementById('qcCreditCode').value.trim(), contact_name: document.getElementById('qcContactName').value.trim(), phone: document.getElementById('qcPhone').value.trim(), address: document.getElementById('qcAddress').value.trim() }) });
        if (r.ok) {
            await loadCustomers();
            const targetForm = _quickCustomerTarget === 'pending' ? document.getElementById('pendingForm') : document.getElementById('workForm');
            if (targetForm) {
                const cname = targetForm.querySelector('[name="customer_name"]');
                const contact = targetForm.querySelector('[name="contact_name"]');
                const phone = targetForm.querySelector('[name="contact_phone"], [name="customer_phone"]');
                const phoneVisible = targetForm.querySelector('#woCustomerPhoneVisible');
                const address = targetForm.querySelector('[name="work_address"]');
                if (cname) cname.value = name;
                if (contact) contact.value = document.getElementById('qcContactName').value.trim();
                if (phone) phone.value = document.getElementById('qcPhone').value.trim();
                if (phoneVisible) phoneVisible.value = document.getElementById('qcPhone').value.trim();
                if (address) address.value = document.getElementById('qcAddress').value.trim();
            }
            bootstrap.Modal.getInstance(document.getElementById('quickCustomerModal')).hide();
        } else { const j = await r.json(); alert(j.error || '添加失败'); }
    } catch (e) { alert('网络错误'); }
}

async function submitCustomer(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
        const r = await apiFetch(`${API_URL}/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ short_name: fd.get('short_name'), full_name: fd.get('full_name'), credit_code: fd.get('credit_code'), contact_name: fd.get('contact_name'), phone: fd.get('phone'), address: fd.get('address'), remark: fd.get('remark') }) });
        if (r.ok) { e.target.reset(); loadCustomers(); } else { const j = await r.json(); alert(j.error || ''); }
    } catch (e) { alert('网络错误'); }
}

async function deleteCustomer(id) {
    if (!confirm('确认删除？')) return;
    try { const r = await apiFetch(`${API_URL}/customers/${id}`, { method: 'DELETE' }); if (r.ok) loadCustomers(); else alert('删除失败'); } catch (e) { alert('网络错误'); }
}

function editCustomerPrompt(id) {
    openCustomerEdit(id);
}

function openCustomerEdit(id) {
    const c = allCustomers.find(x => x.id === id);
    if (!c) return;
    showModal('编辑客户资料', `
        <form id="customerEditForm" class="customer-edit-form" onsubmit="submitCustomerEdit(event, ${id})">
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label fw500">客户简称 <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="short_name" value="${attrHtml(c.short_name || c.name || '')}" required>
                </div>
                <div class="col-md-8">
                    <label class="form-label fw500">客户全称</label>
                    <input type="text" class="form-control" name="full_name" value="${attrHtml(c.full_name || '')}">
                </div>
                <div class="col-md-6">
                    <label class="form-label fw500">统一社会信用代码</label>
                    <input type="text" class="form-control" name="credit_code" value="${attrHtml(c.credit_code || '')}">
                </div>
                <div class="col-md-6">
                    <label class="form-label fw500">联系人</label>
                    <input type="text" class="form-control" name="contact_name" value="${attrHtml(c.contact_name || '')}">
                </div>
                <div class="col-md-6">
                    <label class="form-label fw500">联系电话</label>
                    <input type="tel" class="form-control" name="phone" value="${attrHtml(c.phone || '')}">
                </div>
                <div class="col-12">
                    <label class="form-label fw500">地址</label>
                    <input type="text" class="form-control" name="address" value="${attrHtml(c.address || '')}">
                </div>
                <div class="col-12">
                    <label class="form-label fw500">备注</label>
                    <textarea class="form-control" name="remark" rows="3">${escapeHtml(c.remark || '')}</textarea>
                </div>
            </div>
            <div class="customer-edit-actions">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">取消</button>
                <button type="submit" class="btn btn-primary"><i class="bi bi-check2 me-1"></i>保存客户资料</button>
            </div>
        </form>
    `);
}

async function submitCustomerEdit(event, id) {
    event.preventDefault();
    const form = event.target;
    const fd = new FormData(form);
    const payload = {
        short_name: (fd.get('short_name') || '').trim(),
        full_name: (fd.get('full_name') || '').trim(),
        credit_code: (fd.get('credit_code') || '').trim(),
        contact_name: (fd.get('contact_name') || '').trim(),
        phone: (fd.get('phone') || '').trim(),
        address: (fd.get('address') || '').trim(),
        remark: (fd.get('remark') || '').trim()
    };
    if (!payload.short_name) {
        alert('客户简称不能为空');
        return;
    }
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
        const resp = await apiFetch(`${API_URL}/customers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (resp.ok) {
            closeGlobalModal();
            await loadCustomers(true);
        } else {
            const data = await resp.json().catch(() => ({}));
            alert(data.error || '保存失败');
        }
    } catch (e) {
        alert('网络错误');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function showCustomerDetail(id) {
    try {
        const r = await apiFetch(`${API_URL}/customers/${id}`);
        const data = await r.json();
        const c = data.customer;
        let html = `<div class="card shadow-sm mb-3"><div class="card-body"><h5 class="fw-bold">${c.short_name || c.name}</h5>
            <div class="text-muted small">${c.full_name ? `<i class="bi bi-building me-1"></i>${c.full_name}` : ''}</div>
            <div class="text-muted small">${c.credit_code ? `<i class="bi bi-upc-scan me-1"></i>${c.credit_code}` : ''}</div>
            <div class="text-muted small">${c.contact_name ? `<i class="bi bi-person-vcard me-1"></i>${c.contact_name}` : ''}</div>
            <div class="text-muted small">${c.phone ? `<i class="bi bi-telephone me-1"></i>${c.phone}` : ''}</div>
            <div class="text-muted small">${c.address ? `<i class="bi bi-geo-alt me-1"></i>${c.address}` : ''}</div>
            ${c.remark ? `<div class="text-muted small mt-1">${c.remark}</div>` : ''}</div></div>`;
        if (data.records.length > 0) {
            html += '<h6 class="fw-semibold mb-2">最近工作记录</h6>';
            html += data.records.map(r => `<div class="record-card" onclick="openRecordDetail(${r.id})">
                <div class="rc-actions">
                    <button class="rc-action-btn" onclick="event.stopPropagation(); exportPdfRange(${r.id})" title="导出PDF"><i class="bi bi-filetype-pdf"></i></button>
                    <button class="rc-action-btn" onclick="event.stopPropagation(); editRecord(${r.id})" title="编辑"><i class="bi bi-pencil"></i></button>
                    <button class="rc-action-btn" onclick="event.stopPropagation(); deleteRecord(${r.id})" title="删除"><i class="bi bi-trash"></i></button>
                </div>
                <div class="rc-customer">${r.customer_name}</div>
                <div class="rc-info-row">
                    <span class="rc-date"> ${new Date(r.work_date).toLocaleDateString()}</span>
                    ${r.staff_names && r.staff_names.length > 0 ? '<span class="rc-staff">👤 ' + r.staff_names.join('、') + '</span>' : ''}
                </div>
                <div class="rc-detail">${r.work_content ? r.work_content.substring(0, 60) + (r.work_content.length > 60 ? '...' : '') : ''}</div>
                ${r.total_fee > 0 ? '<div class="rc-fee">💰 ¥' + r.total_fee.toFixed(2) + '</div>' : ''}
            </div>`).join('');
        } else { html += '<div class="empty-state"><i class="bi bi-journal-text"></i>暂无工作记录</div>'; }
        showModal('客户详情', html);
    } catch (e) { alert('加载失败'); }
}

// ===================== 记录类型切换 =====================
function toggleRecordType() {
    const type = document.querySelector('[name=record_type]:checked').value;
    document.getElementById('constructionFields').style.display = type === 'construction' ? '' : 'none';
    document.getElementById('repairFields').style.display = type === 'repair' ? '' : 'none';
    const wc = document.querySelector('#constructionFields textarea[name=work_content]');
    if (wc) wc.required = (type === 'construction');
    fillWorkBusinessOptions(type);
    toggleRepairIncompleteFields();
}

function toggleRepairIncompleteFields() {
    const isRepair = document.querySelector('[name=record_type]:checked')?.value === 'repair';
    const isPending = document.querySelector('input[name=repair_result]:checked')?.value === 'pending';
    const box = document.getElementById('repairIncompleteBox');
    const reason = document.getElementById('incompleteReason');
    if (box) box.style.display = isRepair && isPending ? '' : 'none';
    if (reason) reason.required = !!(isRepair && isPending);
}



const WORK_STATUS_OPTIONS = {
    construction: [['pending','待施工'],['dispatched','已派工'],['in_progress','施工中'],['customer_confirm','待客户确认'],['settlement','待结算'],['callback','待回访'],['completed','已完成'],['rework','需返工'],['paused','暂停处理'],['cancelled','已取消']],
    repair: [['pending','待处理'],['dispatched','已派单'],['in_progress','处理中'],['customer_confirm','待客户确认'],['callback','待回访'],['settlement','待结算'],['completed','已完成'],['rework','需返工'],['unable','无法处理'],['paused','暂停处理'],['cancelled','已取消']]
};
const WORK_SUBTYPE_OPTIONS = {
    construction: ['监控安装','网络布线','门禁安装','弱电施工','设备调试','旧线整改','机柜整理','无线覆盖','设备迁移','项目验收','巡检维护','其他'],
    repair: ['监控离线','无画面','录像异常','网络不通','门禁故障','电源故障','线路故障','设备更换','系统调试','远程协助','弱电故障','其他']
};
function fillWorkBusinessOptions(type) {
    const status = document.getElementById('woStatus');
    const subtype = document.getElementById('woSubtype');
    if (status) status.innerHTML = WORK_STATUS_OPTIONS[type].map(x => `<option value="${x[0]}">${x[1]}</option>`).join('');
    if (subtype) subtype.innerHTML = WORK_SUBTYPE_OPTIONS[type].map(x => `<option value="${x}">${x}</option>`).join('');
    const label = document.getElementById('woSubtypeLabel');
    if (label) label.textContent = type === 'repair' ? '故障类型' : '施工类型';
}
function openNewWork(type) {
    switchTab('tab-work');
    const radio = document.querySelector(`input[name="record_type"][value="${type}"]`);
    if (radio) radio.checked = true;
    toggleRecordType();
}

// ===================== 工作记录 =====================
function calcWorkTotal() {
    var labor = parseFloat(document.querySelector('#workForm [name=labor_fee]').value) || 0;
    var material = parseFloat(document.querySelector('#workForm [name=material_fee]').value) || 0;
    var transport = parseFloat(document.querySelector('#workForm [name=transport_fee]').value) || 0;
    var other = parseFloat(document.querySelector('#workForm [name=other_fee]').value) || 0;
    var subtotal = labor + material + transport + other;
    var taxType = document.querySelector('input[name=tax_type]:checked')?.value || 'no';
    var taxRate = parseFloat(document.getElementById('taxRate').value) || 0.03;
    var taxAmount = 0;
    if (taxType === 'tax') taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    document.getElementById('woTaxAmount').value = taxAmount.toFixed(2);
    document.getElementById('woTotalFee').value = (subtotal + taxAmount).toFixed(2);
}

let selectedWorkPhotos = [];

function getWorkPhotoWatermarkLines() {
    const date = document.getElementById('workDate')?.value || todayStr();
    const compact = (text, max = 18) => {
        text = (text || '').trim();
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    };
    const customer = compact(document.getElementById('woCustomerName')?.value, 18) || '未填写客户';
    const contact = compact(document.getElementById('woContactName')?.value, 8);
    const phone = (document.getElementById('woCustomerPhoneVisible')?.value.trim() || document.getElementById('woCustomerPhone')?.value.trim() || '').replace(/\s+/g, '');
    const address = compact(document.getElementById('woWorkAddress')?.value, 22);
    const type = document.querySelector('[name=record_type]:checked')?.value === 'repair' ? '维修单' : '施工单';
    const keyInfo = contact || phone ? [contact, phone].filter(Boolean).join(' ') : address;
    return [
        `${date} ${type}`,
        customer,
        keyInfo ? compact(keyInfo, 24) : ''
    ].filter(Boolean);
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片读取失败')); };
        img.src = url;
    });
}

async function createWatermarkedPhoto(file) {
    const img = await loadImageFromFile(file);
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const lines = getWorkPhotoWatermarkLines();
    const pad = Math.max(10, Math.round(w * 0.012));
    const fontSize = Math.max(12, Math.round(w * 0.014));
    const lineHeight = Math.round(fontSize * 1.32);
    const watermarkAreaH = Math.max(Math.round(h * 0.08), lines.length * lineHeight + pad * 1.25);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h + watermarkAreaH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const grad = ctx.createLinearGradient(0, h, 0, h + watermarkAreaH);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#eef2f7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h, w, watermarkAreaH);
    ctx.fillStyle = 'rgba(15,23,42,.10)';
    ctx.fillRect(0, h, w, 1);

    ctx.font = `600 ${fontSize}px "Microsoft YaHei", Arial, sans-serif`;
    const x = w - pad;
    const startY = h + Math.max(pad * 0.7, (watermarkAreaH - lines.length * lineHeight) / 2) + fontSize;
    ctx.fillStyle = 'rgba(15,23,42,.68)';
    ctx.shadowColor = 'rgba(255,255,255,.75)';
    ctx.shadowBlur = 1;
    ctx.textAlign = 'right';
    lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineHeight, Math.round(w * 0.72)));
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    const base = file.name.replace(/\.[^.]+$/, '');
    const wmFile = new File([blob], `${base}_水印.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    return { file: wmFile, url: canvas.toDataURL('image/jpeg', 0.88), originalName: file.name };
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function syncWorkPhotoInput() {
    const input = document.querySelector('#workForm input[type="file"][name="photos"]');
    if (!input) return;
    const dt = new DataTransfer();
    selectedWorkPhotos.forEach(p => dt.items.add(p.file));
    input.files = dt.files;
}

function renderWorkPhotoPreview() {
    const container = document.getElementById('workPhotoPreview');
    container.innerHTML = '';
    selectedWorkPhotos.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'work-photo-preview-item';
        card.innerHTML = `<button type="button" class="work-photo-remove" onclick="event.stopPropagation();removeWorkPhoto(${index})" title="删除这张照片"><i class="bi bi-x"></i></button><img src="${item.url}" alt="照片预览" onclick="openSelectedWorkPhoto(${index})"><span>${escapeHtml(item.file.name)}</span>`;
        container.appendChild(card);
    });
}

function openSelectedWorkPhoto(index) {
    const urls = selectedWorkPhotos.map(p => p.url);
    if (urls.length > 0) pvOpen(urls, index);
}

async function previewWorkPhotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const exists = selectedWorkPhotos.some(p => (p.originalName || p.file.name) === file.name && p.originalSize === file.size && p.originalLastModified === file.lastModified);
        if (exists) continue;
        try {
            const item = await createWatermarkedPhoto(file);
            item.originalSize = file.size;
            item.originalLastModified = file.lastModified;
            selectedWorkPhotos.push(item);
            syncWorkPhotoInput();
            renderWorkPhotoPreview();
        } catch (err) {
            alert(`${file.name} 添加水印失败，请重新选择`);
        }
    }
}

function removeWorkPhoto(index) {
    selectedWorkPhotos.splice(index, 1);
    syncWorkPhotoInput();
    renderWorkPhotoPreview();
}

async function submitWorkRecord(e) {
    e.preventDefault();
    try {
        const isRepair = document.querySelector('[name=record_type]:checked')?.value === 'repair';
        const isPending = document.querySelector('input[name=repair_result]:checked')?.value === 'pending';
        if (isRepair && isPending && !document.getElementById('incompleteReason')?.value.trim()) {
            alert('未维修完成时请填写原因说明');
            document.getElementById('incompleteReason')?.focus();
            return;
        }
        const fd = new FormData(e.target);
        fd.delete('photos');
        selectedWorkPhotos.forEach(p => fd.append('photos', p.file));
        const r = await apiFetch(`${API_URL}/records`, { method: 'POST', body: fd });
        if (r.ok) {
            let respData = null;
            try { respData = await r.clone().json(); } catch(e) {}
            e.target.reset(); document.getElementById('workDate').value = todayStr();
            document.getElementById('woTotalFee').value = '0.00';
            selectedWorkPhotos = [];
            document.getElementById('workPhotoPreview').innerHTML = '';
            document.querySelectorAll('#staffPickPanel input[name="staff_check"]').forEach(cb => cb.checked = false);
            document.getElementById('selectedStaffTags').innerHTML = '';
            document.getElementById('woStaffNames').value = '';
            document.getElementById('woTempStaffDetails').value = '[]';
            document.getElementById('woTempStaffFields').style.display = 'none';
            document.getElementById('woTempStaffRows').innerHTML = '';
            toggleRepairIncompleteFields();
            loadDashboard(); loadSalaries();
            let msg = '✅ 记录保存成功！';
            if (respData && respData.warnings && respData.warnings.length) {
                msg += '\n\n⚠️ 库存警告：\n' + respData.warnings.join('\n');
            }
            alert(msg);
        } else { const j = await r.json(); alert('保存失败: '+(j.error||'')); }
    } catch (e) { alert('网络错误'); }
}

// ===================== 查询 =====================
async function queryRecords() {
    const name = document.getElementById('qCustomerName').value;
    const staff = document.getElementById('qStaffName').value;
    const start = document.getElementById('qDateStart').value;
    const end = document.getElementById('qDateEnd').value;
    let url = `${API_URL}/records?per_page=100`;
    if (name) url += `&customer_name=${encodeURIComponent(name)}`;
    if (staff) url += `&staff_name=${encodeURIComponent(staff)}`;
    if (queryRecordType) url += `&record_type=${encodeURIComponent(queryRecordType)}`;
    if (queryPaymentStatus) url += `&payment_status=${encodeURIComponent(queryPaymentStatus)}`;
    if (queryWorkStatus) url += `&status=${encodeURIComponent(queryWorkStatus)}`;
    if (start) url += `&start_date=${start}`;
    if (end) url += `&end_date=${end}`;
    try { const r = await apiFetch(url); const data = await r.json(); lastQueryRecords = data.records || []; const box = document.getElementById('queryResults'); if (box) box.dataset.limit = '30'; renderQuerySummary(lastQueryRecords, data.total || lastQueryRecords.length); renderQueryResults(lastQueryRecords); }
    catch (e) { document.getElementById('queryResults').innerHTML = '<div class="empty-state"><i class="bi bi-exclamation-triangle"></i>查询失败</div>'; }
}

function clearQueryChipGroup(selector) {
    document.querySelectorAll(selector).forEach(btn => btn.classList.remove('active'));
}

function setQueryType(type, btn) {
    queryRecordType = type;
    clearQueryChipGroup('[data-qtype]');
    if (btn) btn.classList.add('active');
    queryRecords();
}

function setQueryPayment(status, btn) {
    queryPaymentStatus = queryPaymentStatus === status ? '' : status;
    document.querySelectorAll('.query-chip[data-payment], .query-chip[data-auto-payment]').forEach(x => x.classList.remove('active'));
    if (btn) {
        btn.dataset.autoPayment = '1';
        btn.classList.toggle('active', !!queryPaymentStatus);
    }
    queryRecords();
}

function setQueryStatus(status, btn) {
    queryWorkStatus = queryWorkStatus === status ? '' : status;
    document.querySelectorAll('.query-chip[data-status], .query-chip[data-auto-status]').forEach(x => x.classList.remove('active'));
    if (btn) {
        btn.dataset.autoStatus = '1';
        btn.classList.toggle('active', !!queryWorkStatus);
    }
    queryRecords();
}

function setQueryRange(mode) {
    const now = new Date();
    let s, e;
    if (mode === 'today') {
        s = e = todayStr();
    } else if (mode === 'thisWeek') {
        const day = now.getDay() || 7;
        s = new Date(now); s.setDate(now.getDate() - day + 1);
        e = new Date(now); e.setDate(now.getDate() + (7 - day));
        s = fmtDate(s); e = fmtDate(e);
    } else if (mode === 'thisMonth') {
        s = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1));
        e = fmtDate(new Date(now.getFullYear(), now.getMonth()+1, 0));
    } else if (mode === 'lastMonth') {
        s = fmtDate(new Date(now.getFullYear(), now.getMonth()-1, 1));
        e = fmtDate(new Date(now.getFullYear(), now.getMonth(), 0));
    }
    document.getElementById('qDateStart').value = s;
    document.getElementById('qDateEnd').value = e;
    queryRecords();
}

function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
}

function setStatsRange(mode) {
    const now = new Date();
    let s, e;
    if (mode === 'thisMonth') {
        s = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1));
        e = todayStr();
    } else if (mode === 'lastMonth') {
        s = fmtDate(new Date(now.getFullYear(), now.getMonth()-1, 1));
        e = fmtDate(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (mode === 'thisYear') {
        s = fmtDate(new Date(now.getFullYear(), 0, 1));
        e = todayStr();
    }
    document.getElementById('statsStart').value = s;
    document.getElementById('statsEnd').value = e;
    loadStatistics();
}

function resetQuery() {
    ['qCustomerName','qStaffName','qDateStart','qDateEnd'].forEach(id => document.getElementById(id).value = '');
    queryRecordType = ''; queryPaymentStatus = ''; queryWorkStatus = ''; lastQueryRecords = [];
    document.querySelectorAll('.query-chip').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.query-chip[data-qtype=""]')?.classList.add('active');
    const summary = document.getElementById('querySummary');
    if (summary) summary.innerHTML = '';
    document.getElementById('queryResults').innerHTML = '<div class="empty-state"><i class="bi bi-search"></i>请输入查询条件</div>';
}


function exportRecords() {
    const name = document.getElementById('qCustomerName').value;
    const staff = document.getElementById('qStaffName').value;
    const start = document.getElementById('qDateStart').value;
    const end = document.getElementById('qDateEnd').value;
    let url = API_URL + '/export/records?';
    if (name) url += '&customer_name=' + encodeURIComponent(name);
    if (staff) url += '&staff_name=' + encodeURIComponent(staff);
    if (start) url += '&start_date=' + start;
    if (end) url += '&end_date=' + end;
    downloadBlob(url, '工作记录.csv');
}

function exportPdfRecord(recordId) {
    downloadBlob(API_URL + '/export/pdf/' + recordId, '工作记录_' + recordId + '.pdf');
}

function exportPdfRange() {
    const start = document.getElementById('qDateStart').value;
    const end = document.getElementById('qDateEnd').value;
    if (!start || !end) { alert('请先选择日期范围'); return; }
    downloadBlob(API_URL + '/export/pdf?start_date=' + start + '&end_date=' + end, '工作记录_' + start + '_' + end + '.pdf');
}

async function downloadBlob(url, filename) {
    try {
        const r = await fetch(url, { headers: { 'Authorization': 'Bearer ' + getToken() } });
        if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            alert(d.error || '下载失败');
            return;
        }
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch(e) {
        alert('下载失败：' + e.message);
    }
}

function renderQueryResults(records) {
    const container = document.getElementById('queryResults');
    if (!records || records.length === 0) { container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i>未找到</div>'; return; }
    const limit = Number(container.dataset.limit || 30);
    const visibleRecords = records.slice(0, limit);
    container.innerHTML = visibleRecords.map(r => {
        const photos = Array.isArray(r.work_photos) ? r.work_photos : [];
        const urls = photos.map(p => photoUrl(p));
        const statusMap = {'pending':'待施工/待处理','dispatched':'已派单','in_progress':'进行中/处理中','callback':'待回访','settlement':'待结算','completed':'已完成','rework':'需返工','unable':'无法处理','cancelled':'已取消'};
        const statusColor = {'completed':'#bbf7d0,#166534','settlement':'#fed7aa,#9a3412','in_progress':'#dbeafe,#1d4ed8','dispatched':'#dbeafe,#1d4ed8','callback':'#fed7aa,#9a3412','pending':'#e2e8f0,#475569','rework':'#fecaca,#991b1b','unable':'#fecaca,#991b1b','cancelled':'#d1d5db,#374151'};
        const sc = statusColor[r.status || 'completed'] || statusColor.completed;
        const scArr = sc.split(',');
        const typeTag = r.record_type === 'repair' ? '<span class="rc-tag rc-tag-repair"><i class="bi bi-gear me-1"></i>维修工单</span>' : '<span class="rc-tag rc-tag-build"><i class="bi bi-tools me-1"></i>施工记录</span>';
        const status = r.status || 'completed';
        const payMap = {'unpaid':'未收款','partial':'部分收款','paid':'已收款','monthly':'月结'};
        const paymentTag = r.payment_status && r.payment_status !== 'paid' ? '<span class="rc-tag rc-tag-payment"><i class="bi bi-wallet2 me-1"></i>'+(payMap[r.payment_status]||r.payment_status)+'</span>' : '';
        const statusTag = '<span class="rc-tag rc-tag-status rc-status-'+status+'" style="background:'+scArr[0]+';color:'+scArr[1]+';cursor:pointer" onclick="event.stopPropagation();changeRecordStatus('+r.id+')">'+(statusMap[status]||'')+'</span>';
        const timeTag = (r.start_time && r.end_time) ? '<span class="rc-tag rc-tag-time"><i class="bi bi-clock me-1"></i>'+r.start_time+'-'+r.end_time+'</span>' : '';
        const feeText = r.total_fee > 0 ? '¥'+Number(r.total_fee).toFixed(0) : '¥0';
        const feeTag = r.total_fee > 0 ? '<span class="rc-tag rc-tag-fee"><i class="bi bi-currency-yen me-1"></i>'+feeText+'</span>' : '';

        return '<div class="record-card record-card-'+(r.record_type || 'construction')+' record-status-'+status+'" onclick="openRecordDetail('+r.id+')">' +
            '<div class="rc-head">' +
                '<div class="rc-title-block">' +
                    '<div class="rc-customer-name-lg">' + (r.customer_name || '未命名客户') + '</div>' +
                    '<div class="rc-order-no">' + (r.order_no ? r.order_no : '未生成编号') + '</div>' +
                '</div>' +
                '<div class="rc-amount">' + feeText + '</div>' +
            '</div>' +
            '<div class="rc-tag-row">' + statusTag + typeTag + timeTag + paymentTag + '</div>' +
            '<div class="rc-info-grid">' +
                '<span><i class="bi bi-calendar3 me-1"></i>' + new Date(r.work_date).toLocaleDateString() + '</span>' +
                (r.staff_names && r.staff_names.length > 0 && r.staff_names[0] ? '<span><i class="bi bi-person me-1"></i>' + r.staff_names.join('、') + '</span>' : '<span><i class="bi bi-person me-1"></i>未填人员</span>') +
                (r.work_address ? '<span class="rc-span-2"><i class="bi bi-geo-alt me-1"></i>' + r.work_address + '</span>' : '') +
            '</div>' +
            (r.work_content ? '<div class="rc-content">' + r.work_content + '</div>' : '') +
            (urls.length > 0 ? '<div class="rc-photos">' + urls.slice(0,3).map((u,i) => '<img src="'+u+'" alt="工单照片" width="48" height="48" loading="lazy" onclick="event.stopPropagation();pvOpen('+JSON.stringify(urls).replace(/"/g,'&quot;')+','+i+')">').join('') + (urls.length > 3 ? '<span class="rc-more-photos">+' + (urls.length-3) + '</span>' : '') + '</div>' : '') +
            '<div class="rc-footer">' +
                '<span class="rc-hint">点击卡片查看详情</span>' +
                '<div class="rc-actions">' +
                    '<button class="rc-action-btn" onclick="event.stopPropagation();exportPdfRecord('+r.id+')" title="导出PDF" aria-label="导出PDF"><i class="bi bi-filetype-pdf" aria-hidden="true"></i></button>' +
                    '<button class="rc-action-btn" onclick="event.stopPropagation();editRecord('+r.id+')" title="编辑" aria-label="编辑工单"><i class="bi bi-pencil" aria-hidden="true"></i></button>' +
                    '<button class="rc-action-btn rc-action-delete" onclick="event.stopPropagation();deleteRecord('+r.id+')" title="删除" aria-label="删除工单"><i class="bi bi-trash" aria-hidden="true"></i></button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('') + (records.length > limit ? `<div class="query-load-more"><button class="btn btn-outline-primary" onclick="showMoreQueryResults()">显示更多 ${Math.min(30, records.length - limit)} 条（共 ${records.length} 条）</button></div>` : '');
}

function showMoreQueryResults() {
    const container = document.getElementById('queryResults');
    container.dataset.limit = String((Number(container.dataset.limit || 30)) + 30);
    renderQueryResults(lastQueryRecords);
}

function renderQuerySummary(records, total) {
    const el = document.getElementById('querySummary');
    if (!el) return;
    const sum = records.reduce((acc, r) => {
        acc.totalFee += Number(r.total_fee || 0);
        acc.unpaid += ['unpaid','partial','monthly'].includes(r.payment_status) ? Math.max(0, Number(r.total_fee || 0) - Number(r.paid_amount || 0)) : 0;
        acc.repair += r.record_type === 'repair' ? 1 : 0;
        acc.construction += r.record_type === 'construction' ? 1 : 0;
        return acc;
    }, {totalFee:0, unpaid:0, repair:0, construction:0});
    el.innerHTML = `
        <div class="query-summary-card"><span>匹配工单</span><strong>${total || records.length}</strong></div>
        <div class="query-summary-card"><span>施工记录</span><strong>${sum.construction}</strong></div>
        <div class="query-summary-card"><span>维修工单</span><strong>${sum.repair}</strong></div>
        <div class="query-summary-card money"><span>金额合计</span><strong>¥${sum.totalFee.toFixed(0)}</strong></div>
        <div class="query-summary-card warn"><span>待收款</span><strong>¥${sum.unpaid.toFixed(0)}</strong></div>`;
}

// ===================== 工作记录详情 =====================
async function openRecordDetail(recordId) {
    try {
        const r = await apiFetch(`${API_URL}/records/${recordId}`);
        const record = await r.json();
        const photos = Array.isArray(record.work_photos) ? record.work_photos : [];
        const urls = photos.map(p => photoUrl(p));

        let staffName = record.staff_names && record.staff_names.length > 0 && record.staff_names[0] ? record.staff_names.join('、') : record.staff_name;
        const statusMap = {'pending':'待施工/待处理','dispatched':'已派单','in_progress':'进行中/处理中','customer_confirm':'待客户确认','callback':'待回访','settlement':'待结算','completed':'已完成','rework':'需返工','unable':'无法处理','paused':'暂停处理','cancelled':'已取消'};
        const payMap = {'unpaid':'未收款','partial':'部分收款','paid':'已收款','monthly':'月结','invoicing':'待开票','invoiced':'已开票'};
        const statusText = statusMap[record.status] || record.status || '未设置';
        const payText = payMap[record.payment_status] || record.payment_status || '未设置';
        const typeText = record.record_type === 'repair' ? '维修单' : '施工单';
        const dateText = new Date(record.work_date).toLocaleDateString();
        const timeText = record.start_time || record.end_time ? `${record.start_time || '--:--'} — ${record.end_time || '--:--'}` : '未填写';
        const feeHtml = Number(record.total_fee || 0) > 0 ? `
            <section class="wd-section">
                <div class="wd-section-title">费用信息</div>
                <div class="wd-fee-grid">
                    <div><span>人工</span><strong>¥${Number(record.labor_fee || 0).toFixed(2)}</strong></div>
                    <div><span>材料</span><strong>¥${Number(record.material_fee || 0).toFixed(2)}</strong></div>
                    <div><span>交通</span><strong>¥${Number(record.transport_fee || 0).toFixed(2)}</strong></div>
                    <div><span>其他</span><strong>¥${Number(record.other_fee || 0).toFixed(2)}</strong></div>
                    <div class="wd-fee-total"><span>合计</span><strong>¥${Number(record.total_fee || 0).toFixed(2)}</strong></div>
                </div>
            </section>` : '';
        const contentHtml = record.record_type === 'repair' ? `
            <section class="wd-section">
                <div class="wd-section-title">维修内容</div>
                <div class="wd-content-stack">
                    ${record.fault_description ? `<div><span>故障现象</span><p>${record.fault_description}</p></div>` : ''}
                    ${record.fault_diagnosis ? `<div><span>故障诊断</span><p>${record.fault_diagnosis}</p></div>` : ''}
                    ${record.repair_process ? `<div><span>维修过程</span><p>${record.repair_process}</p></div>` : ''}
                    <div><span>维修结果</span><p>${record.repair_result === 'pending' ? '未维修完成' : '已维修完成'}</p></div>
                    ${record.repair_result === 'pending' ? `<div class="wd-warning"><span>未完成原因</span><p>${record.incomplete_reason_type || '未分类'}：${record.incomplete_reason || '未填写'}</p></div>` : ''}
                </div>
            </section>` : `
            <section class="wd-section">
                <div class="wd-section-title">施工内容</div>
                <div class="wd-content-stack"><div><p>${record.work_content || '未填写'}</p></div></div>
            </section>`;
        const photoHtml = urls.length > 0 ? `
            <section class="wd-section">
                <div class="wd-section-title">现场照片</div>
                <div class="wd-photo-grid">${urls.map((u,i) => `<img src="${u}" onclick="pvOpen(${JSON.stringify(urls).replace(/"/g,'&quot;')},${i})">`).join('')}</div>
            </section>` : '';
        let html = `<div class="work-detail-v2">
            <section class="wd-hero ${record.record_type === 'repair' ? 'is-repair' : 'is-construction'}">
                <div class="wd-kicker">
                    <span>${record.order_no || '未编号'}</span>
                    <span>${dateText}</span>
                </div>
                <h3>${record.customer_name || '未命名客户'}</h3>
                <div class="wd-tags">
                    <span class="wd-tag wd-type">${typeText}</span>
                    <button class="wd-tag wd-status" onclick="changeRecordStatus(${record.id})">${statusText} <i class="bi bi-arrow-right"></i></button>
                    <span class="wd-tag wd-pay">${payText}</span>
                </div>
                <div class="wd-actions">
                    <button type="button" class="wd-action-btn" onclick="editRecord(${record.id})"><i class="bi bi-pencil-square"></i>编辑</button>
                    <button type="button" class="wd-action-btn" onclick="exportPdfRange(${record.id})"><i class="bi bi-filetype-pdf"></i>导出</button>
                    <button type="button" class="wd-action-btn danger" onclick="deleteRecord(${record.id})"><i class="bi bi-trash"></i>删除</button>
                </div>
            </section>
            <section class="wd-section">
                <div class="wd-section-title">客户信息</div>
                <div class="wd-info-grid">
                    <div><span>联系人</span><strong>${record.contact_name || '未填写'}</strong></div>
                    <div><span>联系电话</span><strong>${record.customer_phone || '未填写'}</strong></div>
                    <div class="span-2"><span>地址</span><strong>${record.work_address || '未填写'}</strong></div>
                </div>
            </section>
            <section class="wd-section">
                <div class="wd-section-title">工单信息</div>
                <div class="wd-info-grid">
                    <div><span>工作人员</span><strong>${staffName || '未指派'}</strong></div>
                    <div><span>作业时间</span><strong>${timeText}</strong></div>
                    <div><span>状态</span><strong>${statusText}</strong></div>
                    <div><span>收款</span><strong>${payText}</strong></div>
                </div>
            </section>
            ${contentHtml}
            ${record.remark ? `<section class="wd-section"><div class="wd-section-title">备注</div><div class="wd-note">${record.remark}</div></section>` : ''}
            ${feeHtml}
            ${photoHtml}
        </div>`;
        showModal('工作详情', html);
    } catch (e) { alert('加载失败'); }
}

// ===================== 编辑记录（含照片增删） =====================
let editRecordPhotos = []; // [{id, url, name, isNew}]
let editRecordId = null;

async function editRecord(recordId) {
    try {
        const [r, staffResp] = await Promise.all([
            apiFetch(`${API_URL}/records/${recordId}`),
            apiFetch(`${API_URL}/staffs`)
        ]);
        const record = await r.json();
        const staffs = await staffResp.json();
        editRecordId = recordId;
        editRecordPhotos = (Array.isArray(record.work_photos) ? record.work_photos : []).map((p,i) => ({
            id: i, url: photoUrl(p), name: p.split('/').pop(), isNew: false
        }));
        
        const staffNamesArr = (record.staff_names && record.staff_names.length > 0 && record.staff_names[0])
            ? record.staff_names.filter(n => n) : [record.staff_name].filter(n => n);
        const staffOpts = staffs.map(s => {
            const checked = staffNamesArr.includes(s.name);
            const badgeCls = s.staff_type === 'temp' ? 'staff-tag-temp' : 'staff-tag-fixed';
            return `<label class="staff-chip ${badgeCls}">
                <input type="checkbox" name="edi_staff_check" value="${s.name}" data-type="${s.staff_type}" data-wage="${s.daily_wage}" ${checked?'checked':''} onchange="ediStaffCheckboxChange()">
                <span>${s.name}</span>
                <small>${s.staff_type==='temp'?'临时':'固定'}</small>
            </label>`;
        }).join('');

        renderEditPhotoList();

        const html = `<form id="editRecordForm">
            <div class="mb-2"><label class="form-label fw500">客户</label>
                <input type="text" class="form-control" id="ediCustomer" value="${record.customer_name}" required></div>
            <div class="row g-2 mb-2">
                <div class="col"><label class="form-label fw500">联系人</label>
                    <input type="text" class="form-control" id="ediContact" value="${record.contact_name||''}"></div>
                <div class="col"><label class="form-label fw500">联系电话</label>
                    <input type="text" class="form-control" id="ediPhone" value="${record.customer_phone||''}"></div>
            </div>
            <div class="mb-2"><label class="form-label fw500">地址</label>
                <input type="text" class="form-control" id="ediAddress" value="${record.work_address}"></div>
            <div class="mb-2"><label class="form-label fw500">工作人员</label>
                <div class="staff-picker" id="ediStaffPicker">
                    <div id="ediStaffPickerTrigger" class="staff-picker-trigger" onclick="ediToggleStaffPicker()">
                        <span id="ediPickerText">选择人员</span> <i class="bi bi-chevron-down ms-1" style="font-size:.7rem"></i>
                    </div>
                    <div id="ediStaffPickPanel" class="staff-pick-panel">
                        ${staffOpts}
                    </div>
                </div><div id="ediSelectedStaffTags" class="d-flex flex-wrap gap-1 mt-1"></div></div>
            <div class="row g-2 mb-2">
                <div class="col"><label class="form-label fw500">开始</label>
                    <input type="time" class="form-control" id="ediStart" value="${record.start_time||''}" onchange="ediCalcLabor()"></div>
                <div class="col"><label class="form-label fw500">结束</label>
                    <input type="time" class="form-control" id="ediEnd" value="${record.end_time||''}" onchange="ediCalcLabor()"></div>
            </div>
            <div class="mb-2"><label class="form-label fw500">内容</label>
                <textarea class="form-control" id="ediContent" rows="3">${record.work_content}</textarea></div>
            ${record.record_type === 'repair' ? `<div class="row g-2 mb-2">
                <div class="col-md-4"><label class="form-label fw500">维修结果</label>
                    <select class="form-select" id="ediRepairResult" onchange="ediToggleIncomplete()">
                        <option value="completed" ${record.repair_result !== 'pending' ? 'selected' : ''}>已维修完成</option>
                        <option value="pending" ${record.repair_result === 'pending' ? 'selected' : ''}>未维修完成</option>
                    </select></div>
                <div class="col-md-4 edi-incomplete-field"><label class="form-label fw500">未完成原因类型</label>
                    <select class="form-select" id="ediIncompleteReasonType">
                        ${['','缺少配件','设备需更换','客户现场条件不具备','需厂家/上级技术支持','客户改期','费用/报价待确认','其他原因'].map(x=>`<option value="${x}" ${record.incomplete_reason_type===x?'selected':''}>${x||'请选择'}</option>`).join('')}
                    </select></div>
                <div class="col-md-4 edi-incomplete-field"><label class="form-label fw500">原因说明</label>
                    <input type="text" class="form-control" id="ediIncompleteReason" value="${record.incomplete_reason||''}"></div>
            </div>` : ''}
            <div class="mb-2">
                <label class="form-label fw500 small mb-0">税费</label>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="ediTaxType" id="ediTaxNo" value="no" ${record.tax_type!=='tax'?'checked':''} onchange="ediCalcTotal()">
                    <label class="form-check-label small" for="ediTaxNo">不含税</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="ediTaxType" id="ediTaxYes" value="tax" ${record.tax_type==='tax'?'checked':''} onchange="ediCalcTotal()">
                    <label class="form-check-label small" for="ediTaxYes">含增值税</label>
                </div>
            </div>
            <div class="row g-2 mb-2">
                <div class="col-3"><label class="form-label fw500">人工</label>
                    <input type="number" class="form-control" id="ediLabor" step="0.01" value="${record.labor_fee||0}"></div>
                <div class="col-3"><label class="form-label fw500">材料</label>
                    <input type="number" class="form-control" id="ediMaterial" step="0.01" value="${record.material_fee||0}"></div>
                <div class="col-3"><label class="form-label fw500">交通</label>
                    <input type="number" class="form-control" id="ediTransport" step="0.01" value="${record.transport_fee||0}"></div>
                <div class="col-3"><label class="form-label fw500">其他</label>
                    <input type="number" class="form-control" id="ediOther" step="0.01" value="${record.other_fee||0}"></div>
            </div>
            <div class="mb-2"><label class="form-label fw500">备注</label>
                <input type="text" class="form-control" id="ediRemark" value="${record.remark||''}"></div>
            <div class="mb-2 fw-bold" style="font-size:1.1rem">
                <input type="text" class="form-control fw-bold" id="ediTotal" value="${record.total_fee||0}" readonly style="background:rgba(79,70,229,.08);color:#4f46e5;font-size:1.2rem">
            </div>
            <div class="mb-2">
                <label class="form-label fw500">照片（可单个删除或新增）</label>
                <div id="editPhotoList" class="d-flex flex-wrap gap-2 mb-2"></div>
                <input type="file" class="form-control" id="ediNewPhotos" multiple accept="image/*" onchange="onEditPhotoAdd(event)">
            </div>
            <button type="submit" class="btn btn-success w-100"><i class="bi bi-check-lg me-1"></i>保存修改</button>
        </form>`;
        showModal('编辑工作记录', html);
        if (record.record_type === 'repair') ediToggleIncomplete();
        renderEditPhotoList();
        document.getElementById('editRecordForm').addEventListener('submit', submitEditRecord);
    } catch (e) { alert('加载失败'); }
}

function renderEditPhotoList() {
    const container = document.getElementById('editPhotoList');
    if (!container) return;
    if (editRecordPhotos.length === 0) {
        container.innerHTML = '<span class="text-muted small">暂无照片</span>';
        return;
    }
    container.innerHTML = editRecordPhotos.map((p, i) => `
        <div style="position:relative;display:inline-block">
            <img src="${p.url}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #ddd">
            <button type="button" class="btn btn-danger btn-sm" style="position:absolute;top:-6px;right:-6px;padding:0 5px;font-size:11px;border-radius:50%;line-height:1.4" onclick="removeEditPhoto(${i})">&times;</button>
            ${p.isNew ? '<span style="position:absolute;bottom:2px;left:2px;background:green;color:#fff;font-size:9px;padding:0 4px;border-radius:3px">新</span>' : ''}
        </div>
    `).join('');
}

function onEditPhotoAdd(e) {
    for (const file of e.target.files) {
        const reader = new FileReader();
        const idx = editRecordPhotos.length;
        reader.onload = ev => {
            editRecordPhotos.push({ id: idx, url: ev.target.result, file: file, isNew: true });
            renderEditPhotoList();
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
}

function removeEditPhoto(i) {
    editRecordPhotos.splice(i, 1);
    renderEditPhotoList();
}

function ediToggleStaffPicker() {
    const panel = document.getElementById('ediStaffPickPanel');
    if (!panel) return;
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) {
        setTimeout(() => {
            document.addEventListener('click', ediCloseOnClickOutside);
        }, 10);
    }
}

function ediCloseOnClickOutside(e) {
    const picker = document.getElementById('ediStaffPicker');
    if (!picker) return;
    if (!picker.contains(e.target)) {
        document.getElementById('ediStaffPickPanel').classList.remove('show');
        document.removeEventListener('click', ediCloseOnClickOutside);
    }
}

function ediStaffCheckboxChange() {
    var checks = document.querySelectorAll('#ediStaffPickPanel input[name="edi_staff_check"]:checked');
    var tags = document.getElementById('ediSelectedStaffTags');
    if (!tags) return;
    tags.innerHTML = Array.from(checks).map(function(cb) {
        var t = cb.dataset.type;
        var badge = t === 'temp' ? '<span style="background:#fef3c7;color:#92400e;font-size:.7rem;padding:0 4px;border-radius:3px">临时</span>'
            : '<span style="background:#e0e7ff;color:#3730a3;font-size:.7rem;padding:0 4px;border-radius:3px">固定</span>';
        return '<span class="badge d-flex align-items-center gap-1" style="background:var(--glass-bg-strong);border:1px solid var(--glass-border);color:var(--text-primary);padding:4px 8px;font-size:.8rem;cursor:pointer" onclick="ediDeselectStaff(\'' + cb.value + '\')">' + badge + ' ' + cb.value + ' <i class="bi bi-x"></i></span>';
    }).join('');
    var n = checks.length;
    document.getElementById('ediPickerText').textContent = n > 0 ? '已选 ' + n + ' 人' : '选择人员';
    ediCalcLabor();
}
function ediDeselectStaff(name) {
    var cb = document.querySelector('#ediStaffPickPanel input[value="' + name + '"]');
    if (cb) cb.checked = false;
    ediStaffCheckboxChange();
}
function ediCalcLabor() {
    var checks = document.querySelectorAll('#ediStaffPickPanel input[name="edi_staff_check"]:checked');
    var start = document.getElementById('ediStart')?.value;
    var end = document.getElementById('ediEnd')?.value;
    var hours = 0;
    if (start && end) {
        var sh = parseInt(start.split(':')[0]), sm = parseInt(start.split(':')[1]);
        var eh = parseInt(end.split(':')[0]), em = parseInt(end.split(':')[1]);
        hours = (eh * 60 + em - sh * 60 - sm) / 60;
    }
    var total = 0;
    checks.forEach(function(cb) {
        var wage = parseFloat(cb.dataset.wage) || 0;
        if (cb.dataset.type === 'fixed' && hours > 0) {
            var daily = wage > 0 ? wage : 200;
            total += hours <= 4 ? daily * 0.5 : daily;
        }
    });
    if (total > 0 || checks.length > 0) {
        document.getElementById('ediLabor').value = total.toFixed(2);
        ediCalcTotal();
    }
}

function ediCalcTotal() {
    var labor = parseFloat(document.getElementById('ediLabor')?.value) || 0;
    var material = parseFloat(document.getElementById('ediMaterial')?.value) || 0;
    var transport = parseFloat(document.getElementById('ediTransport')?.value) || 0;
    var other = parseFloat(document.getElementById('ediOther')?.value) || 0;
    var subtotal = labor + material + transport + other;
    var taxType = document.querySelector('input[name=ediTaxType]:checked')?.value || 'no';
    var tax = taxType === 'tax' ? Math.round(subtotal * 0.03 * 100) / 100 : 0;
    var total = document.getElementById('ediTotal');
    if (total) total.value = (subtotal + tax).toFixed(2);
}

function ediToggleIncomplete() {
    const pending = document.getElementById('ediRepairResult')?.value === 'pending';
    document.querySelectorAll('.edi-incomplete-field').forEach(el => el.style.display = pending ? '' : 'none');
}

async function submitEditRecord(e) {
    e.preventDefault();
    const data = {
        customer_name: document.getElementById('ediCustomer').value,
        contact_name: document.getElementById('ediContact').value || '',
        customer_phone: document.getElementById('ediPhone').value || '',
        work_address: document.getElementById('ediAddress').value,
        staff_name: document.querySelector('#ediStaffPickPanel input[name="edi_staff_check"]:checked')?.value || '',
        staff_names: Array.from(document.querySelectorAll('#ediStaffPickPanel input[name="edi_staff_check"]:checked')||[]).map(cb=>cb.value).join(','),
        work_content: document.getElementById('ediContent').value,
        start_time: document.getElementById('ediStart').value||'',
        end_time: document.getElementById('ediEnd').value||'',
        labor_fee: parseFloat(document.getElementById('ediLabor').value)||0,
        material_fee: parseFloat(document.getElementById('ediMaterial').value)||0,
        transport_fee: parseFloat(document.getElementById('ediTransport').value)||0,
        other_fee: parseFloat(document.getElementById('ediOther').value)||0,
        remark: document.getElementById('ediRemark').value||'',
        tax_type: document.querySelector('input[name=ediTaxType]:checked')?.value||'no',
        tax_rate: 0.03
    };
    if (document.getElementById('ediRepairResult')) {
        data.repair_result = document.getElementById('ediRepairResult').value;
        data.incomplete_reason_type = document.getElementById('ediIncompleteReasonType')?.value || '';
        data.incomplete_reason = document.getElementById('ediIncompleteReason')?.value || '';
        if (data.repair_result === 'pending' && !data.incomplete_reason.trim()) {
            alert('未维修完成时请填写原因说明');
            document.getElementById('ediIncompleteReason')?.focus();
            return;
        }
    }
    try {
        // 如果有新增照片，用 multipart；否则用 JSON
        const newFiles = editRecordPhotos.filter(p => p.isNew).map(p => p.file);
        const keepPhotoNames = editRecordPhotos.filter(p => !p.isNew).map(p => p.name);

        if (newFiles.length > 0) {
            const fd = new FormData();
            Object.entries(data).forEach(([k,v]) => fd.append(k, v));
            newFiles.forEach(f => fd.append('photos', f));
            fd.append('keep_photos', JSON.stringify(keepPhotoNames));
            const r = await apiFetch(`${API_URL}/records/${editRecordId}`, { method: 'PUT', body: fd });
            if (r.ok) {
                let respData = null;
                try { respData = await r.clone().json(); } catch(e) {}
                closeModalAndRefresh();
                if (respData && respData.warnings && respData.warnings.length) {
                    alert('⚠️ 库存警告：\n' + respData.warnings.join('\n'));
                }
            } else { const j = await r.json(); alert('修改失败: '+(j.error||'')); }
        } else {
            data.keep_photos = JSON.stringify(keepPhotoNames);
            const r = await apiFetch(`${API_URL}/records/${editRecordId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (r.ok) {
                let respData = null;
                try { respData = await r.clone().json(); } catch(e) {}
                closeModalAndRefresh();
                if (respData && respData.warnings && respData.warnings.length) {
                    alert('⚠️ 库存警告：\n' + respData.warnings.join('\n'));
                }
            } else { const j = await r.json(); alert('修改失败: '+(j.error||'')); }
        }
    } catch (e) { alert('网络错误'); }
}

function closeModalAndRefresh() {
    const m = bootstrap.Modal.getInstance(document.getElementById('gModal'));
    if (m) m.hide();
    queryRecords();
}

async function deleteRecord(recordId) {
    if (!confirm('确认删除？照片也会删除。')) return;
    try { const r = await apiFetch(`${API_URL}/records/${recordId}`, { method: 'DELETE' }); if (r.ok) queryRecords(); else alert('删除失败'); }
    catch (e) { alert('网络错误'); }
}

// ===================== 待办事项 =====================
async function submitPendingWork(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        title: fd.get('title')||'', customer_name: fd.get('customer_name'),
        contact_name: fd.get('contact_name')||'', contact_phone: fd.get('contact_phone')||'', todo_type: fd.get('todo_type')||'客户报修', priority: fd.get('priority')||'normal',
        work_address: fd.get('work_address')||'', staff_name: fd.get('staff_name')||'',
        work_content: fd.get('work_content'), reminder_date: fd.get('reminder_date')
    };
    try {
        const r = await apiFetch(`${API_URL}/pending`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (r.ok) { e.target.reset(); loadPendingWorks(); updatePendingBadge(); }
        else { const j = await r.json(); alert(j.error||'添加失败'); }
    } catch (e) { alert('网络错误'); }
}

async function loadPendingWorks() {
    try {
        const r = await apiFetch(`${API_URL}/pending?status=pending&per_page=100`);
        const data = await r.json();
        const container = document.getElementById('pendingList');
        const badge = document.getElementById('pendingCountBadge');
        if (data.records.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-check2-circle"></i>没有待办事项</div>';
            if (badge) badge.textContent = '0'; return;
        }
        if (badge) badge.textContent = data.records.length;
        const today = todayStr();
        const overdue = data.records.filter(p => p.reminder_date.split('T')[0] < today);
        const todayItems = data.records.filter(p => p.reminder_date.split('T')[0] === today);
        const future = data.records.filter(p => p.reminder_date.split('T')[0] > today);
        let html = '';
        if (overdue.length > 0) {
            html += `<div class="text-danger fw-semibold small mb-1"><i class="bi bi-exclamation-circle me-1"></i>过期 (${overdue.length})</div>`;
            html += overdue.map(p => pendingCard(p, true)).join('');
        }
        if (todayItems.length > 0) {
            html += `<div class="fw-semibold small mb-1 mt-2"><i class="bi bi-calendar-check me-1"></i>今天</div>`;
            html += todayItems.map(p => pendingCard(p)).join('');
        }
        if (future.length > 0) {
            html += `<div class="text-muted fw-semibold small mb-1 mt-2"><i class="bi bi-calendar3 me-1"></i>以后 (${future.length})</div>`;
            html += future.map(p => pendingCard(p)).join('');
        }
        container.innerHTML = html;
    } catch (e) { document.getElementById('pendingList').innerHTML = '<div class="empty-state">加载失败</div>'; }
}

function pendingCard(p, isOver) {
    const remind = p.reminder_date ? p.reminder_date.split('T')[0] : '';
    const dayDiff = remind ? Math.floor((new Date(todayStr()) - new Date(remind)) / 86400000) : 0;
    const priority = p.priority === 'urgent' ? '紧急' : '普通';
    const type = p.todo_type || '客户报修';
    const phone = p.contact_phone ? `<span><i class="bi bi-telephone me-1"></i>${p.contact_phone}</span>` : '';
    const contact = p.contact_name ? `<span><i class="bi bi-person-vcard me-1"></i>${p.contact_name}</span>` : '';
    const overdueText = isOver ? `<span class="pc-overdue"><i class="bi bi-exclamation-triangle-fill me-1"></i>超期 ${Math.max(dayDiff, 1)} 天</span>` : '';
    return `<div class="pending-card pending-priority-${p.priority || 'normal'}${isOver?' pending-overdue':''}">
        <div class="pc-head">
            <div class="pc-title">${p.title||p.customer_name}</div>
            <div class="pc-badges">
                <span class="pc-type">${type}</span>
                <span class="pc-priority">${priority}</span>
                ${overdueText}
            </div>
        </div>
        <div class="pc-meta">
            <span><i class="bi bi-person me-1"></i>${p.customer_name || '-'}</span>
            ${contact}
            <span><i class="bi bi-person-badge me-1"></i>${p.staff_name || '未分配'}</span>
            ${phone}
            <span><i class="bi bi-calendar-event me-1"></i>${remind}</span>
        </div>
        <div class="pc-content">${p.work_content || ''}</div>
        <div class="pc-actions">
            <button class="btn btn-primary btn-sm" onclick="transferPending(${p.id},'repair')"><i class="bi bi-wrench-adjustable me-1"></i>转维修</button>
            <button class="btn btn-success btn-sm" onclick="transferPending(${p.id},'construction')"><i class="bi bi-tools me-1"></i>转施工</button>
            <button class="btn btn-outline-success btn-sm" onclick="completePending(${p.id})"><i class="bi bi-check-circle me-1"></i>完成</button>
            <button class="btn btn-outline-primary btn-sm" onclick="editPending(${p.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="deletePending(${p.id})"><i class="bi bi-trash"></i></button>
        </div>
    </div>`;
}

async function transferPending(pendingId, type) {
    try {
        const r = await apiFetch(`${API_URL}/pending/${pendingId}/complete?record_type=${type}`, {method:'POST'});
        if (r.ok) { loadPendingWorks(); updatePendingBadge(); queryRecordType = type; queryRecords(); switchTab('tab-query'); }
        else alert('转单失败');
    } catch (e) { alert('网络错误'); }
}

async function completePending(pendingId) {
    try { const r = await apiFetch(`${API_URL}/pending/${pendingId}`, {method:'PUT', body: JSON.stringify({status:'completed'})}); if (r.ok) { loadPendingWorks(); updatePendingBadge(); loadDashboard(); } else alert('操作失败'); }
    catch (e) { alert('网络错误'); }
}

async function editPending(pendingId) {
    try {
        const r = await apiFetch(`${API_URL}/pending?status=pending&per_page=200`);
        const data = await r.json();
        const p = data.records.find(x => x.id === pendingId);
        if (!p) return;
        const html = `<form id="editPendingForm2">
            <input type="hidden" id="epiId" value="${p.id}">
            <div class="mb-2"><label class="form-label fw500">标题</label><input type="text" class="form-control" id="epiTitle" value="${p.title||''}"></div>
            <div class="mb-2"><label class="form-label fw500">客户</label><input type="text" class="form-control" id="epiCustomer" value="${p.customer_name}" required></div>
            <div class="mb-2"><label class="form-label fw500">联系人</label><input type="text" class="form-control" id="epiContact" value="${p.contact_name||''}"></div>
            <div class="mb-2"><label class="form-label fw500">联系电话</label><input type="text" class="form-control" id="epiPhone" value="${p.contact_phone||''}"></div>
            <div class="mb-2"><label class="form-label fw500">地址</label><input type="text" class="form-control" id="epiAddress" value="${p.work_address||''}"></div>
            <div class="mb-2"><label class="form-label fw500">内容</label><textarea class="form-control" id="epiContent" rows="3">${p.work_content}</textarea></div>
            <div class="mb-2"><label class="form-label fw500">提醒日期</label><input type="date" class="form-control" id="epiDate" value="${p.reminder_date.split('T')[0]}"></div>
            <button type="submit" class="btn btn-warning w-100"><i class="bi bi-check-lg me-1"></i>保存</button>
        </form>`;
        showModal('编辑待办事项', html);
        document.getElementById('editPendingForm2').addEventListener('submit', async e => {
            e.preventDefault();
            const d = { title: document.getElementById('epiTitle').value||'', customer_name: document.getElementById('epiCustomer').value, contact_name: document.getElementById('epiContact').value||'', contact_phone: document.getElementById('epiPhone').value||'', work_address: document.getElementById('epiAddress').value||'', work_content: document.getElementById('epiContent').value, reminder_date: document.getElementById('epiDate').value };
            try {
                const resp = await apiFetch(`${API_URL}/pending/${p.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) });
                if (resp.ok) { bootstrap.Modal.getInstance(document.getElementById('gModal')).hide(); loadPendingWorks(); updatePendingBadge(); } else alert('修改失败');
            } catch(e) { alert('网络错误'); }
        });
    } catch(e) { alert('加载失败'); }
}

async function deletePending(pendingId) {
    if (!confirm('确认删除？')) return;
    try { const r = await apiFetch(`${API_URL}/pending/${pendingId}`, {method:'DELETE'}); if (r.ok) { loadPendingWorks(); updatePendingBadge(); } else alert('删除失败'); }
    catch(e) { alert('网络错误'); }
}

async function updatePendingBadge() {
    try {
        const r = await apiFetch(`${API_URL}/pending?status=pending`);
        const data = await r.json();
        const badge = document.getElementById('pendingBadge');
        if (badge) {
            if (data.records.length > 0) { badge.textContent = data.records.length; badge.style.display = 'inline-block'; }
            else badge.style.display = 'none';
        }
        const dockBadge = document.getElementById('dockPendingBadge');
        if (dockBadge) {
            dockBadge.textContent = data.records.length;
            dockBadge.style.display = data.records.length > 0 ? 'inline-flex' : 'none';
        }
    } catch(e) {}
}

// ===================== 统计 =====================
async function loadStatistics() {
    const s = document.getElementById('statsStart').value;
    const e = document.getElementById('statsEnd').value;
    let url = `${API_URL}/statistics`;
    if (s && e) url += `?start_date=${s}&end_date=${e}`;
    try {
        const r = await apiFetch(url); const stats = await r.json();
        document.getElementById('statsContent').innerHTML = `
            <div class="stats-kpi-grid mb-4">
                <div class="stats-hero-card"><div class="shc-number" style="color:#22d3ee">${stats.total_works}</div><div class="shc-label">工作记录</div></div>
                <div class="stats-hero-card"><div class="shc-number" style="color:#2cffb5">${stats.construction_count || 0}</div><div class="shc-label">施工记录</div></div>
                <div class="stats-hero-card"><div class="shc-number" style="color:#60a5fa">${stats.repair_count || 0}</div><div class="shc-label">维修工单</div></div>
                <div class="stats-hero-card"><div class="shc-number" style="color:#fbbf24">${stats.pending_count}</div><div class="shc-label">待办事项</div></div>
                <div class="stats-hero-card"><div class="shc-number" style="color:#34d399">¥${stats.totals.total_fee.toFixed(0)}</div><div class="shc-label">总费用</div></div>
                <div class="stats-hero-card"><div class="shc-number" style="color:#fb7185">¥${(stats.unpaid_amount || 0).toFixed(0)}</div><div class="shc-label">待收款</div></div>
            </div>
            ${stats.fee_summary && stats.fee_summary.length > 0 ? `<h6 class="stats-section-title"><i class="bi bi-people-fill me-1"></i>按人员费用汇总</h6><div class="stats-table-wrapper"><table class="table table-bordered table-hover stats-table"><thead class="stats-thead"><tr><th>人员</th><th>次数</th><th>人工</th><th>材料</th><th>交通</th><th>其他</th><th>税费</th><th>合计</th></tr></thead><tbody>${stats.fee_summary.map(s => `<tr><td>${s.staff_name}</td><td>${s.work_count}</td><td>¥${s.labor_fee.toFixed(0)}</td><td>¥${s.material_fee.toFixed(0)}</td><td>¥${s.transport_fee.toFixed(0)}</td><td>¥${s.other_fee.toFixed(0)}</td><td>¥${(s.tax_amount||0).toFixed(0)}</td><td><strong>¥${s.total_fee.toFixed(0)}</strong></td></tr>`).join('')}</tbody></table>${stats.fee_summary && stats.fee_summary.length > 8 ? '<div class="stats-more-hint">共 '+stats.fee_summary.length+' 条，滚动查看更多</div>' : ''}</div>` : ''}
            ${stats.staff_stats && stats.staff_stats.length > 0 ? `<h6 class="stats-section-title"><i class="bi bi-bar-chart-fill me-1"></i>人员工作次数</h6><div class="stats-work-list">${stats.staff_stats.map(s => `<div class="stats-work-row"><span>${s.name}</span><span class="badge rounded-pill" style="background:rgba(129,140,248,.15);color:#a5b4fc">${s.count}次</span></div>`).join('')}</div>${stats.staff_stats.length > 6 ? '<div class="stats-more-hint">共 '+stats.staff_stats.length+' 人，滚动查看更多</div>' : ''}` : ''}
            <div class="stats-date-range"><i class="bi bi-calendar3 me-1"></i>统计周期：${stats.date_range.start} ~ ${stats.date_range.end}</div>`;
    } catch(e) { document.getElementById('statsContent').innerHTML = '<div class="empty-state">加载失败</div>'; }
}

// ===================== 照片查看器（居中控件） =====================
function pvOpen(photos, idx) {
    pvPhotos = photos; pvIdx = idx; pvZoom = 1; pvTrans = {x:0,y:0};
    pvUpdate();
    const modal = document.getElementById('photoViewerModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const leftBtn = modal.querySelector('.pv-nav-left');
    const rightBtn = modal.querySelector('.pv-nav-right');
    if (leftBtn) leftBtn.style.display = photos.length > 1 ? 'flex' : 'none';
    if (rightBtn) rightBtn.style.display = photos.length > 1 ? 'flex' : 'none';
    document.body.style.overflow = 'hidden';
}

function pvClose() {
    document.getElementById('photoViewerModal').style.display = 'none';
    document.body.style.overflow = '';
}

function pvUpdate() {
    const t = `${pvIdx+1}/${pvPhotos.length}`;
    document.getElementById('pvIndex').textContent = t;
    const ci = document.getElementById('pvCtrlIndex');
    if (ci) ci.textContent = t;
    const prevBtns = document.querySelectorAll('#pvPrevBtn, #pvCtrlPrev');
    const nextBtns = document.querySelectorAll('#pvNextBtn, #pvCtrlNext');
    prevBtns.forEach(b => b.style.display = pvIdx > 0 ? '' : 'none');
    nextBtns.forEach(b => b.style.display = pvIdx < pvPhotos.length-1 ? '' : 'none');
    const img = document.getElementById('pvImage');
    img.src = pvPhotos[pvIdx];
    img.style.transform = `translate(${pvTrans.x}px,${pvTrans.y}px) scale(${pvZoom})`;
}

function pvPrev() { if (pvIdx > 0) { pvIdx--; pvZoom=1; pvTrans={x:0,y:0}; pvUpdate(); }}
function pvNext() { if (pvIdx < pvPhotos.length-1) { pvIdx++; pvZoom=1; pvTrans={x:0,y:0}; pvUpdate(); }}
function pvZoomIn() { pvZoom = Math.min(10, pvZoom * 1.5); pvUpdate(); }
function pvZoomOut() { pvZoom = Math.max(0.2, pvZoom / 1.5); pvUpdate(); }
function pvReset() { pvZoom=1; pvTrans={x:0,y:0}; pvUpdate(); }
function pvWheel(e) { e.preventDefault(); pvZoom = e.deltaY < 0 ? Math.min(10, pvZoom*1.1) : Math.max(0.2, pvZoom/1.1); pvUpdate(); }

function pvStartDrag(e) { pvDrag=true; pvDragStart={x:e.clientX-pvTrans.x, y:e.clientY-pvTrans.y}; document.getElementById('pvContainer').style.cursor='grabbing'; }
function pvMoveDrag(e) { if(!pvDrag) return; pvTrans={x:e.clientX-pvDragStart.x, y:e.clientY-pvDragStart.y}; pvUpdate(); }
function pvEndDrag() { pvDrag=false; document.getElementById('pvContainer').style.cursor='grab'; }
function pvStartDragTouch(e) { if(e.touches.length===1) { pvDrag=true; pvDragStart={x:e.touches[0].clientX-pvTrans.x, y:e.touches[0].clientY-pvTrans.y}; }}
function pvMoveDragTouch(e) { if(!pvDrag||e.touches.length!==1) return; pvTrans={x:e.touches[0].clientX-pvDragStart.x, y:e.touches[0].clientY-pvDragStart.y}; pvUpdate(); }

// ===================== 公司设置 =====================
async function initCompanyName() {
    // 优先从后端加载公司名（跨设备同步）
    let name = localStorage.getItem('companyName');
    try {
        const r = await apiFetch(API_URL + '/settings');
        const data = await r.json();
        if (data.company_name) {
            name = data.company_name;
            localStorage.setItem('companyName', name);
        }
    } catch(e) {
        // 后端加载失败，用 localStorage 缓存值
        if (!name) name = '瑞翼智能科技';
    }
    if (!name) name = '瑞翼智能科技';
    updateCompanyName(name);
    if (document.getElementById('companyNameInput')) {
        document.getElementById('companyNameInput').value = name;
    }
    const settingsForm = document.getElementById('companySettingsForm');
    if (!settingsForm || settingsForm.dataset.ready === '1') return;
    settingsForm.dataset.ready = '1';
    settingsForm.addEventListener('submit', e => {
        e.preventDefault();
        const v = document.getElementById('companyNameInput').value.trim();
        if (v) {
            localStorage.setItem('companyName', v);
            updateCompanyName(v);
            // 保存到后端，实现跨设备同步
            apiFetch(API_URL + '/settings', {
                method: 'POST',
                body: JSON.stringify({ company_name: v })
            }).catch(() => {});
        } else {
            localStorage.removeItem('companyName');
            updateCompanyName('');
        }
        // 保存工单前缀到后端
        const prefix = document.getElementById('orderPrefixInput').value.trim().toUpperCase() || 'RY';
        apiFetch(API_URL + '/settings', {
            method: 'POST',
            body: JSON.stringify({ order_prefix: prefix })
        }).catch(() => {});
        bootstrap.Modal.getInstance(document.getElementById('companySettingsModal')).hide();
    });
}

function updateCompanyName(name) {
    const title = name ? `${name} - 瑞翼工作台` : '瑞翼工作台';
    document.getElementById('companyTitle').textContent = title;
    document.title = title;
    const footer = document.getElementById('footerCompanyName');
    if (footer) {
        footer.textContent = `${name} © ${new Date().getFullYear()}`;
    }
}

function showCompanySettings() {
    // 加载当前工单前缀
    const input = document.getElementById('orderPrefixInput');
    if (input && isAdmin()) {
        apiFetch(API_URL + '/settings').then(r => r.json()).then(data => {
            if (data.order_prefix) input.value = data.order_prefix;
        }).catch(() => {});
    }
    new bootstrap.Modal(document.getElementById('companySettingsModal')).show();
}



function calcDailyFromMonthly(el) {
    const monthly = parseFloat(el.value) || 0;
    const dailyInput = el.closest('.row').querySelector('[name="daily_wage"]');
    if (dailyInput) dailyInput.value = (monthly / 26).toFixed(2);
}

// ===================== 登录处理 =====================
function initAuth() {
    // 尝试恢复已有会话，失败再显示登录页
    restoreSession().then(restored => {
        if (!restored) showLoginPage();
        initLoginForm();
    });
}

async function restoreSession() {
    const token = getToken();
    if (!token) return false;
    try {
        const r = await apiFetch(`${API_URL}/auth/me`);
        if (r.ok) {
            const data = await r.json();
            const u = data.user;
            setToken(token); // token 不变
            localStorage.setItem('auth_user_name', u.staff_name);
            localStorage.setItem('auth_user_role', u.role);
            showApp(u.role);
            initCompanyName();
            // 延迟加载数据
            setTimeout(() => {
                try {
                    loadDashboard(); loadStaffs(); loadPendingWorks(); updatePendingBadge(); loadCustomers();
                } catch(e) { console.error('Session restore load error:', e); }
            }, 200);
            return true;
        }
    } catch(e) {}
    // token 无效或过期，清除
    clearToken();
    return false;
}

function initLoginForm() {
    
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>登录中...';
        document.getElementById('loginError').style.display = 'none';
        try {
            const r = await fetch(API_URL + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await r.json();
            if (r.ok) {
                setToken(data.token);
                localStorage.setItem('auth_user_name', data.user.staff_name);
                localStorage.setItem('auth_user_role', data.user.role);
                // 先跳转，再异步加载数据
                showApp(data.user.role);
                initCompanyName();
                // 延迟加载，确保 token 已写入
                setTimeout(() => {
                    try {
                        loadDashboard();
                        loadStaffs();
                        loadPendingWorks();
                        updatePendingBadge();
                        loadCustomers();
                    } catch(e) {
                        console.error('Post-login load error:', e);
                    }
                }, 300);
            } else {
                document.getElementById('loginError').textContent = data.error || '用户名或密码错误';
                document.getElementById('loginError').style.display = 'block';
            }
        } catch(e) {
            document.getElementById('loginError').textContent = '网络连接失败，请检查服务是否正常';
            document.getElementById('loginError').style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> 登录';
        }
    });

    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPw = document.getElementById('cpOld').value;
        const newPw = document.getElementById('cpNew').value;
        try {
            const r = await apiFetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                body: JSON.stringify({ old_password: oldPw, new_password: newPw })
            });
            if (r.ok) {
                bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
                alert('密码修改成功');
            } else {
                const d = await r.json();
                document.getElementById('cpError').textContent = d.error || '修改失败';
                document.getElementById('cpError').style.display = 'block';
            }
        } catch(e) {
            document.getElementById('cpError').textContent = '网络错误';
            document.getElementById('cpError').style.display = 'block';
        }
    });
}



// ===================== 工资记录 =====================
function fillSalaryStaffOptions() {
    const sel = document.getElementById('salaryStaff');
    if (!sel || !_staffListCache) return;
    sel.innerHTML = '<option value="">请选择</option>' + _staffListCache.map(s => `<option value="${s.name}" data-wage="${s.daily_wage||0}" data-type="${s.staff_type}">${s.name}${s.staff_type==='temp'?'（临时）':''}</option>`).join('');
    sel.onchange = () => {
        const opt = sel.selectedOptions[0];
        if (opt) document.getElementById('salaryDaily').value = opt.dataset.wage || 0;
        calcSalaryForm();
    };
}
function calcSalaryForm() {
    const daily = parseFloat(document.getElementById('salaryDaily')?.value) || 0;
    const units = parseFloat(document.getElementById('salaryUnits')?.value) || 0;
    const out = document.getElementById('salaryPayable');
    if (out) out.value = (daily * units).toFixed(2);
}
async function submitSalary(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    try {
        const r = await apiFetch(`${API_URL}/salaries`, { method:'POST', body: JSON.stringify(data) });
        if (r.ok) { e.target.reset(); document.getElementById('salaryDate').value = todayStr(); calcSalaryForm(); loadSalaries(); loadDashboard(); alert('工资记录已保存'); }
        else { const j = await r.json(); alert(j.error || '保存失败'); }
    } catch(e) { alert('网络错误'); }
}
async function loadSalaries() {
    fillSalaryStaffOptions();
    if (document.getElementById('salaryDate') && !document.getElementById('salaryDate').value) document.getElementById('salaryDate').value = todayStr();
    const month = document.getElementById('salaryMonth')?.value || '';
    const status = document.getElementById('salaryStatus')?.value || '';
    let url = `${API_URL}/salaries?`;
    if (month) url += `&month=${month}`;
    if (status) url += `&status=${status}`;
    try {
        const r = await apiFetch(url); const data = await r.json();
        const summary = document.getElementById('salarySummary');
        if (summary) summary.innerHTML = `
            <div class="col-4"><div class="stat-card"><div class="sc-number">¥${(data.summary?.payable||0).toFixed(0)}</div><div class="sc-label">应发</div></div></div>
            <div class="col-4"><div class="stat-card"><div class="sc-number">¥${(data.summary?.paid||0).toFixed(0)}</div><div class="sc-label">已发</div></div></div>
            <div class="col-4"><div class="stat-card"><div class="sc-number">¥${(data.summary?.unpaid||0).toFixed(0)}</div><div class="sc-label">未发</div></div></div>`;
        const list = document.getElementById('salaryList');
        if (!list) return;
        const records = data.records || [];
        if (records.length === 0) { list.innerHTML = '<div class="empty-state"><i class="bi bi-cash"></i>暂无工资记录</div>'; return; }
        list.innerHTML = records.map(x => `
            <div class="record-card">
                <div class="rc-top-row"><div><span class="rc-order-no">${x.salary_no}</span> <span class="badge ${x.status==='settled'?'bg-success':'bg-warning text-dark'}">${x.status==='settled'?'已结算':'未结算'}</span></div>
                <div>${x.status!=='settled'?`<button class="btn btn-success btn-sm" onclick="settleSalary(${x.id})">标记已结算</button>`:''}</div></div>
                <div class="rc-customer-name-lg">${x.staff_name} <span class="text-muted small">${new Date(x.work_date).toLocaleDateString()}</span></div>
                <div class="rc-info-row"><span>${x.business_type || '其他'} ${x.business_no || ''}</span><span>客户：${x.customer_name || '-'}</span></div>
                <div class="rc-detail">${x.work_content || ''}</div>
                <div class="rc-fee">应发 ¥${(x.payable_amount||0).toFixed(2)} | 已发 ¥${(x.paid_amount||0).toFixed(2)}</div>
            </div>`).join('');
    } catch(e) {
        const list = document.getElementById('salaryList');
        if (list) list.innerHTML = '<div class="empty-state">工资记录加载失败</div>';
    }
}
async function settleSalary(id) {
    if (!confirm('确认标记为已结算？')) return;
    try {
        const r = await apiFetch(`${API_URL}/salaries/${id}/settle`, {method:'POST', body: JSON.stringify({settlement_date: todayStr()})});
        if (r.ok) { loadSalaries(); loadDashboard(); }
        else alert('操作失败');
    } catch(e) { alert('网络错误'); }
}

// ===================== 初始化 =====================
(function(){
    fillWorkBusinessOptions('construction');
    if (document.getElementById('salaryDate')) document.getElementById('salaryDate').value = todayStr();
    const f = document.getElementById('staffUserForm');
    if (f) f.addEventListener('submit', submitStaffUser);
})();

// ===================== 手机端菜单交互 =====================
function isMobileNavLayout() {
    return window.matchMedia('(max-width: 991px)').matches;
}

function closeMobileNavMenu() {
    const nav = document.getElementById('navMenu');
    if (!nav || !isMobileNavLayout()) return;
    nav.querySelectorAll('.dropdown.show, .dropdown-menu.show').forEach(el => el.classList.remove('show'));
    nav.querySelectorAll('[data-bs-toggle="dropdown"][aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded', 'false'));
    document.body.classList.remove('mobile-nav-open');
    const collapse = bootstrap.Collapse.getOrCreateInstance(nav, { toggle: false });
    collapse.hide();
}

function setupMobileNavMenu() {
    const nav = document.getElementById('navMenu');
    if (!nav || nav.dataset.mobileMenuReady === '1') return;
    nav.dataset.mobileMenuReady = '1';

    nav.addEventListener('show.bs.collapse', () => {
        if (isMobileNavLayout()) document.body.classList.add('mobile-nav-open');
    });
    nav.addEventListener('hide.bs.collapse', () => {
        document.body.classList.remove('mobile-nav-open');
        nav.querySelectorAll('.dropdown.show, .dropdown-menu.show').forEach(el => el.classList.remove('show'));
        nav.querySelectorAll('[data-bs-toggle="dropdown"][aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded', 'false'));
    });

    nav.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(toggle => {
        toggle.addEventListener('click', event => {
            if (!isMobileNavLayout()) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const item = toggle.closest('.dropdown');
            const menu = item ? item.querySelector('.dropdown-menu') : null;
            const shouldOpen = !(item && item.classList.contains('show'));

            nav.querySelectorAll('.dropdown.show, .dropdown-menu.show').forEach(el => el.classList.remove('show'));
            nav.querySelectorAll('[data-bs-toggle="dropdown"][aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded', 'false'));

            if (item && menu && shouldOpen) {
                item.classList.add('show');
                menu.classList.add('show');
                toggle.setAttribute('aria-expanded', 'true');
            }
        });
    });

    nav.querySelectorAll('.dropdown-item, .nav-link:not(.dropdown-toggle)').forEach(link => {
        link.addEventListener('click', () => {
            if (!isMobileNavLayout()) return;
            window.setTimeout(closeMobileNavMenu, 120);
        });
    });

    window.addEventListener('resize', () => {
        if (!isMobileNavLayout()) {
            document.body.classList.remove('mobile-nav-open');
            nav.querySelectorAll('.dropdown.show, .dropdown-menu.show').forEach(el => el.classList.remove('show'));
            nav.querySelectorAll('[data-bs-toggle="dropdown"][aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded', 'false'));
        }
    });

    document.addEventListener('click', event => {
        if (!isMobileNavLayout() || !nav.classList.contains('show')) return;
        if (nav.contains(event.target) || event.target.closest('.navbar-toggler')) return;
        closeMobileNavMenu();
    });
}

// ===================== 仪表盘 =====================
async function loadDashboard() {
    try {
        const r = await apiFetch(API_URL + '/dashboard');
        const d = await r.json();
        const dc = document.getElementById('dsTodayConstruction'); if (dc) dc.textContent = d.today_construction_count || 0;
        const dr = document.getElementById('dsTodayRepair'); if (dr) dr.textContent = d.today_repair_count || 0;
        const dpc = document.getElementById('dsPendingCount'); if (dpc) dpc.textContent = d.overdue_pending || 0;
        const dua = document.getElementById('dsUnpaidAmount'); if (dua) dua.textContent = '¥' + (d.unpaid_amount || 0).toFixed(0);
        const dus = document.getElementById('dsUnpaidSalary'); if (dus) dus.textContent = '¥' + (d.unpaid_salary || 0).toFixed(0);
        
        const list = document.getElementById('dashboardTodayList');
        if (!list) return;
        if (!d.today_records || d.today_records.length === 0) {
            list.innerHTML = '<div class="text-muted small py-2">今日暂无工单</div>';
        } else {
            list.innerHTML = d.today_records.map(r => {
                const tag = r.record_type === 'repair' ? '<span style="background:#fed7aa;color:#9a3412;padding:0 6px;border-radius:4px;font-size:.72rem">🔧</span>' : '<span style="background:#bbf7d0;color:#166534;padding:0 6px;border-radius:4px;font-size:.72rem">🔨</span>';
                return '<div class="d-flex justify-content-between align-items-center py-1 border-bottom" style="border-color:var(--glass-border)!important">' +
                    '<span>' + tag + ' <strong>' + r.customer_name + '</strong> ' + (r.order_no ? '<span style="color:#6366f1;font-size:.78rem">'+r.order_no+'</span>' : '') + '</span>' +
                    '<span class="text-muted" style="font-size:.8rem">' + (r.total_fee ? '¥'+r.total_fee.toFixed(0) : '') + '</span></div>';
            }).join('');
        }

        // 待办事项列表
        const pList = document.getElementById('dashboardPendingList');
        if (!pList) return;
        const pendings = d.urgent_pending || [];
        const todayStr = new Date().toISOString().split('T')[0];
        if (pendings.length === 0) {
            pList.innerHTML = '<div class="text-muted small py-2">✅ 暂无待办事项</div>';
        } else {
            pList.innerHTML = pendings.map(p => {
                const dateStr = p.reminder_date ? p.reminder_date.split('T')[0] : '';
                const isOverdue = dateStr && dateStr < todayStr;
                const isToday = dateStr === todayStr;
                const urgencyBadge = isOverdue 
                    ? '<span style="background:#ef4444;color:#fff;padding:0 6px;border-radius:4px;font-size:.7rem">超期</span>'
                    : isToday 
                    ? '<span style="background:#f59e0b;color:#fff;padding:0 6px;border-radius:4px;font-size:.7rem">今日</span>'
                    : '<span style="background:#e0e7ff;color:#3730a3;padding:0 6px;border-radius:4px;font-size:.7rem">' + dateStr + '</span>';
                return '<div class="d-flex justify-content-between align-items-start py-1 gap-2" style="' + (isOverdue ? 'border-left:3px solid #ef4444;padding-left:8px;' : 'border-bottom:1px solid var(--glass-border)') + '">' +
                    '<div class="flex-grow-1" style="min-width:0">' +
                        '<div><strong style="font-size:.84rem">' + (p.customer_name || '') + '</strong>' +
                        (p.title ? '<span class="text-muted ms-1" style="font-size:.78rem">' + p.title + '</span>' : '') + '</div>' +
                        (p.work_content ? '<div class="text-muted" style="font-size:.78rem;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + p.work_content + '</div>' : '') +
                        (p.staff_name ? '<span class="text-muted" style="font-size:.7rem">👤 ' + p.staff_name + '</span>' : '') +
                    '</div>' +
                    '<div class="d-flex flex-column gap-1 align-items-end flex-shrink-0">' + urgencyBadge + '</div>' +
                '</div>';
            }).join('');
        }
    } catch(e) { console.error(e); }
}

// ===================== 日历 =====================
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth() + 1;
let calendarData = {};

async function loadCalendarData() {
    try {
        const r = await apiFetch(API_URL + '/calendar?year=' + calendarYear + '&month=' + calendarMonth);
        calendarData = await r.json();
    } catch(e) { calendarData = {}; }
    renderCalendar();
}

function renderCalendar() {
    document.getElementById('calendarTitle').textContent = calendarYear + '年' + calendarMonth + '月';
    var firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    var daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    var today = new Date();
    var html = '';
    var day = 1;
    for (var r = 0; r < 6; r++) {
        if (day > daysInMonth) break;
        html += '<tr>';
        for (var c = 0; c < 7; c++) {
            if ((r === 0 && c < firstDay) || day > daysInMonth) {
                html += '<td class="cal-cell cal-empty"></td>';
            } else {
                var m = String(calendarMonth).padStart(2, '0');
                var d = String(day).padStart(2, '0');
                var date = calendarYear + '-' + m + '-' + d;
                var records = calendarData[date] || [];
                var count = records.length;
                var isToday = today.getFullYear() === calendarYear && (today.getMonth()+1) === calendarMonth && today.getDate() === day;
                var repairCount = records.filter(function(x){ return x.record_type === 'repair'; }).length;
                var buildCount = count - repairCount;
                var dots = count > 0 ? '<div class="cal-dots">' +
                    (buildCount > 0 ? '<span class="cal-dot cal-dot-build"></span>' : '') +
                    (repairCount > 0 ? '<span class="cal-dot cal-dot-repair"></span>' : '') +
                    (count > 2 ? '<span class="cal-more">+' + (count - 2) + '</span>' : '') +
                    '</div>' : '<div class="cal-dots"></div>';
                html += '<td class="cal-cell ' + (isToday ? 'is-today ' : '') + (count > 0 ? 'has-records' : '') + '" onclick="calendarShowDay(\'' + date + '\')">' +
                    '<button type="button" class="cal-day-btn" aria-label="' + date + '，' + count + '条工单">' +
                    '<span class="cal-day-num">' + day + '</span>' +
                    '<span class="cal-count">' + (count > 0 ? count + '条' : '') + '</span>' +
                    dots +
                    '</button></td>';
                day++;
            }
        }
        html += '</tr>';
    }
    document.getElementById('calendarBody').innerHTML = html;
    document.getElementById('calendarDayRecords').innerHTML = '';
}
function calendarPrev() { calendarMonth--; if (calendarMonth < 1) { calendarMonth = 12; calendarYear--; } loadCalendarData(); }
function calendarNext() { calendarMonth++; if (calendarMonth > 12) { calendarMonth = 1; calendarYear++; } loadCalendarData(); }

async function calendarShowDay(dateStr) {
    const records = calendarData[dateStr] || [];
    const container = document.getElementById('calendarDayRecords');
    if (records.length === 0) { container.innerHTML = '<div class="calendar-day-empty"><i class="bi bi-calendar2"></i><strong>' + dateStr + '</strong><span>当天暂无工单</span></div>'; return; }
    var detailHtml = records.map(function(r) {
        var isRepair = r.record_type == 'repair';
        var typeIcon = isRepair ? '维修工单' : '施工记录';
        var fee = r.total_fee ? '¥' + parseFloat(r.total_fee).toFixed(0) : '¥0';
        var staff = r.staff_name || (Array.isArray(r.staff_names) ? r.staff_names.join('、') : '');
        var content = r.work_content ? r.work_content.substring(0, 30) : '无内容';
        return '<div class="cal-detail-item" onclick="openRecordDetail('+r.id+')">' +
            '<div class="cal-detail-header">' +
            '<span class="cal-detail-name">' + r.customer_name + '</span>' +
            '<span class="cal-detail-type ' + (isRepair ? 'repair' : 'build') + '">' + typeIcon + '</span>' +
            '</div>' +
            '<div class="cal-detail-meta">' +
            (staff ? '<span><i class="bi bi-person"></i>' + staff + '</span>' : '') +
            '<span><i class="bi bi-currency-yen"></i>' + fee + '</span>' +
            '</div>' +
            '<div class="cal-detail-content">' + content + '</div>' +
            '</div>';
    }).join('');
    container.innerHTML = '<div class="card cal-detail-card"><div class="card-header"><div><i class="bi bi-calendar-event me-1"></i>' + dateStr + '</div><span class="cal-day-total">' + records.length + '条</span></div><div class="card-body">' + detailHtml + '</div></div>';
}

// ===================== 工单状态变更 =====================
async function changeRecordStatus(recordId) {
    const rec = await apiFetch(API_URL + '/records/' + recordId).then(r => r.json()).catch(() => ({}));
    const opts = WORK_STATUS_OPTIONS[rec.record_type || 'construction'];
    const statuses = opts.map(x => x[0]);
    const labels = opts.map(x => x[1]);
    const current = rec.status || statuses[0];
    const idx = statuses.indexOf(current);
    const next = statuses[(idx + 1) % statuses.length];
    const nextLabel = labels[(idx + 1) % labels.length];
    if (!confirm('将状态改为「' + nextLabel + '」？')) return;
    try {
        const fd = new FormData();
        fd.append('status', next);
        const r = await apiFetch(API_URL + '/records/' + recordId, { method: 'PUT', body: fd });
        if (r.ok) { 
            alert('已改为「' + nextLabel + '」');
            if (currentTab === 'tab-query') queryRecords();
            else if (currentTab === 'tab-dashboard') loadDashboard();
        }
    } catch(e) {}
}

// ===================== 超期待办高亮 =====================
// 在 loadPendingWorks 中已处理

// ===================== 数据备份 =====================
function showBackupModal() {
    new bootstrap.Modal(document.getElementById('backupModal')).show();
    loadBackups();
}

async function createBackup() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>备份中...';
    try {
        const r = await apiFetch(API_URL + '/backup/create', { method: 'POST' });
        const d = await r.json();
        if (r.ok) {
            document.getElementById('backupStatus').textContent = '✅ ' + d.message + ' (' + (d.size/1024).toFixed(1) + 'KB)';
            document.getElementById('backupStatus').style.display = '';
            loadBackups();
        } else {
            alert(d.error || '备份失败');
        }
    } catch(e) { alert('网络错误'); }
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>创建备份';
}

async function loadBackups() {
    const container = document.getElementById('backupListContainer');
    try {
        const r = await apiFetch(API_URL + '/backup/list');
        const list = await r.json();
        if (list.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-3 small">暂无备份</div>';
            return;
        }
        container.innerHTML = '<div class="list-group">' + list.map(b => `
            <div class="list-group-item d-flex justify-content-between align-items-center py-2 px-3" style="background:rgba(255,255,255,.05);border-color:var(--glass-border)">
                <div>
                    <div class="fw500">${b.name}</div>
                    <small class="text-muted">${b.time} | ${(b.size/1024).toFixed(1)}KB</small>
                </div>
                <div class="d-flex gap-1">
                    <a href="${API_URL}/backup/download/${encodeURIComponent(b.name)}" target="_blank" class="btn btn-outline-primary btn-sm" title="下载"><i class="bi bi-download"></i></a>
                    <button class="btn btn-outline-danger btn-sm" onclick="restoreBackup('${b.name}')" title="恢复"><i class="bi bi-arrow-counterclockwise"></i></button>
                </div>
            </div>
        `).join('') + '</div>';
    } catch(e) { container.innerHTML = '<div class="text-danger small">加载失败</div>'; }
}

async function restoreBackup(name) {
    if (!confirm('确认从 ' + name + ' 恢复数据库？\n当前数据将被替换！')) return;
    try {
        const r = await apiFetch(API_URL + '/backup/restore', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        const d = await r.json();
        if (r.ok) {
            alert('✅ ' + d.message + '\n\n容器重启后生效。');
        } else {
            alert(d.error || '恢复失败');
        }
    } catch(e) { alert('网络错误'); }
}

initAuth();
