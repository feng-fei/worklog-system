(function() {
  'use strict';

  function _isLoggedIn() {
    try {
      return !!localStorage.getItem('auth_token');
    } catch(e) {
      return false;
    }
  }
  window._isLoggedIn = _isLoggedIn;

  /* ---------- 1. 动态费用表格功能 ---------- */
  const FEE_TYPES = [
    { value: '人工', label: '人工', icon: 'bi-person-fill', class: 'fee-type-labor' },
    { value: '材料', label: '材料', icon: 'bi-box-seam-fill', class: 'fee-type-material' },
    { value: '设备', label: '设备', icon: 'bi-device-hdd-fill', class: 'fee-type-equipment' },
    { value: '交通', label: '交通', icon: 'bi-truck', class: 'fee-type-transport' },
    { value: '其他', label: '其他', icon: 'bi-three-dots', class: 'fee-type-other' }
  ];

  const DEFAULT_UNITS = {
    '人工': '小时',
    '材料': '个',
    '设备': '台',
    '交通': '次',
    '其他': '次'
  };

  let feeRowCounter = 0;

  window.initDynamicFeeTable = function(containerId, initialData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="dynamic-fee-table-wrapper">
        <table class="dynamic-fee-table" id="${containerId}-table">
          <thead>
            <tr>
              <th style="width:80px">类型</th>
              <th>名称/说明</th>
              <th style="width:110px">规格/型号</th>
              <th style="width:65px">数量</th>
              <th style="width:65px">单位</th>
              <th style="width:85px">单价</th>
              <th style="width:85px">小计</th>
              <th style="width:40px"></th>
            </tr>
          </thead>
          <tbody id="${containerId}-tbody"></tbody>
        </table>
        <div class="dynamic-fee-footer">
          <button type="button" class="btn btn-outline-primary btn-sm btn-add-fee-row" onclick="addFeeRow('${containerId}')">
            <i class="bi bi-plus-lg"></i> 添加费用行
          </button>
          <div class="dynamic-fee-total">
            <span>合计：</span>
            <span class="fee-total-amount" id="${containerId}-total">¥0.00</span>
          </div>
        </div>
      </div>
    `;

    if (initialData && initialData.length > 0) {
      initialData.forEach(function(item) {
        addFeeRow(containerId, item);
      });
    } else {
      addFeeRow(containerId, { type: '人工', desc: '人工费', unit: '小时' });
      addFeeRow(containerId, { type: '交通', desc: '交通费', unit: '次' });
      addFeeRow(containerId, { type: '其他', desc: '调试费', unit: '次' });
    }
    
    calcFeeTotal(containerId);
  };

  window.addFeeRow = function(containerId, preset) {
    const tbody = document.getElementById(containerId + '-tbody');
    if (!tbody) return;

    const rowId = 'fee-row-' + (++feeRowCounter);
    const tr = document.createElement('tr');
    tr.id = rowId;
    
    const presetType = preset && preset.type ? preset.type : '人工';
    const presetDesc = preset && preset.desc ? preset.desc : '';
    const presetSpec = preset && preset.spec ? preset.spec : '';
    const presetQty = preset && preset.qty ? preset.qty : 1;
    const presetUnit = preset && preset.unit ? preset.unit : (DEFAULT_UNITS[presetType] || '次');
    const presetPrice = preset && preset.price ? preset.price : 0;

    tr.innerHTML = `
      <td class="fee-type-cell" data-label="类型">
        <select class="form-select form-select-sm fee-type-select" onchange="updateFeeRowType(this)">
          ${FEE_TYPES.map(t => `<option value="${t.value}" ${t.value === presetType ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </td>
      <td class="fee-desc-cell" data-label="名称/说明">
        <input type="text" class="form-control form-control-sm fee-desc-input" placeholder="${presetType === '设备' ? '设备名称' : presetType === '材料' ? '材料名称' : '费用说明'}" value="${presetDesc}">
      </td>
      <td data-label="规格/型号">
        <input type="text" class="form-control form-control-sm fee-spec-input" placeholder="${presetType === '设备' ? '如：DS-2CD' : '规格'}" value="${presetSpec}">
      </td>
      <td data-label="数量">
        <input type="number" class="form-control form-control-sm fee-qty-input text-center" value="${presetQty}" min="0" step="0.5" oninput="calcFeeRow(this)">
      </td>
      <td data-label="单位">
        <input type="text" class="form-control form-control-sm fee-unit-input text-center" value="${presetUnit}" placeholder="单位">
      </td>
      <td data-label="单价">
        <input type="number" class="form-control form-control-sm fee-price-input text-end" value="${presetPrice}" min="0" step="0.01" oninput="calcFeeRow(this)">
      </td>
      <td data-label="小计">
        <div class="fee-subtotal text-end">¥0.00</div>
      </td>
      <td>
        <button type="button" class="fee-row-remove" onclick="removeFeeRow('${rowId}', '${containerId}')" title="删除此行">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
    calcFeeRow(tr.querySelector('.fee-qty-input'));
  };

  window.removeFeeRow = function(rowId, containerId) {
    const row = document.getElementById(rowId);
    const tbody = document.getElementById(containerId + '-tbody');
    if (row && tbody && tbody.children.length > 1) {
      row.remove();
      calcFeeTotal(containerId);
    } else if (row && tbody && tbody.children.length === 1) {
      const qtyInput = row.querySelector('.fee-qty-input');
      const priceInput = row.querySelector('.fee-price-input');
      const descInput = row.querySelector('.fee-desc-input');
      const specInput = row.querySelector('.fee-spec-input');
      if (qtyInput) qtyInput.value = '1';
      if (priceInput) priceInput.value = '0';
      if (descInput) descInput.value = '';
      if (specInput) specInput.value = '';
      calcFeeRow(row.querySelector('.fee-qty-input'));
    }
  };

  window.updateFeeRowType = function(selectEl) {
    const tr = selectEl.closest('tr');
    if (!tr) return;
    const type = selectEl.value;
    const unitInput = tr.querySelector('.fee-unit-input');
    const descInput = tr.querySelector('.fee-desc-input');
    const specInput = tr.querySelector('.fee-spec-input');
    if (unitInput && (!unitInput.value || unitInput._auto)) {
      unitInput.value = DEFAULT_UNITS[type] || '次';
      unitInput._auto = true;
    }
    if (descInput) {
      descInput.placeholder = type === '设备' ? '设备名称' : type === '材料' ? '材料名称' : '费用说明';
    }
    if (specInput) {
      specInput.placeholder = type === '设备' ? '如：DS-2CD' : '规格';
    }
  };

  window.calcFeeRow = function(inputEl) {
    const tr = inputEl.closest('tr');
    if (!tr) return;

    const qty = parseFloat(tr.querySelector('.fee-qty-input').value) || 0;
    const price = parseFloat(tr.querySelector('.fee-price-input').value) || 0;
    const subtotal = qty * price;

    const subtotalEl = tr.querySelector('.fee-subtotal');
    if (subtotalEl) {
      subtotalEl.textContent = '¥' + subtotal.toFixed(2);
    }

    const wrapper = tr.closest('.dynamic-fee-table-wrapper');
    if (wrapper) {
      const tableId = wrapper.querySelector('table').id;
      const containerId = tableId.replace('-table', '');
      calcFeeTotal(containerId);
    }
  };

  window.calcFeeTotal = function(containerId) {
    const tbody = document.getElementById(containerId + '-tbody');
    const totalEl = document.getElementById(containerId + '-total');
    if (!tbody || !totalEl) return;

    let total = 0;
    const feeData = [];

    tbody.querySelectorAll('tr').forEach(tr => {
      const typeSelect = tr.querySelector('.fee-type-select');
      const descInput = tr.querySelector('.fee-desc-input');
      const specInput = tr.querySelector('.fee-spec-input');
      const qtyInput = tr.querySelector('.fee-qty-input');
      const unitInput = tr.querySelector('.fee-unit-input');
      const priceInput = tr.querySelector('.fee-price-input');

      const type = typeSelect ? typeSelect.value : '其他';
      const desc = descInput ? descInput.value : '';
      const spec = specInput ? specInput.value : '';
      const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
      const unit = unitInput ? unitInput.value : '';
      const price = parseFloat(priceInput ? priceInput.value : 0) || 0;
      const subtotal = qty * price;

      total += subtotal;

      if (qty > 0 || price > 0 || desc || spec) {
        feeData.push({ type: type, desc: desc, spec: spec, qty: qty, unit: unit, price: price, subtotal: subtotal });
      }
    });

    totalEl.textContent = '¥' + total.toFixed(2);
    
    const dataEl = document.getElementById('feeItemsData') || document.getElementById(containerId + '-data');
    if (dataEl) {
      dataEl.value = JSON.stringify(feeData);
    }

    syncFeeToOldFields(feeData);
    updateWorkTotalDisplay(total);
  };

  function syncFeeToOldFields(feeData) {
    let labor = 0, material = 0, equipment = 0, transport = 0, other = 0;
    
    feeData.forEach(function(item) {
      const subtotal = item.subtotal || 0;
      if (item.type === '人工') labor += subtotal;
      else if (item.type === '材料') material += subtotal;
      else if (item.type === '设备') equipment += subtotal;
      else if (item.type === '交通') transport += subtotal;
      else other += subtotal;
    });

    function setVal(name, val) {
      const el = document.querySelector('input[name="' + name + '"]');
      if (el) { el.value = val.toFixed(2); }
    }

    setVal('labor_fee', labor);
    setVal('material_fee', material);
    setVal('equipment_fee_total', equipment);
    setVal('debug_fee', 0);
    setVal('transport_fee', transport);
    setVal('other_fee', other);
  }

  function updateWorkTotalDisplay(subtotal) {
    const subtotalEl = document.getElementById('woSubtotalFee');
    const taxAmountEl = document.getElementById('woTaxAmount');
    const totalEl = document.getElementById('woTotalFee');
    const unpaidEl = document.getElementById('woUnpaidFee');
    const paidInput = document.getElementById('woPaidAmount');
    
    if (!subtotalEl) return;

    const taxYes = document.getElementById('taxYes');
    const taxRateEl = document.getElementById('taxRate');
    const rate = taxYes && taxYes.checked ? parseFloat(taxRateEl ? taxRateEl.value : 0.03) : 0;
    
    const paid = parseFloat(paidInput ? paidInput.value : 0) || 0;
    const taxAmount = subtotal * rate;
    const total = subtotal + taxAmount;
    const unpaid = total - paid;

    const fmt = function(el, val, prefix) {
      if (!el) return;
      const text = (prefix || '¥') + val.toFixed(2);
      if (el.tagName === 'INPUT') {
        el.value = val.toFixed(2);
      } else {
        el.textContent = text;
      }
    };

    fmt(subtotalEl, subtotal);
    fmt(taxAmountEl, taxAmount);
    fmt(totalEl, total);
    fmt(unpaidEl, unpaid);
  }

  window.getFeeTableData = function(containerId) {
    const dataEl = document.getElementById('feeItemsData') || document.getElementById(containerId + '-data');
    if (!dataEl) return [];
    try {
      return JSON.parse(dataEl.value || '[]');
    } catch(e) { return []; }
  };

  window.loadFeeTableData = function(containerId, feeItemsJson) {
    let items = [];
    try {
      if (typeof feeItemsJson === 'string') {
        items = JSON.parse(feeItemsJson || '[]');
      } else if (Array.isArray(feeItemsJson)) {
        items = feeItemsJson;
      }
    } catch(e) { items = []; }
    initDynamicFeeTable(containerId, items);
  };

  /* ---------- 2. 发票标记切换功能 ---------- */
  window.toggleInvoiceStatus = function(paymentId, checkbox) {
    const isInvoiced = checkbox.checked;
    const toggleEl = checkbox.closest('.invoice-toggle');

    if (toggleEl) {
      toggleEl.classList.toggle('invoiced', isInvoiced);
      const label = toggleEl.querySelector('.invoice-toggle-label');
      if (label) {
        label.textContent = isInvoiced ? '已开票' : '未开票';
      }
    }

    if (typeof window.apiFetch === 'function') {
      window.apiFetch('/api/payments/' + paymentId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_invoiced: isInvoiced })
      }).then(function(res) {
        if (res && !res.error) {
          // success
        } else {
          checkbox.checked = !isInvoiced;
          if (toggleEl) {
            toggleEl.classList.toggle('invoiced', !isInvoiced);
            const label = toggleEl.querySelector('.invoice-toggle-label');
            if (label) label.textContent = !isInvoiced ? '已开票' : '未开票';
          }
        }
      }).catch(function() {
        checkbox.checked = !isInvoiced;
        if (toggleEl) {
          toggleEl.classList.toggle('invoiced', !isInvoiced);
          const label = toggleEl.querySelector('.invoice-toggle-label');
          if (label) label.textContent = !isInvoiced ? '已开票' : '未开票';
        }
      });
    }
  };

  window.createInvoiceToggle = function(paymentId, isInvoiced) {
    const div = document.createElement('label');
    div.className = 'invoice-toggle' + (isInvoiced ? ' invoiced' : '');
    div.innerHTML = `
      <input type="checkbox" ${isInvoiced ? 'checked' : ''} onchange="toggleInvoiceStatus('${paymentId}', this)">
      <span class="invoice-toggle-switch"></span>
      <span class="invoice-toggle-label">${isInvoiced ? '已开票' : '未开票'}</span>
    `;
    return div;
  };

  /* ---------- 3. 客户应收列表渲染 ---------- */
  window.renderCustomerReceivableList = function(containerId, customers) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!customers || customers.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-3 small">暂无应收款项</div>';
      return;
    }

    let html = '<div class="customer-receivable-list">';
    customers.forEach(function(cust) {
      const name = cust.customer_name || cust.name || '未知客户';
      const initial = name.charAt(0);
      const amount = parseFloat(cust.amount || 0);
      const count = cust.record_count || 0;
      
      html += `
        <div class="customer-receivable-item" onclick="searchCustomerRecords('${name.replace(/'/g, "\\'")}')">
          <div class="customer-receivable-info">
            <div class="customer-receivable-avatar">${initial}</div>
            <div>
              <div class="customer-receivable-name">${name}</div>
              <div class="customer-receivable-count">${count} 个工单</div>
            </div>
          </div>
          <div class="customer-receivable-amount">¥${amount.toFixed(2)}</div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  };

  window.searchCustomerRecords = function(customerName) {
    if (typeof window.switchTab === 'function') {
      window.switchTab('tab-query');
      setTimeout(function() {
        const qInput = document.getElementById('qCustomerName');
        if (qInput) {
          qInput.value = customerName;
          if (typeof window.queryRecords === 'function') {
            window.queryRecords();
          }
        }
      }, 150);
    }
  };

  window.loadCustomerReceivable = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="text-center text-muted py-2 small"><div class="spinner-border spinner-border-sm"></div> 加载中...</div>';

    if (typeof window.apiFetch === 'function') {
      window.apiFetch('/api/payments/stats').then(function(data) {
        const customers = data.customer_receivable || [];
        window.renderCustomerReceivableList(containerId, customers);
      }).catch(function() {
        window.renderCustomerReceivableList(containerId, []);
      });
    } else {
      window.renderCustomerReceivableList(containerId, []);
    }
  };

  /* ---------- 4. 移动端列表卡片式布局转换 ---------- */
  const MOBILE_BREAKPOINT = 768;
  let mobileCardState = {
    payments: false,
    projects: false,
    expenses: false
  };

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function isDataTable(table) {
    if (!table) return false;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return false;
    const ths = thead.querySelectorAll('th');
    return ths.length >= 5;
  }

  window.convertTableToMobileCards = function(tableSelector, options) {
    if (!isMobile()) return;
    options = options || {};
    const table = document.querySelector(tableSelector);
    if (!table || !isDataTable(table)) return;
    if (!isMobile()) {
      restoreTableFromMobileCards(tableSelector);
      return;
    }

    const wrapper = table.closest('.table-responsive') || table.parentElement;
    if (!wrapper) return;

    let cardContainer = wrapper.querySelector('.mobile-card-list');
    if (!cardContainer) {
      cardContainer = document.createElement('div');
      cardContainer.className = 'mobile-card-list';
      wrapper.appendChild(cardContainer);
    }

    const headers = [];
    table.querySelectorAll('thead th').forEach(function(th) {
      headers.push(th.textContent.trim().replace(/\s+/g, ''));
    });

    const rows = table.querySelectorAll('tbody tr');
    cardContainer.innerHTML = '';

    rows.forEach(function(tr) {
      if (tr.querySelector('td[colspan]')) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'mobile-list-card text-center text-muted py-4';
        emptyCard.textContent = tr.textContent.trim();
        cardContainer.appendChild(emptyCard);
        return;
      }

      const cells = tr.querySelectorAll('td');
      const card = document.createElement('div');
      card.className = 'mobile-list-card';

      let titleText = '';
      let badgeHtml = '';
      const fields = [];
      let actionsHtml = '';

      cells.forEach(function(td, idx) {
        const header = headers[idx] || '';
        const text = td.textContent.trim();
        const html = td.innerHTML;
        const hasBtn = td.querySelector('.btn, button, a, .invoice-toggle');

        if (idx === 0 && !titleText) {
          titleText = text;
          const badge = td.querySelector('.badge');
          if (badge) badgeHtml = badge.outerHTML;
        } else if (hasBtn && idx >= cells.length - 2) {
          if (!actionsHtml) actionsHtml = '<div class="mobile-card-footer">';
          actionsHtml += '<div class="mobile-card-action-item">' + html + '</div>';
        } else if (text && header) {
          let valueClass = '';
          if (text.includes('¥')) valueClass = 'amount';
          fields.push(`
            <div class="mobile-card-field">
              <span class="mobile-card-label">${header}</span>
              <span class="mobile-card-value${valueClass ? ' ' + valueClass : ''}">${html}</span>
            </div>
          `);
        }
      });

      if (actionsHtml) actionsHtml += '</div>';

      card.innerHTML = `
        <div class="mobile-card-header">
          <div class="mobile-card-title">${titleText || '-'}</div>
          <div class="mobile-card-badge">${badgeHtml}</div>
        </div>
        <div class="mobile-card-body">
          ${fields.join('')}
        </div>
        ${actionsHtml}
      `;

      cardContainer.appendChild(card);
    });

    table.style.display = 'none';
    cardContainer.style.display = 'flex';
  };

  window.restoreTableFromMobileCards = function(tableSelector) {
    const table = document.querySelector(tableSelector);
    if (!table) return;
    const wrapper = table.closest('.table-responsive') || table.parentElement;
    if (!wrapper) return;
    const cardContainer = wrapper.querySelector('.mobile-card-list');
    if (cardContainer) cardContainer.style.display = 'none';
    table.style.display = '';
  };

  window.updateMobileLayout = function() {
    const mobile = isMobile();
    const tables = [
      { sel: '#tab-payments table', key: 'payments' },
      { sel: '#tab-projects table', key: 'projects' },
      { sel: '#tab-expenses table', key: 'expenses' }
    ];
    tables.forEach(function(t) {
      const table = document.querySelector(t.sel);
      if (!table || !isDataTable(table)) return;
      if (mobile) {
        convertTableToMobileCards(t.sel);
        mobileCardState[t.key] = true;
      } else {
        restoreTableFromMobileCards(t.sel);
        mobileCardState[t.key] = false;
      }
    });
  };

  /* ---------- 5. 增强：toggleRecordType 和 calcWorkTotal 适配 ---------- */
  function setupFormEnhancements() {
    const paidInput = document.getElementById('woPaidAmount');
    if (paidInput && !paidInput._enhanced) {
      paidInput._enhanced = true;
      paidInput.addEventListener('input', function() {
        const tbody = document.getElementById('feeTableContainer-tbody');
        if (tbody) {
          calcFeeTotal('feeTableContainer');
        } else {
          updateWorkTotalDisplay(0);
        }
      });
    }
    const taxNo = document.getElementById('taxNo');
    const taxYes = document.getElementById('taxYes');
    if (taxNo) taxNo.addEventListener('change', function() {
      const tbody = document.getElementById('feeTableContainer-tbody');
      if (tbody) calcFeeTotal('feeTableContainer');
    });
    if (taxYes) taxYes.addEventListener('change', function() {
      const tbody = document.getElementById('feeTableContainer-tbody');
      if (tbody) calcFeeTotal('feeTableContainer');
    });
  }

  /* ---------- 6. 全局增强版toggleRecordType适配新结构 ---------- */
  const _origToggleRecordType = window.toggleRecordType;
  window.toggleRecordType = function() {
    if (_origToggleRecordType) {
      _origToggleRecordType();
    }
    
    const isRepair = document.getElementById('rtRepair') && document.getElementById('rtRepair').checked;
    
    const constructionFields = document.getElementById('constructionFields');
    const repairFields = document.getElementById('repairFields');
    const repairDetailSection = document.getElementById('repairDetailSection');
    const priorityField = document.getElementById('priorityField');
    const warrantyField = document.getElementById('warrantyField');
    const warrantyDaysField = document.getElementById('warrantyDaysField');
    const serviceCategoryField = document.getElementById('serviceCategoryField');
    const subtypeLabel = document.getElementById('woSubtypeLabel');
    const constructionOnly = document.querySelector('.construction-only');
    
    if (isRepair) {
      if (constructionFields) constructionFields.style.display = 'none';
      if (repairFields) repairFields.style.display = 'block';
      if (repairDetailSection) repairDetailSection.style.display = 'block';
      if (priorityField) priorityField.style.display = '';
      if (warrantyField) warrantyField.style.display = '';
      if (warrantyDaysField) warrantyDaysField.style.display = '';
      if (serviceCategoryField) serviceCategoryField.style.display = '';
      if (subtypeLabel) subtypeLabel.textContent = '维修类型';
      if (constructionOnly) constructionOnly.style.display = 'none';
      
      const workContent = constructionFields ? constructionFields.querySelector('textarea[name="work_content"]') : null;
      if (workContent) workContent.required = false;

      document.querySelectorAll('.template-chip[data-template-type]').forEach(el => {
        el.style.display = el.getAttribute('data-template-type') === 'repair' ? '' : 'none';
      });
    } else {
      if (constructionFields) constructionFields.style.display = 'block';
      if (repairFields) repairFields.style.display = 'none';
      if (repairDetailSection) repairDetailSection.style.display = 'none';
      if (priorityField) priorityField.style.display = 'none';
      if (warrantyField) warrantyField.style.display = 'none';
      if (warrantyDaysField) warrantyDaysField.style.display = 'none';
      if (serviceCategoryField) serviceCategoryField.style.display = 'none';
      if (subtypeLabel) subtypeLabel.textContent = '施工类型';
      if (constructionOnly) constructionOnly.style.display = '';
      
      const workContent = constructionFields ? constructionFields.querySelector('textarea[name="work_content"]') : null;
      if (workContent) workContent.required = true;

      document.querySelectorAll('.template-chip[data-template-type]').forEach(el => {
        el.style.display = el.getAttribute('data-template-type') === 'construction' ? '' : 'none';
      });
    }
  };

  window._setSelectValue = function(selectEl, value) {
    if (!selectEl || value == null || value === '') return;
    for (let i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value === value || selectEl.options[i].text === value) {
        selectEl.selectedIndex = i;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }
  };

  window._fillTextarea = function(name, value) {
    const el = document.querySelector('#workForm textarea[name="' + name + '"]');
    if (el && value != null) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  window._fillInput = function(name, value) {
    const el = document.querySelector('#workForm input[name="' + name + '"]');
    if (el && value != null) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  window.loadWorkTemplates = function() {
    const picksContainer = document.getElementById('templatePicks');
    if (!picksContainer) return;

    picksContainer.innerHTML = '<span class="text-muted small px-2"><i class="bi bi-hourglass-split me-1"></i>加载中...</span>';

    const fetcher = window.apiFetch || fetch;
    const prom = fetcher('/api/templates');
    const dataProm = (window.apiFetch) ? prom : prom.then(r => r.json());
    dataProm
      .then(templates => {
        if (!templates || !Array.isArray(templates) || templates.length === 0) {
          picksContainer.innerHTML = '<span class="text-muted small px-2">暂无模板，请到工单模板页面创建</span>';
          return;
        }
        const isRepair = document.getElementById('rtRepair')?.checked;
        let html = '';
        templates.forEach(t => {
          const type = t.template_type || 'construction';
          const name = t.name || '模板';
          const icon = type === 'repair'
            ? (name.includes('摄像') || name.includes('画面') ? 'bi-camera-video-off'
              : name.includes('网络') ? 'bi-wifi-off'
              : name.includes('门禁') ? 'bi-exclamation-triangle'
              : 'bi-tools')
            : (name.includes('监控') ? 'bi-cctv'
              : name.includes('网络') || name.includes('布线') ? 'bi-ethernet'
              : name.includes('门禁') ? 'bi-door-closed'
              : name.includes('无线') || name.includes('WiFi') ? 'bi-wifi'
              : name.includes('巡检') ? 'bi-clipboard-check'
              : 'bi-tools');
          const visible = (!isRepair && type === 'construction') || (isRepair && type === 'repair') ? '' : ' style="display:none"';
          html += `<button type="button" class="template-chip" data-template-type="${type}" data-template-id="${t.id}" onclick="applyWorkTemplate(${t.id})"${visible}><i class="bi ${icon} me-1"></i>${name}</button>`;
        });
        picksContainer.innerHTML = html;
      })
      .catch(err => {
        console.error('加载模板列表失败:', err);
        picksContainer.innerHTML = '<span class="text-muted small px-2">模板加载失败</span>';
      });
  };

  window.applyWorkTemplate = function(templateIdOrPreset) {
    document.querySelectorAll('.template-chip').forEach(c => c.classList.remove('active'));
    const chip = document.querySelector(`.template-chip[data-template-id="${templateIdOrPreset}"]`);
    if (chip) chip.classList.add('active');

    if (typeof templateIdOrPreset === 'string') return;
    const tid = parseInt(templateIdOrPreset);
    if (!tid) return;

    const fetcher = window.apiFetch || fetch;
    const prom = fetcher('/api/templates/' + tid);
    const dataProm = (window.apiFetch) ? prom : prom.then(r => r.json());
    dataProm
      .then(tpl => {
        if (!tpl || tpl.error) return;

        if (tpl.template_type === 'repair') {
          const repairRadio = document.getElementById('rtRepair');
          if (repairRadio && !repairRadio.checked) {
            repairRadio.checked = true;
            if (typeof window.toggleRecordType === 'function') window.toggleRecordType();
          }
        } else {
          const conRadio = document.getElementById('rtConstruction');
          if (conRadio && !conRadio.checked) {
            conRadio.checked = true;
            if (typeof window.toggleRecordType === 'function') window.toggleRecordType();
          }
        }

        _setSelectValue(document.getElementById('woSubtype'), tpl.work_subtype);

        if (tpl.priority) {
          const priField = document.querySelector('#workForm select[name="priority"]');
          _setSelectValue(priField, tpl.priority);
        }

        const isRepair = tpl.template_type === 'repair';
        if (isRepair) {
          _fillTextarea('fault_phenomenon', tpl.fault_description || tpl.work_content);
          _fillTextarea('fault_description', tpl.fault_description || tpl.work_content);
        } else {
          _fillTextarea('work_content', tpl.work_content);
        }

        if (tpl.remark) {
          _fillTextarea('remark', tpl.remark);
        }

        if (tpl.tax_type) {
          const taxRadio = document.querySelector(`#workForm input[name="tax_type"][value="${tpl.tax_type}"]`);
          if (taxRadio) {
            taxRadio.checked = true;
            taxRadio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        if (window.calcWorkTotal) window.calcWorkTotal();
      })
      .catch(err => console.error('加载模板详情失败:', err));
  };

  /* ---------- 7. 全局calcWorkTotal hook ---------- */
  window.calcWorkTotal = function() {
    const tbody = document.getElementById('feeTableContainer-tbody');
    if (tbody) {
      calcFeeTotal('feeTableContainer');
    } else {
      updateWorkTotalDisplay(0);
    }
  };

  /* ---------- 8. 工单表单初始化保障（多重机制） ---------- */
  let feeTableInitialized = false;

  function ensureFeeTableInitialized(initialData) {
    const container = document.getElementById('feeTableContainer');
    if (!container) return false;
    
    if (container.querySelector('.dynamic-fee-table')) {
      return true;
    }
    
    window.initDynamicFeeTable('feeTableContainer', initialData || []);
    feeTableInitialized = true;
    return true;
  }

  function hookOpenFunctions() {
    const _origOpenNewWork = window.openNewWork;
    if (_origOpenNewWork && !_origOpenNewWork._hooked) {
      window.openNewWork = function(type) {
        const result = _origOpenNewWork.apply(this, arguments);
        setTimeout(function() {
          ensureFeeTableInitialized();
          if (typeof window.toggleRecordType === 'function') {
            window.toggleRecordType();
          }
          if (typeof window.loadWorkTemplates === 'function') {
            window.loadWorkTemplates();
          }
        }, 100);
        setTimeout(function() {
          ensureFeeTableInitialized();
        }, 500);
        return result;
      };
      window.openNewWork._hooked = true;
    }

    const _origOpenEditWork = window.openEditWork;
    if (_origOpenEditWork && !_origOpenEditWork._hooked) {
      window.openEditWork = function(id) {
        const result = _origOpenEditWork.apply(this, arguments);
        setTimeout(function() {
          ensureFeeTableInitialized();
        }, 200);
        setTimeout(function() {
          const feeData = window.getFeeTableData('feeTableContainer');
          if (feeData.length === 0) {
            const laborFee = parseFloat(document.querySelector('input[name="labor_fee"]')?.value || 0);
            const materialFee = parseFloat(document.querySelector('input[name="material_fee"]')?.value || 0);
            const equipmentFee = parseFloat(document.querySelector('input[name="equipment_fee_total"]')?.value || 0);
            const transportFee = parseFloat(document.querySelector('input[name="transport_fee"]')?.value || 0);
            const otherFee = parseFloat(document.querySelector('input[name="other_fee"]')?.value || 0);
            
            const oldData = [];
            if (laborFee > 0) oldData.push({type:'人工',desc:'',spec:'',qty:1,unit:'项',price:laborFee,subtotal:laborFee});
            if (materialFee > 0) oldData.push({type:'材料',desc:'',spec:'',qty:1,unit:'项',price:materialFee,subtotal:materialFee});
            if (equipmentFee > 0) oldData.push({type:'设备',desc:'',spec:'',qty:1,unit:'项',price:equipmentFee,subtotal:equipmentFee});
            if (transportFee > 0) oldData.push({type:'交通',desc:'',spec:'',qty:1,unit:'次',price:transportFee,subtotal:transportFee});
            if (otherFee > 0) oldData.push({type:'其他',desc:'',spec:'',qty:1,unit:'项',price:otherFee,subtotal:otherFee});
            
            if (oldData.length > 0) {
              window.initDynamicFeeTable('feeTableContainer', oldData);
            } else {
              ensureFeeTableInitialized();
            }
          }
        }, 600);
        return result;
      };
      window.openEditWork._hooked = true;
    }
  }

  /* 兼容旧的自动计算人工费函数 */
  const _origCalcAutoLaborFee = window.calcAutoLaborFee;
  window.calcAutoLaborFee = function() {
    if (_origCalcAutoLaborFee) {
      _origCalcAutoLaborFee();
    }
    setTimeout(function() {
      const tbody = document.getElementById('feeTableContainer-tbody');
      if (tbody) {
        calcFeeTotal('feeTableContainer');
      }
    }, 50);
  };

  /* ---------- 9. MutationObserver 监听DOM变化，自动初始化 ---------- */
  function setupMutationObserver() {
    const observer = new MutationObserver(function(mutations) {
      const container = document.getElementById('feeTableContainer');
      if (container && !container.querySelector('.dynamic-fee-table')) {
        if (document.getElementById('workForm') && getComputedStyle(container.closest('.tab-pane') || document.body).display !== 'none') {
          ensureFeeTableInitialized();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* ---------- 10. 轮询检查（兜底保障） ---------- */
  function startPollingCheck() {
    setInterval(function() {
      const container = document.getElementById('feeTableContainer');
      if (container && !container.querySelector('.dynamic-fee-table')) {
        const workForm = document.getElementById('workForm');
        if (workForm) {
          const tabPane = workForm.closest('.tab-pane');
          if (!tabPane || tabPane.classList.contains('active')) {
            ensureFeeTableInitialized();
          }
        }
      }
    }, 1000);
  }

  /* ---------- 8. 重写模板页的"使用"按钮，跳转到新建工单并填充 ---------- */
  let _origApplyTemplateSaved = null;
  function hookApplyTemplate() {
    if (_origApplyTemplateSaved) return;
    if (typeof window.applyTemplate !== 'function') {
      setTimeout(hookApplyTemplate, 200);
      return;
    }
    _origApplyTemplateSaved = window.applyTemplate;
    window.applyTemplate = function(templateId) {
      if (typeof window.switchTab === 'function') {
        window.switchTab('tab-work');
      }
      setTimeout(function() {
        if (typeof window.openNewWork === 'function') {
          window.openNewWork();
        }
        setTimeout(function() {
          if (typeof window.applyWorkTemplate === 'function') {
            window.applyWorkTemplate(templateId);
          }
        }, 500);
      }, 200);
    };
  }

  /* ---------- 初始化 ---------- */
  function init() {
    setupFormEnhancements();
    hookOpenFunctions();
    hookApplyTemplate();
    setupMutationObserver();
    startPollingCheck();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js?v=20260715-v20').catch(function(err) {
          console.warn('SW 注册失败:', err);
        });
      });
    }

    if (typeof window.updateMobileLayout === 'function') {
      window.addEventListener('resize', window.updateMobileLayout);
      setTimeout(window.updateMobileLayout, 500);
    }
    
    setTimeout(function() {
      ensureFeeTableInitialized();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  window.CustomUtils = {
    initDynamicFeeTable: window.initDynamicFeeTable,
    addFeeRow: window.addFeeRow,
    removeFeeRow: window.removeFeeRow,
    calcFeeRow: window.calcFeeRow,
    calcFeeTotal: window.calcFeeTotal,
    calcWorkTotal: window.calcWorkTotal,
    loadFeeTableData: window.loadFeeTableData,
    getFeeTableData: window.getFeeTableData,
    toggleInvoiceStatus: window.toggleInvoiceStatus,
    createInvoiceToggle: window.createInvoiceToggle,
    renderCustomerReceivableList: window.renderCustomerReceivableList,
    loadCustomerReceivable: window.loadCustomerReceivable,
    convertTableToMobileCards: window.convertTableToMobileCards,
    restoreTableFromMobileCards: window.restoreTableFromMobileCards,
    updateMobileLayout: window.updateMobileLayout,
    updateWorkTotalDisplay: updateWorkTotalDisplay,
    setupFormEnhancements: setupFormEnhancements,
    ensureFeeTableInitialized: ensureFeeTableInitialized,
    hookOpenFunctions: hookOpenFunctions,
    isMobile: isMobile
  };

})();

(function() {
  'use strict';

  const STAGE_MAP = {
    preparation: { label: '准备阶段', color: 'secondary' },
    material_prep: { label: '材料筹备', color: 'warning' },
    in_progress: { label: '施工中', color: 'primary' },
    completed: { label: '施工完成', color: 'purple' },
    acceptance: { label: '验收中', color: 'info' },
    settled: { label: '已结算', color: 'success' }
  };

  const EXPENSE_TYPES = {
    material: { label: '材料采购', icon: 'bi-box-seam' },
    tool: { label: '工具', icon: 'bi-tools' },
    equipment_rental: { label: '设备租赁', icon: 'bi-device-hdd' },
    transport: { label: '运输', icon: 'bi-truck' },
    meal: { label: '餐费', icon: 'bi-cup-hot' },
    accommodation: { label: '住宿', icon: 'bi-house' },
    entertainment: { label: '接待', icon: 'bi-people' },
    other: { label: '其他', icon: 'bi-three-dots' }
  };

  const SALARY_TYPES = {
    hourly: { label: '计时', icon: 'bi-clock' },
    daily: { label: '计日', icon: 'bi-calendar-day' },
    piece: { label: '计件', icon: 'bi-grid-3x3' },
    advance: { label: '预支', icon: 'bi-cash' },
    bonus: { label: '奖金', icon: 'bi-gift' }
  };

  let projectViewMode = 'card';
  let currentProjectId = null;
  let currentProjectDetailTab = 'overview';

  function fmtMoney(val) {
    const num = parseFloat(val) || 0;
    return '¥' + num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function fmtMoney2(val) {
    const num = parseFloat(val) || 0;
    return '¥' + num.toFixed(2);
  }

  function getStageBadge(stage) {
    const s = STAGE_MAP[stage] || { label: stage || '未知', color: 'secondary' };
    return `<span class="badge bg-${s.color}">${s.label}</span>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- 1. 项目列表页增强 ---------- */
  function initProjectListView() {
    const tabProjects = document.getElementById('tab-projects');
    if (!tabProjects || tabProjects._enhanced) return;

    // 隐藏原有的表格
    const tableCard = tabProjects.querySelector('.card.shadow-sm');
    if (tableCard) {
      tableCard.style.display = 'none';
    }

    // 创建卡片容器
    const cardContainer = document.createElement('div');
    cardContainer.id = 'projectsCardContainer';
    cardContainer.className = 'project-card-grid';

    if (tableCard) {
      tableCard.parentNode.insertBefore(cardContainer, tableCard);
    } else {
      tabProjects.querySelector('.container.py-3')?.appendChild(cardContainer);
    }

    tabProjects._enhanced = true;

    const _origLoadProjects = window.loadProjects;
    if (_origLoadProjects && !_origLoadProjects._hooked) {
      window.loadProjects = function() {
        const result = _origLoadProjects.apply(this, arguments);
        setTimeout(function() {
          renderProjectCards();
        }, 50);
        return result;
      };
      window.loadProjects._hooked = true;
    }
  }

  window.setProjectViewMode = function(mode) {
    projectViewMode = mode;
    localStorage.setItem('projectViewMode', mode);
    applyProjectViewMode();
  };

  function applyProjectViewMode() {
    const tabProjects = document.getElementById('tab-projects');
    if (!tabProjects) return;

    const tableCard = tabProjects.querySelector('.card.shadow-sm');
    const cardContainer = document.getElementById('projectsCardContainer');
    const btns = tabProjects.querySelectorAll('.btn-group .btn');

    if (projectViewMode === 'card') {
      if (tableCard) tableCard.style.display = 'none';
      if (cardContainer) cardContainer.style.display = '';
      btns.forEach(b => {
        b.classList.toggle('active', b.textContent.includes('grid') || b.querySelector('.bi-grid-fill'));
      });
    } else {
      if (tableCard) tableCard.style.display = '';
      if (cardContainer) cardContainer.style.display = 'none';
      btns.forEach(b => {
        b.classList.toggle('active', b.textContent.includes('list') || b.querySelector('.bi-list-ul'));
      });
    }

    const viewBtns = tabProjects.querySelectorAll('.btn-group.btn-group-sm .btn');
    if (viewBtns.length >= 2) {
      viewBtns[0].classList.toggle('active', projectViewMode === 'card');
      viewBtns[1].classList.toggle('active', projectViewMode === 'table');
    }
  }

  function renderProjectCards() {
    const tbody = document.getElementById('projectsTableBody');
    const cardContainer = document.getElementById('projectsCardContainer');
    if (!tbody || !cardContainer) return;

    const statusMap = {pending: '待启动', in_progress: '进行中', completed: '已完成', settled: '已结算', cancelled: '已取消'};
    const statusClass = {pending: 'bg-secondary', in_progress: 'bg-primary', completed: 'bg-success', settled: 'bg-info', cancelled: 'bg-danger'};

    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0 || rows[0].querySelector('td[colspan]')) {
      cardContainer.innerHTML = '<div class="text-center text-muted py-5">暂无项目</div>';
      return;
    }

    const cards = [];
    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 8) return;

      const projectNo = tds[0].textContent.trim();
      const name = tds[1].textContent.trim();
      const customer = tds[2].textContent.trim();
      const type = tds[3].textContent.trim();
      const statusBadge = tds[4].innerHTML;
      const amount = tds[5].textContent.trim();
      const manager = tds[6].textContent.trim();
      const editBtn = tds[7].querySelector('button[onclick*="editProject"]');
      const deleteBtn = tds[7].querySelector('button[onclick*="deleteProject"]');
      const editOnclick = editBtn ? editBtn.getAttribute('onclick') : '';
      const deleteOnclick = deleteBtn ? deleteBtn.getAttribute('onclick') : '';
      const projectIdMatch = editOnclick.match(/editProject\((\d+)\)/);
      const projectId = projectIdMatch ? projectIdMatch[1] : '';

      const progress = Math.floor(Math.random() * 80) + 10;
      const stage = 'in_progress';

      cards.push(`
        <div class="project-card" onclick="openProjectDetail(${projectId})">
          <div class="project-card-header">
            <div class="project-card-title-row">
              <h6 class="project-card-title">${escapeHtml(name)}</h6>
              ${statusBadge}
            </div>
            <div class="project-card-no"><i class="bi bi-hash"></i> ${projectNo}</div>
          </div>
          <div class="project-card-body">
            <div class="project-card-field">
              <i class="bi bi-people"></i>
              <span>${escapeHtml(customer) || '-'}</span>
            </div>
            <div class="project-card-field">
              <i class="bi bi-geo-alt"></i>
              <span class="text-truncate">${escapeHtml(type) || '-'}</span>
            </div>
            <div class="project-card-field">
              <i class="bi bi-person-badge"></i>
              <span>${escapeHtml(manager) || '-'}</span>
            </div>
            <div class="project-progress">
              <div class="project-progress-label">
                <span>施工进度</span>
                <span class="fw-semibold">${progress}%</span>
              </div>
              <div class="progress" style="height:6px">
                <div class="progress-bar" style="width:${progress}%"></div>
              </div>
            </div>
          </div>
          <div class="project-card-footer">
            <div class="project-card-amount">
              <div class="amount-label">合同金额</div>
              <div class="amount-value">${amount}</div>
            </div>
            <div class="project-card-actions" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-outline-primary" onclick="${editOnclick}">编辑</button>
              <button class="btn btn-sm btn-outline-danger" onclick="${deleteOnclick}">删除</button>
            </div>
          </div>
        </div>
      `);
    });

    cardContainer.innerHTML = cards.join('');
  }

  /* ---------- 2. 项目详情页 ---------- */
  window.openProjectDetail = function(projectId) {
    currentProjectId = projectId;
    currentProjectDetailTab = 'overview';
    showProjectDetailView();
    loadProjectDetail(projectId);
  };

  window.backToProjectList = function() {
    hideProjectDetailView();
    currentProjectId = null;
  };

  function showProjectDetailView() {
    const tabProjects = document.getElementById('tab-projects');
    if (!tabProjects) return;

    let detailView = document.getElementById('projectDetailView');
    if (!detailView) {
      detailView = document.createElement('div');
      detailView.id = 'projectDetailView';
      detailView.className = 'project-detail-view';
      tabProjects.querySelector('.container.py-3').appendChild(detailView);
    }

    const listElements = tabProjects.querySelectorAll('.container.py-3 > *:not(#projectDetailView)');
    listElements.forEach(el => el.style.display = 'none');

    detailView.style.display = '';
  }

  function hideProjectDetailView() {
    const tabProjects = document.getElementById('tab-projects');
    if (!tabProjects) return;

    const detailView = document.getElementById('projectDetailView');
    if (detailView) detailView.style.display = 'none';

    const listElements = tabProjects.querySelectorAll('.container.py-3 > *:not(#projectDetailView)');
    listElements.forEach(el => el.style.display = '');
  }

  function loadProjectDetail(projectId) {
    const detailView = document.getElementById('projectDetailView');
    if (!detailView) return;

    detailView.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <div class="mt-2 text-muted">加载中...</div>
      </div>
    `;

    apiFetch('/api/projects/' + projectId).then(r => {
      if (r.error) {
        detailView.innerHTML = `<div class="alert alert-danger">加载失败：${r.error}</div>`;
        return;
      }
      const project = r.project || r;
      renderProjectDetail(project);
    }).catch(() => {
      detailView.innerHTML = '<div class="alert alert-danger">加载失败</div>';
    });
  }

  function renderProjectDetail(project) {
    const detailView = document.getElementById('projectDetailView');
    if (!detailView) return;

    const stage = project.project_stage || project.stage || 'preparation';
    const stageInfo = STAGE_MAP[stage] || { label: '未知', color: 'secondary' };

    detailView.innerHTML = `
      <div class="project-detail-header">
        <button class="btn btn-outline-secondary btn-sm" onclick="backToProjectList()">
          <i class="bi bi-arrow-left"></i> 返回
        </button>
        <div class="project-detail-title-row">
          <h5 class="mb-0">${escapeHtml(project.name)}</h5>
          <span class="badge bg-${stageInfo.color}">${stageInfo.label}</span>
        </div>
        <div class="project-detail-actions">
          <button class="btn btn-sm btn-outline-primary" onclick="editProject(${project.id})">
            <i class="bi bi-pencil"></i> 编辑
          </button>
          <button class="btn btn-sm btn-outline-warning" onclick="showProjectStageModal(${project.id})">
            <i class="bi bi-arrow-right-circle"></i> 阶段更新
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteProject(${project.id})">
            <i class="bi bi-trash"></i> 删除
          </button>
        </div>
      </div>

      <div class="project-detail-tabs">
        <button class="project-tab-btn ${currentProjectDetailTab === 'overview' ? 'active' : ''}" onclick="switchProjectDetailTab('overview')">
          <i class="bi bi-house"></i> 概览
        </button>
        <button class="project-tab-btn ${currentProjectDetailTab === 'records' ? 'active' : ''}" onclick="switchProjectDetailTab('records')">
          <i class="bi bi-clipboard-check"></i> 施工记录
        </button>
        <button class="project-tab-btn ${currentProjectDetailTab === 'expenses' ? 'active' : ''}" onclick="switchProjectDetailTab('expenses')">
          <i class="bi bi-receipt-cutoff"></i> 费用开支
        </button>
        <button class="project-tab-btn ${currentProjectDetailTab === 'salaries' ? 'active' : ''}" onclick="switchProjectDetailTab('salaries')">
          <i class="bi bi-cash-coin"></i> 工资管理
        </button>
      </div>

      <div class="project-detail-content">
        <div id="projectTabOverview" class="project-tab-pane ${currentProjectDetailTab === 'overview' ? 'active' : ''}"></div>
        <div id="projectTabRecords" class="project-tab-pane ${currentProjectDetailTab === 'records' ? 'active' : ''}"></div>
        <div id="projectTabExpenses" class="project-tab-pane ${currentProjectDetailTab === 'expenses' ? 'active' : ''}"></div>
        <div id="projectTabSalaries" class="project-tab-pane ${currentProjectDetailTab === 'salaries' ? 'active' : ''}"></div>
      </div>
    `;

    renderProjectOverview(project);
  }

  window.switchProjectDetailTab = function(tab) {
    currentProjectDetailTab = tab;

    document.querySelectorAll('.project-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(tabNameToLabel(tab)) || btn.getAttribute('onclick')?.includes(tab));
    });

    const tabBtns = document.querySelectorAll('.project-detail-tabs .project-tab-btn');
    const tabNames = ['overview', 'records', 'expenses', 'salaries'];
    tabBtns.forEach((btn, idx) => {
      btn.classList.toggle('active', tabNames[idx] === tab);
    });

    document.querySelectorAll('.project-tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const paneId = 'projectTab' + tab.charAt(0).toUpperCase() + tab.slice(1);
    const pane = document.getElementById(paneId);
    if (pane) pane.classList.add('active');

    if (tab === 'records') loadProjectRecords();
    if (tab === 'expenses') loadProjectExpenses();
    if (tab === 'salaries') loadProjectSalaries();
  };

  function tabNameToLabel(tab) {
    const map = { overview: '概览', records: '施工记录', expenses: '费用开支', salaries: '工资管理' };
    return map[tab] || tab;
  }

  function renderProjectOverview(project) {
    const pane = document.getElementById('projectTabOverview');
    if (!pane) return;

    const contractAmount = parseFloat(project.contract_amount) || 0;
    const budgetAmount = parseFloat(project.budget_amount) || 0;
    const actualAmount = parseFloat(project.actual_amount) || 0;
    const profit = contractAmount - actualAmount;

    pane.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header"><h6 class="mb-0"><i class="bi bi-info-circle me-1"></i>项目基本信息</h6></div>
            <div class="card-body">
              <div class="info-row"><span class="info-label">项目编号</span><span class="info-value"><code>${project.project_no || '-'}</code></span></div>
              <div class="info-row"><span class="info-label">项目类型</span><span class="info-value">${escapeHtml(project.project_type) || '-'}</span></div>
              <div class="info-row"><span class="info-label">客户名称</span><span class="info-value">${escapeHtml(project.customer_name) || '-'}</span></div>
              <div class="info-row"><span class="info-label">项目负责人</span><span class="info-value">${escapeHtml(project.manager) || '-'}</span></div>
              <div class="info-row"><span class="info-label">项目地址</span><span class="info-value">${escapeHtml(project.project_address) || '-'}</span></div>
              <div class="info-row"><span class="info-label">联系人</span><span class="info-value">${escapeHtml(project.contact_name) || '-'} ${project.contact_phone ? '(' + project.contact_phone + ')' : ''}</span></div>
              <div class="info-row"><span class="info-label">计划工期</span><span class="info-value">${project.start_date || '-'} ~ ${project.end_date || '-'}</span></div>
              <div class="info-row"><span class="info-label">合同编号</span><span class="info-value">${escapeHtml(project.contract_no) || '-'}</span></div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header"><h6 class="mb-0"><i class="bi bi-wallet2 me-1"></i>收支概览</h6></div>
            <div class="card-body">
              <div class="finance-grid">
                <div class="finance-item">
                  <div class="finance-label">合同金额</div>
                  <div class="finance-value text-primary">${fmtMoney(contractAmount)}</div>
                </div>
                <div class="finance-item">
                  <div class="finance-label">预算金额</div>
                  <div class="finance-value">${fmtMoney(budgetAmount)}</div>
                </div>
                <div class="finance-item">
                  <div class="finance-label">实际支出</div>
                  <div class="finance-value text-danger">${fmtMoney(actualAmount)}</div>
                </div>
                <div class="finance-item">
                  <div class="finance-label">预估毛利</div>
                  <div class="finance-value ${profit >= 0 ? 'text-success' : 'text-danger'}">${fmtMoney(profit)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header"><h6 class="mb-0"><i class="bi bi-bar-chart-line me-1"></i>项目进度</h6></div>
            <div class="card-body">
              <div class="stage-timeline">
                ${Object.entries(STAGE_MAP).map(([key, val], idx) => {
                  const stageKeys = Object.keys(STAGE_MAP);
                  const currentIdx = stageKeys.indexOf(project.project_stage || project.stage);
                  const isActive = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  return `
                    <div class="stage-item ${isActive ? 'done' : ''} ${isCurrent ? 'current' : ''}">
                      <div class="stage-dot"></div>
                      <div class="stage-content">
                        <div class="stage-name">${val.label}</div>
                      </div>
                      ${idx < stageKeys.length - 1 ? '<div class="stage-line"></div>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header"><h6 class="mb-0"><i class="bi bi-people me-1"></i>参与人员</h6></div>
            <div class="card-body">
              <div class="staff-list">
                ${project.manager ? `
                  <div class="staff-item">
                    <div class="staff-avatar">${project.manager.charAt(0)}</div>
                    <div class="staff-info">
                      <div class="staff-name">${escapeHtml(project.manager)}</div>
                      <div class="staff-role">项目负责人</div>
                    </div>
                  </div>
                ` : '<div class="text-muted small">暂无人员信息</div>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ---------- 施工记录 ---------- */
  function loadProjectRecords() {
    const pane = document.getElementById('projectTabRecords');
    if (!pane || !currentProjectId) return;

    pane.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">施工工单列表</h6>
        <button class="btn btn-primary btn-sm" onclick="openProjectRecordModal()">
          <i class="bi bi-plus-lg me-1"></i>新增施工工单
        </button>
      </div>
      <div class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <span class="ms-2 text-muted">加载中...</span>
      </div>
    `;

    apiFetch('/api/projects/' + currentProjectId + '/records').then(r => {
      if (r.error) {
        pane.innerHTML = `<div class="alert alert-danger">加载失败：${r.error}</div>`;
        return;
      }
      renderProjectRecords(r.records || r || []);
    }).catch(() => {
      pane.innerHTML = '<div class="alert alert-danger">加载失败</div>';
    });
  }

  function renderProjectRecords(records) {
    const pane = document.getElementById('projectTabRecords');
    if (!pane) return;

    if (!records || records.length === 0) {
      pane.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0">施工工单列表</h6>
          <button class="btn btn-primary btn-sm" onclick="openProjectRecordModal()">
            <i class="bi bi-plus-lg me-1"></i>新增施工工单
          </button>
        </div>
        <div class="text-center text-muted py-5">暂无施工记录</div>
      `;
      return;
    }

    pane.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">施工工单列表 (${records.length})</h6>
        <button class="btn btn-primary btn-sm" onclick="openProjectRecordModal()">
          <i class="bi bi-plus-lg me-1"></i>新增施工工单
        </button>
      </div>
      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead><tr><th>工单号</th><th>类型</th><th>客户</th><th>地址</th><th>负责人</th><th>状态</th><th>金额</th><th>操作</th></tr></thead>
              <tbody>
                ${records.map(r => `
                  <tr>
                    <td><code class="small">${r.record_no || r.id}</code></td>
                    <td>${escapeHtml(r.work_subtype || r.type || '-')}</td>
                    <td>${escapeHtml(r.customer_name || '-')}</td>
                    <td class="text-truncate" style="max-width:200px">${escapeHtml(r.work_address || '-')}</td>
                    <td>${escapeHtml(r.worker_name || r.manager || '-')}</td>
                    <td><span class="badge bg-secondary">${r.status || '进行中'}</span></td>
                    <td>${fmtMoney(r.total_amount || r.amount || 0)}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-primary" onclick="openEditWork(${r.id})">查看</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  window.openProjectRecordModal = function() {
    if (typeof window.openNewWork === 'function') {
      window.openNewWork('construction');
      setTimeout(() => {
        const projIdInput = document.querySelector('#workForm input[name="project_id"]');
        if (projIdInput) projIdInput.value = currentProjectId;
      }, 300);
    } else {
      alert('请先升级系统以支持施工工单功能');
    }
  };

  /* ---------- 费用开支 ---------- */
  let projectExpensePage = 1;

  function loadProjectExpenses() {
    const pane = document.getElementById('projectTabExpenses');
    if (!pane || !currentProjectId) return;

    pane.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">费用开支</h6>
        <button class="btn btn-primary btn-sm" onclick="openProjectExpenseModal()">
          <i class="bi bi-plus-lg me-1"></i>新增费用
        </button>
      </div>
      <div class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <span class="ms-2 text-muted">加载中...</span>
      </div>
    `;

    apiFetch('/api/projects/' + currentProjectId + '/expenses').then(r => {
      if (r.error) {
        pane.innerHTML = `<div class="alert alert-danger">加载失败：${r.error}</div>`;
        return;
      }
      renderProjectExpenses(r.records || r || []);
    }).catch(() => {
      pane.innerHTML = '<div class="alert alert-danger">加载失败</div>';
    });
  }

  function renderProjectExpenses(expenses) {
    const pane = document.getElementById('projectTabExpenses');
    if (!pane) return;

    let total = 0;
    const typeStats = {};
    (expenses || []).forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      total += amt;
      typeStats[e.expense_type || e.type || 'other'] = (typeStats[e.expense_type || e.type || 'other'] || 0) + amt;
    });

    pane.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">费用开支</h6>
        <button class="btn btn-primary btn-sm" onclick="openProjectExpenseModal()">
          <i class="bi bi-plus-lg me-1"></i>新增费用
        </button>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">总支出</div>
            <div class="stat-value text-danger">${fmtMoney(total)}</div>
          </div>
        </div>
        ${Object.entries(typeStats).slice(0, 3).map(([type, amt]) => {
          const info = EXPENSE_TYPES[type] || { label: type, icon: 'bi-circle' };
          return `
            <div class="col-6 col-md-3">
              <div class="stat-card">
                <div class="stat-label"><i class="bi ${info.icon} me-1"></i>${info.label}</div>
                <div class="stat-value">${fmtMoney(amt)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead><tr><th>日期</th><th>类型</th><th>名称/说明</th><th>金额</th><th>经办人</th><th>操作</th></tr></thead>
              <tbody>
                ${(expenses || []).length === 0 ? '<tr><td colspan="6" class="text-center py-4 text-muted">暂无费用记录</td></tr>' :
                  expenses.map(e => {
                    const type = e.expense_type || e.type || 'other';
                    const typeInfo = EXPENSE_TYPES[type] || { label: type, icon: 'bi-circle' };
                    return `
                      <tr>
                        <td>${e.expense_date || e.date || '-'}</td>
                        <td><i class="bi ${typeInfo.icon} me-1"></i>${typeInfo.label}</td>
                        <td class="text-truncate" style="max-width:250px">${escapeHtml(e.name || e.description || '-')}</td>
                        <td class="text-danger">${fmtMoney(e.amount || 0)}</td>
                        <td>${escapeHtml(e.handler || e.person || '-')}</td>
                        <td>
                          <button class="btn btn-sm btn-outline-primary" onclick="editProjectExpense(${e.id}, ${JSON.stringify(e).replace(/"/g, '&quot;')})">编辑</button>
                          <button class="btn btn-sm btn-outline-danger" onclick="deleteProjectExpense(${e.id})">删除</button>
                        </td>
                      </tr>
                    `;
                  }).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  let _expenseModal = null;

  window.openProjectExpenseModal = function(expenseData) {
    if (!_expenseModal) {
      const modalHtml = `
        <div class="modal fade" id="projectExpenseModal" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="expenseModalTitle">新增费用</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="projectExpenseForm">
                  <input type="hidden" id="expenseId">
                  <div class="mb-3">
                    <label class="form-label">费用类型</label>
                    <select class="form-select" id="expenseType">
                      ${Object.entries(EXPENSE_TYPES).map(([key, val]) =>
                        `<option value="${key}">${val.label}</option>`
                      ).join('')}
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">费用名称/说明</label>
                    <input type="text" class="form-control" id="expenseName" placeholder="请输入费用说明">
                  </div>
                  <div class="row g-3 mb-3">
                    <div class="col-md-6">
                      <label class="form-label">日期</label>
                      <input type="date" class="form-control" id="expenseDate">
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">金额</label>
                      <input type="number" class="form-control" id="expenseAmount" step="0.01" min="0">
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">经办人</label>
                    <input type="text" class="form-control" id="expenseHandler" placeholder="经办人姓名">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">备注</label>
                    <textarea class="form-control" id="expenseRemark" rows="3"></textarea>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" onclick="saveProjectExpense()">保存</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      _expenseModal = new bootstrap.Modal(document.getElementById('projectExpenseModal'));
    }

    document.getElementById('expenseId').value = expenseData?.id || '';
    document.getElementById('expenseType').value = expenseData?.expense_type || expenseData?.type || 'material';
    document.getElementById('expenseName').value = expenseData?.name || expenseData?.description || '';
    document.getElementById('expenseDate').value = expenseData?.expense_date || expenseData?.date || new Date().toISOString().split('T')[0];
    document.getElementById('expenseAmount').value = expenseData?.amount || '';
    document.getElementById('expenseHandler').value = expenseData?.handler || expenseData?.person || '';
    document.getElementById('expenseRemark').value = expenseData?.remark || '';
    document.getElementById('expenseModalTitle').textContent = expenseData?.id ? '编辑费用' : '新增费用';
    _expenseModal.show();
  };

  window.editProjectExpense = function(id, data) {
    openProjectExpenseModal(data);
  };

  window.saveProjectExpense = function() {
    const id = document.getElementById('expenseId').value;
    const data = {
      expense_type: document.getElementById('expenseType').value,
      name: document.getElementById('expenseName').value,
      expense_date: document.getElementById('expenseDate').value,
      amount: parseFloat(document.getElementById('expenseAmount').value) || 0,
      handler: document.getElementById('expenseHandler').value,
      remark: document.getElementById('expenseRemark').value
    };

    if (!data.name) { alert('请输入费用名称'); return; }
    if (!data.amount || data.amount <= 0) { alert('请输入有效金额'); return; }

    const url = id ? `/api/projects/${currentProjectId}/expenses/${id}` : `/api/projects/${currentProjectId}/expenses`;
    const method = id ? 'PUT' : 'POST';

    apiFetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => {
      if (!r.error) {
        _expenseModal.hide();
        loadProjectExpenses();
        loadProjectDetail(currentProjectId);
      } else {
        alert('保存失败：' + r.error);
      }
    });
  };

  window.deleteProjectExpense = function(id) {
    if (!confirm('确定删除这笔费用吗？')) return;
    apiFetch(`/api/projects/${currentProjectId}/expenses/${id}`, { method: 'DELETE' }).then(r => {
      if (!r.error) {
        loadProjectExpenses();
        loadProjectDetail(currentProjectId);
      } else {
        alert('删除失败：' + r.error);
      }
    });
  };

  /* ---------- 工资管理 ---------- */
  let salaryStaffFilter = '';

  function loadProjectSalaries() {
    const pane = document.getElementById('projectTabSalaries');
    if (!pane || !currentProjectId) return;

    pane.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">工资管理</h6>
        <button class="btn btn-primary btn-sm" onclick="openProjectSalaryModal()">
          <i class="bi bi-plus-lg me-1"></i>新增工资记录
        </button>
      </div>
      <div class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <span class="ms-2 text-muted">加载中...</span>
      </div>
    `;

    apiFetch('/api/projects/' + currentProjectId + '/salaries').then(r => {
      if (r.error) {
        pane.innerHTML = `<div class="alert alert-danger">加载失败：${r.error}</div>`;
        return;
      }
      renderProjectSalaries(r.records || r || []);
    }).catch(() => {
      pane.innerHTML = '<div class="alert alert-danger">加载失败</div>';
    });
  }

  function renderProjectSalaries(salaries) {
    const pane = document.getElementById('projectTabSalaries');
    if (!pane) return;

    let total = 0, paid = 0, unpaid = 0, advance = 0;
    const staffSet = new Set();
    (salaries || []).forEach(s => {
      const amt = parseFloat(s.amount) || 0;
      total += amt;
      staffSet.add(s.staff_name || s.person || '');
      if (s.salary_type === 'advance' || s.type === 'advance') {
        advance += amt;
      }
      if (s.status === 'paid') {
        paid += amt;
      } else {
        unpaid += amt;
      }
    });

    const staffList = Array.from(staffSet).filter(s => s);

    pane.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h6 class="mb-0">工资管理</h6>
        <div class="d-flex gap-2">
          <select class="form-select form-select-sm" style="max-width:150px" id="salaryStaffFilter" onchange="filterProjectSalaries()">
            <option value="">全部人员</option>
            ${staffList.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" onclick="openProjectSalaryModal()">
            <i class="bi bi-plus-lg me-1"></i>新增
          </button>
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">总工资</div>
            <div class="stat-value text-primary">${fmtMoney(total)}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">已发放</div>
            <div class="stat-value text-success">${fmtMoney(paid)}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">未发放</div>
            <div class="stat-value text-warning">${fmtMoney(unpaid)}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">预支</div>
            <div class="stat-value text-info">${fmtMoney(advance)}</div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead><tr><th>日期</th><th>人员</th><th>类型</th><th>说明</th><th>金额</th><th>状态</th><th>操作</th></tr></thead>
              <tbody id="salaryTableBody">
                ${(salaries || []).length === 0 ? '<tr><td colspan="7" class="text-center py-4 text-muted">暂无工资记录</td></tr>' :
                  renderSalaryRows(salaries)
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    window._allProjectSalaries = salaries || [];
  }

  function renderSalaryRows(salaries) {
    return salaries.map(s => {
      const type = s.salary_type || s.type || 'hourly';
      const typeInfo = SALARY_TYPES[type] || { label: type, icon: 'bi-circle' };
      const isPaid = s.status === 'paid';
      return `
        <tr data-staff="${escapeHtml(s.staff_name || s.person || '')}">
          <td>${s.salary_date || s.date || '-'}</td>
          <td>${escapeHtml(s.staff_name || s.person || '-')}</td>
          <td><i class="bi ${typeInfo.icon} me-1"></i>${typeInfo.label}</td>
          <td class="text-truncate" style="max-width:200px">${escapeHtml(s.description || s.remark || '-')}</td>
          <td>${fmtMoney(s.amount || 0)}</td>
          <td><span class="badge ${isPaid ? 'bg-success' : 'bg-warning'}">${isPaid ? '已发放' : '未发放'}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="editProjectSalary(${s.id}, ${JSON.stringify(s).replace(/"/g, '&quot;')})">编辑</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteProjectSalary(${s.id})">删除</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.filterProjectSalaries = function() {
    const filter = document.getElementById('salaryStaffFilter')?.value || '';
    const tbody = document.getElementById('salaryTableBody');
    if (!tbody || !window._allProjectSalaries) return;

    const filtered = filter
      ? window._allProjectSalaries.filter(s => (s.staff_name || s.person || '') === filter)
      : window._allProjectSalaries;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">暂无记录</td></tr>';
    } else {
      tbody.innerHTML = renderSalaryRows(filtered);
    }
  };

  let _salaryModal = null;

  window.openProjectSalaryModal = function(salaryData) {
    if (!_salaryModal) {
      const modalHtml = `
        <div class="modal fade" id="projectSalaryModal" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="salaryModalTitle">新增工资记录</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="projectSalaryForm">
                  <input type="hidden" id="salaryId">
                  <div class="mb-3">
                    <label class="form-label">人员姓名</label>
                    <input type="text" class="form-control" id="salaryStaff" placeholder="请输入人员姓名">
                  </div>
                  <div class="row g-3 mb-3">
                    <div class="col-md-6">
                      <label class="form-label">工资类型</label>
                      <select class="form-select" id="salaryType">
                        ${Object.entries(SALARY_TYPES).map(([key, val]) =>
                          `<option value="${key}">${val.label}</option>`
                        ).join('')}
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">日期</label>
                      <input type="date" class="form-control" id="salaryDate">
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">金额</label>
                    <input type="number" class="form-control" id="salaryAmount" step="0.01" min="0">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">状态</label>
                    <select class="form-select" id="salaryStatus">
                      <option value="unpaid">未发放</option>
                      <option value="paid">已发放</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">说明/备注</label>
                    <textarea class="form-control" id="salaryRemark" rows="3"></textarea>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" onclick="saveProjectSalary()">保存</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      _salaryModal = new bootstrap.Modal(document.getElementById('projectSalaryModal'));
    }

    document.getElementById('salaryId').value = salaryData?.id || '';
    document.getElementById('salaryStaff').value = salaryData?.staff_name || salaryData?.person || '';
    document.getElementById('salaryType').value = salaryData?.salary_type || salaryData?.type || 'hourly';
    document.getElementById('salaryDate').value = salaryData?.salary_date || salaryData?.date || new Date().toISOString().split('T')[0];
    document.getElementById('salaryAmount').value = salaryData?.amount || '';
    document.getElementById('salaryStatus').value = salaryData?.status || 'unpaid';
    document.getElementById('salaryRemark').value = salaryData?.remark || salaryData?.description || '';
    document.getElementById('salaryModalTitle').textContent = salaryData?.id ? '编辑工资记录' : '新增工资记录';
    _salaryModal.show();
  };

  window.editProjectSalary = function(id, data) {
    openProjectSalaryModal(data);
  };

  window.saveProjectSalary = function() {
    const id = document.getElementById('salaryId').value;
    const data = {
      staff_name: document.getElementById('salaryStaff').value,
      salary_type: document.getElementById('salaryType').value,
      salary_date: document.getElementById('salaryDate').value,
      amount: parseFloat(document.getElementById('salaryAmount').value) || 0,
      status: document.getElementById('salaryStatus').value,
      remark: document.getElementById('salaryRemark').value
    };

    if (!data.staff_name) { alert('请输入人员姓名'); return; }
    if (!data.amount || data.amount <= 0) { alert('请输入有效金额'); return; }

    const url = id ? `/api/projects/${currentProjectId}/salaries/${id}` : `/api/projects/${currentProjectId}/salaries`;
    const method = id ? 'PUT' : 'POST';

    apiFetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => {
      if (!r.error) {
        _salaryModal.hide();
        loadProjectSalaries();
        loadProjectDetail(currentProjectId);
      } else {
        alert('保存失败：' + r.error);
      }
    });
  };

  window.deleteProjectSalary = function(id) {
    if (!confirm('确定删除这条工资记录吗？')) return;
    apiFetch(`/api/projects/${currentProjectId}/salaries/${id}`, { method: 'DELETE' }).then(r => {
      if (!r.error) {
        loadProjectSalaries();
        loadProjectDetail(currentProjectId);
      } else {
        alert('删除失败：' + r.error);
      }
    });
  };

  /* ---------- 阶段更新弹窗 ---------- */
  let _stageModal = null;

  window.showProjectStageModal = function(projectId) {
    if (!_stageModal) {
      const modalHtml = `
        <div class="modal fade" id="projectStageModal" tabindex="-1">
          <div class="modal-dialog modal-sm">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">更新项目阶段</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <label class="form-label">项目阶段</label>
                  <select class="form-select" id="stageSelect">
                    ${Object.entries(STAGE_MAP).map(([key, val]) =>
                      `<option value="${key}">${val.label}</option>`
                    ).join('')}
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" onclick="saveProjectStage()">确定</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      _stageModal = new bootstrap.Modal(document.getElementById('projectStageModal'));
    }
    _stageModal.show();
  };

  window.saveProjectStage = function() {
    const stage = document.getElementById('stageSelect').value;
    if (!currentProjectId) return;

    apiFetch(`/api/projects/${currentProjectId}/stage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_stage: stage })
    }).then(r => {
      if (!r.error) {
        _stageModal.hide();
        loadProjectDetail(currentProjectId);
        if (typeof window.loadProjects === 'function') window.loadProjects();
      } else {
        alert('更新失败：' + r.error);
      }
    });
  };

  /* ---------- 3. 底部+号菜单改造 ---------- */
  function initBottomPlusMenu() {
    const dockAdd = document.querySelector('.mobile-dock-item[data-tab="tab-work"]');
    if (!dockAdd || dockAdd._enhanced) return;

    dockAdd._enhanced = true;
    dockAdd.setAttribute('onclick', 'toggleBottomActionSheet()');

    const sheetHtml = `
      <div class="action-sheet-overlay" id="bottomActionSheet" onclick="closeBottomActionSheet(event)">
        <div class="action-sheet" onclick="event.stopPropagation()">
          <div class="action-sheet-header">新建</div>
          <div class="action-sheet-item" onclick="openNewRepairFromSheet()">
            <div class="action-sheet-icon repair"><i class="bi bi-wrench-adjustable"></i></div>
            <div class="action-sheet-label">新增维修工单</div>
          </div>
          <div class="action-sheet-item" onclick="openNewWorkFromSheet()">
            <div class="action-sheet-icon work"><i class="bi bi-tools"></i></div>
            <div class="action-sheet-label">新增施工工单</div>
          </div>
          <div class="action-sheet-item" onclick="openExpenseFromSheet()">
            <div class="action-sheet-icon expense"><i class="bi bi-receipt-cutoff"></i></div>
            <div class="action-sheet-label">新增费用开支</div>
          </div>
          <button class="action-sheet-cancel" onclick="closeBottomActionSheet()">取消</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', sheetHtml);
  }

  window.toggleBottomActionSheet = function() {
    const sheet = document.getElementById('bottomActionSheet');
    if (!sheet) return;
    sheet.classList.toggle('show');
  };

  window.closeBottomActionSheet = function(e) {
    if (e && e.target && !e.target.classList.contains('action-sheet-overlay')) {
      if (e.type === 'click' && e.target.closest('.action-sheet-item')) return;
    }
    const sheet = document.getElementById('bottomActionSheet');
    if (sheet) sheet.classList.remove('show');
  };

  window.openNewRepairFromSheet = function() {
    closeBottomActionSheet();
    if (typeof window.openNewWork === 'function') {
      window.openNewWork('repair');
    }
  };

  window.openNewWorkFromSheet = function() {
    closeBottomActionSheet();
    if (typeof window.openNewWork === 'function') {
      window.openNewWork('construction');
    }
  };

  window.openExpenseFromSheet = function() {
    closeBottomActionSheet();
    switchTab('tab-expenses');
    setTimeout(function() {
      const addBtn = document.querySelector('#tab-expenses .btn-primary');
      if (addBtn) addBtn.click();
    }, 300);
  };

  /* ---------- 4. 导航入口调整 ---------- */
  function adjustNavigation() {
    const navList = document.querySelector('#navMenu .navbar-nav');
    const businessItem = document.querySelector('#businessDropdown')?.closest('li');
    const manageDropdown = document.querySelector('#manageDropdown + .dropdown-menu');

    if (!navList || !businessItem || navList._projectNavReady) return;

    // 从管理菜单里移除项目管理
    const oldProjectItem = manageDropdown?.querySelector('a[onclick*="tab-projects"]')?.closest('li');
    if (oldProjectItem) oldProjectItem.remove();

    // 创建一级菜单"项目管理"
    const projectNavLi = document.createElement('li');
    projectNavLi.className = 'nav-item dropdown';
    projectNavLi.innerHTML = `
      <a class="nav-link" href="#" id="projectDropdown" role="button" data-bs-toggle="dropdown">
        <i class="bi bi-folder-symlink me-1"></i>项目管理
      </a>
      <ul class="dropdown-menu dropdown-menu-end ry-nav-menu">
        <li><h6 class="dropdown-header">项目</h6></li>
        <li><a class="dropdown-item" href="#" onclick="switchTab('tab-projects')"><i class="bi bi-list-ul me-2"></i>项目清单</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><h6 class="dropdown-header">快速新增</h6></li>
        <li><a class="dropdown-item" href="#" onclick="openNewWork('construction');"><i class="bi bi-tools me-2"></i>新增施工工单</a></li>
        <li><a class="dropdown-item" href="#" onclick="openProjectExpenseQuickAdd();"><i class="bi bi-receipt-cutoff me-2"></i>新增费用开支</a></li>
      </ul>
    `;

    // 插在"业务"后面
    businessItem.after(projectNavLi);

    // 更新公司标题
    const titleEl = document.getElementById('companyTitle');
    if (titleEl) titleEl.textContent = '瑞易工作台';

    navList._projectNavReady = true;
  }

  // 快速新增费用（不关联项目的通用开支）
  function openProjectExpenseQuickAdd() {
    switchTab('tab-projects');
    setTimeout(function() {
      const firstAddBtn = document.querySelector('.proj-quick-expense-btn');
      if (firstAddBtn) firstAddBtn.click();
    }, 300);
  }

  /* ---------- 5. Dashboard 项目卡片 ---------- */
  function initDashboardProjectsCard() {
    const dashContentRow = document.querySelector('.dash-content-row');
    if (!dashContentRow || dashContentRow._projectsCard) return;

    const card = document.createElement('div');
    card.className = 'dash-content-card';
    card.id = 'dashboardProjectsCard';
    card.innerHTML = `
      <div class="dash-content-header">
        <span class="dash-content-title"><i class="bi bi-folder2-open me-1"></i>进行中项目</span>
        <a class="dash-content-more" onclick="switchTab('tab-projects')">全部 <i class="bi bi-chevron-right"></i></a>
      </div>
      <div class="dash-content-body" id="dashboardProjectsList">
        <div class="text-muted small py-2 text-center">加载中...</div>
      </div>
    `;

    const firstCard = dashContentRow.querySelector('.dash-content-card');
    if (firstCard) {
      firstCard.parentNode.insertBefore(card, firstCard.nextSibling);
    } else {
      dashContentRow.appendChild(card);
    }

    dashContentRow._projectsCard = true;
    loadDashboardProjects();
  }

  function loadDashboardProjects() {
    const listEl = document.getElementById('dashboardProjectsList');
    if (!listEl) return;

    if (typeof apiFetch !== 'function') return;

    apiFetch('/api/projects?status=in_progress&per_page=3').then(r => {
      const records = r.records || r || [];
      if (!records || records.length === 0) {
        listEl.innerHTML = '<div class="text-muted small py-2 text-center">暂无进行中项目</div>';
        return;
      }

      const statusMap = {pending: '待启动', in_progress: '进行中', completed: '已完成', settled: '已结算'};
      const statusClass = {pending: 'bg-secondary', in_progress: 'bg-primary', completed: 'bg-success', settled: 'bg-info'};

      listEl.innerHTML = records.map(p => `
        <div class="dash-list-item" onclick="switchTab('tab-projects')" style="cursor:pointer">
          <div class="dash-list-icon dash-icon-cyan"><i class="bi bi-folder-symlink"></i></div>
          <div class="dash-list-main">
            <div class="dash-list-title">${escapeHtml(p.name)}</div>
            <div class="dash-list-sub">${escapeHtml(p.customer_name || '-')} · <span class="badge ${statusClass[p.status] || 'bg-secondary'}">${statusMap[p.status] || p.status}</span></div>
          </div>
        </div>
      `).join('');

      const countEl = document.getElementById('dsActiveProjects');
      if (countEl && r.total != null) {
        countEl.textContent = r.total;
      }
    }).catch(() => {
      listEl.innerHTML = '<div class="text-muted small py-2 text-center">加载失败</div>';
    });
  }

  /* ---------- 初始化 ---------- */
  var _projInitDone = false;
  function init() {
    if (!_isLoggedIn()) {
      setTimeout(init, 500);
      return;
    }
    if (_projInitDone) return;
    _projInitDone = true;

    const savedMode = localStorage.getItem('projectViewMode');
    if (savedMode) projectViewMode = savedMode;

    const observer = new MutationObserver(function() {
      if (_isLoggedIn()) {
        initProjectListView();
        initBottomPlusMenu();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      initProjectListView();
      initBottomPlusMenu();
      adjustNavigation();
      initDashboardProjectsCard();
    }, 500);

    const _origSwitchTab = window.switchTab;
    if (_origSwitchTab && !_origSwitchTab._projectHooked) {
      window.switchTab = function(tabId) {
        const result = _origSwitchTab.apply(this, arguments);
        if (tabId === 'tab-projects') {
          setTimeout(() => {
            initProjectListView();
            applyProjectViewMode();
          }, 100);
        }
        if (tabId === 'tab-dashboard') {
          setTimeout(loadDashboardProjects, 200);
        }
        return result;
      };
      window.switchTab._projectHooked = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 200);
  }

  /* ================================================
     项目施工记录 - 独立接口版本
     ================================================ */

  const WORK_TYPES = ['布管', '穿线', '设备安装', '设备调试', '系统测试', '其他'];

  let projectRecordsPage = 1;
  const projectRecordsPerPage = 20;
  let _projectRecordModal = null;

  function loadProjectRecords() {
    const pane = document.getElementById('projectTabRecords');
    if (!pane || !currentProjectId) return;

    pane.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h6 class="mb-0">施工记录</h6>
        <button class="btn btn-primary btn-sm" onclick="openProjectRecordModal()">
          <i class="bi bi-plus-lg me-1"></i>新增施工记录
        </button>
      </div>
      <div class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <span class="ms-2 text-muted">加载中...</span>
      </div>
    `;

    fetchProjectRecords();
  }

  function fetchProjectRecords() {
    const pane = document.getElementById('projectTabRecords');
    if (!pane || !currentProjectId) return;

    apiFetch('/api/projects/' + currentProjectId + '/records?page=' + projectRecordsPage + '&per_page=' + projectRecordsPerPage).then(r => {
      if (r.error) {
        pane.innerHTML = `<div class="alert alert-danger">加载失败：${r.error}</div>`;
        return;
      }
      renderProjectRecords(r.list || r.records || r || [], r.total || 0, r.page || projectRecordsPage, r.per_page || projectRecordsPerPage);
    }).catch(() => {
      pane.innerHTML = '<div class="alert alert-danger">加载失败</div>';
    });
  }

  function renderProjectRecords(records, total, page, perPage) {
    const pane = document.getElementById('projectTabRecords');
    if (!pane) return;

    const totalPages = Math.ceil(total / perPage) || 1;

    if (!records || records.length === 0) {
      pane.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h6 class="mb-0">施工记录</h6>
          <button class="btn btn-primary btn-sm" onclick="openProjectRecordModal()">
            <i class="bi bi-plus-lg me-1"></i>新增施工记录
          </button>
        </div>
        <div class="text-center text-muted py-5">暂无施工记录</div>
      `;
      return;
    }

    let totalHours = 0;
    let totalFee = 0;
    records.forEach(r => {
      totalHours += parseFloat(r.work_hours) || 0;
      totalFee += parseFloat(r.total_fee) || 0;
    });

    pane.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h6 class="mb-0">施工记录 (${total})</h6>
        <button class="btn btn-primary btn-sm" onclick="openProjectRecordModal()">
          <i class="bi bi-plus-lg me-1"></i>新增施工记录
        </button>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">总记录数</div>
            <div class="stat-value text-primary">${total}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">总工时</div>
            <div class="stat-value">${totalHours.toFixed(1)}h</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">总费用</div>
            <div class="stat-value text-danger">${fmtMoney(totalFee)}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-label">本页记录</div>
            <div class="stat-value">${records.length}</div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead><tr><th>日期</th><th>施工类型</th><th>施工内容</th><th>人员</th><th>工时</th><th>总费用</th><th>操作</th></tr></thead>
              <tbody>
                ${records.map(r => `
                  <tr>
                    <td><code class="small">${r.work_date || '-'}</code></td>
                    <td><span class="badge bg-info">${escapeHtml(r.work_type || '-')}</span></td>
                    <td class="text-truncate" style="max-width:250px" title="${escapeHtml(r.work_content || '')}">${escapeHtml(r.work_content || '-')}</td>
                    <td>${escapeHtml(r.staff_names || '-')}</td>
                    <td class="text-center">${parseFloat(r.work_hours) || 0}h</td>
                    <td class="text-danger">${fmtMoney(r.total_fee || 0)}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-primary" onclick='editProjectRecord(${JSON.stringify(r).replace(/'/g, "&#39;")})'>编辑</button>
                      <button class="btn btn-sm btn-outline-danger" onclick="deleteProjectRecord(${r.id})">删除</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      ${totalPages > 1 ? `
        <div class="d-flex justify-content-between align-items-center mt-3">
          <div class="text-muted small">第 ${page} / ${totalPages} 页，共 ${total} 条</div>
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item ${page <= 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="goProjectRecordsPage(${page - 1}); return false;">上一页</a>
              </li>
              ${generatePageNumbers(page, totalPages).map(p => `
                <li class="page-item ${p === page ? 'active' : ''} ${p === '...' ? 'disabled' : ''}">
                  <a class="page-link" href="#" ${p === '...' ? '' : `onclick="goProjectRecordsPage(${p}); return false;"`}>${p}</a>
                </li>
              `).join('')}
              <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="goProjectRecordsPage(${page + 1}); return false;">下一页</a>
              </li>
            </ul>
          </nav>
        </div>
      ` : ''}
    `;
  }

  function generatePageNumbers(current, total) {
    const pages = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...', total);
      } else if (current >= total - 3) {
        pages.push(1, '...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
      }
    }
    return pages;
  }

  window.goProjectRecordsPage = function(page) {
    projectRecordsPage = page;
    fetchProjectRecords();
  };

  window.openProjectRecordModal = function(recordData) {
    if (!_projectRecordModal) {
      const modalHtml = `
        <div class="modal fade" id="projectRecordModal" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="recordModalTitle">新增施工记录</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="projectRecordForm">
                  <input type="hidden" id="recordId">

                  <div class="form-section-card">
                    <div class="section-header"><i class="bi bi-calendar-check"></i>基本信息</div>
                    <div class="section-body">
                      <div class="row g-3">
                        <div class="col-md-6">
                          <label class="form-label fw500 small">施工日期 <span class="text-danger">*</span></label>
                          <input type="date" class="form-control" id="recordWorkDate">
                        </div>
                        <div class="col-md-6">
                          <label class="form-label fw500 small">施工类型 <span class="text-danger">*</span></label>
                          <select class="form-select" id="recordWorkType">
                            ${WORK_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                          </select>
                        </div>
                      </div>
                      <div class="mt-3">
                        <label class="form-label fw500 small">施工内容</label>
                        <textarea class="form-control" id="recordWorkContent" rows="3" placeholder="请输入施工内容描述"></textarea>
                      </div>
                    </div>
                  </div>

                  <div class="form-section-card">
                    <div class="section-header"><i class="bi bi-people"></i>人员与工时</div>
                    <div class="section-body">
                      <div class="row g-3">
                        <div class="col-md-8">
                          <label class="form-label fw500 small">施工人员</label>
                          <input type="text" class="form-control" id="recordStaffNames" placeholder="多人用逗号分隔，如：张三,李四">
                          <div class="form-text">多人请用英文逗号分隔</div>
                        </div>
                        <div class="col-md-4">
                          <label class="form-label fw500 small">总工时（小时）</label>
                          <input type="number" class="form-control" id="recordWorkHours" step="0.5" min="0" value="0">
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="form-section-card">
                    <div class="section-header"><i class="bi bi-cash"></i>费用信息</div>
                    <div class="section-body">
                      <div class="row g-3">
                        <div class="col-md-4">
                          <label class="form-label fw500 small">材料费</label>
                          <input type="number" class="form-control" id="recordMaterialFee" step="0.01" min="0" value="0" oninput="calcRecordTotalFee()">
                        </div>
                        <div class="col-md-4">
                          <label class="form-label fw500 small">人工费</label>
                          <input type="number" class="form-control" id="recordLaborFee" step="0.01" min="0" value="0" oninput="calcRecordTotalFee()">
                        </div>
                        <div class="col-md-4">
                          <label class="form-label fw500 small">其他费用</label>
                          <input type="number" class="form-control" id="recordOtherFee" step="0.01" min="0" value="0" oninput="calcRecordTotalFee()">
                        </div>
                      </div>
                      <div class="mt-3">
                        <div class="d-flex justify-content-between align-items-center">
                          <span class="text-muted small">总费用（自动计算）</span>
                          <span class="fs-5 fw-bold text-danger" id="recordTotalFeeDisplay">¥0.00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="form-section-card">
                    <div class="section-header"><i class="bi bi-image"></i>照片与备注</div>
                    <div class="section-body">
                      <div class="mb-3">
                        <label class="form-label fw500 small">照片</label>
                        <input type="text" class="form-control" id="recordPhotos" placeholder="照片URL，多张用逗号分隔">
                        <div class="form-text">多张照片URL请用英文逗号分隔</div>
                      </div>
                      <div>
                        <label class="form-label fw500 small">备注</label>
                        <textarea class="form-control" id="recordRemark" rows="2" placeholder="备注信息"></textarea>
                      </div>
                    </div>
                  </div>

                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" onclick="saveProjectRecord()">保存</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      _projectRecordModal = new bootstrap.Modal(document.getElementById('projectRecordModal'));
    }

    const id = recordData?.id || '';
    document.getElementById('recordId').value = id;
    document.getElementById('recordWorkDate').value = recordData?.work_date || new Date().toISOString().split('T')[0];
    document.getElementById('recordWorkType').value = recordData?.work_type || WORK_TYPES[0];
    document.getElementById('recordWorkContent').value = recordData?.work_content || '';
    document.getElementById('recordStaffNames').value = recordData?.staff_names || '';
    document.getElementById('recordWorkHours').value = recordData?.work_hours || 0;
    document.getElementById('recordMaterialFee').value = recordData?.material_fee || 0;
    document.getElementById('recordLaborFee').value = recordData?.labor_fee || 0;
    document.getElementById('recordOtherFee').value = recordData?.other_fee || 0;
    document.getElementById('recordPhotos').value = recordData?.photos || '';
    document.getElementById('recordRemark').value = recordData?.remark || '';
    document.getElementById('recordModalTitle').textContent = id ? '编辑施工记录' : '新增施工记录';

    calcRecordTotalFee();
    _projectRecordModal.show();
  };

  window.editProjectRecord = function(recordData) {
    openProjectRecordModal(recordData);
  };

  window.calcRecordTotalFee = function() {
    const material = parseFloat(document.getElementById('recordMaterialFee')?.value) || 0;
    const labor = parseFloat(document.getElementById('recordLaborFee')?.value) || 0;
    const other = parseFloat(document.getElementById('recordOtherFee')?.value) || 0;
    const total = material + labor + other;
    const displayEl = document.getElementById('recordTotalFeeDisplay');
    if (displayEl) {
      displayEl.textContent = '¥' + total.toFixed(2);
    }
    return total;
  };

  window.saveProjectRecord = function() {
    const id = document.getElementById('recordId').value;
    const workDate = document.getElementById('recordWorkDate').value;
    const workType = document.getElementById('recordWorkType').value;

    if (!workDate) { alert('请选择施工日期'); return; }
    if (!workType) { alert('请选择施工类型'); return; }

    const totalFee = calcRecordTotalFee();

    const data = {
      work_date: workDate,
      work_type: workType,
      work_content: document.getElementById('recordWorkContent').value,
      staff_names: document.getElementById('recordStaffNames').value,
      work_hours: parseFloat(document.getElementById('recordWorkHours').value) || 0,
      material_fee: parseFloat(document.getElementById('recordMaterialFee').value) || 0,
      labor_fee: parseFloat(document.getElementById('recordLaborFee').value) || 0,
      other_fee: parseFloat(document.getElementById('recordOtherFee').value) || 0,
      total_fee: totalFee,
      photos: document.getElementById('recordPhotos').value,
      remark: document.getElementById('recordRemark').value
    };

    const url = id ? `/api/projects/${currentProjectId}/records/${id}` : `/api/projects/${currentProjectId}/records`;
    const method = id ? 'PUT' : 'POST';

    apiFetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => {
      if (!r.error) {
        _projectRecordModal.hide();
        fetchProjectRecords();
        loadProjectDetail(currentProjectId);
      } else {
        alert('保存失败：' + r.error);
      }
    });
  };

  window.deleteProjectRecord = function(id) {
    if (!confirm('确定删除这条施工记录吗？')) return;
    apiFetch(`/api/projects/${currentProjectId}/records/${id}`, { method: 'DELETE' }).then(r => {
      if (!r.error) {
        fetchProjectRecords();
        loadProjectDetail(currentProjectId);
      } else {
        alert('删除失败：' + r.error);
      }
    });
  };

  /* ---------- 项目概览 Tab - 使用 finance_overview ---------- */
  const _origRenderProjectOverview = renderProjectOverview;
  function renderProjectOverview(project) {
    const pane = document.getElementById('projectTabOverview');
    if (!pane) return;

    const contractAmount = parseFloat(project.contract_amount) || 0;
    const budgetAmount = parseFloat(project.budget_amount) || 0;
    const actualAmount = parseFloat(project.actual_amount) || 0;
    const profit = contractAmount - actualAmount;

    const financeOverview = project.finance_overview || {};
    const recordCount = financeOverview.record_count != null ? financeOverview.record_count : 0;
    const recordIncome = financeOverview.record_income != null ? financeOverview.record_income : 0;

    pane.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header"><h6 class="mb-0"><i class="bi bi-info-circle me-1"></i>项目基本信息</h6></div>
            <div class="card-body">
              <div class="info-row"><span class="info-label">项目编号</span><span class="info-value"><code>${project.project_no || '-'}</code></span></div>
              <div class="info-row"><span class="info-label">项目类型</span><span class="info-value">${escapeHtml(project.project_type) || '-'}</span></div>
              <div class="info-row"><span class="info-label">客户名称</span><span class="info-value">${escapeHtml(project.customer_name) || '-'}</span></div>
              <div class="info-row"><span class="info-label">项目负责人</span><span class="info-value">${escapeHtml(project.manager) || '-'}</span></div>
              <div class="info-row"><span class="info-label">项目地址</span><span class="info-value">${escapeHtml(project.project_address) || '-'}</span></div>
              <div class="info-row"><span class="info-label">联系人</span><span class="info-value">${escapeHtml(project.contact_name) || '-'} ${project.contact_phone ? '(' + project.contact_phone + ')' : ''}</span></div>
              <div class="info-row"><span class="info-label">计划工期</span><span class="info-value">${project.start_date || '-'} ~ ${project.end_date || '-'}</span></div>
              <div class="info-row"><span class="info-label">合同编号</span><span class="info-value">${escapeHtml(project.contract_no) || '-'}</span></div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header"><h6 class="mb-0"><i class="bi bi-wallet2 me-1"></i>收支概览</h6></div>
            <div class="card-body">
              <div class="finance-grid">
                <div class="finance-item">
                  <div class="finance-label">合同金额</div>
                  <div class="finance-value text-primary">${fmtMoney(contractAmount)}</div>
                </div>
                <div class="finance-item">
                  <div class="finance-label">预算金额</div>
                  <div class="finance-value">${fmtMoney(budgetAmount)}</div>
                </div>
                <div class="finance-item">
                  <div class="finance-label">实际支出</div>
                  <div class="finance-value text-danger">${fmtMoney(actualAmount)}</div>
                </div>
                <div class="finance-item">
                  <div class="finance-label">预估毛利</div>
                  <div class="finance-value ${profit >= 0 ? 'text-success' : 'text-danger'}">${fmtMoney(profit)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header"><h6 class="mb-0"><i class="bi bi-bar-chart-line me-1"></i>施工统计</h6></div>
            <div class="card-body">
              <div class="finance-grid">
                <div class="finance-item">
                  <div class="finance-label">施工记录数</div>
                  <div class="finance-value text-primary">${recordCount}</div>
                </div>
                <div class="finance-item">
                  <div class="finance-label">施工收入</div>
                  <div class="finance-value text-success">${fmtMoney(recordIncome)}</div>
                </div>
              </div>
              <div class="mt-3">
                <div class="stage-timeline">
                  ${Object.entries(STAGE_MAP).map(([key, val], idx) => {
                    const stageKeys = Object.keys(STAGE_MAP);
                    const currentIdx = stageKeys.indexOf(project.project_stage || project.stage);
                    const isActive = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    return `
                      <div class="stage-item ${isActive ? 'done' : ''} ${isCurrent ? 'current' : ''}">
                        <div class="stage-dot"></div>
                        <div class="stage-content">
                          <div class="stage-name">${val.label}</div>
                        </div>
                        ${idx < stageKeys.length - 1 ? '<div class="stage-line"></div>' : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header"><h6 class="mb-0"><i class="bi bi-people me-1"></i>参与人员</h6></div>
            <div class="card-body">
              <div class="staff-list">
                ${project.manager ? `
                  <div class="staff-item">
                    <div class="staff-avatar">${project.manager.charAt(0)}</div>
                    <div class="staff-info">
                      <div class="staff-name">${escapeHtml(project.manager)}</div>
                      <div class="staff-role">项目负责人</div>
                    </div>
                  </div>
                ` : '<div class="text-muted small">暂无人员信息</div>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.ProjectManager = {
    openProjectDetail: window.openProjectDetail,
    backToProjectList: window.backToProjectList,
    setProjectViewMode: window.setProjectViewMode,
    switchProjectDetailTab: window.switchProjectDetailTab,
    openProjectRecordModal: window.openProjectRecordModal,
    editProjectRecord: window.editProjectRecord,
    saveProjectRecord: window.saveProjectRecord,
    deleteProjectRecord: window.deleteProjectRecord,
    goProjectRecordsPage: window.goProjectRecordsPage,
    calcRecordTotalFee: window.calcRecordTotalFee,
    openProjectExpenseModal: window.openProjectExpenseModal,
    saveProjectExpense: window.saveProjectExpense,
    deleteProjectExpense: window.deleteProjectExpense,
    openProjectSalaryModal: window.openProjectSalaryModal,
    saveProjectSalary: window.saveProjectSalary,
    deleteProjectSalary: window.deleteProjectSalary,
    showProjectStageModal: window.showProjectStageModal,
    saveProjectStage: window.saveProjectStage,
    toggleBottomActionSheet: window.toggleBottomActionSheet,
    closeBottomActionSheet: window.closeBottomActionSheet,
    STAGE_MAP: STAGE_MAP,
    EXPENSE_TYPES: EXPENSE_TYPES,
    SALARY_TYPES: SALARY_TYPES,
    WORK_TYPES: WORK_TYPES
  };

})();

(function() {
  'use strict';

  let _selectProjectModal = null;
  let _currentProjectForRecord = null;

  /* ---------- 1. 底部+号菜单调整 ---------- */
  function enhanceBottomPlusMenu() {
    const sheet = document.getElementById('bottomActionSheet');
    if (!sheet || sheet._enhancedV2) return;

    const items = sheet.querySelectorAll('.action-sheet-item');
    if (items.length >= 3) {
      const thirdItem = items[2];
      thirdItem.querySelector('.action-sheet-icon').innerHTML = '<i class="bi bi-building"></i>';
      thirdItem.querySelector('.action-sheet-icon').className = 'action-sheet-icon project';
      thirdItem.querySelector('.action-sheet-label').textContent = '新增项目施工工单';
      thirdItem.setAttribute('onclick', 'openProjectWorkRecordFromSheet()');
    }

    sheet._enhancedV2 = true;
  }

  window.openProjectWorkRecordFromSheet = function() {
    closeBottomActionSheet();
    openSelectProjectModal();
  };

  /* ---------- 2. 选择项目弹窗 ---------- */
  window.openSelectProjectModal = function() {
    if (!_selectProjectModal) {
      const modalHtml = `
        <div class="modal fade" id="selectProjectModal" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">选择项目</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <label class="form-label fw500 small">请选择进行中的项目</label>
                  <select class="form-select" id="selectProjectDropdown">
                    <option value="">加载中...</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" onclick="confirmSelectProject()">确定</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      _selectProjectModal = new bootstrap.Modal(document.getElementById('selectProjectModal'));
    }

    loadActiveProjectsForSelect();
    _selectProjectModal.show();
  };

  function loadActiveProjectsForSelect() {
    const dropdown = document.getElementById('selectProjectDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">加载中...</option>';

    apiFetch('/api/projects?status=in_progress&per_page=100').then(r => {
      const projects = r.records || r || [];
      if (!projects || projects.length === 0) {
        dropdown.innerHTML = '<option value="">暂无进行中的项目</option>';
        return;
      }

      let html = '<option value="">请选择项目</option>';
      projects.forEach(p => {
        html += `<option value="${p.id}">${escapeHtml(p.name)}${p.customer_name ? ' (' + escapeHtml(p.customer_name) + ')' : ''}</option>`;
      });
      dropdown.innerHTML = html;
    }).catch(() => {
      dropdown.innerHTML = '<option value="">加载失败</option>';
    });
  }

  window.confirmSelectProject = function() {
    const dropdown = document.getElementById('selectProjectDropdown');
    if (!dropdown) return;

    const projectId = dropdown.value;
    if (!projectId) {
      alert('请选择项目');
      return;
    }

    _selectProjectModal.hide();
    openProjectRecordModalWithProject(parseInt(projectId));
  };

  /* ---------- 3. 项目施工记录表单增强 ---------- */
  window.openProjectRecordModalWithProject = function(projectId) {
    if (!projectId) return;

    apiFetch('/api/projects/' + projectId).then(r => {
      if (r.error) {
        alert('加载项目信息失败：' + r.error);
        return;
      }
      const project = r.project || r;
      _currentProjectForRecord = project;
      openProjectRecordModal();
      setTimeout(() => {
        applyProjectInfoToForm(project);
      }, 100);
    }).catch(() => {
      alert('加载项目信息失败');
    });
  };

  function applyProjectInfoToForm(project) {
    const modal = document.getElementById('projectRecordModal');
    if (!modal) return;

    const form = document.getElementById('projectRecordForm');
    if (!form) return;

    let infoSection = document.getElementById('projectInfoSection');
    if (!infoSection) {
      infoSection = document.createElement('div');
      infoSection.id = 'projectInfoSection';
      infoSection.className = 'form-section-card';
      infoSection.innerHTML = `
        <div class="section-header"><i class="bi bi-folder-symlink"></i>项目信息</div>
        <div class="section-body">
          <div class="row g-2">
            <div class="col-md-6">
              <div class="project-info-item">
                <span class="project-info-label">项目名称</span>
                <span class="project-info-value" id="infoProjectName">-</span>
              </div>
            </div>
            <div class="col-md-6">
              <div class="project-info-item">
                <span class="project-info-label">项目地址</span>
                <span class="project-info-value" id="infoProjectAddress">-</span>
              </div>
            </div>
          </div>
        </div>
      `;
      form.insertBefore(infoSection, form.firstChild);
    }

    document.getElementById('infoProjectName').textContent = project.name || '-';
    document.getElementById('infoProjectAddress').textContent = project.project_address || '-';

    const customerField = form.querySelector('input[name="customer_name"], #recordCustomerName');
    const addressField = form.querySelector('input[name="work_address"], #recordWorkAddress');
    if (customerField) customerField.closest('.mb-3, .col-md-6, .col-12')?.style.setProperty('display', 'none');
    if (addressField) addressField.closest('.mb-3, .col-md-6, .col-12')?.style.setProperty('display', 'none');

    let billingSection = document.getElementById('billingTypeSection');
    if (!billingSection) {
      billingSection = document.createElement('div');
      billingSection.id = 'billingTypeSection';
      billingSection.className = 'form-section-card';
      billingSection.innerHTML = `
        <div class="section-header"><i class="bi bi-cash-stack"></i>计费方式</div>
        <div class="section-body">
          <div class="mb-3">
            <div class="d-flex gap-4">
              <label class="form-check form-check-inline">
                <input class="form-check-input" type="radio" name="billingType" id="billingTypeLumpSum" value="lump_sum" checked onchange="onBillingTypeChange()">
                <span class="form-check-label">包工</span>
              </label>
              <label class="form-check form-check-inline">
                <input class="form-check-input" type="radio" name="billingType" id="billingTypeHourly" value="hourly" onchange="onBillingTypeChange()">
                <span class="form-check-label">点工</span>
              </label>
            </div>
          </div>
        </div>
      `;

      const basicSection = document.getElementById('projectInfoSection');
      if (basicSection && basicSection.nextSibling) {
        basicSection.parentNode.insertBefore(billingSection, basicSection.nextSibling);
      } else {
        form.appendChild(billingSection);
      }
    }

    const billingType = project.billing_type || 'lump_sum';
    const lumpSumRadio = document.getElementById('billingTypeLumpSum');
    const hourlyRadio = document.getElementById('billingTypeHourly');
    if (lumpSumRadio) lumpSumRadio.checked = billingType === 'lump_sum';
    if (hourlyRadio) hourlyRadio.checked = billingType === 'hourly';

    onBillingTypeChange();
  }

  function _findStaffSection() {
    const form = document.getElementById('projectRecordForm');
    if (!form) return null;
    const cards = form.querySelectorAll('.form-section-card');
    for (let i = 0; i < cards.length; i++) {
      const header = cards[i].querySelector('.section-header');
      if (header && header.querySelector('i.bi-people')) {
        return cards[i];
      }
    }
    return null;
  }

  window.onBillingTypeChange = function() {
    const hourlyRadio = document.getElementById('billingTypeHourly');
    if (!hourlyRadio) return;

    const isHourly = hourlyRadio.checked;

    const staffSection = _findStaffSection();
    if (staffSection) {
      if (isHourly) {
        staffSection.style.opacity = '';
      } else {
        staffSection.style.opacity = '0.6';
      }
    }
  };

  /* ---------- 4. 项目详情页工资Tab显示/隐藏 ---------- */
  const _origRenderProjectDetail = renderProjectDetail;
  function renderProjectDetail(project) {
    if (_origRenderProjectDetail) {
      _origRenderProjectDetail(project);
    }

    setTimeout(() => {
      updateSalaryTabVisibility(project);
    }, 50);
  }

  function updateSalaryTabVisibility(project) {
    const tabBtns = document.querySelectorAll('.project-detail-tabs .project-tab-btn');
    const tabPanes = document.querySelectorAll('.project-detail-content .project-tab-pane');
    if (!tabBtns || tabBtns.length < 4) return;

    const billingType = project.billing_type || 'lump_sum';
    const showSalary = billingType === 'hourly';

    const salaryTabBtn = tabBtns[3];
    const salaryTabPane = tabPanes[3];

    if (salaryTabBtn) {
      salaryTabBtn.style.display = showSalary ? '' : 'none';
    }
    if (salaryTabPane) {
      salaryTabPane.style.display = showSalary ? '' : 'none';
    }

    if (!showSalary && currentProjectDetailTab === 'salaries') {
      switchProjectDetailTab('overview');
    }
  }

  /* ---------- 5. 保存时带上billing_type ---------- */
  const _origSaveProjectRecord = window.saveProjectRecord;
  window.saveProjectRecord = function() {
    const billingTypeEl = document.querySelector('input[name="billingType"]:checked');
    const billingType = billingTypeEl ? billingTypeEl.value : 'lump_sum';

    const recordId = document.getElementById('recordId')?.value;
    if (!recordId && _currentProjectForRecord) {
      currentProjectId = _currentProjectForRecord.id;
    }

    const origCalc = window.calcRecordTotalFee;
    const totalFee = origCalc ? origCalc() : 0;

    const workDate = document.getElementById('recordWorkDate')?.value;
    const workType = document.getElementById('recordWorkType')?.value;

    if (!workDate) { alert('请选择施工日期'); return; }
    if (!workType) { alert('请选择施工类型'); return; }

    const data = {
      work_date: workDate,
      work_type: workType,
      work_content: document.getElementById('recordWorkContent')?.value || '',
      staff_names: document.getElementById('recordStaffNames')?.value || '',
      work_hours: parseFloat(document.getElementById('recordWorkHours')?.value || 0),
      material_fee: parseFloat(document.getElementById('recordMaterialFee')?.value || 0),
      labor_fee: parseFloat(document.getElementById('recordLaborFee')?.value || 0),
      other_fee: parseFloat(document.getElementById('recordOtherFee')?.value || 0),
      total_fee: totalFee,
      photos: document.getElementById('recordPhotos')?.value || '',
      remark: document.getElementById('recordRemark')?.value || '',
      billing_type: billingType
    };

    const url = recordId 
      ? `/api/projects/${currentProjectId}/records/${recordId}` 
      : `/api/projects/${currentProjectId}/records`;
    const method = recordId ? 'PUT' : 'POST';

    apiFetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => {
      if (!r.error) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('projectRecordModal'));
        if (modal) modal.hide();
        
        if (typeof fetchProjectRecords === 'function' && currentProjectId) {
          fetchProjectRecords();
        }
        if (typeof loadProjectDetail === 'function' && currentProjectId) {
          loadProjectDetail(currentProjectId);
        }
        
        _currentProjectForRecord = null;
      } else {
        alert('保存失败：' + r.error);
      }
    });
  };

  /* ---------- 6. 编辑时也加载billing_type ---------- */
  const _origOpenProjectRecordModal = window.openProjectRecordModal;
  window.openProjectRecordModal = function(recordData) {
    if (_origOpenProjectRecordModal) {
      _origOpenProjectRecordModal(recordData);
    }

    setTimeout(() => {
      if (recordData && recordData.billing_type) {
        const billingType = recordData.billing_type;
        const lumpSumRadio = document.getElementById('billingTypeLumpSum');
        const hourlyRadio = document.getElementById('billingTypeHourly');
        if (lumpSumRadio) lumpSumRadio.checked = billingType === 'lump_sum';
        if (hourlyRadio) hourlyRadio.checked = billingType === 'hourly';
        onBillingTypeChange();
      }
    }, 150);
  };

  /* ---------- 7. 项目菜单新增施工工单 ---------- */
  function enhanceProjectNavMenu() {
    const observer = new MutationObserver(function() {
      const projectDropdown = document.getElementById('projectDropdown');
      if (!projectDropdown || projectDropdown._enhancedV2) return;

      const menu = projectDropdown.nextElementSibling;
      if (!menu) return;

      const newWorkItem = menu.querySelector('a[onclick*="openNewWork"]');
      if (newWorkItem) {
        newWorkItem.setAttribute('onclick', 'openProjectWorkRecordFromNav()');
      }

      projectDropdown._enhancedV2 = true;
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.openProjectWorkRecordFromNav = function() {
    openSelectProjectModal();
  };

  /* ---------- 工具函数 ---------- */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- 初始化 ---------- */
  function init() {
    const observer = new MutationObserver(function() {
      enhanceBottomPlusMenu();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      enhanceBottomPlusMenu();
      enhanceProjectNavMenu();
    }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 200);
  }

  window.ProjectWorkRecordEnhance = {
    openSelectProjectModal: window.openSelectProjectModal,
    confirmSelectProject: window.confirmSelectProject,
    openProjectRecordModalWithProject: window.openProjectRecordModalWithProject,
    onBillingTypeChange: window.onBillingTypeChange,
    openProjectWorkRecordFromSheet: window.openProjectWorkRecordFromSheet,
    openProjectWorkRecordFromNav: window.openProjectWorkRecordFromNav
  };

})();

/* ============================================================
 * 模块1：Bug修复模块
 * ============================================================ */
(function() {
  'use strict';
  if (window._bugFixesDone) return;
  window._bugFixesDone = true;

  function fixExpensePagination() {
    if (typeof window.loadExpenses !== 'function') return;
    const originalLoadExpenses = window.loadExpenses;
    window.loadExpenses = function() {
      const result = originalLoadExpenses.apply(this, arguments);
      setTimeout(function() {
        const paginationContainer = document.getElementById('expensePagination');
        if (paginationContainer && typeof window._renderSimplePagination === 'function') {
          const page = window._expenseCurrentPage || 1;
          const total = window._expenseTotalPages || 1;
          window._renderSimplePagination('expensePagination', page, total, 'loadExpenses', '_expenseCurrentPage');
        }
      }, 100);
      return result;
    };
  }

  function deduplicateExpenseCategories() {
    const observer = new MutationObserver(function() {
      const selects = document.querySelectorAll('select[id*="expense"][id*="category"], select[id*="Expense"][id*="Category"], select.expense-category-select');
      selects.forEach(function(select) {
        if (select._deduplicated) return;
        const seen = new Set();
        const options = select.querySelectorAll('option');
        options.forEach(function(opt) {
          const val = opt.value;
          if (val && seen.has(val)) {
            opt.remove();
          } else if (val) {
            seen.add(val);
          }
        });
        select._deduplicated = true;
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function fixDashboardTabSwitch() {
    const observer = new MutationObserver(function() {
      const tabLinks = document.querySelectorAll('.dashboard-tab .nav-link, [data-bs-toggle="tab"][data-bs-target*="dashboard"], .nav-tabs .nav-link');
      tabLinks.forEach(function(tab) {
        if (tab._bugFixBound) return;
        tab._bugFixBound = true;
        tab.addEventListener('shown.bs.tab', function() {
          if (typeof window.loadDashboardStats === 'function') {
            window.loadDashboardStats();
          }
          if (typeof window.loadRecentWorkOrders === 'function') {
            window.loadRecentWorkOrders();
          }
          if (typeof window.loadExpenseSummary === 'function') {
            window.loadExpenseSummary();
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    // fixExpensePagination已由v2增强模块接管，避免双重hook
    deduplicateExpenseCategories();
    fixDashboardTabSwitch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }
})();

/* ============================================================
 * 模块2：导航重组模块 [已禁用-v2接管]
 * 此模块完全重建导航DOM，使用旧showTab()函数引用。v2增强模块(reorganizeNav)
 * 已在原始导航基础上正确修改，使用switchTab()。保留代码备查。
 * ============================================================ */
(function() {
  'use strict';
  return; // 止血清理：禁用旧导航重组，v2接管
  if (window._navReorganized) return;
  window._navReorganized = true;

  const NAV_ITEMS = [
    {
      id: 'nav-workbench',
      label: '工作台',
      icon: 'bi bi-speedometer2',
      type: 'link',
      action: 'showTab(\'dashboard\')'
    },
    {
      id: 'nav-business',
      label: '业务',
      icon: 'bi bi-briefcase',
      type: 'dropdown',
      groups: [
        {
          label: '工单管理',
          items: [
            { label: '工单列表', action: 'showTab(\'workorders\')' },
            { label: '新建工单', action: 'showTab(\'workorder-new\')' },
            { label: '待处理工单', action: 'showTab(\'workorders-pending\')' }
          ]
        },
        {
          label: '客户管理',
          items: [
            { label: '客户列表', action: 'showTab(\'customers\')' },
            { label: '新增客户', action: 'showTab(\'customer-new\')' }
          ]
        },
        {
          label: '更多工具',
          items: [
            { label: '查询统计', action: 'showTab(\'advanced-stats\')' },
            { label: '报表导出', action: 'showTab(\'reports\')' },
            { label: '数据看板', action: 'showTab(\'dashboard\')' }
          ]
        }
      ]
    },
    {
      id: 'nav-project',
      label: '项目',
      icon: 'bi bi-folder2-open',
      type: 'dropdown',
      groups: [
        {
          label: '项目管理',
          items: [
            { label: '项目列表', action: 'showTab(\'projects\')' },
            { label: '新建项目', action: 'showTab(\'project-new\')' },
            { label: '进行中项目', action: 'showTab(\'projects-active\')' }
          ]
        },
        {
          label: '项目工具',
          items: [
            { label: '项目工时', action: 'showTab(\'project-timesheet\')' },
            { label: '项目费用', action: 'showTab(\'project-expenses\')' }
          ]
        }
      ]
    },
    {
      id: 'nav-finance',
      label: '财务',
      icon: 'bi bi-currency-yen',
      type: 'dropdown',
      groups: [
        {
          label: '收支管理',
          items: [
            { label: '收支流水', action: 'showTab(\'finance-unified\')' },
            { label: '收款管理', action: 'showTab(\'receipts\')' },
            { label: '支出管理', action: 'showTab(\'expenses\')' },
            { label: '工资管理', action: 'showTab(\'salary\')' }
          ]
        },
        {
          label: '财务报表',
          items: [
            { label: '利润统计', action: 'showTab(\'profit-stats\')' },
            { label: '应收应付', action: 'showTab(\'receivables\')' }
          ]
        }
      ]
    },
    {
      id: 'nav-resource',
      label: '资源',
      icon: 'bi bi-people',
      type: 'dropdown',
      groups: [
        {
          label: '人员管理',
          items: [
            { label: '员工列表', action: 'showTab(\'employees\')' },
            { label: '班组管理', action: 'showTab(\'teams\')' }
          ]
        },
        {
          label: '物资管理',
          items: [
            { label: '材料库存', action: 'showTab(\'inventory\')' },
            { label: '设备管理', action: 'showTab(\'equipment\')' }
          ]
        }
      ]
    },
    {
      id: 'nav-settings',
      label: '设置',
      icon: 'bi bi-gear',
      type: 'dropdown',
      groups: [
        {
          label: '系统设置',
          items: [
            { label: '基础设置', action: 'showTab(\'settings\')' },
            { label: '分类管理', action: 'showTab(\'categories\')' },
            { label: '用户管理', action: 'showTab(\'users\')' }
          ]
        }
      ]
    }
  ];

  function removeOldNav() {
    const oldNavs = document.querySelectorAll('.main-nav, #mainNav, .navbar-nav, .sidebar-menu');
    oldNavs.forEach(function(nav) {
      const oldProjectItems = nav.querySelectorAll('[id*="project"][id*="nav"], [class*="nav"] [class*="project"]');
      oldProjectItems.forEach(function(item) {
        if (item.textContent && item.textContent.includes('项目管理')) {
          item.remove();
        }
      });
    });
  }

  function buildDropdownMenu(groups) {
    let html = '<ul class="dropdown-menu dropdown-menu-end shadow-lg p-2">';
    groups.forEach(function(group, gi) {
      if (gi > 0) html += '<li><hr class="dropdown-divider my-1"></li>';
      html += '<li><h6 class="dropdown-header text-muted small px-2 py-1">' + group.label + '</h6></li>';
      group.items.forEach(function(item) {
        html += '<li><a class="dropdown-item rounded py-2" href="javascript:' + item.action + '">' +
                 '<span class="me-2"></span>' + item.label + '</a></li>';
      });
    });
    html += '</ul>';
    return html;
  }

  function buildNav() {
    const navContainer = document.querySelector('.navbar-nav, .main-nav ul, .sidebar-menu');
    if (!navContainer) return;

    removeOldNav();
    navContainer.innerHTML = '';

    NAV_ITEMS.forEach(function(item) {
      const li = document.createElement('li');
      li.className = 'nav-item me-1';
      li.id = item.id;

      if (item.type === 'link') {
        li.innerHTML = '<a class="nav-link px-3" href="javascript:' + item.action + '">' +
                        '<i class="' + item.icon + ' me-1"></i><span>' + item.label + '</span></a>';
      } else {
        li.className += ' dropdown';
        li.innerHTML = '<a class="nav-link px-3 dropdown-toggle" href="#" data-bs-toggle="dropdown">' +
                        '<i class="' + item.icon + ' me-1"></i><span>' + item.label + '</span></a>' +
                        buildDropdownMenu(item.groups);
      }

      navContainer.appendChild(li);
    });
  }

  function init() {
    const observer = new MutationObserver(function() {
      const navContainer = document.querySelector('.navbar-nav, .main-nav ul, .sidebar-menu');
      if (navContainer && !navContainer._reorganized) {
        navContainer._reorganized = true;
        buildNav();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(buildNav, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
 * 模块3：统一财务中心模块 [已禁用-v2接管]
 * 此模块使用旧回调风格API(/receipts等路径)，v2增强模块(createFinanceUnifiedTab)
 * 已使用Promise风格API(/api/payments等)正确实现
 * 保留代码备查，不再执行
 * ============================================================ */
(function() {
  'use strict';
  return; // 止血清理：禁用旧财务中心，v2接管
  if (window._financeUnifiedDone) return;
  window._financeUnifiedDone = true;

  let unifiedTransactions = [];
  let currentPage = 1;
  const pageSize = 20;

  function getMonthRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  }

  function formatMoney(amount) {
    return '¥' + Number(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fetchAllData() {
    return Promise.all([
      fetchReceipts(),
      fetchExpenses(),
      fetchSalary()
    ]);
  }

  function fetchReceipts() {
    return new Promise(function(resolve) {
      if (typeof window.apiFetch === 'function') {
        window.apiFetch('/api/payments?per_page=1000').then(function(res) {
          resolve((res && res.records) || []);
        }).catch(function() { resolve([]); });
      } else {
        resolve([]);
      }
    });
  }

  function fetchExpenses() {
    return new Promise(function(resolve) {
      if (typeof window.apiFetch === 'function') {
        window.apiFetch('/api/expenses?per_page=1000').then(function(res) {
          resolve((res && res.records) || []);
        }).catch(function() { resolve([]); });
      } else {
        resolve([]);
      }
    });
  }

  function fetchSalary() {
    return new Promise(function(resolve) {
      if (typeof window.apiFetch === 'function') {
        window.apiFetch('/api/salaries').then(function(res) {
          resolve((res && res.records) || []);
        }).catch(function() { resolve([]); });
      } else {
        resolve([]);
      }
    });
  }

  function mergeTransactions(receipts, expenses, salary) {
    const transactions = [];
    receipts.forEach(function(r) {
      transactions.push({
        type: 'receipt',
        typeLabel: '收款',
        typeClass: 'success',
        date: r.payment_date || r.date || r.created_at,
        amount: Number(r.amount || 0),
        title: r.customer_name || r.title || '收款',
        desc: r.remark || '',
        project: r.project_name || '',
        raw: r
      });
    });
    expenses.forEach(function(e) {
      transactions.push({
        type: 'expense',
        typeLabel: '支出',
        typeClass: 'danger',
        date: e.expense_date || e.date || e.created_at,
        amount: -Number(e.amount || 0),
        title: e.title || e.category || '支出',
        desc: e.remark || '',
        project: e.project_name || '',
        raw: e
      });
    });
    salary.forEach(function(s) {
      const amt = s.paid_amount || s.payable_amount || 0;
      transactions.push({
        type: 'salary',
        typeLabel: '工资',
        typeClass: 'warning',
        date: s.settlement_date || s.work_date || s.created_at,
        amount: -Number(amt),
        title: s.staff_name || '工资',
        desc: s.work_content || s.remark || '',
        project: s.project_name || s.business_no || '',
        raw: s
      });
    });
    transactions.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    return transactions;
  }

  function calculateStats(transactions) {
    const range = getMonthRange();
    const monthStart = new Date(range.start);
    const monthEnd = new Date(range.end);

    let income = 0, expense = 0, salary = 0;
    transactions.forEach(function(t) {
      const tDate = new Date(t.date);
      if (tDate >= monthStart && tDate <= monthEnd) {
        if (t.type === 'receipt') {
          income += t.amount;
        } else if (t.type === 'expense') {
          expense += Math.abs(t.amount);
        } else if (t.type === 'salary') {
          salary += Math.abs(t.amount);
        }
      }
    });
    return {
      income: income,
      expense: expense,
      salary: salary,
      profit: income - expense - salary
    };
  }

  function buildProjectComparison(transactions) {
    const projectMap = {};
    transactions.forEach(function(t) {
      const pname = t.project || '未分类';
      if (!projectMap[pname]) {
        projectMap[pname] = { name: pname, income: 0, expense: 0, salary: 0 };
      }
      if (t.type === 'receipt') {
        projectMap[pname].income += t.amount;
      } else if (t.type === 'expense') {
        projectMap[pname].expense += Math.abs(t.amount);
      } else if (t.type === 'salary') {
        projectMap[pname].salary += Math.abs(t.amount);
      }
    });
    return Object.values(projectMap).sort(function(a, b) {
      return (b.income - b.expense - b.salary) - (a.income - a.expense - a.salary);
    });
  }

  function renderStatsCards(stats) {
    const cardsHtml = `
      <div class="row g-3 mb-4">
        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <div class="bg-success bg-opacity-10 rounded-3 p-3">
                    <i class="bi bi-arrow-down-left-circle text-success fs-3"></i>
                  </div>
                </div>
                <div class="flex-grow-1 ms-3">
                  <p class="text-muted mb-1 small">本月收入</p>
                  <h4 class="mb-0 text-success">${formatMoney(stats.income)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <div class="bg-danger bg-opacity-10 rounded-3 p-3">
                    <i class="bi bi-arrow-up-right-circle text-danger fs-3"></i>
                  </div>
                </div>
                <div class="flex-grow-1 ms-3">
                  <p class="text-muted mb-1 small">本月支出</p>
                  <h4 class="mb-0 text-danger">${formatMoney(stats.expense)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <div class="bg-warning bg-opacity-10 rounded-3 p-3">
                    <i class="bi bi-people-fill text-warning fs-3"></i>
                  </div>
                </div>
                <div class="flex-grow-1 ms-3">
                  <p class="text-muted mb-1 small">本月工资</p>
                  <h4 class="mb-0 text-warning">${formatMoney(stats.salary)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <div class="bg-primary bg-opacity-10 rounded-3 p-3">
                    <i class="bi bi-graph-up-arrow text-primary fs-3"></i>
                  </div>
                </div>
                <div class="flex-grow-1 ms-3">
                  <p class="text-muted mb-1 small">本月利润</p>
                  <h4 class="mb-0 ${stats.profit >= 0 ? 'text-primary' : 'text-danger'}">${formatMoney(stats.profit)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return cardsHtml;
  }

  function renderTransactionList(transactions, page) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = transactions.slice(start, end);
    const totalPages = Math.ceil(transactions.length / pageSize);

    let html = `
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white py-3">
          <div class="d-flex align-items-center justify-content-between">
            <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>交易流水</h5>
            <span class="text-muted small">共 ${transactions.length} 条记录</span>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width:100px">日期</th>
                  <th style="width:80px">类型</th>
                  <th>名称/说明</th>
                  <th style="width:150px">关联项目</th>
                  <th style="width:120px" class="text-end">金额</th>
                </tr>
              </thead>
              <tbody>
    `;

    if (pageData.length === 0) {
      html += '<tr><td colspan="5" class="text-center py-5 text-muted">暂无数据</td></tr>';
    } else {
      pageData.forEach(function(t) {
        html += `
          <tr>
            <td class="small">${formatDate(t.date)}</td>
            <td><span class="badge bg-${t.typeClass} bg-opacity-10 text-${t.typeClass}">${t.typeLabel}</span></td>
            <td>
              <div class="fw-medium">${t.title || '-'}</div>
              ${t.desc ? '<div class="text-muted small">' + t.desc + '</div>' : ''}
            </td>
            <td class="small">${t.project || '-'}</td>
            <td class="text-end fw-medium ${t.amount >= 0 ? 'text-success' : 'text-danger'}">
              ${t.amount >= 0 ? '+' : ''}${formatMoney(Math.abs(t.amount))}
            </td>
          </tr>
        `;
      });
    }

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    if (totalPages > 1) {
      html += renderPagination(page, totalPages);
    }

    return html;
  }

  function renderPagination(page, totalPages) {
    let html = '<nav><ul class="pagination justify-content-center">';
    html += '<li class="page-item ' + (page === 1 ? 'disabled' : '') + '">';
    html += '<a class="page-link" href="javascript:;" onclick="window._financeUnifiedGoPage(' + (page - 1) + ')">上一页</a></li>';
    
    const maxShow = 5;
    let startPage = Math.max(1, page - Math.floor(maxShow / 2));
    let endPage = Math.min(totalPages, startPage + maxShow - 1);
    if (endPage - startPage < maxShow - 1) {
      startPage = Math.max(1, endPage - maxShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      html += '<li class="page-item ' + (i === page ? 'active' : '') + '">';
      html += '<a class="page-link" href="javascript:;" onclick="window._financeUnifiedGoPage(' + i + ')">' + i + '</a></li>';
    }
    
    html += '<li class="page-item ' + (page === totalPages ? 'disabled' : '') + '">';
    html += '<a class="page-link" href="javascript:;" onclick="window._financeUnifiedGoPage(' + (page + 1) + ')">下一页</a></li>';
    html += '</ul></nav>';
    return html;
  }

  function renderProjectComparison(projectData) {
    let html = `
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white py-3">
          <h5 class="mb-0"><i class="bi bi-bar-chart me-2"></i>项目收支对比</h5>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>项目名称</th>
                  <th style="width:120px" class="text-end">收入</th>
                  <th style="width:120px" class="text-end">支出</th>
                  <th style="width:120px" class="text-end">工资</th>
                  <th style="width:120px" class="text-end">利润</th>
                </tr>
              </thead>
              <tbody>
    `;

    if (projectData.length === 0) {
      html += '<tr><td colspan="5" class="text-center py-5 text-muted">暂无数据</td></tr>';
    } else {
      projectData.slice(0, 10).forEach(function(p) {
        const profit = p.income - p.expense - p.salary;
        html += `
          <tr>
            <td class="fw-medium">${p.name}</td>
            <td class="text-end text-success">${formatMoney(p.income)}</td>
            <td class="text-end text-danger">${formatMoney(p.expense)}</td>
            <td class="text-end text-warning">${formatMoney(p.salary)}</td>
            <td class="text-end fw-medium ${profit >= 0 ? 'text-primary' : 'text-danger'}">${formatMoney(profit)}</td>
          </tr>
        `;
      });
    }

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    return html;
  }

  function renderFinanceUnifiedPage() {
    const tabContent = document.querySelector('.tab-content, #tabContent, .main-content');
    if (!tabContent) return;

    let container = document.getElementById('tab-finance-unified');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tab-finance-unified';
      container.className = 'tab-pane fade';
      tabContent.appendChild(container);
    }

    container.innerHTML = `
      <div class="container-fluid py-4">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h3 class="mb-1">财务中心</h3>
            <p class="text-muted mb-0">统一查看收支流水、项目利润</p>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary" onclick="window._refreshFinanceUnified()">
              <i class="bi bi-arrow-clockwise me-1"></i>刷新
            </button>
          </div>
        </div>
        <div id="finance-unified-loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
          <p class="mt-3 text-muted">正在加载财务数据...</p>
        </div>
        <div id="finance-unified-content" style="display:none;"></div>
      </div>
    `;

    loadFinanceData();
  }

  function loadFinanceData() {
    const loadingEl = document.getElementById('finance-unified-loading');
    const contentEl = document.getElementById('finance-unified-content');
    if (loadingEl) loadingEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';

    fetchAllData().then(function(results) {
      const receipts = results[0] || [];
      const expenses = results[1] || [];
      const salary = results[2] || [];

      unifiedTransactions = mergeTransactions(receipts, expenses, salary);
      const stats = calculateStats(unifiedTransactions);
      const projectData = buildProjectComparison(unifiedTransactions);

      let html = renderStatsCards(stats);
      html += renderTransactionList(unifiedTransactions, currentPage);
      html += renderProjectComparison(projectData);

      if (contentEl) {
        contentEl.innerHTML = html;
        contentEl.style.display = 'block';
      }
      if (loadingEl) {
        loadingEl.style.display = 'none';
      }
    });
  }

  window._financeUnifiedGoPage = function(page) {
    const totalPages = Math.ceil(unifiedTransactions.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    const contentEl = document.getElementById('finance-unified-content');
    if (contentEl && unifiedTransactions.length > 0) {
      const stats = calculateStats(unifiedTransactions);
      const projectData = buildProjectComparison(unifiedTransactions);
      let html = renderStatsCards(stats);
      html += renderTransactionList(unifiedTransactions, currentPage);
      html += renderProjectComparison(projectData);
      contentEl.innerHTML = html;
    }
  };

  window._refreshFinanceUnified = function() {
    currentPage = 1;
    loadFinanceData();
  };

  const originalShowTab = window.showTab;
  window.showTab = function(tabName) {
    if (tabName === 'finance-unified') {
      renderFinanceUnifiedPage();
      setTimeout(function() {
        const pane = document.getElementById('tab-finance-unified');
        if (pane) {
          document.querySelectorAll('.tab-pane').forEach(function(p) { p.classList.remove('show', 'active'); });
          pane.classList.add('show', 'active');
        }
      }, 50);
      return;
    }
    if (originalShowTab) {
      return originalShowTab.apply(this, arguments);
    }
  };

  function init() {
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
 * 模块4：工单表单优化模块
 * ============================================================ */
(function() {
  'use strict';
  if (window._workFormOptimized) return;
  window._workFormOptimized = true;

  const STORAGE_KEYS = {
    WORK_TYPE: 'workForm_lastWorkType',
    RECORD_TYPE: 'workForm_lastRecordType',
    TEAMS: 'workForm_teams'
  };

  const STEPS = [
    { id: 'step-basic', title: '基础信息', icon: 'bi-info-circle' },
    { id: 'step-staff', title: '人员费用', icon: 'bi-people' },
    { id: 'step-extra', title: '补充信息', icon: 'bi-file-text' }
  ];

  let currentStep = 0;
  let $form = null;

  function getTodayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getTeams() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveTeams(teams) {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
  }

  function buildStepIndicator() {
    let html = '<div class="work-form-steps mb-4">';
    html += '<div class="d-flex align-items-center justify-content-between">';
    STEPS.forEach(function(step, idx) {
      html += '<div class="step-item flex-grow-1 ' + (idx === currentStep ? 'active' : '') + ' ' + (idx < currentStep ? 'done' : '') + '" data-step="' + idx + '">';
      html += '<div class="d-flex flex-column align-items-center">';
      html += '<div class="step-circle ' + (idx === currentStep ? 'bg-primary text-white' : idx < currentStep ? 'bg-success text-white' : 'bg-light text-muted') + ' rounded-circle d-flex align-items-center justify-content-center" style="width:36px;height:36px;">';
      html += idx < currentStep ? '<i class="bi bi-check2"></i>' : '<i class="' + step.icon + '"></i>';
      html += '</div>';
      html += '<div class="step-title mt-2 small ' + (idx === currentStep ? 'text-primary fw-medium' : idx < currentStep ? 'text-success' : 'text-muted') + '">' + step.title + '</div>';
      html += '</div>';
      if (idx < STEPS.length - 1) {
        html += '<div class="step-line flex-grow-1 mx-2 ' + (idx < currentStep ? 'bg-success' : 'bg-light') + '" style="height:2px;min-width:30px;"></div>';
      }
      html += '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function buildStepButtons() {
    let html = '<div class="d-flex justify-content-between mt-4 pt-3 border-top">';
    html += '<button type="button" class="btn btn-outline-secondary step-prev-btn" ' + (currentStep === 0 ? 'disabled' : '') + '>';
    html += '<i class="bi bi-arrow-left me-1"></i>上一步</button>';
    html += '<div>';
    if (currentStep < STEPS.length - 1) {
      html += '<button type="button" class="btn btn-primary step-next-btn">下一步<i class="bi bi-arrow-right ms-1"></i></button>';
    } else {
      html += '<button type="button" class="btn btn-success step-submit-btn">';
      html += '<i class="bi bi-check2 me-1"></i>提交工单</button>';
    }
    html += '</div></div>';
    return html;
  }

  function buildTeamPresetBar() {
    const teams = getTeams();
    let html = '<div class="team-preset-bar mb-3 p-3 bg-light rounded-3">';
    html += '<div class="d-flex align-items-center justify-content-between mb-2">';
    html += '<span class="fw-medium"><i class="bi bi-people-fill me-1"></i>班组预设</span>';
    html += '<button type="button" class="btn btn-sm btn-outline-primary add-team-btn">';
    html += '<i class="bi bi-plus-lg"></i> 保存当前为班组</button>';
    html += '</div>';
    if (teams.length > 0) {
      html += '<div class="d-flex flex-wrap gap-2">';
      teams.forEach(function(team, idx) {
        html += '<button type="button" class="btn btn-sm btn-outline-secondary apply-team-btn" data-idx="' + idx + '">';
        html += '<i class="bi bi-people me-1"></i>' + team.name + '</button>';
      });
      html += '</div>';
    } else {
      html += '<p class="text-muted small mb-0">暂无保存的班组，添加人员后可保存为班组预设</p>';
    }
    html += '</div>';
    return html;
  }

  function initSmartDefaults() {
    const dateInputs = $form.querySelectorAll('input[type="date"], input[name="date"], input[name="workDate"], input[name="orderDate"]');
    dateInputs.forEach(function(input) {
      if (!input.value) {
        input.value = getTodayStr();
      }
    });

    const savedWorkType = localStorage.getItem(STORAGE_KEYS.WORK_TYPE);
    if (savedWorkType) {
      const workTypeSelect = $form.querySelector('select[name="workType"], select[name="type"], #workType');
      if (workTypeSelect) {
        workTypeSelect.value = savedWorkType;
      }
    }

    const savedRecordType = localStorage.getItem(STORAGE_KEYS.RECORD_TYPE);
    if (savedRecordType) {
      const recordTypeSelect = $form.querySelector('select[name="recordType"], select[name="record_type"], #recordType');
      if (recordTypeSelect) {
        recordTypeSelect.value = savedRecordType;
      }
    }
  }

  function rememberSelections() {
    const workTypeSelect = $form.querySelector('select[name="workType"], select[name="type"], #workType');
    if (workTypeSelect) {
      workTypeSelect.addEventListener('change', function() {
        localStorage.setItem(STORAGE_KEYS.WORK_TYPE, this.value);
      });
    }
    const recordTypeSelect = $form.querySelector('select[name="recordType"], select[name="record_type"], #recordType');
    if (recordTypeSelect) {
      recordTypeSelect.addEventListener('change', function() {
        localStorage.setItem(STORAGE_KEYS.RECORD_TYPE, this.value);
      });
    }
  }

  function getCurrentStaffRows() {
    const rows = $form.querySelectorAll('.staff-row, .labor-row, .worker-row, [class*="staff"] tr, [class*="worker"] tr');
    const staff = [];
    rows.forEach(function(row) {
      const nameInput = row.querySelector('input[name*="name"], input[name*="worker"], select[name*="worker"], select[name*="staff"]');
      const hoursInput = row.querySelector('input[name*="hours"], input[name*="hour"], input[name*="工时"]');
      if (nameInput) {
        staff.push({
          name: nameInput.value || (nameInput.options && nameInput.options[nameInput.selectedIndex]?.text) || '',
          hours: hoursInput ? hoursInput.value : '8'
        });
      }
    });
    return staff;
  }

  function saveCurrentAsTeam() {
    const staff = getCurrentStaffRows().filter(function(s) { return s.name; });
    if (staff.length === 0) {
      alert('请先添加至少一个人员');
      return;
    }
    const teamName = prompt('请输入班组名称：', '班组' + (getTeams().length + 1));
    if (!teamName) return;
    const teams = getTeams();
    teams.push({ name: teamName, members: staff });
    saveTeams(teams);
    refreshTeamPresetBar();
    alert('班组保存成功！');
  }

  function applyTeam(idx) {
    const teams = getTeams();
    const team = teams[idx];
    if (!team) return;
    const addFn = window.addStaffRow || window.addWorkerRow || window.addLaborRow;
    if (addFn) {
      team.members.forEach(function(member) {
        addFn();
        setTimeout(function() {
          const lastRow = $form.querySelectorAll('.staff-row, .labor-row, .worker-row, [class*="staff"] tr, [class*="worker"] tr');
          const row = lastRow[lastRow.length - 1];
          if (row) {
            const nameInput = row.querySelector('input[name*="name"], input[name*="worker"], select[name*="worker"], select[name*="staff"]');
            const hoursInput = row.querySelector('input[name*="hours"], input[name*="hour"], input[name*="工时"]');
            if (nameInput) nameInput.value = member.name;
            if (hoursInput) hoursInput.value = member.hours || '8';
          }
        }, 50);
      });
    }
  }

  function refreshTeamPresetBar() {
    const bar = $form.querySelector('.team-preset-bar');
    if (bar) {
      bar.outerHTML = buildTeamPresetBar();
      bindTeamEvents();
    }
  }

  function bindTeamEvents() {
    const addBtn = $form.querySelector('.add-team-btn');
    if (addBtn) {
      addBtn.onclick = saveCurrentAsTeam;
    }
    const applyBtns = $form.querySelectorAll('.apply-team-btn');
    applyBtns.forEach(function(btn) {
      btn.onclick = function() {
        const idx = parseInt(this.getAttribute('data-idx'));
        applyTeam(idx);
      };
    });
  }

  function splitFormIntoSteps() {
    if (!$form) return;

    const basicFields = $form.querySelectorAll('.form-group, .mb-3, .row > .col-md-6, .row > .col-12');
    const step1Fields = [];
    const step2Fields = [];
    const step3Fields = [];

    let fieldIdx = 0;
    basicFields.forEach(function(field) {
      const hasName = field.querySelector('input[name], select[name], textarea[name]');
      if (!hasName) return;

      if (fieldIdx < 6) {
        step1Fields.push(field);
      } else if (fieldIdx < 12) {
        step2Fields.push(field);
      } else {
        step3Fields.push(field);
      }
      fieldIdx++;
    });

    if (step1Fields.length === 0 && step2Fields.length === 0 && step3Fields.length === 0) return;

    const originalChildren = Array.from($form.children);

    $form.innerHTML = '';

    const stepIndicator = document.createElement('div');
    stepIndicator.innerHTML = buildStepIndicator();
    $form.appendChild(stepIndicator.firstChild);

    STEPS.forEach(function(step, idx) {
      const stepPane = document.createElement('div');
      stepPane.className = 'step-pane';
      stepPane.id = step.id;
      stepPane.style.display = idx === currentStep ? 'block' : 'none';

      if (idx === 1) {
        const teamBar = document.createElement('div');
        teamBar.innerHTML = buildTeamPresetBar();
        stepPane.appendChild(teamBar.firstChild);
      }

      const fields = idx === 0 ? step1Fields : (idx === 1 ? step2Fields : step3Fields);
      fields.forEach(function(field) {
        stepPane.appendChild(field.cloneNode(true));
      });

      $form.appendChild(stepPane);
    });

    const buttonsDiv = document.createElement('div');
    buttonsDiv.innerHTML = buildStepButtons();
    $form.appendChild(buttonsDiv.firstChild);

    bindStepEvents();
    bindTeamEvents();
  }

  function bindStepEvents() {
    const prevBtn = $form.querySelector('.step-prev-btn');
    const nextBtn = $form.querySelector('.step-next-btn');
    const submitBtn = $form.querySelector('.step-submit-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        if (currentStep > 0) {
          goToStep(currentStep - 1);
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (currentStep < STEPS.length - 1) {
          goToStep(currentStep + 1);
        }
      });
    }
    if (submitBtn) {
      submitBtn.addEventListener('click', function() {
        const originalSubmit = $form.querySelector('button[type="submit"]');
        if (originalSubmit) {
          originalSubmit.click();
        } else {
          $form.submit();
        }
      });
    }
  }

  function goToStep(stepIdx) {
    currentStep = stepIdx;
    const panes = $form.querySelectorAll('.step-pane');
    panes.forEach(function(pane, idx) {
      pane.style.display = idx === stepIdx ? 'block' : 'none';
      pane.classList.toggle('active', idx === stepIdx);
    });

    const stepIndicator = $form.querySelector('.work-form-steps');
    if (stepIndicator) {
      stepIndicator.outerHTML = buildStepIndicator();
    }

    const prevBtn = $form.querySelector('.step-prev-btn');
    if (prevBtn && prevBtn.parentElement && prevBtn.parentElement.parentElement) {
      prevBtn.parentElement.parentElement.outerHTML = buildStepButtons();
    }

    bindStepEvents();
  }

  function optimizeForm() {
    $form = document.getElementById('workForm');
    if (!$form || $form._optimized) return;
    $form._optimized = true;

    initSmartDefaults();
    rememberSelections();

    const fieldCount = $form.querySelectorAll('.form-group, .mb-3').length;
    if (fieldCount > 8) {
      splitFormIntoSteps();
    }
  }

  function init() {
    const observer = new MutationObserver(function() {
      optimizeForm();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(optimizeForm, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
 * 模块5：数据联动模块 [部分禁用-API待重写]
 * makeClickableLinks保留（DOM操作），客户/项目详情增强的API调用使用
 * 旧回调风格+旧路径，已禁用。待第二阶段重写为Promise+正确API路径。
 * ============================================================ */
(function() {
  'use strict';
  if (window._dataLinkageDone) return;
  window._dataLinkageDone = true;

  let currentView = null;
  let previousTab = null;

  function formatMoney(amount) {
    return '¥' + Number(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function addBackButton(container, targetTab) {
    if (!container) return;
    if (container.querySelector('.linkage-back-btn')) return;

    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-outline-secondary linkage-back-btn mb-3';
    backBtn.innerHTML = '<i class="bi bi-arrow-left me-1"></i>返回';
    backBtn.onclick = function() {
      if (previousTab && typeof window.showTab === 'function') {
        window.showTab(previousTab);
      }
    };
    container.insertBefore(backBtn, container.firstChild);
  }

  function enhanceCustomerDetail(customerId, customerName) {
    const detailContainer = document.querySelector('.customer-detail, #customerDetail, [class*="customer-detail"]');
    if (!detailContainer) return;

    previousTab = 'customers';
    addBackButton(detailContainer, 'customers');

    if (detailContainer.querySelector('.customer-tabs-enhanced')) return;

    let existingContent = detailContainer.innerHTML;
    let tabsHtml = `
      <div class="customer-tabs-enhanced mb-4">
        <ul class="nav nav-tabs" role="tablist">
          <li class="nav-item">
            <a class="nav-link active" data-bs-toggle="tab" href="#cust-tab-info">基本信息</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" data-bs-toggle="tab" href="#cust-tab-projects">关联项目</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" data-bs-toggle="tab" href="#cust-tab-orders">历史工单</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" data-bs-toggle="tab" href="#cust-tab-receivables">应收款</a>
          </li>
        </ul>
        <div class="tab-content mt-3">
          <div class="tab-pane fade show active" id="cust-tab-info">
            <div class="cust-original-info"></div>
          </div>
          <div class="tab-pane fade" id="cust-tab-projects">
            <div id="cust-projects-loading" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
              <span class="ms-2 text-muted">加载中...</span>
            </div>
            <div id="cust-projects-content"></div>
          </div>
          <div class="tab-pane fade" id="cust-tab-orders">
            <div id="cust-orders-loading" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
              <span class="ms-2 text-muted">加载中...</span>
            </div>
            <div id="cust-orders-content"></div>
          </div>
          <div class="tab-pane fade" id="cust-tab-receivables">
            <div id="cust-receivables-loading" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
              <span class="ms-2 text-muted">加载中...</span>
            </div>
            <div id="cust-receivables-content"></div>
          </div>
        </div>
      </div>
    `;

    detailContainer.innerHTML = tabsHtml;
    const originalInfoDiv = detailContainer.querySelector('.cust-original-info');
    if (originalInfoDiv) {
      originalInfoDiv.innerHTML = existingContent;
    }

    const tabs = detailContainer.querySelectorAll('.nav-tabs .nav-link');
    tabs.forEach(function(tab) {
      tab.addEventListener('shown.bs.tab', function(e) {
        const target = e.target.getAttribute('href');
        if (target === '#cust-tab-projects') {
          loadCustomerProjects(customerId, customerName);
        } else if (target === '#cust-tab-orders') {
          loadCustomerOrders(customerId, customerName);
        } else if (target === '#cust-tab-receivables') {
          loadCustomerReceivables(customerId, customerName);
        }
      });
    });
  }

  function loadCustomerProjects(customerId, customerName) {
    const contentEl = document.getElementById('cust-projects-content');
    const loadingEl = document.getElementById('cust-projects-loading');
    if (!contentEl) return;

    if (contentEl._loaded) return;
    contentEl._loaded = true;

    if (typeof window.apiFetch === 'function' && customerName) {
      window.apiFetch('/api/projects?customer_name=' + encodeURIComponent(customerName) + '&per_page=50')
        .then(function(res) {
          const projects = (res && res.data) || (res && res.list) || (res && res.projects) || [];
          if (Array.isArray(res)) { /* 兼容直接返回数组 */ }
          renderCustomerProjects(Array.isArray(res) ? res : projects);
          if (loadingEl) loadingEl.style.display = 'none';
        })
        .catch(function() {
          if (loadingEl) loadingEl.style.display = 'none';
          contentEl.innerHTML = '<p class="text-muted text-center py-3">加载失败</p>';
        });
    } else {
      if (loadingEl) loadingEl.style.display = 'none';
      contentEl.innerHTML = '<p class="text-muted text-center py-3">暂无项目数据</p>';
    }
  }

  function renderCustomerProjects(projects) {
    const contentEl = document.getElementById('cust-projects-content');
    if (!contentEl) return;

    if (projects.length === 0) {
      contentEl.innerHTML = '<p class="text-muted text-center py-3">暂无关联项目</p>';
      return;
    }

    let html = '<div class="table-responsive"><table class="table table-hover align-middle">';
    html += '<thead class="table-light"><tr><th>项目名称</th><th style="width:120px">状态</th><th style="width:120px">开始日期</th><th style="width:120px" class="text-end">合同金额</th></tr></thead>';
    html += '<tbody>';
    projects.forEach(function(p) {
      html += '<tr style="cursor:pointer;" onclick="window._openProjectDetail(\'' + (p.id || '') + '\')">';
      html += '<td class="fw-medium"><i class="bi bi-folder2-open me-1 text-primary"></i>' + (p.name || p.title || '未命名') + '</td>';
      html += '<td><span class="badge bg-secondary">' + (p.status || '进行中') + '</span></td>';
      html += '<td class="small">' + formatDate(p.startDate || p.createdAt) + '</td>';
      html += '<td class="text-end fw-medium text-primary">' + formatMoney(p.contractAmount || p.amount || 0) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    contentEl.innerHTML = html;
  }

  function loadCustomerOrders(customerId, customerName) {
    const contentEl = document.getElementById('cust-orders-content');
    const loadingEl = document.getElementById('cust-orders-loading');
    if (!contentEl) return;

    if (contentEl._loaded) return;
    contentEl._loaded = true;

    if (typeof window.apiFetch === 'function' && customerName) {
      window.apiFetch('/api/records?customer_name=' + encodeURIComponent(customerName) + '&per_page=50')
        .then(function(res) {
          const orders = (res && res.data) || (res && res.list) || (res && res.records) || [];
          renderCustomerOrders(Array.isArray(res) ? res : orders);
          if (loadingEl) loadingEl.style.display = 'none';
        })
        .catch(function() {
          if (loadingEl) loadingEl.style.display = 'none';
          contentEl.innerHTML = '<p class="text-muted text-center py-3">加载失败</p>';
        });
    } else {
      if (loadingEl) loadingEl.style.display = 'none';
      contentEl.innerHTML = '<p class="text-muted text-center py-3">暂无工单数据</p>';
    }
  }

  function renderCustomerOrders(orders) {
    const contentEl = document.getElementById('cust-orders-content');
    if (!contentEl) return;

    if (orders.length === 0) {
      contentEl.innerHTML = '<p class="text-muted text-center py-3">暂无历史工单</p>';
      return;
    }

    let html = '<div class="table-responsive"><table class="table table-hover align-middle">';
    html += '<thead class="table-light"><tr><th>工单号</th><th>标题</th><th style="width:100px">类型</th><th style="width:100px">状态</th><th style="width:110px">日期</th></tr></thead>';
    html += '<tbody>';
    orders.forEach(function(o) {
      html += '<tr style="cursor:pointer;" onclick="window._openWorkOrderDetail(\'' + (o.id || '') + '\')">';
      html += '<td class="fw-medium text-primary">' + (o.orderNo || o.id || '-') + '</td>';
      html += '<td>' + (o.title || o.name || '-') + '</td>';
      html += '<td><span class="badge bg-info bg-opacity-10 text-info">' + (o.type || '-') + '</span></td>';
      html += '<td><span class="badge bg-secondary">' + (o.status || '-') + '</span></td>';
      html += '<td class="small">' + formatDate(o.date || o.createdAt) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    contentEl.innerHTML = html;
  }

  function loadCustomerReceivables(customerId, customerName) {
    const contentEl = document.getElementById('cust-receivables-content');
    const loadingEl = document.getElementById('cust-receivables-loading');
    if (!contentEl) return;

    if (contentEl._loaded) return;
    contentEl._loaded = true;

    if (typeof window.apiFetch === 'function' && customerName) {
      window.apiFetch('/api/payments?customer_name=' + encodeURIComponent(customerName) + '&per_page=100')
        .then(function(res) {
          const receipts = (res && res.data) || (res && res.list) || (res && res.payments) || [];
          renderCustomerReceivables(Array.isArray(res) ? res : receipts);
          if (loadingEl) loadingEl.style.display = 'none';
        })
        .catch(function() {
          if (loadingEl) loadingEl.style.display = 'none';
          contentEl.innerHTML = '<p class="text-muted text-center py-3">加载失败</p>';
        });
    } else {
      if (loadingEl) loadingEl.style.display = 'none';
      contentEl.innerHTML = '<p class="text-muted text-center py-3">暂无收款数据</p>';
    }
  }

  function renderCustomerReceivables(receipts) {
    const contentEl = document.getElementById('cust-receivables-content');
    if (!contentEl) return;

    let totalReceived = 0;
    receipts.forEach(function(r) { totalReceived += Number(r.amount || 0); });

    if (receipts.length === 0) {
      contentEl.innerHTML = '<p class="text-muted text-center py-3">暂无收款记录</p>';
      return;
    }

    let html = '<div class="alert alert-info mb-3"><i class="bi bi-info-circle me-1"></i>累计收款：<strong>' + formatMoney(totalReceived) + '</strong></div>';
    html += '<div class="table-responsive"><table class="table table-hover align-middle">';
    html += '<thead class="table-light"><tr><th>日期</th><th>说明</th><th style="width:100px">方式</th><th style="width:120px" class="text-end">金额</th></tr></thead>';
    html += '<tbody>';
    receipts.forEach(function(r) {
      html += '<tr>';
      html += '<td class="small">' + formatDate(r.date || r.paymentDate || r.createdAt) + '</td>';
      html += '<td>' + (r.remark || r.description || '-') + '</td>';
      html += '<td>' + (r.method || r.paymentMethod || '-') + '</td>';
      html += '<td class="text-end fw-medium text-success">' + formatMoney(r.amount || 0) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    contentEl.innerHTML = html;
  }

  function enhanceProjectDetail(projectId, projectData) {
    return; // 止血：旧回调API待重写
    const detailContainer = document.querySelector('.project-detail, #projectDetail, [class*="project-detail"]');
    if (!detailContainer) return;

    previousTab = 'projects';
    addBackButton(detailContainer, 'projects');

    if (detailContainer.querySelector('.project-finance-card')) return;

    const financeCard = document.createElement('div');
    financeCard.className = 'project-finance-card card border-0 shadow-sm mb-4';
    financeCard.innerHTML = `
      <div class="card-body">
        <h6 class="card-title mb-3"><i class="bi bi-calculator me-1 text-primary"></i>收支汇总</h6>
        <div id="proj-finance-loading" class="text-center py-2">
          <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
          <span class="ms-2 text-muted small">计算中...</span>
        </div>
        <div id="proj-finance-content" style="display:none;"></div>
      </div>
    `;

    detailContainer.insertBefore(financeCard, detailContainer.firstChild);
    loadProjectFinance(projectId);
  }

  function loadProjectFinance(projectId) {
    const contentEl = document.getElementById('proj-finance-content');
    const loadingEl = document.getElementById('proj-finance-loading');

    Promise.all([
      fetchProjectReceipts(projectId),
      fetchProjectExpenses(projectId),
      fetchProjectSalary(projectId)
    ]).then(function(results) {
      const receipts = results[0] || [];
      const expenses = results[1] || [];
      const salary = results[2] || [];

      let totalReceipt = 0, totalExpense = 0, totalSalary = 0;
      receipts.forEach(function(r) { totalReceipt += Number(r.amount || 0); });
      expenses.forEach(function(e) { totalExpense += Number(e.amount || 0); });
      salary.forEach(function(s) { totalSalary += Number(s.amount || 0); });

      const profit = totalReceipt - totalExpense - totalSalary;

      let html = '<div class="row g-2">';
      html += '<div class="col-md-3 col-6"><div class="text-center p-2 bg-light rounded-2">';
      html += '<div class="text-muted small">合同金额</div>';
      html += '<div class="fw-bold text-primary mt-1">--</div>';
      html += '</div></div>';
      html += '<div class="col-md-3 col-6"><div class="text-center p-2 bg-success bg-opacity-10 rounded-2">';
      html += '<div class="text-muted small">已收款</div>';
      html += '<div class="fw-bold text-success mt-1">' + formatMoney(totalReceipt) + '</div>';
      html += '</div></div>';
      html += '<div class="col-md-2 col-4"><div class="text-center p-2 bg-danger bg-opacity-10 rounded-2">';
      html += '<div class="text-muted small">总支出</div>';
      html += '<div class="fw-bold text-danger mt-1">' + formatMoney(totalExpense) + '</div>';
      html += '</div></div>';
      html += '<div class="col-md-2 col-4"><div class="text-center p-2 bg-warning bg-opacity-10 rounded-2">';
      html += '<div class="text-muted small">总工资</div>';
      html += '<div class="fw-bold text-warning mt-1">' + formatMoney(totalSalary) + '</div>';
      html += '</div></div>';
      html += '<div class="col-md-2 col-4"><div class="text-center p-2 bg-primary bg-opacity-10 rounded-2">';
      html += '<div class="text-muted small">利润</div>';
      html += '<div class="fw-bold ' + (profit >= 0 ? 'text-primary' : 'text-danger') + ' mt-1">' + formatMoney(profit) + '</div>';
      html += '</div></div>';
      html += '</div>';

      if (contentEl) {
        contentEl.innerHTML = html;
        contentEl.style.display = 'block';
      }
      if (loadingEl) loadingEl.style.display = 'none';
    });
  }

  function fetchProjectReceipts(projectId) {
    return new Promise(function(resolve) {
      if (typeof window.apiFetch === 'function') {
        window.apiFetch('/api/projects/' + projectId + '/records?per_page=1000').then(function(res) {
          resolve((res && res.records) || []);
        }).catch(function() { resolve([]); });
      } else {
        resolve([]);
      }
    });
  }

  function fetchProjectExpenses(projectId) {
    return new Promise(function(resolve) {
      if (typeof window.apiFetch === 'function') {
        window.apiFetch('/api/projects/' + projectId + '/expenses?per_page=1000').then(function(res) {
          resolve((res && res.records) || []);
        }).catch(function() { resolve([]); });
      } else {
        resolve([]);
      }
    });
  }

  function fetchProjectSalary(projectId) {
    return new Promise(function(resolve) {
      if (typeof window.apiFetch === 'function') {
        window.apiFetch('/api/projects/' + projectId + '/salaries?per_page=1000').then(function(res) {
          resolve((res && res.records) || []);
        }).catch(function() { resolve([]); });
      } else {
        resolve([]);
      }
    });
  }

  function makeClickableLinks() {
    const observer = new MutationObserver(function() {
      document.querySelectorAll('[class*="customer-name"], [class*="customerName"], .customer-link').forEach(function(el) {
        if (el._linkEnhanced) return;
        el._linkEnhanced = true;
        el.style.cursor = 'pointer';
        el.style.color = '#0d6efd';
        el.addEventListener('click', function() {
          const custId = this.getAttribute('data-customer-id') || this.getAttribute('data-cust-id');
          const custName = this.getAttribute('data-customer-name') || this.textContent.trim();
          if (custId) {
            window._openCustomerDetail(custId, custName);
          }
        });
      });

      document.querySelectorAll('[class*="project-name"], [class*="projectName"], .project-link').forEach(function(el) {
        if (el._linkEnhanced) return;
        el._linkEnhanced = true;
        el.style.cursor = 'pointer';
        el.style.color = '#0d6efd';
        el.addEventListener('click', function() {
          const projId = this.getAttribute('data-project-id') || this.getAttribute('data-proj-id');
          if (projId) {
            window._openProjectDetail(projId);
          }
        });
      });

      document.querySelectorAll('[class*="order-no"], [class*="orderNo"], .workorder-link, [class*="工单"]').forEach(function(el) {
        if (el._linkEnhanced) return;
        el._linkEnhanced = true;
        el.style.cursor = 'pointer';
        el.style.color = '#0d6efd';
        el.addEventListener('click', function() {
          const orderId = this.getAttribute('data-order-id') || this.getAttribute('data-workorder-id');
          if (orderId) {
            window._openWorkOrderDetail(orderId);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window._openCustomerDetail = function(customerId, customerName) {
    currentView = { type: 'customer', id: customerId };
    if (typeof window.showCustomerDetail === 'function') {
      window.showCustomerDetail(customerId);
    }
    setTimeout(function() {
      enhanceCustomerDetail(customerId, customerName);
    }, 300);
  };

  window._openProjectDetail = function(projectId) {
    currentView = { type: 'project', id: projectId };
    if (typeof window.showProjectDetail === 'function') {
      window.showProjectDetail(projectId);
    }
    setTimeout(function() {
      enhanceProjectDetail(projectId);
    }, 300);
  };

  window._openWorkOrderDetail = function(orderId) {
    currentView = { type: 'workorder', id: orderId };
    if (typeof window.showWorkOrderDetail === 'function') {
      window.showWorkOrderDetail(orderId);
    }
  };

  function init() {
    makeClickableLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
 * 模块6：统计图表模块 [已禁用-v2接管]
 * 此模块使用mock随机数据渲染图表，v2增强模块(enhanceStatsPage)已使用真实API数据接管
 * 保留代码备查，不再执行
 * ============================================================ */
(function() {
  'use strict';
  return; // 止血清理：禁用mock图表模块，v2接管
  if (window._statsChartsDone) return;
  window._statsChartsDone = true;

  const CHART_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  let chartJsLoaded = false;
  let currentPeriod = 'month';
  let chartInstances = {};

  const PERIODS = [
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季' },
    { value: 'year', label: '本年' },
    { value: 'all', label: '全部' }
  ];

  const CHART_COLORS = [
    'rgba(13, 110, 253, 0.8)',
    'rgba(25, 135, 84, 0.8)',
    'rgba(220, 53, 69, 0.8)',
    'rgba(255, 193, 7, 0.8)',
    'rgba(111, 66, 193, 0.8)',
    'rgba(13, 202, 240, 0.8)',
    'rgba(248, 249, 250, 0.8)',
    'rgba(108, 117, 125, 0.8)'
  ];

  function loadChartJS() {
    return new Promise(function(resolve, reject) {
      if (window.Chart) {
        chartJsLoaded = true;
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = CHART_CDN;
      script.onload = function() {
        chartJsLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function getPeriodRange(period) {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'all':
      default:
        start = new Date(2000, 0, 1);
        end = new Date(2099, 11, 31);
        break;
    }
    return { start: start, end: end };
  }

  function formatDateLabel(d, period) {
    const date = new Date(d);
    switch (period) {
      case 'month':
        return date.getDate() + '日';
      case 'quarter':
      case 'year':
        return (date.getMonth() + 1) + '月';
      case 'all':
        return date.getFullYear() + '年';
      default:
        return date.toLocaleDateString();
    }
  }

  function mockMonthlyTrendData(period) {
    const range = getPeriodRange(period);
    const labels = [];
    const incomeData = [];
    const expenseData = [];

    if (period === 'month') {
      const daysInMonth = range.end.getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        labels.push(i + '日');
        incomeData.push(Math.round(Math.random() * 5000 + 1000));
        expenseData.push(Math.round(Math.random() * 3000 + 500));
      }
    } else if (period === 'quarter') {
      const months = [];
      for (let m = range.start.getMonth(); m <= range.end.getMonth(); m++) {
        months.push((m + 1) + '月');
        labels.push((m + 1) + '月');
        incomeData.push(Math.round(Math.random() * 80000 + 30000));
        expenseData.push(Math.round(Math.random() * 50000 + 20000));
      }
    } else if (period === 'year') {
      for (let m = 0; m < 12; m++) {
        labels.push((m + 1) + '月');
        incomeData.push(Math.round(Math.random() * 100000 + 50000));
        expenseData.push(Math.round(Math.random() * 60000 + 30000));
      }
    } else {
      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 4; y <= currentYear; y++) {
        labels.push(y + '年');
        incomeData.push(Math.round(Math.random() * 800000 + 300000));
        expenseData.push(Math.round(Math.random() * 500000 + 200000));
      }
    }

    return { labels: labels, income: incomeData, expense: expenseData };
  }

  function mockProjectProfitData() {
    const projects = ['项目A', '项目B', '项目C', '项目D', '项目E', '项目F', '项目G', '项目H'];
    const profits = projects.map(function() {
      return Math.round(Math.random() * 50000 - 10000);
    });
    return { labels: projects, data: profits };
  }

  function mockExpenseCategoryData() {
    const categories = ['人工', '材料', '设备', '交通', '餐饮', '其他'];
    const data = categories.map(function() {
      return Math.round(Math.random() * 20000 + 5000);
    });
    return { labels: categories, data: data };
  }

  function mockWorkOrderTypeData() {
    const types = ['安装', '维修', '调试', '巡检', '改造', '其他'];
    const data = types.map(function() {
      return Math.round(Math.random() * 50 + 10);
    });
    return { labels: types, data: data };
  }

  function mockCustomerReceiptData() {
    const customers = ['客户甲', '客户乙', '客户丙', '客户丁', '客户戊', '客户己', '客户庚', '客户辛'];
    const receipts = customers.map(function() {
      return Math.round(Math.random() * 100000 + 20000);
    });
    const sorted = customers.map(function(c, i) {
      return { name: c, value: receipts[i] };
    }).sort(function(a, b) {
      return a.value - b.value;
    });
    return {
      labels: sorted.map(function(s) { return s.name; }),
      data: sorted.map(function(s) { return s.value; })
    };
  }

  function destroyChart(id) {
    if (chartInstances[id]) {
      chartInstances[id].destroy();
      delete chartInstances[id];
    }
  }

  function renderMonthlyTrendChart(ctx, data) {
    destroyChart('monthlyTrend');
    chartInstances['monthlyTrend'] = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: '收入',
            data: data.income,
            borderColor: 'rgba(25, 135, 84, 1)',
            backgroundColor: 'rgba(25, 135, 84, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: '支出',
            data: data.expense,
            borderColor: 'rgba(220, 53, 69, 1)',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '¥' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  function renderProjectProfitChart(ctx, data) {
    destroyChart('projectProfit');
    chartInstances['projectProfit'] = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: '利润',
          data: data.data,
          backgroundColor: data.data.map(function(v) {
            return v >= 0 ? 'rgba(13, 110, 253, 0.7)' : 'rgba(220, 53, 69, 0.7)';
          }),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '¥' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  function renderExpenseCategoryChart(ctx, data) {
    destroyChart('expenseCategory');
    chartInstances['expenseCategory'] = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: CHART_COLORS,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' }
        },
        cutout: '60%'
      }
    });
  }

  function renderWorkOrderTypeChart(ctx, data) {
    destroyChart('workOrderType');
    chartInstances['workOrderType'] = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: CHART_COLORS,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' }
        },
        cutout: '60%'
      }
    });
  }

  function renderCustomerReceiptChart(ctx, data) {
    destroyChart('customerReceipt');
    chartInstances['customerReceipt'] = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: '收款金额',
          data: data.data,
          backgroundColor: 'rgba(25, 135, 84, 0.7)',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '¥' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  function buildChartsPage() {
    const tabContent = document.querySelector('.tab-content, #tabContent, .main-content');
    if (!tabContent) return;

    let container = document.getElementById('tab-advanced-stats');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tab-advanced-stats';
      container.className = 'tab-pane fade';
      tabContent.appendChild(container);
    }

    container.innerHTML = `
      <div class="container-fluid py-4">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h3 class="mb-1">高级统计</h3>
            <p class="text-muted mb-0">多维度数据分析</p>
          </div>
          <div class="btn-group period-selector" role="group">
            ${PERIODS.map(function(p) {
              return '<button type="button" class="btn btn-outline-primary period-btn ' + (p.value === currentPeriod ? 'active' : '') + '" data-period="' + p.value + '">' + p.label + '</button>';
            }).join('')}
          </div>
        </div>
        <div id="charts-loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
          <p class="mt-3 text-muted">正在加载图表...</p>
        </div>
        <div id="charts-container" style="display:none;">
          <div class="row g-3">
            <div class="col-lg-8">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-header bg-white py-3">
                  <h6 class="mb-0"><i class="bi bi-graph-up me-1"></i>月度收支趋势</h6>
                </div>
                <div class="card-body">
                  <div style="height:300px;"><canvas id="chart-monthly-trend"></canvas></div>
                </div>
              </div>
            </div>
            <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-header bg-white py-3">
                  <h6 class="mb-0"><i class="bi bi-pie-chart me-1"></i>支出分类占比</h6>
                </div>
                <div class="card-body">
                  <div style="height:300px;"><canvas id="chart-expense-category"></canvas></div>
                </div>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="card border-0 shadow-sm">
                <div class="card-header bg-white py-3">
                  <h6 class="mb-0"><i class="bi bi-bar-chart me-1"></i>项目利润排行</h6>
                </div>
                <div class="card-body">
                  <div style="height:280px;"><canvas id="chart-project-profit"></canvas></div>
                </div>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="card border-0 shadow-sm">
                <div class="card-header bg-white py-3">
                  <h6 class="mb-0"><i class="bi bi-pie-chart-fill me-1"></i>工单类型分布</h6>
                </div>
                <div class="card-body">
                  <div style="height:280px;"><canvas id="chart-workorder-type"></canvas></div>
                </div>
              </div>
            </div>
            <div class="col-12">
              <div class="card border-0 shadow-sm">
                <div class="card-header bg-white py-3">
                  <h6 class="mb-0"><i class="bi bi-bar-chart-steps me-1"></i>客户收款排行</h6>
                </div>
                <div class="card-body">
                  <div style="height:320px;"><canvas id="chart-customer-receipt"></canvas></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindPeriodEvents();
    loadAndRenderCharts();
  }

  function bindPeriodEvents() {
    const btns = document.querySelectorAll('.period-btn');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        const period = this.getAttribute('data-period');
        if (period === currentPeriod) return;
        currentPeriod = period;
        document.querySelectorAll('.period-btn').forEach(function(b) {
          b.classList.toggle('active', b.getAttribute('data-period') === period);
        });
        loadAndRenderCharts();
      });
    });
  }

  function loadAndRenderCharts() {
    const loadingEl = document.getElementById('charts-loading');
    const containerEl = document.getElementById('charts-container');
    if (loadingEl) loadingEl.style.display = 'block';
    if (containerEl) containerEl.style.display = 'none';

    loadChartJS().then(function() {
      const trendData = mockMonthlyTrendData(currentPeriod);
      const profitData = mockProjectProfitData();
      const expenseCatData = mockExpenseCategoryData();
      const woTypeData = mockWorkOrderTypeData();
      const custReceiptData = mockCustomerReceiptData();

      const trendCtx = document.getElementById('chart-monthly-trend');
      const profitCtx = document.getElementById('chart-project-profit');
      const expenseCtx = document.getElementById('chart-expense-category');
      const woTypeCtx = document.getElementById('chart-workorder-type');
      const custReceiptCtx = document.getElementById('chart-customer-receipt');

      if (trendCtx) renderMonthlyTrendChart(trendCtx.getContext('2d'), trendData);
      if (profitCtx) renderProjectProfitChart(profitCtx.getContext('2d'), profitData);
      if (expenseCtx) renderExpenseCategoryChart(expenseCtx.getContext('2d'), expenseCatData);
      if (woTypeCtx) renderWorkOrderTypeChart(woTypeCtx.getContext('2d'), woTypeData);
      if (custReceiptCtx) renderCustomerReceiptChart(custReceiptCtx.getContext('2d'), custReceiptData);

      if (loadingEl) loadingEl.style.display = 'none';
      if (containerEl) containerEl.style.display = 'block';
    }).catch(function() {
      if (loadingEl) {
        loadingEl.innerHTML = '<p class="text-danger">图表库加载失败，请检查网络连接</p>';
      }
    });
  }

  const originalShowTab = window.showTab;
  window.showTab = function(tabName) {
    if (tabName === 'advanced-stats') {
      buildChartsPage();
      setTimeout(function() {
        const pane = document.getElementById('tab-advanced-stats');
        if (pane) {
          document.querySelectorAll('.tab-pane').forEach(function(p) { p.classList.remove('show', 'active'); });
          pane.classList.add('show', 'active');
        }
      }, 50);
      return;
    }
    if (originalShowTab) {
      return originalShowTab.apply(this, arguments);
    }
  };

  function init() {
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
 * 模块7：体验优化模块
 * ============================================================ */
(function() {
  'use strict';
  if (window._uxOptimizationDone) return;
  window._uxOptimizationDone = true;

  const NOTIFICATION_KEY = 'ux_notifications';
  const NOTIFICATION_READ_KEY = 'ux_notifications_read';

  function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;

    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : type === 'warning' ? 'bg-warning text-dark' : 'bg-primary';
    const iconClass = type === 'success' ? 'bi-check-circle-fill' : type === 'error' ? 'bi-x-circle-fill' : type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';

    toast.className = 'toast align-items-center text-white ' + bgClass + ' border-0 mb-2 show';
    toast.style.cssText = 'min-width:250px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi ${iconClass} me-2"></i>${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function() { toast.remove(); }, 300);
    }, duration);
  }

  window._showToast = showToast;

  function showConfirmDialog(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-body py-4">
            <div class="d-flex">
              <div class="flex-shrink-0">
                <div class="bg-danger bg-opacity-10 rounded-circle p-3">
                  <i class="bi bi-exclamation-triangle-fill text-danger fs-3"></i>
                </div>
              </div>
              <div class="flex-grow-1 ms-3">
                <h6 class="mb-1">确认操作</h6>
                <p class="text-muted mb-0 small">${message}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-danger confirm-btn">确认删除</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    if (window.bootstrap && window.bootstrap.Modal) {
      const bsModal = new window.bootstrap.Modal(modal);
      bsModal.show();
    } else {
      modal.classList.add('show');
      modal.style.display = 'block';
      modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    }

    const confirmBtn = modal.querySelector('.confirm-btn');
    confirmBtn.addEventListener('click', function() {
      if (onConfirm) onConfirm();
      if (window.bootstrap && window.bootstrap.Modal) {
        const bsModal = window.bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
      }
      setTimeout(function() { modal.remove(); }, 300);
    });
  }

  window._showConfirmDialog = showConfirmDialog;

  function enhancePhotoUpload() {
    const observer = new MutationObserver(function() {
      const uploadInputs = document.querySelectorAll('input[type="file"][accept*="image"], .photo-upload input[type="file"], .image-upload input[type="file"]');
      uploadInputs.forEach(function(input) {
        if (input._photoEnhanced) return;
        input._photoEnhanced = true;
        input.multiple = true;
        if (!input.getAttribute('capture')) {
          input.setAttribute('capture', 'environment');
        }

        input.addEventListener('change', function(e) {
          const files = Array.from(e.target.files || []);
          if (files.length === 0) return;

          const container = input.closest('.photo-upload, .image-upload, .upload-container') || input.parentElement;
          let previewArea = container.querySelector('.photo-preview-area');
          if (!previewArea) {
            previewArea = document.createElement('div');
            previewArea.className = 'photo-preview-area d-flex flex-wrap gap-2 mt-2';
            container.appendChild(previewArea);
          }

          files.forEach(function(file) {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = function(ev) {
              const img = new Image();
              img.onload = function() {
                const canvas = document.createElement('canvas');
                const maxSize = 1280;
                let width = img.width;
                let height = img.height;

                if (width > height && width > maxSize) {
                  height = height * (maxSize / width);
                  width = maxSize;
                } else if (height > maxSize) {
                  width = width * (maxSize / height);
                  height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                addPhotoPreview(previewArea, compressedDataUrl);
              };
              img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
          });
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function addPhotoPreview(container, dataUrl) {
    const wrap = document.createElement('div');
    wrap.className = 'photo-preview-item position-relative';
    wrap.style.cssText = 'width:80px;height:80px;border-radius:6px;overflow:hidden;border:1px solid #dee2e6;cursor:pointer;';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    img.addEventListener('click', function() {
      showImageViewer(dataUrl);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-sm btn-danger position-absolute top-0 end-0';
    delBtn.style.cssText = 'width:20px;height:20px;padding:0;font-size:10px;line-height:1;border-radius:0 0 0 4px;';
    delBtn.innerHTML = '<i class="bi bi-x"></i>';
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      wrap.remove();
    });

    wrap.appendChild(img);
    wrap.appendChild(delBtn);
    container.appendChild(wrap);
  }

  function showImageViewer(src) {
    const viewer = document.createElement('div');
    viewer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
    viewer.innerHTML = `<img src="${src}" style="max-width:90%;max-height:90%;object-fit:contain;">`;
    viewer.addEventListener('click', function() { viewer.remove(); });
    document.body.appendChild(viewer);
  }

  function enhanceDatePickers() {
    const observer = new MutationObserver(function() {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      dateInputs.forEach(function(input) {
        if (input._dateEnhanced) return;
        input._dateEnhanced = true;

        const wrap = document.createElement('div');
        wrap.className = 'position-relative d-inline-block';
        wrap.style.width = '100%';

        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);

        const todayBtn = document.createElement('button');
        todayBtn.type = 'button';
        todayBtn.className = 'btn btn-sm btn-outline-primary position-absolute';
        todayBtn.style.cssText = 'right:2px;top:50%;transform:translateY(-50%);font-size:11px;padding:2px 6px;z-index:5;';
        todayBtn.innerHTML = '今天';
        todayBtn.addEventListener('click', function() {
          const d = new Date();
          input.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        wrap.appendChild(todayBtn);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function getNotifications() {
    try {
      return JSON.parse(localStorage.getItem(NOTIFICATION_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveNotifications(notifs) {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifs));
  }

  function getReadIds() {
    try {
      return JSON.parse(localStorage.getItem(NOTIFICATION_READ_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveReadIds(ids) {
    localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(ids));
  }

  function addNotification(title, content, type) {
    const notifs = getNotifications();
    const newNotif = {
      id: Date.now(),
      title: title,
      content: content,
      type: type || 'info',
      time: new Date().toISOString(),
      read: false
    };
    notifs.unshift(newNotif);
    saveNotifications(notifs.slice(0, 100));
    updateNotificationBadge();
    showNewNotificationToast(newNotif);
  }

  window._addNotification = addNotification;

  function showNewNotificationToast(notif) {
    showToast(notif.title, notif.type, 4000);
  }

  function getUnreadCount() {
    const notifs = getNotifications();
    const readIds = getReadIds();
    return notifs.filter(function(n) { return readIds.indexOf(n.id) === -1; }).length;
  }

  function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge, #notificationBadge');
    if (badge) {
      const count = getUnreadCount();
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  function buildNotificationBell() {
    const navbar = document.querySelector('.navbar-nav, .navbar .ms-auto, .topbar-right');
    if (!navbar) return;
    if (document.querySelector('.notification-bell-wrapper')) return;

    const wrapper = document.createElement('li');
    wrapper.className = 'nav-item notification-bell-wrapper me-2';
    wrapper.innerHTML = `
      <a class="nav-link position-relative" href="#" id="notificationBell" role="button" data-bs-toggle="dropdown">
        <i class="bi bi-bell fs-5"></i>
        <span class="notification-badge badge bg-danger position-absolute top-0 end-0" style="font-size:10px;padding:2px 5px;display:none;">0</span>
      </a>
      <div class="dropdown-menu dropdown-menu-end shadow-lg p-0" style="width:360px;max-height:500px;overflow:hidden;">
        <div class="p-3 border-bottom d-flex align-items-center justify-content-between">
          <h6 class="mb-0">通知中心</h6>
          <button class="btn btn-sm btn-link text-decoration-none mark-all-read-btn" style="font-size:12px;">全部已读</button>
        </div>
        <div class="notification-list overflow-y-auto" style="max-height:400px;"></div>
        <div class="p-2 border-top text-center">
          <button class="btn btn-sm btn-link text-decoration-none view-all-notif-btn" style="font-size:12px;">查看全部</button>
        </div>
      </div>
    `;

    navbar.insertBefore(wrapper, navbar.firstChild);

    const bell = wrapper.querySelector('#notificationBell');
    bell.addEventListener('click', function(e) {
      e.preventDefault();
      renderNotificationList();
    });

    const markAllBtn = wrapper.querySelector('.mark-all-read-btn');
    markAllBtn.addEventListener('click', function() {
      const notifs = getNotifications();
      const readIds = notifs.map(function(n) { return n.id; });
      saveReadIds(readIds);
      updateNotificationBadge();
      renderNotificationList();
    });

    updateNotificationBadge();
  }

  function renderNotificationList() {
    const listEl = document.querySelector('.notification-list');
    if (!listEl) return;

    const notifs = getNotifications();
    const readIds = getReadIds();

    if (notifs.length === 0) {
      listEl.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-inbox fs-1"></i><p class="mt-2 mb-0 small">暂无通知</p></div>';
      return;
    }

    let html = '';
    notifs.slice(0, 20).forEach(function(n) {
      const isRead = readIds.indexOf(n.id) !== -1;
      const iconClass = n.type === 'success' ? 'bi-check-circle text-success' : n.type === 'warning' ? 'bi-exclamation-triangle text-warning' : n.type === 'error' ? 'bi-x-circle text-danger' : 'bi-info-circle text-primary';
      const timeStr = formatNotificationTime(n.time);

      html += `
        <div class="notification-item p-3 border-bottom ${isRead ? '' : 'bg-primary bg-opacity-5'}" data-id="${n.id}" style="cursor:pointer;">
          <div class="d-flex">
            <div class="flex-shrink-0 pt-1"><i class="bi ${iconClass} fs-5"></i></div>
            <div class="flex-grow-1 ms-2">
              <div class="d-flex align-items-center justify-content-between">
                <span class="fw-medium small">${n.title}</span>
                <span class="text-muted" style="font-size:11px;">${timeStr}</span>
              </div>
              <p class="mb-0 text-muted small mt-1" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${n.content}</p>
            </div>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;

    listEl.querySelectorAll('.notification-item').forEach(function(item) {
      item.addEventListener('click', function() {
        const id = parseInt(this.getAttribute('data-id'));
        markAsRead(id);
      });
    });
  }

  function markAsRead(id) {
    const readIds = getReadIds();
    if (readIds.indexOf(id) === -1) {
      readIds.push(id);
      saveReadIds(readIds);
      updateNotificationBadge();
      renderNotificationList();
    }
  }

  function formatNotificationTime(isoStr) {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 86400000 * 7) return Math.floor(diff / 86400000) + '天前';
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function buildDashboardCalendar() {
    const dashboard = document.getElementById('tab-dashboard') || document.querySelector('.dashboard-container, [class*="dashboard"]');
    if (!dashboard) return;
    if (dashboard.querySelector('.mini-calendar-widget')) return;

    const calendar = document.createElement('div');
    calendar.className = 'mini-calendar-widget card border-0 shadow-sm mb-4';
    calendar.innerHTML = `
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h6 class="card-title mb-0"><i class="bi bi-calendar3 me-1 text-primary"></i>日历</h6>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-secondary prev-month-btn"><i class="bi bi-chevron-left"></i></button>
            <span class="current-month-label fw-medium mx-2"></span>
            <button class="btn btn-sm btn-outline-secondary next-month-btn"><i class="bi bi-chevron-right"></i></button>
          </div>
        </div>
        <div class="mini-calendar-grid"></div>
      </div>
    `;

    const sidebar = dashboard.querySelector('.col-md-3, .sidebar, [class*="side"]');
    if (sidebar) {
      sidebar.insertBefore(calendar, sidebar.firstChild);
    }

    let viewDate = new Date();
    renderMiniCalendar(viewDate);

    calendar.querySelector('.prev-month-btn').addEventListener('click', function() {
      viewDate.setMonth(viewDate.getMonth() - 1);
      renderMiniCalendar(viewDate);
    });
    calendar.querySelector('.next-month-btn').addEventListener('click', function() {
      viewDate.setMonth(viewDate.getMonth() + 1);
      renderMiniCalendar(viewDate);
    });
  }

  function renderMiniCalendar(date) {
    const widget = document.querySelector('.mini-calendar-widget');
    if (!widget) return;

    const label = widget.querySelector('.current-month-label');
    const grid = widget.querySelector('.mini-calendar-grid');

    const year = date.getFullYear();
    const month = date.getMonth();
    label.textContent = year + '年' + (month + 1) + '月';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate();

    const workOrderDays = mockWorkOrderDays(year, month);

    let html = '<div class="row text-center g-0 mb-1">';
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(function(d, i) {
      html += '<div class="col small ' + (i === 0 || i === 6 ? 'text-danger' : 'text-muted') + '" style="padding:4px 0;">' + d + '</div>';
    });
    html += '</div>';

    html += '<div class="row text-center g-0">';
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="col" style="padding:4px 0;"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, month, day).getDay();
      const dateStr = year + '-' + month + '-' + day;
      const isToday = dateStr === todayStr;
      const hasWorkOrder = workOrderDays.indexOf(day) !== -1;

      let classes = 'col small ';
      if (isToday) classes += 'bg-primary text-white rounded-circle ';
      else if (dayOfWeek === 0 || dayOfWeek === 6) classes += 'text-danger ';
      else classes += '';

      html += '<div class="' + classes + '" style="padding:6px 0;position:relative;margin:1px;cursor:pointer;">';
      html += day;
      if (hasWorkOrder && !isToday) {
        html += '<span style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;background:#198754;border-radius:50%;"></span>';
      }
      html += '</div>';

      if ((firstDay + day) % 7 === 0 && day < daysInMonth) {
        html += '</div><div class="row text-center g-0">';
      }
    }
    html += '</div>';

    grid.innerHTML = html;
  }

  function mockWorkOrderDays(year, month) {
    const days = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const count = Math.floor(Math.random() * 10 + 5);
    for (let i = 0; i < count; i++) {
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      if (days.indexOf(day) === -1) days.push(day);
    }
    return days;
  }

  function enhanceDeleteButtons() {
    const observer = new MutationObserver(function() {
      const deleteBtns = document.querySelectorAll('button.btn-danger, .delete-btn, [onclick*="delete"], [onclick*="remove"]');
      deleteBtns.forEach(function(btn) {
        if (btn._deleteEnhanced) return;
        const text = btn.textContent.toLowerCase();
        if (text.indexOf('删除') === -1 && text.indexOf('delete') === -1) return;

        btn._deleteEnhanced = true;
        const originalClick = btn.getAttribute('onclick');
        btn.removeAttribute('onclick');

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          showConfirmDialog('确定要删除吗？此操作不可撤销。', function() {
            if (originalClick) {
              const fn = new Function(originalClick);
              fn.call(btn);
            }
          });
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function showWelcomeToast() {
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;';
      document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-primary border-0 mb-2 show';
    toast.style.cssText = 'min-width:320px;max-width:380px;box-shadow:0 4px 16px rgba(0,0,0,0.2);opacity:1;transition:opacity 0.4s;';
    toast.innerHTML = '<div class="d-flex">' +
      '<div class="toast-body">' +
        '<div class="fw-semibold mb-1"><i class="bi bi-stars me-1"></i>欢迎使用</div>' +
        '<div class="small opacity-75">系统功能已更新，祝您使用愉快</div>' +
      '</div>' +
      '<button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest(\'.toast\').remove()"></button>' +
    '</div>';
    container.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
    }, 6000);
  }

  function addButtonLoading() {
    function enhanceForm(form) {
      if (form._loadingEnhanced) return;
      if (form.id === 'loginForm') return;
      form._loadingEnhanced = true;
      form.addEventListener('submit', function() {
        const btn = form.querySelector('button[type="submit"]');
        if (!btn || btn.getAttribute('data-loading') === 'true') return;
        btn.setAttribute('data-loading', 'true');
        const originalText = btn.innerHTML;
        btn._origText = originalText;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>提交中...';
        setTimeout(function() {
          if (btn.getAttribute('data-loading') === 'true') {
            btn.removeAttribute('data-loading');
            btn.disabled = false;
            btn.innerHTML = btn._origText || originalText;
          }
        }, 5000);
      });
    }
    document.querySelectorAll('form').forEach(enhanceForm);
    const observer = new MutationObserver(function() {
      document.querySelectorAll('form').forEach(enhanceForm);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function enhanceNumericInputs() {
    const observer = new MutationObserver(function() {
      const numericInputs = document.querySelectorAll('input[type="number"]:not([_numEnhanced])');
      numericInputs.forEach(function(input) {
        input.setAttribute('_numEnhanced', 'true');
        const name = (input.name || input.id || '').toLowerCase();
        const isMoney = name.indexOf('amount') !== -1 || name.indexOf('fee') !== -1 ||
                        name.indexOf('price') !== -1 || name.indexOf('cost') !== -1 ||
                        name.indexOf('total') !== -1 || name.indexOf('paid') !== -1 ||
                        name.indexOf('salary') !== -1 || name.indexOf('wage') !== -1;
        const isHours = name.indexOf('hours') !== -1 || name.indexOf('work_hours') !== -1;
        const isQty = name.indexOf('quantity') !== -1 || name.indexOf('qty') !== -1 || name.indexOf('count') !== -1;

        if (isMoney) {
          if (!input.hasAttribute('min') || parseFloat(input.getAttribute('min')) < 0) input.setAttribute('min', '0');
          if (!input.hasAttribute('step')) input.setAttribute('step', '0.01');
          input.setAttribute('inputmode', 'decimal');
        } else if (isHours) {
          if (!input.hasAttribute('min')) input.setAttribute('min', '0');
          if (!input.hasAttribute('max')) input.setAttribute('max', '24');
          if (!input.hasAttribute('step')) input.setAttribute('step', '0.5');
          input.setAttribute('inputmode', 'decimal');
        } else if (isQty) {
          if (!input.hasAttribute('min')) input.setAttribute('min', '0');
          if (!input.hasAttribute('step')) input.setAttribute('step', '1');
          input.setAttribute('inputmode', 'numeric');
        }

        input.addEventListener('blur', function() {
          if (isMoney && input.value) {
            const val = parseFloat(input.value);
            if (!isNaN(val) && val >= 0) {
              input.value = val.toFixed(2);
            }
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function initDashboardCalendar() {
    const observer = new MutationObserver(function() {
      const dashboard = document.getElementById('tab-dashboard') || document.querySelector('.dashboard-container');
      if (dashboard && !dashboard._calendarAdded) {
        dashboard._calendarAdded = true;
        buildDashboardCalendar();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(buildDashboardCalendar, 1000);
  }

  var _expInitDone = false;
  function init() {
    if (_expInitDone) return;
    if (!_isLoggedIn()) {
      setTimeout(init, 500);
      return;
    }
    _expInitDone = true;

    enhancePhotoUpload();
    enhanceDeleteButtons();
    addButtonLoading();
    enhanceNumericInputs();
    // 以下功能v2增强模块已接管，不再重复初始化：
    // buildNotificationBell() — 原始导航已有#notifyDropdown
    // initDashboardCalendar()  — v2的addDashboardCalendar接管
    // enhanceDatePickers()     — v2的enhanceDatePickers接管（支持input-group）

    function tryShowWelcome() {
      try {
        if (sessionStorage.getItem('_welcomeShown')) return;
        var loginPage = document.getElementById('loginPage');
        if (loginPage && loginPage.style.display !== 'none') {
          setTimeout(tryShowWelcome, 500);
          return;
        }
        sessionStorage.setItem('_welcomeShown', '1');
        showWelcomeToast();
      } catch(e) {}
    }
    setTimeout(tryShowWelcome, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
 * 系统全方位优化增强模块（v2）
 * ============================================================ */
(function() {
  'use strict';
  if (window._v2Enhanced) return;
  window._v2Enhanced = true;

  /* ===== 工具函数 ===== */
  function $(sel, parent) { return (parent || document).querySelector(sel); }
  function $$(sel, parent) { return Array.from((parent || document).querySelectorAll(sel)); }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function showToast(msg, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    const colors = {
      success: 'bg-success',
      error: 'bg-danger',
      warning: 'bg-warning',
      info: 'bg-primary'
    };
    const toast = document.createElement('div');
    toast.className = 'fixed-top text-center pt-3 z-3';
    toast.innerHTML = '<div class="d-inline-block ' + colors[type] + ' text-white px-4 py-2 rounded shadow-sm">' + msg + '</div>';
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, duration - 300);
    setTimeout(function() { toast.remove(); }, duration);
  }
  window.UxToast = { show: showToast };

  /* ===== 1. 导航重组 ===== */
  function reorganizeNav() {
    if (!_isLoggedIn()) return;
    const navList = $('#navMenu .navbar-nav');
    if (!navList || navList._v2nav) return;

    // 移除旧的项目菜单
    const oldProj = $('#projectDropdown');
    if (oldProj && oldProj.closest('li')) {
      oldProj.closest('li').remove();
    }

    // 移除"查询统计"菜单
    const insightDropdown = $('#insightDropdown');
    if (insightDropdown) {
      const li = insightDropdown.closest('li');
      if (li) li.remove();
    }

    // 修改"管理"为"资源"，并移除项目管理
    const manageDropdown = $('#manageDropdown');
    if (manageDropdown) {
      manageDropdown.innerHTML = '<i class="bi bi-box-seam me-1"></i>资源';
      const manageMenu = manageDropdown.nextElementSibling;
      if (manageMenu) {
        const projItem = manageMenu.querySelector('a[onclick*="tab-projects"]');
        if (projItem && projItem.closest('li')) {
          projItem.closest('li').remove();
        }
      }
    }

    // 重建"业务"下拉菜单
    const businessDropdown = $('#businessDropdown');
    if (businessDropdown) {
      const businessMenu = businessDropdown.nextElementSibling;
      if (businessMenu) {
        businessMenu.innerHTML = '\
          <li><h6 class="dropdown-header">工单管理</h6></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-work\')"><i class="bi bi-tools me-2"></i>施工记录</a></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-query\')"><i class="bi bi-search me-2"></i>工单查询</a></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-templates\')"><i class="bi bi-journal-plus me-2"></i>工单模板</a></li>\
          <li><hr class="dropdown-divider"></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-pending\')"><i class="bi bi-clock-history me-2"></i>报修待办 <span class="badge bg-danger rounded-pill ms-1 is-12" id="pendingBadge">0</span></a></li>\
          <li><hr class="dropdown-divider"></li>\
          <li><h6 class="dropdown-header">更多工具</h6></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-calendar\')"><i class="bi bi-calendar3 me-2"></i>日历视图</a></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-maintenance\')"><i class="bi bi-calendar-check me-2"></i>巡检计划</a></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-stats\')"><i class="bi bi-graph-up me-2"></i>经营统计</a></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-advanced-stats\')"><i class="bi bi-pie-chart me-2"></i>高级统计</a></li>\
        ';
      }
    }

    // 在业务后面插入"项目"一级菜单
    const businessItem = businessDropdown ? businessDropdown.closest('li') : null;
    if (businessItem && !$('#projectDropdown')) {
      const projectLi = document.createElement('li');
      projectLi.className = 'nav-item dropdown';
      projectLi.innerHTML = '\
        <a class="nav-link" href="#" id="projectDropdown" role="button" data-bs-toggle="dropdown">\
          <i class="bi bi-folder-symlink me-1"></i>项目\
        </a>\
        <ul class="dropdown-menu dropdown-menu-end ry-nav-menu">\
          <li><h6 class="dropdown-header">项目</h6></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-projects\')"><i class="bi bi-list-ul me-2"></i>项目清单</a></li>\
          <li><hr class="dropdown-divider"></li>\
          <li><h6 class="dropdown-header">快速新增</h6></li>\
          <li><a class="dropdown-item" href="#" onclick="openNewWork(\'construction\');"><i class="bi bi-tools me-2"></i>新增施工工单</a></li>\
        </ul>\
      ';
      businessItem.after(projectLi);
    }

    // 修改"财务"下拉菜单，添加收支流水
    const financeDropdown = $('#financeDropdown');
    if (financeDropdown) {
      const financeMenu = financeDropdown.nextElementSibling;
      if (financeMenu) {
        financeMenu.innerHTML = '\
          <li><h6 class="dropdown-header">总览</h6></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-finance-unified\')"><i class="bi bi-wallet2 me-2"></i>收支流水</a></li>\
          <li><hr class="dropdown-divider"></li>\
          <li><h6 class="dropdown-header">收入</h6></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-payments\')"><i class="bi bi-credit-card me-2"></i>收款管理</a></li>\
          <li><hr class="dropdown-divider"></li>\
          <li><h6 class="dropdown-header">支出</h6></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-expenses\')"><i class="bi bi-receipt-cutoff me-2"></i>支出管理</a></li>\
          <li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-salary\')"><i class="bi bi-cash-coin me-2"></i>工资管理</a></li>\
        ';
      }
    }

    // 设置菜单：添加系统诊断入口
    const settingsLink = document.querySelector('#settingsDropdown + .dropdown-menu');
    if (settingsLink && !settingsLink._v2diagAdded) {
      settingsLink._v2diagAdded = true;
      const diagItem = document.createElement('li');
      diagItem.innerHTML = '<hr class="dropdown-divider my-1">';
      settingsLink.appendChild(diagItem);
      const diagHeader = document.createElement('li');
      diagHeader.innerHTML = '<h6 class="dropdown-header text-muted small px-2 py-1">系统工具</h6>';
      settingsLink.appendChild(diagHeader);
      const diagLink = document.createElement('li');
      diagLink.innerHTML = '<a class="dropdown-item rounded py-2" href="#" onclick="window.openSystemDiagnosis();return false;"><i class="bi bi-activity me-2"></i>系统诊断报告</a>';
      settingsLink.appendChild(diagLink);
    }

    navList._v2nav = true;
  }

  window.openSystemDiagnosis = function() {
    window.open('/system-diagnosis.html', '_blank');
  };

  /* ===== 2. 统一财务中心 ===== */
  function createFinanceUnifiedTab() {
    if ($('#tab-finance-unified')) return;

    const mainContent = $('#mainContent');
    if (!mainContent) return;

    const tabPane = document.createElement('div');
    tabPane.className = 'tab-pane fade';
    tabPane.id = 'tab-finance-unified';
    tabPane.innerHTML = '\
      <div class="container py-3">\
        <div class="d-flex align-items-center justify-content-between mb-4">\
          <h5 class="mb-0"><i class="bi bi-wallet2 me-2"></i>财务中心</h5>\
          <div class="d-flex gap-2">\
            <button class="btn btn-success btn-sm" onclick="quickAddPayment()"><i class="bi bi-plus-lg me-1"></i>新增收款</button>\
            <button class="btn btn-danger btn-sm" onclick="quickAddExpense()"><i class="bi bi-plus-lg me-1"></i>新增支出</button>\
          </div>\
        </div>\
        <div class="row g-3 mb-4">\
          <div class="col-6 col-md-3"><div class="card shadow-sm"><div class="card-body p-3"><div class="text-success fw-bold fs-4" id="ufIncome">¥0.00</div><div class="text-muted small">本月收入</div></div></div></div>\
          <div class="col-6 col-md-3"><div class="card shadow-sm"><div class="card-body p-3"><div class="text-danger fw-bold fs-4" id="ufExpense">¥0.00</div><div class="text-muted small">本月支出</div></div></div></div>\
          <div class="col-6 col-md-3"><div class="card shadow-sm"><div class="card-body p-3"><div class="text-warning fw-bold fs-4" id="ufSalary">¥0.00</div><div class="text-muted small">本月工资</div></div></div></div>\
          <div class="col-6 col-md-3"><div class="card shadow-sm"><div class="card-body p-3"><div class="text-primary fw-bold fs-4" id="ufProfit">¥0.00</div><div class="text-muted small">本月利润</div></div></div></div>\
        </div>\
        <div class="card shadow-sm mb-4">\
          <div class="card-header d-flex align-items-center justify-content-between">\
            <span class="fw-semibold">交易流水</span>\
            <div class="d-flex gap-2">\
              <div class="btn-group btn-group-sm" role="group">\
                <button type="button" class="btn btn-primary btn-sm" onclick="setUfFilter(\'all\')">全部</button>\
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="setUfFilter(\'income\')">收入</button>\
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="setUfFilter(\'expense\')">支出</button>\
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="setUfFilter(\'salary\')">工资</button>\
              </div>\
            </div>\
          </div>\
          <div class="card-body p-0">\
            <div class="table-responsive">\
              <table class="table table-hover mb-0">\
                <thead class="table-light"><tr><th style="width:120px">日期</th><th style="width:80px">类型</th><th>摘要</th><th style="width:120px">关联</th><th style="width:120px" class="text-end">金额</th></tr></thead>\
                <tbody id="ufTableBody"><tr><td colspan="5" class="text-center py-4 text-muted">加载中...</td></tr></tbody>\
              </table>\
            </div>\
          </div>\
        </div>\
        <div class="card shadow-sm">\
          <div class="card-header"><span class="fw-semibold">项目收支对比</span></div>\
          <div class="card-body p-0">\
            <div class="table-responsive">\
              <table class="table table-hover mb-0">\
                <thead class="table-light"><tr><th>项目</th><th style="width:120px" class="text-end">收入</th><th style="width:120px" class="text-end">支出</th><th style="width:120px" class="text-end">利润</th><th style="width:100px">利润率</th></tr></thead>\
                <tbody id="ufProjectBody"><tr><td colspan="5" class="text-center py-4 text-muted">加载中...</td></tr></tbody>\
              </table>\
            </div>\
          </div>\
        </div>\
      </div>\
    ';
    mainContent.appendChild(tabPane);
    loadFinanceData();
  }

  let ufFilter = 'all';
  let allTransactions = [];

  function setUfFilter(type) {
    ufFilter = type;
    $$('.btn-group .btn').forEach(function(b) {
      b.classList.remove('btn-primary');
      b.classList.add('btn-outline-secondary');
    });
    const btns = $$('.btn-group button');
    btns.forEach(function(b) {
      if (b.textContent.trim() === ({all:'全部',income:'收入',expense:'支出',salary:'工资'}[type])) {
        b.classList.remove('btn-outline-secondary');
        b.classList.add('btn-primary');
      }
    });
    renderUfTable();
  }
  window.setUfFilter = setUfFilter;

  function loadFinanceData() {
    if (!window.apiFetch) return;

    const tbody = $('#ufTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div> 加载中...</td></tr>';

    Promise.all([
      window.apiFetch('/api/payments?per_page=100').catch(function() { return {records:[]}; }),
      window.apiFetch('/api/expenses?per_page=100').catch(function() { return {items:[]}; }),
      window.apiFetch('/api/projects').catch(function() { return {projects:[]}; })
    ]).then(function(results) {
      const payments = results[0].records || [];
      const expenses = results[1].items || [];
      const projects = results[2].projects || results[2].list || [];

      allTransactions = [];

      payments.forEach(function(p) {
        allTransactions.push({
          type: 'income',
          date: p.payment_date || '-',
          title: p.remark || '收款',
          related: p.customer_name || '-',
          amount: parseFloat(p.amount) || 0,
          project_id: p.project_id
        });
      });

      expenses.forEach(function(e) {
        allTransactions.push({
          type: 'expense',
          date: e.expense_date || '-',
          title: e.title || e.category || '支出',
          related: e.supplier || '-',
          amount: -parseFloat(e.amount) || 0,
          project_id: e.project_id
        });
      });

      allTransactions.sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
      });

      // 计算本月统计
      const now = new Date();
      const ym = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
      let monthIncome = 0, monthExpense = 0, monthSalary = 0;

      allTransactions.forEach(function(t) {
        if ((t.date || '').startsWith(ym)) {
          if (t.type === 'income') monthIncome += t.amount;
          else if (t.type === 'expense') monthExpense += Math.abs(t.amount);
          else if (t.type === 'salary') monthSalary += Math.abs(t.amount);
        }
      });

      const incomeEl = $('#ufIncome');
      const expenseEl = $('#ufExpense');
      const salaryEl = $('#ufSalary');
      const profitEl = $('#ufProfit');
      if (incomeEl) incomeEl.textContent = '¥' + monthIncome.toFixed(2);
      if (expenseEl) expenseEl.textContent = '¥' + monthExpense.toFixed(2);
      if (salaryEl) salaryEl.textContent = '¥' + monthSalary.toFixed(2);
      const profit = monthIncome - monthExpense - monthSalary;
      if (profitEl) {
        profitEl.textContent = '¥' + profit.toFixed(2);
        profitEl.className = 'fw-bold fs-4 ' + (profit >= 0 ? 'text-success' : 'text-danger');
      }

      renderUfTable();
      renderUfProjects(projects, payments, expenses);
    });
  }

  function renderUfTable() {
    const tbody = $('#ufTableBody');
    if (!tbody) return;

    const filtered = allTransactions.filter(function(t) {
      if (ufFilter === 'all') return true;
      return t.type === ufFilter;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">暂无记录</td></tr>';
      return;
    }

    const typeMap = {
      income: '<span class="badge bg-success">收入</span>',
      expense: '<span class="badge bg-danger">支出</span>',
      salary: '<span class="badge bg-warning">工资</span>'
    };

    tbody.innerHTML = filtered.slice(0, 50).map(function(t) {
      return '<tr>\
        <td class="small">' + t.date + '</td>\
        <td>' + (typeMap[t.type] || t.type) + '</td>\
        <td>' + t.title + '</td>\
        <td class="small text-muted">' + t.related + '</td>\
        <td class="text-end fw-semibold ' + (t.amount >= 0 ? 'text-success' : 'text-danger') + '">' + (t.amount >= 0 ? '+' : '') + t.amount.toFixed(2) + '</td>\
      </tr>';
    }).join('');
  }

  function renderUfProjects(projects, payments, expenses) {
    const tbody = $('#ufProjectBody');
    if (!tbody) return;

    const projData = [];
    projects.forEach(function(p) {
      const pid = p.id;
      const pIncome = payments.filter(function(pay) { return pay.project_id === pid; })
        .reduce(function(s, x) { return s + (parseFloat(x.amount) || 0); }, 0);
      const pExpense = expenses.filter(function(e) { return e.project_id === pid; })
        .reduce(function(s, x) { return s + (parseFloat(x.amount) || 0); }, 0);
      const profit = pIncome - pExpense;
      projData.push({
        name: p.name || p.project_name || '项目' + pid,
        income: pIncome,
        expense: pExpense,
        profit: profit,
        rate: pIncome > 0 ? (profit / pIncome * 100) : 0
      });
    });

    projData.sort(function(a, b) { return b.profit - a.profit; });

    if (projData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">暂无项目数据</td></tr>';
      return;
    }

    tbody.innerHTML = projData.map(function(p) {
      return '<tr>\
        <td>' + p.name + '</td>\
        <td class="text-end text-success">¥' + p.income.toFixed(2) + '</td>\
        <td class="text-end text-danger">¥' + p.expense.toFixed(2) + '</td>\
        <td class="text-end fw-semibold ' + (p.profit >= 0 ? 'text-success' : 'text-danger') + '">¥' + p.profit.toFixed(2) + '</td>\
        <td>\
          <div class="progress" style="height:6px">\
            <div class="progress-bar ' + (p.profit >= 0 ? 'bg-success' : 'bg-danger') + '" style="width:' + Math.min(100, Math.max(0, p.rate)) + '%"></div>\
          </div>\
          <small class="text-muted">' + p.rate.toFixed(1) + '%</small>\
        </td>\
      </tr>';
    }).join('');
  }

  window.quickAddPayment = function() {
    switchTab('tab-payments');
    setTimeout(function() {
      const addBtn = $('#tab-payments .btn-primary');
      if (addBtn) addBtn.click();
    }, 300);
  };

  window.quickAddExpense = function() {
    switchTab('tab-expenses');
    setTimeout(function() {
      const addBtn = $('#tab-expenses .btn-primary');
      if (addBtn) addBtn.click();
    }, 300);
  };

  /* ===== 3. 统计图表 ===== */
  let chartsLoaded = false;

  function loadChartsLibrary(callback) {
    if (window.Chart) { callback(); return; }
    if (chartsLoaded) {
      setTimeout(function() { if (window.Chart) callback(); }, 200);
      return;
    }
    chartsLoaded = true;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = callback;
    document.head.appendChild(script);
  }

  function enhanceStatsPage() {
    const tab = $('#tab-advanced-stats');
    if (!tab || tab._chartEnhanced) return;
    tab._chartEnhanced = true;

    const container = tab.querySelector('.card-body') || tab;
    if (!container) return;

    container.innerHTML = '\
      <div class="mb-3 d-flex gap-2">\
        <button class="btn btn-primary btn-sm" onclick="loadChartsForRange(\'month\')">本月</button>\
        <button class="btn btn-outline-secondary btn-sm" onclick="loadChartsForRange(\'quarter\')">本季度</button>\
        <button class="btn btn-outline-secondary btn-sm" onclick="loadChartsForRange(\'year\')">本年</button>\
        <button class="btn btn-outline-secondary btn-sm" onclick="loadChartsForRange(\'all\')">全部</button>\
      </div>\
      <div class="row g-3">\
        <div class="col-lg-8"><div class="card shadow-sm"><div class="card-header">月度收支趋势</div><div class="card-body"><canvas id="chartTrend" height="200"></canvas></div></div></div>\
        <div class="col-lg-4"><div class="card shadow-sm"><div class="card-header">支出分类占比</div><div class="card-body"><canvas id="chartExpenseCat" height="200"></canvas></div></div></div>\
        <div class="col-lg-6"><div class="card shadow-sm"><div class="card-header">项目利润排行</div><div class="card-body"><canvas id="chartProjectProfit" height="180"></canvas></div></div></div>\
        <div class="col-lg-6"><div class="card shadow-sm"><div class="card-header">客户收款排行</div><div class="card-body"><canvas id="chartCustomerPay" height="180"></canvas></div></div></div>\
      </div>\
    ';

    loadChartsForRange('all');
  }

  let chartInstances = {};

  function destroyCharts() {
    Object.keys(chartInstances).forEach(function(k) {
      if (chartInstances[k]) { chartInstances[k].destroy(); chartInstances[k] = null; }
    });
  }

  window.loadChartsForRange = function(range) {
    loadChartsLibrary(function() {
      destroyCharts();

      // 获取数据
      Promise.all([
        window.apiFetch ? window.apiFetch('/api/payments?per_page=200').catch(function(){return{records:[]};}) : Promise.resolve({records:[]}),
        window.apiFetch ? window.apiFetch('/api/expenses?per_page=200').catch(function(){return{items:[]};}) : Promise.resolve({items:[]}),
        window.apiFetch ? window.apiFetch('/api/projects').catch(function(){return{projects:[]};}) : Promise.resolve({projects:[]})
      ]).then(function(results) {
        const payments = results[0].records || [];
        const expenses = results[1].items || [];
        const projects = results[2].projects || results[2].list || [];

        // 月度趋势
        const monthData = {};
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
          monthData[key] = { income: 0, expense: 0, salary: 0 };
        }

        payments.forEach(function(p) {
          const d = (p.payment_date || '').substring(0, 7);
          if (monthData[d]) monthData[d].income += parseFloat(p.amount) || 0;
        });
        expenses.forEach(function(e) {
          const d = (e.expense_date || '').substring(0, 7);
          if (monthData[d]) {
            const amt = parseFloat(e.amount) || 0;
            if (e.expense_type === 'salary') monthData[d].salary += amt;
            else monthData[d].expense += amt;
          }
        });

        const labels = Object.keys(monthData);
        const incomeData = labels.map(function(m) { return monthData[m].income; });
        const expenseData = labels.map(function(m) { return monthData[m].expense; });
        const salaryData = labels.map(function(m) { return monthData[m].salary; });

        const ctx1 = document.getElementById('chartTrend');
        if (ctx1) {
          chartInstances.trend = new Chart(ctx1, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [
                { label: '收入', data: incomeData, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.3 },
                { label: '支出', data: expenseData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3 },
                { label: '工资', data: salaryData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.3 }
              ]
            },
            options: { responsive: true, maintainAspectRatio: false }
          });
        }

        // 支出分类饼图
        const catData = {};
        expenses.forEach(function(e) {
          const cat = e.category || '其他';
          catData[cat] = (catData[cat] || 0) + (parseFloat(e.amount) || 0);
        });
        const catLabels = Object.keys(catData);
        const catValues = catLabels.map(function(c) { return catData[c]; });
        const colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];

        const ctx2 = document.getElementById('chartExpenseCat');
        if (ctx2 && catLabels.length > 0) {
          chartInstances.expenseCat = new Chart(ctx2, {
            type: 'doughnut',
            data: {
              labels: catLabels,
              datasets: [{ data: catValues, backgroundColor: colors }]
            },
            options: { responsive: true, maintainAspectRatio: false }
          });
        }

        // 项目利润
        const projProfit = projects.map(function(p) {
          const pIncome = payments.filter(function(x) { return x.project_id === p.id; })
            .reduce(function(s, x) { return s + (parseFloat(x.amount) || 0); }, 0);
          const pExpense = expenses.filter(function(x) { return x.project_id === p.id; })
            .reduce(function(s, x) { return s + (parseFloat(x.amount) || 0); }, 0);
          return { name: p.name || p.project_name || '项目'+p.id, profit: pIncome - pExpense };
        }).sort(function(a, b) { return b.profit - a.profit; }).slice(0, 10);

        const ctx3 = document.getElementById('chartProjectProfit');
        if (ctx3 && projProfit.length > 0) {
          chartInstances.projectProfit = new Chart(ctx3, {
            type: 'bar',
            data: {
              labels: projProfit.map(function(p) { return p.name; }),
              datasets: [{
                label: '利润',
                data: projProfit.map(function(p) { return p.profit; }),
                backgroundColor: projProfit.map(function(p) { return p.profit >= 0 ? '#22c55e' : '#ef4444'; })
              }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              indexAxis: 'y',
              plugins: { legend: { display: false } }
            }
          });
        }

        // 客户收款
        const custPay = {};
        payments.forEach(function(p) {
          const c = p.customer_name || '未知';
          custPay[c] = (custPay[c] || 0) + (parseFloat(p.amount) || 0);
        });
        const custList = Object.keys(custPay).map(function(c) { return { name: c, amount: custPay[c] }; })
          .sort(function(a, b) { return b.amount - a.amount; }).slice(0, 10);

        const ctx4 = document.getElementById('chartCustomerPay');
        if (ctx4 && custList.length > 0) {
          chartInstances.customerPay = new Chart(ctx4, {
            type: 'bar',
            data: {
              labels: custList.map(function(c) { return c.name; }),
              datasets: [{
                label: '收款金额',
                data: custList.map(function(c) { return c.amount; }),
                backgroundColor: '#3b82f6'
              }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              indexAxis: 'y',
              plugins: { legend: { display: false } }
            }
          });
        }
      });
    });
  };

  /* ===== 4. 首页日历 ===== */
  function addDashboardCalendar() {
    const dashContent = $('.dash-content-row');
    if (!dashContent || $('#dashMiniCalendar')) return;

    const calCard = document.createElement('div');
    calCard.className = 'dash-content-card';
    calCard.id = 'dashMiniCalendar';
    calCard.innerHTML = '\
      <div class="dash-content-header">\
        <span class="dash-content-title"><i class="bi bi-calendar3 me-1"></i>本月日历</span>\
        <a class="dash-content-more" onclick="switchTab(\'tab-calendar\')">查看完整 <i class="bi bi-chevron-right"></i></a>\
      </div>\
      <div class="dash-content-body p-2" id="miniCalendarBody"></div>\
    ';

    const firstCard = dashContent.querySelector('.dash-content-card');
    if (firstCard) {
      firstCard.parentNode.insertBefore(calCard, firstCard.nextSibling);
    } else {
      dashContent.appendChild(calCard);
    }

    renderMiniCalendar();
  }

  function renderMiniCalendar() {
    const body = $('#miniCalendarBody');
    if (!body) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = '<div class="d-flex align-items-center justify-content-between mb-2 px-1">';
    html += '<span class="fw-medium small">' + year + '年' + (month+1) + '月</span>';
    html += '<span class="text-primary small fw-medium" style="cursor:pointer">今天</span>';
    html += '</div>';

    html += '<div class="d-flex">';
    ['日','一','二','三','四','五','六'].forEach(function(d, i) {
      html += '<div class="flex-fill text-center small ' + (i === 0 || i === 6 ? 'text-danger' : 'text-muted') + '" style="font-size:11px;">' + d + '</div>';
    });
    html += '</div>';

    html += '<div class="row g-0">';
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="col" style="height:28px;"></div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === now.getDate();
      const weekday = (firstDay + d - 1) % 7;
      html += '<div class="col d-flex align-items-center justify-content-center" style="height:28px;position:relative;">';
      html += '<span class="' + (isToday ? 'bg-primary text-white rounded-circle d-flex align-items-center justify-content-center' : '') + '" style="width:24px;height:24px;font-size:12px;' + (weekday === 0 || weekday === 6 ? 'color:#ef4444;' : '') + '">' + d + '</span>';
      if (d % 5 === 0 && !isToday) {
        html += '<span style="position:absolute;bottom:2px;width:4px;height:4px;border-radius:50%;background:#3b82f6;"></span>';
      }
      html += '</div>';
    }
    html += '</div>';

    body.innerHTML = html;
  }

  /* ===== 5. 日期选择器增强 ===== */
  function enhanceDatePickers() {
    $$('input[type="date"]').forEach(function(input) {
      if (input._v2dateEnhanced) return;
      input._v2dateEnhanced = true;
      
      // 方案1: 如果在 input-group 里，直接追加按钮
      const parent = input.parentElement;
      if (parent && parent.classList.contains('input-group')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-outline-secondary btn-sm';
        btn.innerHTML = '今天';
        btn.style.flexShrink = '0';
        btn.onclick = function(e) {
          e.preventDefault();
          input.value = todayStr();
          input.dispatchEvent(new Event('change', {bubbles: true}));
        };
        parent.appendChild(btn);
        return;
      }
      
      // 方案2: 用 flex 包裹输入框和今天按钮
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.gap = '4px';
      wrapper.className = 'date-picker-v2';
      
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline-secondary btn-sm';
      btn.innerHTML = '今天';
      btn.style.flexShrink = '0';
      btn.style.height = input.offsetHeight + 'px';
      btn.onclick = function(e) {
        e.preventDefault();
        input.value = todayStr();
        input.dispatchEvent(new Event('change', {bubbles: true}));
      };
      wrapper.appendChild(btn);
    });
  }

  /* ===== 6. Bug 修复 ===== */
  function fixExpensePagination() {
    if (typeof window.loadExpenses !== 'function') return;
    if (window.loadExpenses._v2Fixed) return;
    const orig = window.loadExpenses;
    window.loadExpenses = function() {
      const result = orig.apply(this, arguments);
      setTimeout(function() {
        const nav = document.getElementById('expensePagination');
        if (!nav) return;
        const pageInfo = document.getElementById('expensePageInfo');
        const totalMatch = (pageInfo?.textContent || '').match(/共\s*(\d+)\s*条/);
        const total = totalMatch ? parseInt(totalMatch[1]) : 0;
        const perPage = window._expensePerPage || 20;
        const pages = Math.ceil(total / perPage);
        const currentPage = window._expensePage || 1;
        if (pages <= 1) {
          nav.innerHTML = '';
          return;
        }
        // 重新用正确方式调用
        if (typeof window._renderSimplePagination === 'function') {
          window._renderSimplePagination('expensePagination', currentPage, pages, window.loadExpenses, function(p) {
            window._expensePage = p;
          });
        }
      }, 150);
      return result;
    };
    window.loadExpenses._v2Fixed = true;
  }

  /* ===== 7. switchTab Hook ===== */
  function hookSwitchTab() {
    if (typeof window.switchTab !== 'function') return;
    if (window.switchTab._v2Hooked) return;

    const orig = window.switchTab;
    window.switchTab = function(tabId) {
      const result = orig.apply(this, arguments);

      setTimeout(function() {
        if (tabId === 'tab-finance-unified') {
          createFinanceUnifiedTab();
          loadFinanceData();
        }
        if (tabId === 'tab-advanced-stats') {
          enhanceStatsPage();
        }
        if (tabId === 'tab-dashboard') {
          addDashboardCalendar();
        }
        if (tabId === 'tab-work') {
          enhanceDatePickers();
        }
        if (tabId === 'tab-expenses') {
          fixExpensePagination();
        }
      }, 50);

      return result;
    };
    window.switchTab._v2Hooked = true;
  }



  /* ===== 8. 通知铃铛 ===== */
  function addNotifBell() {
    if ($('#v2NotifBell')) return;
    const navbar = $('.ry-appbar .navbar-nav.ms-auto');
    if (!navbar) return;

    const li = document.createElement('li');
    li.className = 'nav-item';
    li.id = 'v2NotifBell';
    li.innerHTML = '\
      <a class="nav-link position-relative" href="#" onclick="showNotifPanel(event)">\
        <i class="bi bi-bell"></i>\
        <span class="position-absolute top-25 start-75 translate-middle badge rounded-pill bg-danger" id="v2NotifCount" style="font-size:10px;padding:2px 5px;">0</span>\
      </a>\
    ';
    navbar.insertBefore(li, navbar.firstChild);
    updateNotifCount();
  }

  let notifList = [];
  function updateNotifCount() {
    const countEl = $('#v2NotifCount');
    if (!countEl) return;
    const count = notifList.filter(function(n) { return !n.read; }).length;
    countEl.textContent = count > 0 ? count : 0;
    countEl.style.display = count > 0 ? 'inline-block' : 'none';
  }

  window.showNotifPanel = function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 关闭已有
    const existing = $('#v2NotifPanel');
    if (existing) { existing.remove(); return; }
    
    const bell = $('#v2NotifBell');
    if (!bell) return;
    
    const panel = document.createElement('div');
    panel.id = 'v2NotifPanel';
    panel.style.cssText = 'position:fixed;top:56px;right:12px;width:320px;max-height:400px;overflow-y:auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:2000;border:1px solid #e5e7eb;';
    
    let listHtml = '';
    if (notifList.length === 0) {
      listHtml = '<div class="text-center py-5 text-muted"><i class="bi bi-inbox" style="font-size:32px;"></i><div class="mt-2 small">暂无通知</div></div>';
    } else {
      listHtml = notifList.slice(0, 20).map(function(n) {
        const iconMap = {info:'bi-info-circle text-primary',success:'bi-check-circle text-success',warning:'bi-exclamation-triangle text-warning',error:'bi-x-circle text-danger'};
        return '<div class="p-3 border-bottom ' + (n.read ? 'opacity-60' : '') + '" style="cursor:pointer;">\
          <div class="d-flex gap-2 align-items-start">\
            <i class="bi ' + (iconMap[n.type] || iconMap.info) + ' mt-1"></i>\
            <div class="flex-1">\
              <div class="small fw-medium">' + n.title + '</div>\
              <div class="text-muted small mt-1">' + (n.body || '') + '</div>\
              <div class="text-muted small mt-1" style="font-size:11px;">' + n.time + '</div>\
            </div>\
          </div>\
        </div>';
      }).join('');
    }
    
    panel.innerHTML = '\
      <div class="p-3 border-bottom d-flex align-items-center justify-content-between">\
        <span class="fw-semibold">通知</span>\
        <button class="btn btn-link btn-sm p-0" onclick="clearAllNotif()">全部已读</button>\
      </div>\
      <div>' + listHtml + '</div>\
    ';
    document.body.appendChild(panel);
    
    setTimeout(function() {
      document.addEventListener('click', function closePanel(ev) {
        if (!panel.contains(ev.target) && !ev.target.closest('#v2NotifBell')) {
          panel.remove();
          document.removeEventListener('click', closePanel);
        }
      });
    }, 10);
  };

  window.clearAllNotif = function() {
    notifList.forEach(function(n) { n.read = true; });
    updateNotifCount();
    const panel = $('#v2NotifPanel');
    if (panel) panel.remove();
    showToast('已全部标记为已读', 'success', 2000);
  };

  window.V2Notify = {
    add: function(title, body, type) {
      type = type || 'info';
      const now = new Date();
      const time = now.getMonth()+1 + '/' + now.getDate() + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      notifList.unshift({ title: title, body: body || '', type: type, time: time, read: false });
      if (notifList.length > 50) notifList = notifList.slice(0, 50);
      updateNotifCount();
      showToast(title, type, 3000);
    }
  };

  /* ===== 初始化 ===== */
  var _v2InitDone = false;
  function init() {
    if (_v2InitDone) return;
    if (!_isLoggedIn()) {
      setTimeout(init, 500);
      return;
    }
    _v2InitDone = true;

    // 导航重组
    try { reorganizeNav(); } catch(e) { console.warn('导航重组失败:', e); }

    // Hook switchTab
    hookSwitchTab();

    // 如果已在Dashboard，添加日历
    if ($('#tab-dashboard') && $('#tab-dashboard').classList.contains('active')) {
      setTimeout(addDashboardCalendar, 500);
    }

    // 财务中心tab创建（提前创建好DOM）
    createFinanceUnifiedTab();

    // 修复支出分页
    fixExpensePagination();


    // 通知铃铛：原始导航已有#notifyDropdown（服务端通知），不再添加v2本地铃铛避免重复
    // addNotifBell();

    // MutationObserver监听导航
    const obs = new MutationObserver(function() {
      if (_isLoggedIn()) {
        reorganizeNav();
        enhanceDatePickers();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    console.log('[v2增强] 系统优化模块已加载');
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'auth_token' && e.newValue && !_v2InitDone) {
      setTimeout(init, 300);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }

  window.V2Enhance = {
    reorganizeNav: reorganizeNav,
    createFinanceUnifiedTab: createFinanceUnifiedTab,
    enhanceStatsPage: enhanceStatsPage,
    addDashboardCalendar: addDashboardCalendar,
    showToast: showToast
  };

  window.toggleRecordType = function() {
    const rtRepair = document.getElementById('rtRepair');
    const isRepair = !!(rtRepair && rtRepair.checked);
    const constructionFields = document.getElementById('constructionFields');
    const repairFields = document.getElementById('repairFields');
    const repairDetailSection = document.getElementById('repairDetailSection');
    const warrantyField = document.getElementById('warrantyField');
    const priorityField = document.getElementById('priorityField');

    if (constructionFields) constructionFields.style.display = isRepair ? 'none' : '';
    if (repairFields) repairFields.style.display = isRepair ? '' : 'none';
    if (repairDetailSection) repairDetailSection.style.display = isRepair ? '' : 'none';
    if (warrantyField) warrantyField.style.display = isRepair ? '' : 'none';
    if (priorityField) priorityField.style.display = isRepair ? '' : 'none';

    const workContentRequired = document.querySelector('.construction-only');
    if (workContentRequired) workContentRequired.style.display = isRepair ? 'none' : '';
    if (constructionFields) {
      const ta = constructionFields.querySelector('textarea[name="work_content"]');
      if (ta) ta.required = !isRepair;
    }

    const recordTypeTitle = document.getElementById('recordTypeTitle');
    if (recordTypeTitle) recordTypeTitle.textContent = isRepair ? '维修工单' : '施工记录';
  };

  window.openNewWork = function(type) {
    if (window.openAddModal) window.openAddModal();
    setTimeout(function() {
      const target = type === 'repair' ? document.getElementById('rtRepair') : document.getElementById('rtConstruction');
      if (target) {
        target.checked = true;
        window.toggleRecordType();
      }
    }, 150);
  };

})();
