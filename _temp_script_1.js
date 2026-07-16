
(function(){
  function initLoginEnterKey(){
    var pwdInput = document.getElementById('loginPassword');
    var loginForm = document.getElementById('loginForm');
    if (!pwdInput || !loginForm) return;
    pwdInput.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        var submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    });
    var userInput = document.getElementById('loginUsername');
    if (userInput) {
      userInput.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          pwdInput.focus();
        }
      });
    }
  }

  function syncLoginState(){
    var loginPage = document.getElementById('loginPage');
    var appContent = document.getElementById('appContent');
    if (!loginPage || !appContent) return;
    var isLoggedIn = loginPage.style.display === 'none' || localStorage.getItem('auth_token');
    if (isLoggedIn) {
      appContent.classList.remove('is-0');
      document.body.classList.add('logged-in');
    } else {
      appContent.classList.add('is-0');
      document.body.classList.remove('logged-in');
    }
  }

  function watchLoginState(){
    syncLoginState();
    var loginPage = document.getElementById('loginPage');
    if (loginPage) {
      var observer = new MutationObserver(syncLoginState);
      observer.observe(loginPage, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    window.addEventListener('storage', syncLoginState);
    setInterval(syncLoginState, 1000);
  }

  function initUiFixes(){
    var photoModal = document.getElementById('photoViewerModal');
    if (photoModal && photoModal.classList.contains('is-19')) {
      photoModal.classList.remove('is-19');
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      initLoginEnterKey();
      initUiFixes();
      watchLoginState();
    });
  } else {
    initLoginEnterKey();
    initUiFixes();
    watchLoginState();
  }
})();

/* ====== 主题切换 ====== */
(function(){
  var STORAGE_KEY = 'app_theme';

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getCurrentTheme() {
    var saved = localStorage.getItem(STORAGE_KEY);
    return saved || getSystemTheme();
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    updateToggleBtn(theme);
  }

  function updateToggleBtn(theme) {
    var icon = document.getElementById('themeToggleIcon');
    var text = document.getElementById('themeToggleText');
    if (!icon || !text) return;
    if (theme === 'dark') {
      icon.className = 'bi bi-sun me-2';
      text.textContent = '亮色模式';
    } else {
      icon.className = 'bi bi-moon-stars me-2';
      text.textContent = '深色模式';
    }
  }

  function toggleTheme() {
    var current = getCurrentTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  window.toggleTheme = toggleTheme;

  // 初始化
  function init() {
    var theme = getCurrentTheme();
    applyTheme(theme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

(function(){
  function applyMobileFixes(){
    var isMobile = window.innerWidth <= 768;
    /* 费用输入2列布局 */
    var fees = ['labor_fee','material_fee','transport_fee','other_fee'];
    fees.forEach(function(name){
      var inp = document.querySelector('input[name="'+name+'"]');
      if(inp && inp.parentElement){
        if(isMobile){
          inp.parentElement.style.width = '50%';
          inp.parentElement.style.flex = '0 0 50%';
          inp.parentElement.style.maxWidth = '50%';
        } else {
          inp.parentElement.style.width = '';
          inp.parentElement.style.flex = '';
          inp.parentElement.style.maxWidth = '';
        }
      }
    });
    /* 日期选择器：用 CSS 统一控制，JS 不再干预 */

  }
  function init(){
    applyMobileFixes();
    window.addEventListener('resize', applyMobileFixes);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ====== 维修单下载按钮 ======
// 包装 renderQueryResults - 在查询列表卡片中添加下载按钮
(function(){
  var _origRender = window.renderQueryResults;
  window.renderQueryResults = function(records){
    _origRender(records);
    setTimeout(addQueryDownloadBtns, 50);
  };
})();

function addQueryDownloadBtns(){
  document.querySelectorAll('#queryResults .record-card-repair .rc-actions').forEach(function(actions){
    if(actions.querySelector('.rc-action-xlsx')) return;
    var card = actions.closest('.record-card');
    if(!card) return;
    var match = card.getAttribute('onclick') || '';
    var idMatch = match.match(/openRecordDetail\((\d+)\)/);
    if(!idMatch) return;
    var rid = idMatch[1];
    var previewBtn = document.createElement('button');
    previewBtn.className = 'rc-action-btn rc-action-preview';
    previewBtn.title = '预览维修单';
    previewBtn.setAttribute('aria-label', '预览维修单');
    previewBtn.innerHTML = '<i class="bi bi-eye" aria-hidden="true"></i>';
    previewBtn.onclick = function(e){ e.stopPropagation(); previewRepairExcel(rid); };
    var pdfBtn = document.createElement('button');
    pdfBtn.className = 'rc-action-btn rc-action-pdf';
    pdfBtn.title = '下载维修单PDF';
    pdfBtn.setAttribute('aria-label', '下载PDF');
    pdfBtn.innerHTML = '<i class="bi bi-file-pdf" aria-hidden="true"></i>';
    pdfBtn.onclick = function(e){ e.stopPropagation(); downloadRepairPdf(rid); };
    var dlBtn = document.createElement('button');
    dlBtn.className = 'rc-action-btn rc-action-xlsx';
    dlBtn.title = '下载维修单Excel';
    dlBtn.setAttribute('aria-label', '下载维修单');
    dlBtn.innerHTML = '<i class="bi bi-file-earmark-spreadsheet" aria-hidden="true"></i>';
    dlBtn.onclick = function(e){ e.stopPropagation(); downloadRepairExcel(rid); };
    actions.insertBefore(pdfBtn, actions.firstChild);
    actions.insertBefore(dlBtn, actions.firstChild);
    actions.insertBefore(previewBtn, actions.firstChild);
  });
}

// 包装 openRecordDetail - 在详情弹窗中添加下载按钮
(function(){
  var _origOpenDetail = window.openRecordDetail;
  window.openRecordDetail = async function(recordId){
    await _origOpenDetail(recordId);
    setTimeout(function(){ addDetailDownloadBtn(recordId); }, 100);
  };
})();

function addDetailDownloadBtn(recordId){
  var modal = document.getElementById('gModal');
  if(!modal || !modal.classList.contains('show')) return;
  var body = document.getElementById('gModalBody');
  if(!body || !body.querySelector('.is-repair')) return;
  if(modal.querySelector('.wd-download-btn')) return;
  var header = modal.querySelector('.modal-header');
  if(!header) return;
  var wrap = document.createElement('div');
  wrap.className = 'd-flex gap-2 ms-auto';
  var previewBtn = document.createElement('button');
  previewBtn.className = 'btn btn-sm btn-outline-primary wd-preview-btn';
  previewBtn.innerHTML = '<i class="bi bi-eye me-1"></i>预览';
  previewBtn.onclick = function(){ previewRepairExcel(recordId); };
  var pdfBtn = document.createElement('button');
  pdfBtn.className = 'btn btn-sm btn-outline-danger wd-pdf-btn';
  pdfBtn.innerHTML = '<i class="bi bi-file-pdf me-1"></i>PDF';
  pdfBtn.onclick = function(){ downloadRepairPdf(recordId); };
  var dlBtn = document.createElement('button');
  dlBtn.className = 'btn btn-sm btn-outline-success wd-download-btn';
  dlBtn.innerHTML = '<i class="bi bi-file-earmark-spreadsheet me-1"></i>下载维修单';
  dlBtn.onclick = function(){ downloadRepairExcel(recordId); };
  wrap.appendChild(pdfBtn);
  wrap.appendChild(previewBtn);
  wrap.appendChild(dlBtn);
  var closeBtn = header.querySelector('.btn-close');
  if(closeBtn){
    header.insertBefore(wrap, closeBtn);
  } else {
    header.appendChild(wrap);
  }
}

// 当通过 showMoreQueryResults 加载更多时也添加按钮
(function(){
  var _origShowMore = window.showMoreQueryResults;
  if(_origShowMore){
    window.showMoreQueryResults = function(){
      _origShowMore();
      setTimeout(addQueryDownloadBtns, 50);
    };
  }
})();


// ====== 维修单下载 / 预览 工具 ======
async function downloadRepairExcel(recordId){
  try{
    var r = await apiFetch('/api/repair-export/' + recordId);
    if(!r.ok){ var e = await r.json().catch(function(){return{}}); alert(e.error || '下载失败'); return; }
    var blob = await r.blob();
    var cd = r.headers.get('Content-Disposition') || '';
    var fn = '维修单.xlsx';
    var m = cd.match(/filename="?([^"]+)"?/);
    if(m) fn = decodeURIComponent(m[1]);
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = fn; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }catch(e){ alert('下载失败: ' + e.message); }
}

async function downloadRepairPdf(recordId){
  try{
    var r = await apiFetch('/api/repair-pdf/' + recordId);
    if(!r.ok){ var e = await r.json().catch(function(){return{}}); alert(e.error || 'PDF生成失败'); return; }
    var blob = await r.blob();
    var cd = r.headers.get('Content-Disposition') || '';
    var fn = '维修单.pdf';
    var m = cd.match(/filename="?([^"]+)"?/);
    if(m) fn = decodeURIComponent(m[1]);
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = fn; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }catch(e){ alert('PDF生成失败: ' + e.message); }
}

async function previewRepairExcel(recordId){
  var loading = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">加载预览中...</p></div>';
  showModal('维修单预览', loading, 'repair-preview-modal');
  try{
    var r = await apiFetch('/api/repair-preview/' + recordId);
    var data = await r.json();
    if(data.error){ showModal('预览失败', '<div class="alert alert-danger">'+data.error+'</div>'); return; }
    var html = '<div style="overflow:auto;max-height:70vh;"><div class="mb-2 d-flex gap-2 align-items-center flex-wrap"><span class="text-muted small">共 '+data.total_rows+' 行 '+data.total_cols+' 列</span><div class="ms-auto d-flex gap-2"><button class="btn btn-sm btn-outline-danger" onclick="downloadRepairPdf('+recordId+')"><i class="bi bi-file-pdf me-1"></i>PDF</button><button class="btn btn-sm btn-outline-success" onclick="downloadRepairExcel('+recordId+')"><i class="bi bi-download me-1"></i>Excel</button></div></div>'+data.html+'</div>';
    showModal('维修单预览', html, 'repair-preview-modal');
  }catch(e){
    showModal('预览失败', '<div class="alert alert-danger">预览加载失败: '+e.message+'</div>');
  }
}

/* ====== 待办列表筛选 + 重排布局 ====== */
(function(){
  var currentFilter = 'all';
  var pendingDataCache = [];

  function todayStr(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function customPendingCard(p, isOver){
    var remind = p.reminder_date ? p.reminder_date.split('T')[0] : '';
    var dayDiff = remind ? Math.floor((new Date(todayStr()) - new Date(remind)) / 86400000) : 0;
    var priority = p.priority === 'urgent' ? '紧急' : '普通';
    var type = p.todo_type || '客户报修';
    var title = p.title || p.customer_name || '';
    var customer = p.customer_name || '-';
    var contact = p.contact_name || '';
    var phone = p.contact_phone || '';
    var address = p.work_address || '';
    var staff = p.staff_name || '未分配';
    var content = p.work_content || '';
    var overdueText = isOver ? '<span class="pc-overdue"><i class="bi bi-exclamation-triangle-fill me-1"></i>超期 ' + Math.max(dayDiff, 1) + ' 天</span>' : '';

    return `
      <div class="pending-card pending-priority-${p.priority || 'normal'}${isOver ? ' pending-overdue' : ''}">
        <div class="pc-title-row">
          <div class="pc-title">${title}</div>
          ${overdueText}
        </div>
        <div class="pc-customer-section">
          <div class="pc-section-label">客户信息</div>
          <div class="pc-customer-list">
            <div class="pc-cust-item">
              <span class="pc-cust-icon"><i class="bi bi-building"></i></span>
              <span class="pc-cust-label">客户</span>
              <span class="pc-cust-value">${customer}</span>
            </div>
            ${contact ? `
            <div class="pc-cust-item">
              <span class="pc-cust-icon"><i class="bi bi-person"></i></span>
              <span class="pc-cust-label">联系人</span>
              <span class="pc-cust-value">${contact}</span>
            </div>` : ''}
            ${phone ? `
            <div class="pc-cust-item">
              <span class="pc-cust-icon"><i class="bi bi-telephone"></i></span>
              <span class="pc-cust-label">电话</span>
              <span class="pc-cust-value">${phone}</span>
            </div>` : ''}
            ${address ? `
            <div class="pc-cust-item">
              <span class="pc-cust-icon"><i class="bi bi-geo-alt"></i></span>
              <span class="pc-cust-label">地址</span>
              <span class="pc-cust-value">${address}</span>
            </div>` : ''}
          </div>
        </div>
        <div class="pc-meta-section">
          <div class="pc-section-label">其他信息</div>
          <div class="pc-meta-grid">
            <div class="pc-meta-item">
              <span class="pc-meta-label">类型</span>
              <span class="pc-type">${type}</span>
            </div>
            <div class="pc-meta-item">
              <span class="pc-meta-label">优先级</span>
              <span class="pc-priority">${priority}</span>
            </div>
            <div class="pc-meta-item">
              <span class="pc-meta-label">负责人员</span>
              <span class="pc-meta-value"><i class="bi bi-person-badge me-1"></i>${staff}</span>
            </div>
            <div class="pc-meta-item">
              <span class="pc-meta-label">处理日期</span>
              <span class="pc-meta-value"><i class="bi bi-calendar-event me-1"></i>${remind || '-'}</span>
            </div>
          </div>
        </div>
        <div class="pc-content-section">
          <div class="pc-section-label">待办内容</div>
          <div class="pc-content-text">${content}</div>
        </div>
        <div class="pc-actions">
          <button class="btn btn-primary btn-sm" onclick="transferPending(${p.id})">转工单</button>
          <button class="btn btn-success btn-sm" onclick="completePending(${p.id})">完成</button>
          <button class="btn btn-outline-secondary btn-sm" onclick="editPending(${p.id})">编辑</button>
          <button class="btn btn-outline-danger btn-sm" onclick="deletePending(${p.id})">删除</button>
        </div>
      </div>
    `;
  }

  function renderFilteredList(records){
    var container = document.getElementById('pendingList');
    var badge = document.getElementById('pendingCountBadge');
    if(!container) return;

    if(0 === records.length){
      container.innerHTML = '<div class="empty-state"><i class="bi bi-check2-circle"></i>没有待办事项</div>';
      if(badge) badge.textContent = '0';
      return;
    }

    if(badge) badge.textContent = records.length;

    var today = todayStr();
    var overdue = records.filter(function(p){ return p.reminder_date && p.reminder_date.split('T')[0] < today; });
    var todayItems = records.filter(function(p){ return p.reminder_date && p.reminder_date.split('T')[0] === today; });
    var future = records.filter(function(p){ return !p.reminder_date || p.reminder_date.split('T')[0] > today; });

    var html = '';
    if(overdue.length > 0){
      html += '<div class="text-danger fw-semibold small mb-1"><i class="bi bi-exclamation-circle me-1"></i>过期 (' + overdue.length + ')</div>';
      html += overdue.map(function(p){ return customPendingCard(p, true); }).join('');
    }
    if(todayItems.length > 0){
      html += '<div class="fw-semibold small mb-1 mt-2"><i class="bi bi-calendar-check me-1"></i>今天 (' + todayItems.length + ')</div>';
      html += todayItems.map(function(p){ return customPendingCard(p, false); }).join('');
    }
    if(future.length > 0){
      html += '<div class="text-muted fw-semibold small mb-1 mt-2"><i class="bi bi-calendar3 me-1"></i>以后 (' + future.length + ')</div>';
      html += future.map(function(p){ return customPendingCard(p, false); }).join('');
    }
    container.innerHTML = html;
  }

  function applyFilter(records){
    var today = todayStr();
    switch(currentFilter){
      case 'urgent':
        return records.filter(function(p){ return p.priority === 'urgent'; });
      case 'overdue':
        return records.filter(function(p){ return p.reminder_date && p.reminder_date.split('T')[0] < today; });
      case 'today':
        return records.filter(function(p){ return p.reminder_date && p.reminder_date.split('T')[0] === today; });
      default:
        return records;
    }
  }

  window.filterPending = function(filterType){
    currentFilter = filterType;

    document.querySelectorAll('.pending-filter-btn').forEach(function(btn){
      if(btn.getAttribute('data-filter') === filterType){
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    var filtered = applyFilter(pendingDataCache);
    renderFilteredList(filtered);
  };

  var _origLoadPending = window.loadPendingWorks;
  window.loadPendingWorks = async function(){
    try{
      var r = await apiFetch('/api/pending?status=pending&per_page=100');
      var data = await r.json();
      pendingDataCache = data.records || [];
      var filtered = applyFilter(pendingDataCache);
      renderFilteredList(filtered);
    }catch(e){
      var container = document.getElementById('pendingList');
      if(container) container.innerHTML = '<div class="empty-state">加载失败</div>';
    }
  };
})();

// ==============================================
// 详情弹窗增强 - 展示所有数据库字段
// ==============================================
(function(){
  var _origOpenDetail = window.openRecordDetail;
  window.openRecordDetail = async function(recordId){
    await _origOpenDetail(recordId);
    setTimeout(function(){ enhanceWorkDetail(recordId); }, 150);
  };
})();

async function enhanceWorkDetail(recordId){
  var modal = document.getElementById('gModal');
  if(!modal || !modal.classList.contains('show')) return;
  var body = document.getElementById('gModalBody');
  if(!body) return;
  var detailWrap = body.querySelector('.work-detail-v2');
  if(!detailWrap) return;
  if(detailWrap.getAttribute('data-enhanced') === '1') return;

  try{
    var r = await fetch('/api/records/' + recordId);
    var data = await r.json();
    if(!data || !data.id) return;

    detailWrap.setAttribute('data-enhanced', '1');

    // 移除旧的内容，重新构建完整详情
    var hero = detailWrap.querySelector('.wd-hero');
    var sections = detailWrap.querySelectorAll('.wd-section');

    // 保留hero，替换sections
    sections.forEach(function(s){ s.remove(); });

    var html = buildFullDetailHtml(data);
    detailWrap.insertAdjacentHTML('beforeend', html);

    // 加载设备明细
    loadEquipmentDetail(recordId, detailWrap);
  }catch(e){
    console.error('增强详情失败:', e);
  }
}

function buildFullDetailHtml(r){
  var typeLabel = r.record_type === 'construction' ? '施工记录' : '维修工单';
  var statusMap = {
    pending: '待处理', in_progress: '进行中', completed: '已完成',
    cancelled: '已取消', settlement: '待结算', rework: '返工',
    dispatched: '已派工', callback: '待回访', unable: '无法完成'
  };
  var payMap = { unpaid: '未收款', partial: '部分收款', paid: '已收款', monthly: '月结' };
  var resultMap = { completed: '已完成', incomplete: '未完成' };

  var html = '';

  // 客户信息（增强版）
  html += `
  <section class="wd-section">
    <div class="wd-section-title">客户信息</div>
    <div class="wd-info-grid">
      <div><span>客户名称</span><strong>${escapeHtml(r.customer_name)}</strong></div>
      <div><span>联系人</span><strong>${escapeHtml(r.contact_name) || '未填写'}</strong></div>
      <div><span>联系电话</span><strong>${escapeHtml(r.customer_phone) || '未填写'}</strong></div>
      <div class="span-2"><span>地址</span><strong>${escapeHtml(r.work_address) || '未填写'}</strong></div>
    </div>
  </section>`;

  // 工单信息（增强版）
  html += `
  <section class="wd-section">
    <div class="wd-section-title">工单信息</div>
    <div class="wd-info-grid">
      <div><span>工单号</span><strong>${escapeHtml(r.order_no) || '-'}</strong></div>
      <div><span>工单类型</span><strong>${typeLabel}</strong></div>
      <div><span>施工类型/故障类型</span><strong>${escapeHtml(r.work_subtype) || '-'}</strong></div>
      <div><span>优先级</span><strong>${escapeHtml(r.priority) || '普通'}</strong></div>
      <div><span>工作人员</span><strong>${escapeHtml(Array.isArray(r.staff_names) ? r.staff_names.join('、') : r.staff_name) || '未分配'}</strong></div>
      <div><span>状态</span><strong>${statusMap[r.status] || r.status}</strong></div>
      <div><span>收款状态</span><strong>${payMap[r.payment_status] || r.payment_status}</strong></div>
      <div><span>已收金额</span><strong>¥${(r.paid_amount || 0).toFixed(2)}</strong></div>
      <div><span>服务类别</span><strong>${escapeHtml(r.service_category) || '-'}</strong></div>
      <div><span>保修状态</span><strong>${escapeHtml(r.warranty_status) || '-'}</strong></div>
      <div><span>保修天数</span><strong>${r.warranty_days || 0}天</strong></div>
      <div><span>创建人</span><strong>${escapeHtml(r.created_by) || '-'}</strong></div>
      <div><span>创建时间</span><strong>${formatDate(r.created_at)}</strong></div>
    </div>
  </section>`;

  // 时间信息
  html += `
  <section class="wd-section">
    <div class="wd-section-title">时间信息</div>
    <div class="wd-info-grid">
      <div><span>工单日期</span><strong>${formatDate(r.work_date)}</strong></div>
      <div><span>开始时间</span><strong>${escapeHtml(r.start_time) || '-'}</strong></div>
      <div><span>结束时间</span><strong>${escapeHtml(r.end_time) || '-'}</strong></div>
      <div><span>到达时间</span><strong>${escapeHtml(r.arrival_time) || '-'}</strong></div>
      <div><span>完工时间</span><strong>${escapeHtml(r.completion_time) || '-'}</strong></div>
      <div><span>勘查时间</span><strong>${escapeHtml(r.survey_time) || '-'}</strong></div>
      <div><span>报价时间</span><strong>${escapeHtml(r.quote_time) || '-'}</strong></div>
      <div><span>维修开始</span><strong>${escapeHtml(r.repair_start_time) || '-'}</strong></div>
      <div><span>维修结束</span><strong>${escapeHtml(r.repair_end_time) || '-'}</strong></div>
      <div><span>验收时间</span><strong>${escapeHtml(r.accept_time) || '-'}</strong></div>
    </div>
  </section>`;

  // 设备信息
  if(r.device_brand || r.device_model || r.device_sn || r.involved_systems){
    html += `
  <section class="wd-section">
    <div class="wd-section-title">设备信息</div>
    <div class="wd-info-grid">
      <div><span>设备品牌</span><strong>${escapeHtml(r.device_brand) || '-'}</strong></div>
      <div><span>设备型号</span><strong>${escapeHtml(r.device_model) || '-'}</strong></div>
      <div><span>设备序列号</span><strong>${escapeHtml(r.device_sn) || '-'}</strong></div>
      <div class="span-2"><span>涉及系统/设备</span><strong>${escapeHtml(r.involved_systems) || '-'}</strong></div>
    </div>
  </section>`;
  }

  // 维修内容（增强版）
  if(r.record_type === 'repair'){
    html += `
  <section class="wd-section">
    <div class="wd-section-title">维修详情</div>
    <div class="wd-content-stack">
      ${r.fault_phenomenon ? `<div><span>故障现象</span><p>${escapeHtml(r.fault_phenomenon)}</p></div>` : ''}
      ${r.fault_description ? `<div><span>故障描述</span><p>${escapeHtml(r.fault_description)}</p></div>` : ''}
      ${r.fault_cause ? `<div><span>故障原因</span><p>${escapeHtml(r.fault_cause)}</p></div>` : ''}
      ${r.fault_diagnosis ? `<div><span>故障诊断</span><p>${escapeHtml(r.fault_diagnosis)}</p></div>` : ''}
      ${r.repair_solution ? `<div><span>维修方案</span><p>${escapeHtml(r.repair_solution)}</p></div>` : ''}
      ${r.repair_process ? `<div><span>维修过程</span><p>${escapeHtml(r.repair_process)}</p></div>` : ''}
      ${r.repair_result ? `<div><span>维修结果</span><p>${resultMap[r.repair_result] || r.repair_result}</p></div>` : ''}
      ${r.incomplete_reason ? `<div><span>未完成原因</span><p>${escapeHtml(r.incomplete_reason_type) ? '['+escapeHtml(r.incomplete_reason_type)+'] ' : ''}${escapeHtml(r.incomplete_reason)}</p></div>` : ''}
    </div>
  </section>`;
  } else {
    html += `
  <section class="wd-section">
    <div class="wd-section-title">施工内容</div>
    <div class="wd-content-stack">
      ${r.work_content ? `<div><span>施工内容</span><p>${escapeHtml(r.work_content)}</p></div>` : ''}
      ${r.repair_process ? `<div><span>施工过程</span><p>${escapeHtml(r.repair_process)}</p></div>` : ''}
    </div>
  </section>`;
  }

  // 设备明细占位（后面加载）
  html += `
  <section class="wd-section" id="equipmentSection" style="display:none;">
    <div class="wd-section-title d-flex justify-content-between align-items-center">
      <span>设备明细</span>
    </div>
    <div id="equipmentList"></div>
  </section>`;

  // 费用信息（增强版）
  html += `
  <section class="wd-section">
    <div class="wd-section-title">费用信息</div>
    <div class="wd-fee-grid">
      <div><span>人工费</span><strong>¥${(r.labor_fee || 0).toFixed(2)}</strong></div>
      <div><span>材料费</span><strong>¥${(r.material_fee || 0).toFixed(2)}</strong></div>
      <div><span>交通费</span><strong>¥${(r.transport_fee || 0).toFixed(2)}</strong></div>
      <div><span>其他费</span><strong>¥${(r.other_fee || 0).toFixed(2)}</strong></div>
      <div><span>设备费</span><strong>¥${(r.equipment_fee_total || 0).toFixed(2)}</strong></div>
      <div><span>调试费</span><strong>¥${(r.debug_fee || 0).toFixed(2)}</strong></div>
      <div><span>税额</span><strong>¥${(r.tax_amount || 0).toFixed(2)}</strong></div>
      <div><span>税率</span><strong>${(r.tax_rate || 0).toFixed(0)}%</strong></div>
      <div class="wd-fee-total span-2"><span>合计金额</span><strong>¥${(r.total_fee || 0).toFixed(2)}</strong></div>
    </div>
  </section>`;

  // 客户反馈
  if(r.customer_feedback || r.satisfaction){
    html += `
  <section class="wd-section">
    <div class="wd-section-title">客户反馈</div>
    <div class="wd-content-stack">
      ${r.satisfaction ? `<div><span>满意度</span><p>${escapeHtml(r.satisfaction)}</p></div>` : ''}
      ${r.customer_feedback ? `<div><span>客户意见</span><p>${escapeHtml(r.customer_feedback)}</p></div>` : ''}
    </div>
  </section>`;
  }

  // 备注
  if(r.remark){
    html += `
  <section class="wd-section">
    <div class="wd-section-title">备注</div>
    <div class="wd-content-stack">
      <div><p>${escapeHtml(r.remark)}</p></div>
    </div>
  </section>`;
  }

  // 照片
  if(r.work_photos && r.work_photos.length > 0){
    html += `
  <section class="wd-section">
    <div class="wd-section-title">现场照片</div>
    <div class="wd-photo-grid">
      ${r.work_photos.map(function(p){ return `<img src="${p}" class="wd-photo" onclick="window.open('${p}')">`; }).join('')}
    </div>
  </section>`;
  }

  // 客户签名
  if(r.customer_signature){
    html += `
  <section class="wd-section">
    <div class="wd-section-title">客户签名</div>
    <div class="wd-signature">
      <img src="${r.customer_signature}" alt="客户签名">
    </div>
  </section>`;
  }

  return html;
}

async function loadEquipmentDetail(recordId, detailWrap){
  try{
    var r = await fetch('/api/records/' + recordId + '/equipment');
    var data = await r.json();
    if(!data || !data.equipment || data.equipment.length === 0) return;

    var section = detailWrap.querySelector('#equipmentSection');
    var list = detailWrap.querySelector('#equipmentList');
    if(!section || !list) return;

    section.style.display = '';

    var html = '<div class="eq-list">';
    data.equipment.forEach(function(eq, idx){
      html += `
      <div class="eq-item">
        <div class="eq-head">
          <span class="eq-idx">#${idx+1}</span>
          <span class="eq-name">${escapeHtml(eq.device_name || '-')}</span>
          <span class="eq-type">${escapeHtml(eq.system_type || '-')}</span>
          <span class="eq-amount">¥${(eq.subtotal || 0).toFixed(2)}</span>
        </div>
        <div class="eq-grid">
          <div><span>品牌</span><strong>${escapeHtml(eq.device_brand) || '-'}</strong></div>
          <div><span>型号</span><strong>${escapeHtml(eq.device_model) || '-'}</strong></div>
          <div><span>数量</span><strong>${eq.quantity || 0}</strong></div>
          <div><span>单价</span><strong>¥${(eq.unit_price || 0).toFixed(2)}</strong></div>
          <div><span>位置</span><strong>${escapeHtml(eq.location) || '-'}</strong></div>
          <div><span>维修方式</span><strong>${escapeHtml(eq.repair_method) || '-'}</strong></div>
          <div class="span-2"><span>故障描述</span><strong>${escapeHtml(eq.fault_description) || '-'}</strong></div>
          <div class="span-2"><span>维修结果</span><strong>${escapeHtml(eq.repair_result) || '-'}</strong></div>
          ${eq.remark ? `<div class="span-2"><span>备注</span><strong>${escapeHtml(eq.remark)}</strong></div>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';
    list.innerHTML = html;
  }catch(e){
    console.error('加载设备明细失败:', e);
  }
}

function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function formatDate(d){
  if(!d) return '-';
  try{
    var dt = new Date(d);
    return dt.getFullYear() + '/' + (dt.getMonth()+1) + '/' + dt.getDate();
  }catch(e){ return d; }
}

// ====== 设备明细管理 ======
var EQUIPMENT_SYSTEM_TYPES = ['视频监控', '门禁系统', '网络系统', '综合布线', '低压强电', '广播系统', '停车系统', '楼宇对讲', '巡更系统', '其他'];
var EQUIPMENT_REPAIR_METHODS = ['维修', '更换', '调试', '新增设备', '移机', '其他'];

function addEquipmentRow(data){
  var container = document.getElementById('equipmentRows');
  if(!container) return;
  var idx = container.children.length;
  data = data || {};
  
  var row = document.createElement('div');
  row.className = 'equipment-row';
  row.setAttribute('data-idx', idx);
  
  row.innerHTML = `
    <div class="eq-row-header">
      <span class="eq-row-title">设备 #${idx+1}</span>
      <button type="button" class="eq-row-delete" onclick="deleteEquipmentRow(this)" title="删除">
        <i class="bi bi-trash"></i>
      </button>
    </div>
    <div class="row g-2">
      <div class="col-md-3">
        <label class="form-label small">系统类型</label>
        <select class="form-select form-select-sm eq-system_type">
          <option value="">请选择</option>
          ${EQUIPMENT_SYSTEM_TYPES.map(function(t){ return '<option value="'+t+'"'+(data.system_type===t?' selected':'')+'>'+t+'</option>'; }).join('')}
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label small">设备名称</label>
        <input type="text" class="form-control form-control-sm eq-device_name" value="${data.device_name || ''}" placeholder="如：摄像头">
      </div>
      <div class="col-md-3">
        <label class="form-label small">品牌</label>
        <input type="text" class="form-control form-control-sm eq-device_brand" value="${data.device_brand || ''}" placeholder="如：海康威视">
      </div>
      <div class="col-md-3">
        <label class="form-label small">型号</label>
        <input type="text" class="form-control form-control-sm eq-device_model" value="${data.device_model || ''}" placeholder="设备型号">
      </div>
      <div class="col-md-2">
        <label class="form-label small">数量</label>
        <input type="number" class="form-control form-control-sm eq-quantity" value="${data.quantity || 1}" min="1" onchange="updateEquipmentSubtotal(this)">
      </div>
      <div class="col-md-3">
        <label class="form-label small">单价 (¥)</label>
        <input type="number" class="form-control form-control-sm eq-unit_price" value="${data.unit_price || 0}" min="0" step="0.01" onchange="updateEquipmentSubtotal(this)">
      </div>
      <div class="col-md-3">
        <label class="form-label small">小计 (¥)</label>
        <input type="text" class="form-control form-control-sm eq-subtotal" value="${(data.subtotal || 0).toFixed(2)}" readonly>
      </div>
      <div class="col-md-4">
        <label class="form-label small">安装位置</label>
        <input type="text" class="form-control form-control-sm eq-location" value="${data.location || ''}" placeholder="如：1楼大厅">
      </div>
      <div class="col-md-4">
        <label class="form-label small">维修方式</label>
        <select class="form-select form-select-sm eq-repair_method">
          <option value="">请选择</option>
          ${EQUIPMENT_REPAIR_METHODS.map(function(m){ return '<option value="'+m+'"'+(data.repair_method===m?' selected':'')+'>'+m+'</option>'; }).join('')}
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label small">维修结果</label>
        <input type="text" class="form-control form-control-sm eq-repair_result" value="${data.repair_result || ''}" placeholder="维修结果">
      </div>
      <div class="col-md-6">
        <label class="form-label small">故障描述</label>
        <textarea class="form-control form-control-sm eq-fault_description" rows="1" placeholder="故障描述">${data.fault_description || ''}</textarea>
      </div>
      <div class="col-md-6">
        <label class="form-label small">备注</label>
        <textarea class="form-control form-control-sm eq-remark" rows="1" placeholder="备注">${data.remark || ''}</textarea>
      </div>
    </div>
  `;
  
  container.appendChild(row);
  updateEquipmentDetailsHidden();
}

function deleteEquipmentRow(btn){
  var row = btn.closest('.equipment-row');
  if(!row) return;
  var container = document.getElementById('equipmentRows');
  if(container && container.children.length <= 1){
    if(!confirm('确定删除最后一条设备明细吗？')) return;
  }
  row.remove();
  reindexEquipmentRows();
  updateEquipmentDetailsHidden();
  calcEquipmentFeeTotal();
}

function reindexEquipmentRows(){
  var rows = document.querySelectorAll('#equipmentRows .equipment-row');
  rows.forEach(function(row, idx){
    row.setAttribute('data-idx', idx);
    var title = row.querySelector('.eq-row-title');
    if(title) title.textContent = '设备 #' + (idx+1);
  });
}

function updateEquipmentSubtotal(input){
  var row = input.closest('.equipment-row');
  if(!row) return;
  var qty = parseFloat(row.querySelector('.eq-quantity').value) || 0;
  var price = parseFloat(row.querySelector('.eq-unit_price').value) || 0;
  var subtotal = qty * price;
  row.querySelector('.eq-subtotal').value = subtotal.toFixed(2);
  updateEquipmentDetailsHidden();
  calcEquipmentFeeTotal();
}

function collectEquipmentDetails(){
  var rows = document.querySelectorAll('#equipmentRows .equipment-row');
  var list = [];
  rows.forEach(function(row){
    list.push({
      system_type: row.querySelector('.eq-system_type').value,
      device_name: row.querySelector('.eq-device_name').value,
      device_brand: row.querySelector('.eq-device_brand').value,
      device_model: row.querySelector('.eq-device_model').value,
      quantity: parseInt(row.querySelector('.eq-quantity').value) || 1,
      unit_price: parseFloat(row.querySelector('.eq-unit_price').value) || 0,
      subtotal: parseFloat(row.querySelector('.eq-subtotal').value) || 0,
      location: row.querySelector('.eq-location').value,
      repair_method: row.querySelector('.eq-repair_method').value,
      repair_result: row.querySelector('.eq-repair_result').value,
      fault_description: row.querySelector('.eq-fault_description').value,
      remark: row.querySelector('.eq-remark').value
    });
  });
  return list;
}

function updateEquipmentDetailsHidden(){
  var hidden = document.getElementById('equipmentDetails');
  if(hidden){
    hidden.value = JSON.stringify(collectEquipmentDetails());
  }
}

function calcEquipmentFeeTotal(){
  var list = collectEquipmentDetails();
  var total = 0;
  list.forEach(function(eq){ total += eq.subtotal || 0; });
  var input = document.querySelector('input[name="equipment_fee_total"]');
  if(input){
    input.value = total.toFixed(2);
    if(typeof calcWorkTotal === 'function'){
      calcWorkTotal();
    }
  }
}

function loadEquipmentDetailsIntoForm(recordId){
  if(!recordId) return;
  fetch('/api/records/' + recordId + '/equipment')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(data && data.equipment && data.equipment.length > 0){
        var container = document.getElementById('equipmentRows');
        if(container) container.innerHTML = '';
        data.equipment.forEach(function(eq){
          addEquipmentRow(eq);
        });
        calcEquipmentFeeTotal();
      }
    })
    .catch(function(e){ console.error('加载设备明细失败:', e); });
}

// ====== 包装费用计算 ======
(function(){
  var _origCalc = window.calcWorkTotal;
  window.calcWorkTotal = function(){
    if(_origCalc) _origCalc.apply(this, arguments);
    var labor = parseFloat(document.querySelector('input[name="labor_fee"]').value) || 0;
    var material = parseFloat(document.querySelector('input[name="material_fee"]').value) || 0;
    var equipment = parseFloat(document.querySelector('input[name="equipment_fee_total"]').value) || 0;
    var debug = parseFloat(document.querySelector('input[name="debug_fee"]').value) || 0;
    var transport = parseFloat(document.querySelector('input[name="transport_fee"]').value) || 0;
    var other = parseFloat(document.querySelector('input[name="other_fee"]').value) || 0;
    var subtotal = labor + material + equipment + debug + transport + other;
    var taxType = document.querySelector('input[name="tax_type"]:checked');
    var taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    var taxAmount = 0;
    var total = subtotal;
    if(taxType && taxType.value === 'tax'){
      taxAmount = subtotal * taxRate;
      total = subtotal + taxAmount;
    }
    document.getElementById('woTaxAmount').value = taxAmount.toFixed(2);
    document.getElementById('woTotalFee').value = total.toFixed(2);
  };
})();

// ====== 包装编辑工单加载 ======
(function(){
  var _origOpenEdit = window.openEditWork;
  window.openEditWork = function(recordId){
    if(_origOpenEdit) _origOpenEdit.apply(this, arguments);
    setTimeout(function(){ loadEquipmentDetailsIntoForm(recordId); }, 200);
  };
})();

// ====== 包装新建工单打开 ======
(function(){
  var _origOpenNew = window.openNewWork;
  window.openNewWork = function(type){
    if(_origOpenNew) _origOpenNew.apply(this, arguments);
    setTimeout(function(){
      var container = document.getElementById('equipmentRows');
      if(container && container.children.length === 0){
        addEquipmentRow();
      }
    }, 100);
  };
})();

// ====== 初始化设备明细 ======
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    var container = document.getElementById('equipmentRows');
    if(container && container.children.length === 0){
      addEquipmentRow();
    }
  }, 500);
});

// ===================== 操作日志 =====================
var currentOplogPage = 1;
var currentOplogId = null;
var oplogDetailModal = null;

function _renderOplogPagination(page, totalPages, callbackName){
  if(totalPages <= 1) return '';
  var html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
  html += '<li class="page-item ' + (page <= 1 ? 'disabled' : '') + '"><a class="page-link" href="#" onclick="' + callbackName + '(' + (page - 1) + ');return false;">上一页</a></li>';
  var start = Math.max(1, page - 2);
  var end = Math.min(totalPages, page + 2);
  if(start > 1){
    html += '<li class="page-item"><a class="page-link" href="#" onclick="' + callbackName + '(1);return false;">1</a></li>';
    if(start > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
  }
  for(var i = start; i <= end; i++){
    html += '<li class="page-item ' + (i === page ? 'active' : '') + '"><a class="page-link" href="#" onclick="' + callbackName + '(' + i + ');return false;">' + i + '</a></li>';
  }
  if(end < totalPages){
    if(end < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    html += '<li class="page-item"><a class="page-link" href="#" onclick="' + callbackName + '(' + totalPages + ');return false;">' + totalPages + '</a></li>';
  }
  html += '<li class="page-item ' + (page >= totalPages ? 'disabled' : '') + '"><a class="page-link" href="#" onclick="' + callbackName + '(' + (page + 1) + ');return false;">下一页</a></li>';
  html += '</ul></nav>';
  return html;
}

function loadOpLogs(page){
  if(!page) page = 1;
  currentOplogPage = page;
  loadOplogStats();
  var targetType = document.getElementById('oplogTypeFilter').value;
  var action = document.getElementById('oplogActionFilter').value;
  var keyword = document.getElementById('oplogKeyword').value;
  
  var url = '/api/operation-logs?page=' + page + '&per_page=20';
  if(targetType) url += '&target_type=' + targetType;
  if(action) url += '&action=' + action;
  if(keyword) url += '&keyword=' + encodeURIComponent(keyword);
  
  apiFetch(url).then(function(r){ return r.json(); }).then(function(data){
    var listEl = document.getElementById('oplogList');
    if(data.error){
      listEl.innerHTML = '<div class="text-danger py-4 text-center">加载失败: ' + escapeHtml(data.error) + '</div>';
      return;
    }
    if(!data.logs || data.logs.length === 0){
      listEl.innerHTML = '<div class="text-muted py-4 text-center">暂无操作记录</div>';
      document.getElementById('oplogPagination').innerHTML = '';
      return;
    }
    
    var html = '<div class="table-responsive"><table class="table table-hover table-sm align-middle"><thead><tr>';
    html += '<th style="width:80px">ID</th>';
    html += '<th style="width:90px">类型</th>';
    html += '<th style="width:90px">操作</th>';
    html += '<th>内容标题</th>';
    html += '<th style="width:100px">操作人</th>';
    html += '<th style="width:160px">时间</th>';
    html += '<th style="width:120px">操作</th>';
    html += '</tr></thead><tbody>';
    
    for(var i = 0; i < data.logs.length; i++){
      var log = data.logs[i];
      var typeLabel = log.target_type === 'work_record' ? '工单' : (log.target_type === 'pending_work' ? '待办' : log.target_type);
      var typeClass = log.target_type === 'work_record' ? 'bg-info' : 'bg-warning';
      var actionLabel = log.action === 'update' ? '编辑' : (log.action === 'delete' ? '删除' : (log.action === 'create' ? '新增' : log.action));
      var actionClass = log.action === 'delete' ? 'danger' : (log.action === 'update' ? 'warning' : 'success');
      var timeStr = formatDate(log.created_at);
      
      html += '<tr>';
      html += '<td class="text-muted small">' + log.id + '</td>';
      html += '<td><span class="badge ' + typeClass + ' bg-opacity-10 text-' + (log.target_type === 'work_record' ? 'info' : 'warning') + '">' + typeLabel + '</span></td>';
      html += '<td><span class="badge text-' + actionClass + ' bg-' + actionClass + ' bg-opacity-10">' + actionLabel + '</span></td>';
      html += '<td><div class="text-truncate" style="max-width:400px" title="' + escapeHtml(log.target_title) + '">' + escapeHtml(log.target_title || '-') + '</div></td>';
      html += '<td class="text-muted">' + escapeHtml(log.user || '-') + '</td>';
      html += '<td class="text-muted small">' + timeStr + '</td>';
      html += '<td><button class="btn btn-sm btn-outline-primary" onclick="showOplogDetail(' + log.id + ')"><i class="bi bi-eye me-1"></i>详情</button></td>';
      html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    listEl.innerHTML = html;
    
    // 分页
    var pageHtml = _renderOplogPagination(page, data.pages, 'loadOpLogs');
    document.getElementById('oplogPagination').innerHTML = pageHtml;
    
  }).catch(function(err){
    document.getElementById('oplogList').innerHTML = '<div class="text-danger py-4 text-center">加载失败: ' + escapeHtml(err.message) + '</div>';
  });
}

function showOplogDetail(logId){
  currentOplogId = logId;
  if(!oplogDetailModal){
    oplogDetailModal = new bootstrap.Modal(document.getElementById('oplogDetailModal'));
  }
  document.getElementById('oplogDetailBody').innerHTML = '<div class="text-center py-4 text-muted">加载中...</div>';
  oplogDetailModal.show();
  
  apiFetch('/api/operation-logs/' + logId).then(function(r){ return r.json(); }).then(function(log){
    if(log.error){
      document.getElementById('oplogDetailBody').innerHTML = '<div class="text-danger text-center py-4">加载失败: ' + escapeHtml(log.error) + '</div>';
      return;
    }
    renderOplogDetail(log);
  }).catch(function(err){
    document.getElementById('oplogDetailBody').innerHTML = '<div class="text-danger text-center py-4">加载失败: ' + escapeHtml(err.message) + '</div>';
  });
}

function renderOplogDetail(log){
  var typeLabel = log.target_type === 'work_record' ? '工单' : (log.target_type === 'pending_work' ? '待办' : log.target_type);
  var actionLabel = log.action === 'update' ? '编辑' : (log.action === 'delete' ? '删除' : (log.action === 'create' ? '新增' : log.action));
  
  var html = '';
  
  // 基本信息
  html += '<div class="row g-2 mb-3">';
  html += '<div class="col-md-3"><div class="text-muted small">日志ID</div><div class="fw-semibold">#' + log.id + '</div></div>';
  html += '<div class="col-md-3"><div class="text-muted small">类型</div><div>' + typeLabel + ' #' + log.target_id + '</div></div>';
  html += '<div class="col-md-2"><div class="text-muted small">操作</div><div>' + actionLabel + '</div></div>';
  html += '<div class="col-md-2"><div class="text-muted small">操作人</div><div>' + escapeHtml(log.user || '-') + '</div></div>';
  html += '<div class="col-md-2"><div class="text-muted small">时间</div><div class="small">' + formatDate(log.created_at) + '</div></div>';
  html += '</div>';
  html += '<div class="mb-3"><div class="text-muted small mb-1">内容标题</div><div class="fw-semibold">' + escapeHtml(log.target_title || '-') + '</div></div>';
  
  // 变更对比
  if(log.changes_summary && log.changes_summary.length > 0){
    html += '<div class="mb-3"><div class="text-muted small mb-2 fw-semibold">变更字段 (' + log.changes_summary.length + ' 项)</div>';
    html += '<div class="table-responsive"><table class="table table-sm table-bordered"><thead><tr>';
    html += '<th style="width:120px">字段</th>';
    html += '<th style="width:50%; background:var(--danger-bg,#fff5f5)">修改前</th>';
    html += '<th style="width:50%; background:var(--success-bg,#f0fff4)">修改后</th>';
    html += '</tr></thead><tbody>';
    for(var i = 0; i < log.changes_summary.length; i++){
      var c = log.changes_summary[i];
      html += '<tr>';
      html += '<td class="fw-medium">' + escapeHtml(c.label || c.field) + '</td>';
      html += '<td class="text-danger">' + (c.before && c.before.length > 200 ? c.before.substring(0,200) + '...' : escapeHtml(c.before || '-')) + '</td>';
      html += '<td class="text-success">' + (c.after && c.after.length > 200 ? c.after.substring(0,200) + '...' : escapeHtml(c.after || '-')) + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table></div></div>';
  }
  
  // 完整快照
  if(log.snapshot_before || log.snapshot_after){
    html += '<div class="mb-2"><div class="text-muted small fw-semibold mb-2">完整数据快照</div>';
    html += '<div class="d-flex gap-2 mb-2">';
    if(log.snapshot_before){
      html += '<button class="btn btn-sm btn-outline-secondary" onclick="toggleSnapshot(\'before\')">查看修改前快照</button>';
    }
    if(log.snapshot_after){
      html += '<button class="btn btn-sm btn-outline-secondary" onclick="toggleSnapshot(\'after\')">查看修改后快照</button>';
    }
    html += '</div>';
    html += '<pre id="snapshotBefore" class="d-none small bg-light p-2 rounded" style="max-height:300px;overflow:auto">' + escapeHtml(JSON.stringify(log.snapshot_before, null, 2)) + '</pre>';
    html += '<pre id="snapshotAfter" class="d-none small bg-light p-2 rounded" style="max-height:300px;overflow:auto">' + escapeHtml(JSON.stringify(log.snapshot_after, null, 2)) + '</pre>';
    html += '</div>';
  }
  
  document.getElementById('oplogDetailBody').innerHTML = html;
  
  // 恢复按钮：删除操作可以恢复（重新创建），编辑操作可以恢复（回滚到修改前）
  var restoreBtn = document.getElementById('oplogRestoreBtn');
  if(log.action === 'delete' || log.action === 'update'){
    restoreBtn.style.display = '';
    var btnLabel = log.action === 'delete' ? '恢复（重新创建）' : '恢复到此版本';
    restoreBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise me-1"></i>' + btnLabel;
  } else {
    restoreBtn.style.display = 'none';
  }
}

function toggleSnapshot(which){
  var beforeEl = document.getElementById('snapshotBefore');
  var afterEl = document.getElementById('snapshotAfter');
  if(which === 'before'){
    beforeEl.classList.toggle('d-none');
    afterEl.classList.add('d-none');
  } else {
    afterEl.classList.toggle('d-none');
    beforeEl.classList.add('d-none');
  }
}

function restoreFromOplog(){
  if(!currentOplogId) return;
  if(!confirm('确定要恢复到此版本吗？恢复后当前数据将被覆盖。')) return;
  
  apiFetch('/api/operation-logs/' + currentOplogId + '/restore', {
    method: 'POST'
  }).then(function(r){ return r.json(); }).then(function(data){
    if(data.error){
      alert('恢复失败: ' + data.error);
      return;
    }
    alert(data.message || '恢复成功');
    if(oplogDetailModal) oplogDetailModal.hide();
    loadOpLogs(currentOplogPage);
  }).catch(function(err){
    alert('恢复失败: ' + err.message);
  });
}

function loadOplogStats(){
  apiFetch('/api/operation-logs/stats').then(function(r){ return r.json(); }).then(function(data){
    if(data.error) return;
    document.getElementById('oplogTotal').textContent = data.total || 0;
    document.getElementById('oplogExpired').textContent = data.expired || 0;
    if(data.retention_days){
      document.getElementById('oplogRetentionDays').value = data.retention_days;
    }
  }).catch(function(err){});
}

function saveRetentionDays(){
  var days = document.getElementById('oplogRetentionDays').value;
  if(!days || days < 7 || days > 365){
    alert('保留天数必须在 7-365 天之间');
    return;
  }
  apiFetch('/api/settings', {
    method: 'POST',
    body: JSON.stringify({ oplog_retention_days: days })
  }).then(function(r){ return r.json(); }).then(function(data){
    if(data.error){
      alert('保存失败: ' + data.error);
      return;
    }
    alert('设置已保存');
    loadOplogStats();
  }).catch(function(err){
    alert('保存失败: ' + err.message);
  });
}

function cleanupOplogs(){
  if(!confirm('确定要清理过期的操作日志吗？清理后不可恢复！')) return;
  apiFetch('/api/operation-logs/cleanup', {
    method: 'POST'
  }).then(function(r){ return r.json(); }).then(function(data){
    if(data.error){
      alert('清理失败: ' + data.error);
      return;
    }
    alert(data.message || '清理完成');
    loadOpLogs(1);
  }).catch(function(err){
    alert('清理失败: ' + err.message);
  });
}

// 权限控制：只有管理员显示操作日志菜单
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    if(typeof isAdmin === 'function' && !isAdmin()){
      var link = document.getElementById('oplogMenuLink');
      if(link) link.style.display = 'none';
    }
  }, 200);
});


    // ========== 站内通知 ==========
    var _notifyPage = 1;
    var _notifyPerPage = 20;
    var _notifyTimer = null;
    var _notifyStarted = false;

    function startNotifyPolling() {
        if (_notifyStarted) return;
        _notifyStarted = true;
        refreshUnreadCount();
        if (_notifyTimer) clearInterval(_notifyTimer);
        _notifyTimer = setInterval(refreshUnreadCount, 60000);
    }

    function stopNotifyPolling() {
        _notifyStarted = false;
        if (_notifyTimer) {
            clearInterval(_notifyTimer);
            _notifyTimer = null;
        }
    }

    function _checkLoginAndStartNotify() {
        var token = localStorage.getItem('auth_token');
        if (token && !_notifyStarted) {
            startNotifyPolling();
        } else if (!token && _notifyStarted) {
            stopNotifyPolling();
        }
    }

    setInterval(_checkLoginAndStartNotify, 3000);
    document.addEventListener('DOMContentLoaded', _checkLoginAndStartNotify);

    function refreshUnreadCount() {
        apiFetch('/api/notifications/unread-count')
            .then(function(data) {
                var badge = document.getElementById('notifyBadge');
                if (badge) {
                    var count = data.unread_count || 0;
                    if (count > 0) {
                        badge.textContent = count > 99 ? '99+' : count;
                        badge.classList.remove('d-none');
                    } else {
                        badge.classList.add('d-none');
                    }
                }
            })
            .catch(function() {});
    }

    function _getNotifyIconClass(type) {
        if (type === 'warning') return 'bi-exclamation-triangle text-warning';
        if (type === 'success') return 'bi-check-circle text-success';
        if (type === 'danger') return 'bi-x-circle text-danger';
        return 'bi-info-circle text-primary';
    }

    function loadNotifications() {
        var filterEl = document.getElementById('notifyFilter');
        var filter = filterEl ? filterEl.value : '';
        var container = document.getElementById('notifyListContainer');
        var pageList = document.getElementById('notifyPageList');

        var url = '/api/notifications?page=' + _notifyPage + '&per_page=' + _notifyPerPage;
        if (filter !== '') url += '&is_read=' + filter;

        apiFetch(url).then(function(data) {
            var records = data.records || [];
            
            if (container) {
                if (records.length === 0) {
                    container.innerHTML = '<div class="text-center text-muted py-4 small">暂无通知</div>';
                } else {
                    var html = '';
                    for (var i = 0; i < Math.min(records.length, 8); i++) {
                        var n = records[i];
                        var iconClass = _getNotifyIconClass(n.notify_type);
                        var readClass = n.is_read ? 'opacity-60' : '';
                        var relType = n.related_type || '';
                        var relId = n.related_id || 0;
                        html += '<li><a class="dropdown-item ' + readClass + '" href="#" onclick="handleNotifyClick(' + n.id + ', \'' + relType + '\', ' + relId + ');return false;">' +
                                '<div class="d-flex gap-2">' +
                                '<i class="bi ' + iconClass + ' mt-1"></i>' +
                                '<div class="flex-1 min-w-0">' +
                                '<div class="fw-medium small text-truncate">' + (n.title || '') + '</div>' +
                                '<div class="text-muted small text-truncate" style="max-width:280px;">' + (n.content || '') + '</div>' +
                                '<div class="text-muted is-11 mt-1">' + formatNotifyTime(n.created_at) + '</div>' +
                                '</div></div></a></li>';
                    }
                    container.innerHTML = html;
                }
            }
            
            if (pageList) {
                if (records.length === 0) {
                    pageList.innerHTML = '<div class="card"><div class="card-body text-center text-muted py-5">暂无通知消息</div></div>';
                } else {
                    var html2 = '<div class="card"><div class="list-group list-group-flush">';
                    for (var j = 0; j < records.length; j++) {
                        var n2 = records[j];
                        var iconClass2 = _getNotifyIconClass(n2.notify_type);
                        var readClass2 = n2.is_read ? 'bg-transparent' : 'list-group-item-light';
                        var relType2 = n2.related_type || '';
                        var btnRead = n2.is_read ? '' : '<button class="btn btn-sm btn-outline-primary" onclick="markOneRead(' + n2.id + ')">标记已读</button>';
                        var btnDetail = n2.related_id ? '<button class="btn btn-sm btn-outline-secondary" onclick="handleNotifyClick(' + n2.id + ', \'' + relType2 + '\', ' + n2.related_id + ')">查看详情</button>' : '';
                        html2 += '<div class="list-group-item ' + readClass2 + ' px-3 py-3">' +
                                '<div class="d-flex gap-3 align-items-start">' +
                                '<i class="bi ' + iconClass2 + ' fs-5 mt-1"></i>' +
                                '<div class="flex-grow-1 min-w-0">' +
                                '<div class="d-flex align-items-center justify-content-between mb-1">' +
                                '<h6 class="mb-0 fw-medium">' + (n2.title || '') + '</h6>' +
                                '<small class="text-muted text-nowrap">' + formatNotifyTime(n2.created_at) + '</small>' +
                                '</div>' +
                                '<p class="mb-2 small text-muted">' + (n2.content || '') + '</p>' +
                                '<div class="d-flex gap-2">' + btnRead +
                                '<button class="btn btn-sm btn-outline-danger" onclick="deleteOneNotify(' + n2.id + ')">删除</button>' + btnDetail +
                                '</div></div></div></div>';
                    }
                    html2 += '</div></div>';
                    pageList.innerHTML = html2;
                }
                
                var nav = document.getElementById('notifyPageNav');
                if (nav && data.pages > 1) {
                    nav.innerHTML = _renderSimplePagination(_notifyPage, data.pages, function(p) {
                        _notifyPage = p;
                        loadNotifications();
                    });
                }
            }
        }).catch(function(err) {
            console.error('加载通知失败:', err);
        });
    }

    function formatNotifyTime(isoStr) {
        if (!isoStr) return '';
        var d = new Date(isoStr);
        var now = new Date();
        var diff = (now - d) / 1000;
        if (diff < 60) return '刚刚';
        if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
        if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
        if (diff < 604800) return Math.floor(diff / 86400) + '天前';
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function markOneRead(id) {
        apiFetch('/api/notifications/' + id + '/read', { method: 'POST' })
            .then(function() {
                refreshUnreadCount();
                loadNotifications();
            });
    }

    function markAllRead(event) {
        if (event) event.stopPropagation();
        apiFetch('/api/notifications/read-all', { method: 'POST' })
            .then(function() {
                refreshUnreadCount();
                loadNotifications();
            });
    }

    function deleteOneNotify(id) {
        if (!confirm('确定删除这条通知吗？')) return;
        apiFetch('/api/notifications/' + id, { method: 'DELETE' })
            .then(function() {
                refreshUnreadCount();
                loadNotifications();
            });
    }

    function clearReadNotifs(event) {
        if (event) event.stopPropagation();
        if (!confirm('确定清除所有已读通知吗？')) return;
        apiFetch('/api/notifications/clear-read', { method: 'POST' })
            .then(function() {
                refreshUnreadCount();
                loadNotifications();
            });
    }

    function handleNotifyClick(id, relatedType, relatedId) {
        apiFetch('/api/notifications/' + id + '/read', { method: 'POST' }).catch(function(){});
        refreshUnreadCount();
        
        if (relatedType === 'work_record' && relatedId) {
            loadRecordDetail(relatedId);
        } else if (relatedType === 'pending' && relatedId) {
            switchTab('tab-pending');
        } else if (relatedType === 'payment' && relatedId) {
            switchTab('tab-payments');
        }
    }

    function loadNotifySettings() {
        loadNotifications();
    }

    function saveNotifySettings() {
        alert('站内通知无需配置Webhook，通知将直接显示在顶部铃铛中。');
    }

    function testNotification() {
        alert('站内通知模式下，通知将在相关事件触发时自动显示。');
    }
    
    