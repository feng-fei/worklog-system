(function() {
  'use strict';

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
  function init() {
    const savedMode = localStorage.getItem('projectViewMode');
    if (savedMode) projectViewMode = savedMode;

    const observer = new MutationObserver(function() {
      initProjectListView();
      initBottomPlusMenu();
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

(function() {
  'use strict';

  /* ---------- Bug修复1: 支出分页函数调用错误 ---------- */
  function fixExpensePagination() {
    if (typeof window.loadExpenses !== 'function') return;
    if (window.loadExpenses._paginationFixed) return;

    const _origLoadExpenses = window.loadExpenses;
    window.loadExpenses = function() {
      const result = _origLoadExpenses.apply(this, arguments);
      
      setTimeout(function() {
        const nav = document.getElementById('expensePagination');
        if (!nav) return;
        
        const pageInfo = document.getElementById('expensePageInfo');
        const totalText = pageInfo ? pageInfo.textContent : '';
        const totalMatch = totalText.match(/共\s*(\d+)\s*条/);
        const total = totalMatch ? parseInt(totalMatch[1]) : 0;
        const perPage = window._expensePerPage || 20;
        const pages = Math.ceil(total / perPage);
        const currentPage = window._expensePage || 1;

        if (pages > 1 && typeof window._renderSimplePagination === 'function') {
          window._renderSimplePagination(
            'expensePagination',
            currentPage,
            pages,
            window.loadExpenses,
            function(p) {
              window._expensePage = p;
            }
          );
        }
      }, 100);

      return result;
    };
    window.loadExpenses._paginationFixed = true;
  }

  /* ---------- Bug修复2: 支出分类下拉重复问题 ---------- */
  function fixExpenseCategoriesDedup() {
    if (typeof window.loadExpenseCategories !== 'function') return;
    if (window.loadExpenseCategories._dedupFixed) return;

    const _origLoadExpenseCategories = window.loadExpenseCategories;
    window.loadExpenseCategories = function(type) {
      const result = _origLoadExpenseCategories.apply(this, arguments);

      setTimeout(function() {
        const select = document.getElementById('expenseCategory');
        const filterSelect = document.getElementById('expFilterCategory');

        function dedupSelect(selEl, firstOptionText) {
          if (!selEl) return;
          const seen = new Set();
          const options = selEl.querySelectorAll('option');
          const preserved = [];
          
          options.forEach(function(opt) {
            const val = opt.value;
            if (val === '' || !seen.has(val)) {
              seen.add(val);
              preserved.push(opt.cloneNode(true));
            }
          });

          selEl.innerHTML = '';
          preserved.forEach(function(opt) {
            selEl.appendChild(opt);
          });
        }

        dedupSelect(select, '请选择');
        dedupSelect(filterSelect, '全部分类');
      }, 50);

      return result;
    };
    window.loadExpenseCategories._dedupFixed = true;
  }

  /* ---------- Bug修复3: Dashboard切换tab时重新加载 ---------- */
  function fixDashboardTabReload() {
    if (typeof window.switchTab !== 'function') return;
    if (window.switchTab._dashboardReloadFixed) return;

    const _origSwitchTab = window.switchTab;
    window.switchTab = function(tabId) {
      const result = _origSwitchTab.apply(this, arguments);

      if (tabId === 'tab-dashboard') {
        setTimeout(function() {
          if (typeof window.loadDashboard === 'function') {
            window.loadDashboard();
          }
        }, 100);
      }

      return result;
    };
    window.switchTab._dashboardReloadFixed = true;
  }

  /* ---------- 初始化 ---------- */
  function init() {
    fixExpensePagination();
    fixExpenseCategoriesDedup();
    fixDashboardTabReload();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 200);
  }

  window.BugFixes = {
    fixExpensePagination: fixExpensePagination,
    fixExpenseCategoriesDedup: fixExpenseCategoriesDedup,
    fixDashboardTabReload: fixDashboardTabReload
  };

})();

(function() {
  'use strict';

  if (window._workFormOptimized) return;
  window._workFormOptimized = true;

  const STEPS = [
    {
      id: 1,
      name: '基础信息',
      icon: 'bi-info-circle-fill',
      sections: ['.bi-person-vcard', '.bi-clipboard-data', '.bi-file-text']
    },
    {
      id: 2,
      name: '人员与费用',
      icon: 'bi-people-fill',
      sections: ['.bi-people-fill', '.bi-cash-stack']
    },
    {
      id: 3,
      name: '补充信息',
      icon: 'bi-paperclip',
      sections: ['.bi-wrench-adjustable', '.bi-chat-dots', '.bi-paperclip']
    }
  ];

  let currentStep = 1;
  let allSections = [];

  function getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function findSectionByIcon(form, iconSelector) {
    const cards = form.querySelectorAll('.form-section-card');
    for (let i = 0; i < cards.length; i++) {
      const header = cards[i].querySelector('.section-header');
      if (header && header.querySelector('i' + iconSelector)) {
        return cards[i];
      }
    }
    return null;
  }

  function createStepIndicator(form) {
    const indicator = document.createElement('div');
    indicator.className = 'step-indicator mb-4';
    indicator.id = 'workFormStepIndicator';

    let html = '<div class="d-flex align-items-center justify-content-between">';
    STEPS.forEach(function(step, idx) {
      html += '<div class="step-item d-flex flex-column align-items-center" data-step="' + step.id + '">';
      html += '<div class="step-circle d-flex align-items-center justify-content-center">';
      html += '<i class="bi ' + step.icon + '"></i>';
      html += '</div>';
      html += '<div class="step-label small mt-1 fw-medium">' + step.name + '</div>';
      html += '</div>';
      if (idx < STEPS.length - 1) {
        html += '<div class="step-line flex-grow-1 mx-2"></div>';
      }
    });
    html += '</div>';

    indicator.innerHTML = html;
    return indicator;
  }

  function createStepNavButtons() {
    const navDiv = document.createElement('div');
    navDiv.className = 'step-navigation d-flex gap-2 mt-4';
    navDiv.id = 'workFormStepNav';

    navDiv.innerHTML = `
      <button type="button" class="btn btn-outline-secondary flex-grow-1" id="prevStepBtn" style="display:none">
        <i class="bi bi-arrow-left me-1"></i> 上一步
      </button>
      <button type="button" class="btn btn-primary flex-grow-1" id="nextStepBtn">
        下一步 <i class="bi bi-arrow-right ms-1"></i>
      </button>
      <button type="submit" class="btn btn-success flex-grow-1" id="submitStepBtn" style="display:none">
        <i class="bi bi-check-lg me-1"></i> 保存工单记录
      </button>
    `;

    return navDiv;
  }

  function updateStepDisplay(form) {
    const step = STEPS.find(function(s) { return s.id === currentStep; });
    if (!step) return;

    allSections.forEach(function(section) {
      section.style.display = 'none';
    });

    step.sections.forEach(function(iconSel) {
      const section = findSectionByIcon(form, iconSel);
      if (section) {
        section.style.display = '';
      }
    });

    const indicator = document.getElementById('workFormStepIndicator');
    if (indicator) {
      indicator.querySelectorAll('.step-item').forEach(function(item) {
        const stepId = parseInt(item.getAttribute('data-step'));
        const circle = item.querySelector('.step-circle');
        const label = item.querySelector('.step-label');
        if (stepId < currentStep) {
          circle.className = 'step-circle step-completed d-flex align-items-center justify-content-center';
          label.className = 'step-label small mt-1 fw-medium text-success';
        } else if (stepId === currentStep) {
          circle.className = 'step-circle step-active d-flex align-items-center justify-content-center';
          label.className = 'step-label small mt-1 fw-medium text-primary';
        } else {
          circle.className = 'step-circle d-flex align-items-center justify-content-center';
          label.className = 'step-label small mt-1 fw-medium text-muted';
        }
      });

      const lines = indicator.querySelectorAll('.step-line');
      lines.forEach(function(line, idx) {
        if (idx < currentStep - 1) {
          line.className = 'step-line step-line-active flex-grow-1 mx-2';
        } else {
          line.className = 'step-line flex-grow-1 mx-2';
        }
      });
    }

    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const submitBtn = document.getElementById('submitStepBtn');

    if (prevBtn) prevBtn.style.display = currentStep > 1 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = currentStep < STEPS.length ? '' : 'none';
    if (submitBtn) submitBtn.style.display = currentStep === STEPS.length ? '' : 'none';
  }

  function goToStep(step, form) {
    if (step < 1 || step > STEPS.length) return;
    currentStep = step;
    updateStepDisplay(form);
  }

  function validateCurrentStep(form) {
    const step = STEPS.find(function(s) { return s.id === currentStep; });
    if (!step) return true;

    if (currentStep === 1) {
      const customerName = document.getElementById('woCustomerName');
      if (customerName && !customerName.value.trim()) {
        alert('请输入或选择客户名称');
        customerName.focus();
        return false;
      }
      const workDate = document.getElementById('workDate');
      if (workDate && !workDate.value) {
        alert('请选择工作日期');
        workDate.focus();
        return false;
      }
    }

    return true;
  }

  function initSmartDefaults(form) {
    const workDate = document.getElementById('workDate');
    if (workDate && !workDate.value) {
      workDate.value = getTodayStr();
    }

    const lastWorkType = localStorage.getItem('lastWorkType');
    if (lastWorkType) {
      const subtype = document.getElementById('woSubtype');
      if (subtype) {
        for (let i = 0; i < subtype.options.length; i++) {
          if (subtype.options[i].value === lastWorkType || subtype.options[i].text === lastWorkType) {
            subtype.selectedIndex = i;
            break;
          }
        }
      }
    }

    const subtype = document.getElementById('woSubtype');
    if (subtype) {
      subtype.addEventListener('change', function() {
        localStorage.setItem('lastWorkType', this.value);
      });
    }

    const repairRadio = document.getElementById('rtRepair');
    const constructionRadio = document.getElementById('rtConstruction');
    const lastRecordType = localStorage.getItem('lastRecordType');
    if (lastRecordType === 'repair' && repairRadio) {
      repairRadio.checked = true;
      if (typeof window.toggleRecordType === 'function') {
        window.toggleRecordType();
      }
    }
    if (repairRadio) {
      repairRadio.addEventListener('change', function() {
        if (this.checked) localStorage.setItem('lastRecordType', 'repair');
      });
    }
    if (constructionRadio) {
      constructionRadio.addEventListener('change', function() {
        if (this.checked) localStorage.setItem('lastRecordType', 'construction');
      });
    }
  }

  function getStaffGroups() {
    try {
      return JSON.parse(localStorage.getItem('staffGroups') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveStaffGroups(groups) {
    localStorage.setItem('staffGroups', JSON.stringify(groups));
  }

  function getStaffListFromPicker() {
    const staffNames = [];
    const tagsContainer = document.getElementById('selectedStaffTags');
    if (tagsContainer) {
      tagsContainer.querySelectorAll('.staff-tag').forEach(function(tag) {
        const name = tag.getAttribute('data-name') || tag.textContent.trim();
        if (name) staffNames.push(name);
      });
    }
    return staffNames;
  }

  function addStaffByName(name) {
    if (typeof window.addStaffToRecord === 'function') {
      window.addStaffToRecord(name);
    } else {
      const event = new CustomEvent('addStaff', { detail: { name: name } });
      document.dispatchEvent(event);
    }
  }

  function createGroupModal() {
    const modalHtml = `
      <div class="modal fade" id="staffGroupModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-people-fill me-2"></i>班组管理</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw500 small">选择班组</label>
                <select class="form-select form-select-sm" id="groupSelect">
                  <option value="">-- 选择班组 --</option>
                </select>
              </div>
              <div id="groupMembersList" class="mb-3" style="display:none">
                <label class="form-label fw500 small">班组成员</label>
                <div class="border rounded p-2 bg-light" id="groupMembersDisplay"></div>
              </div>
              <hr>
              <div class="mb-3">
                <label class="form-label fw500 small">新建班组</label>
                <input type="text" class="form-control form-control-sm mb-2" id="newGroupName" placeholder="班组名称，如：监控组">
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-sm btn-outline-primary" id="saveGroupBtn">
                    <i class="bi bi-save me-1"></i>保存当前选中人员为班组
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-danger" id="deleteGroupBtn" style="display:none">
                    <i class="bi bi-trash me-1"></i>删除班组
                  </button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
              <button type="button" class="btn btn-primary" id="applyGroupBtn" disabled>
                <i class="bi bi-check-lg me-1"></i>应用班组
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (!document.getElementById('staffGroupModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    setupGroupModalEvents();
  }

  function setupGroupModalEvents() {
    const modal = document.getElementById('staffGroupModal');
    if (!modal || modal._eventsSetup) return;
    modal._eventsSetup = true;

    const groupSelect = document.getElementById('groupSelect');
    const membersList = document.getElementById('groupMembersList');
    const membersDisplay = document.getElementById('groupMembersDisplay');
    const applyBtn = document.getElementById('applyGroupBtn');
    const deleteBtn = document.getElementById('deleteGroupBtn');
    const saveBtn = document.getElementById('saveGroupBtn');
    const newGroupName = document.getElementById('newGroupName');

    function refreshGroupList() {
      const groups = getStaffGroups();
      groupSelect.innerHTML = '<option value="">-- 选择班组 --</option>';
      groups.forEach(function(g) {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.name + ' (' + g.members.length + '人)';
        groupSelect.appendChild(option);
      });
    }

    groupSelect.addEventListener('change', function() {
      const groups = getStaffGroups();
      const group = groups.find(function(g) { return g.id === groupSelect.value; });
      if (group) {
        membersList.style.display = '';
        membersDisplay.innerHTML = group.members.map(function(m) {
          return '<span class="badge bg-secondary me-1 mb-1">' + m + '</span>';
        }).join('') || '<span class="text-muted small">暂无成员</span>';
        applyBtn.disabled = false;
        deleteBtn.style.display = '';
      } else {
        membersList.style.display = 'none';
        applyBtn.disabled = true;
        deleteBtn.style.display = 'none';
      }
    });

    applyBtn.addEventListener('click', function() {
      const groups = getStaffGroups();
      const group = groups.find(function(g) { return g.id === groupSelect.value; });
      if (group) {
        group.members.forEach(function(name) {
          addStaffByName(name);
        });
        setTimeout(function() {
          if (typeof window.updateTotalHoursDisplay === 'function') {
            window.updateTotalHoursDisplay();
          }
        }, 100);
        bootstrap.Modal.getInstance(modal).hide();
      }
    });

    deleteBtn.addEventListener('click', function() {
      if (!confirm('确定要删除这个班组吗？')) return;
      let groups = getStaffGroups();
      groups = groups.filter(function(g) { return g.id !== groupSelect.value; });
      saveStaffGroups(groups);
      refreshGroupList();
      membersList.style.display = 'none';
      applyBtn.disabled = true;
      deleteBtn.style.display = 'none';
    });

    saveBtn.addEventListener('click', function() {
      const name = newGroupName.value.trim();
      if (!name) {
        alert('请输入班组名称');
        newGroupName.focus();
        return;
      }

      const currentStaff = getStaffListFromPicker();
      if (currentStaff.length === 0) {
        alert('请先选择人员，再保存为班组');
        return;
      }

      const groups = getStaffGroups();
      const existingIdx = groups.findIndex(function(g) { return g.name === name; });
      if (existingIdx >= 0) {
        if (!confirm('班组名称已存在，是否更新成员？')) return;
        groups[existingIdx].members = currentStaff;
      } else {
        groups.push({
          id: 'g_' + Date.now(),
          name: name,
          members: currentStaff
        });
      }
      saveStaffGroups(groups);
      refreshGroupList();
      newGroupName.value = '';
      alert('班组保存成功');
    });

    modal.addEventListener('show.bs.modal', function() {
      refreshGroupList();
    });
  }

  function addStaffGroupButton() {
    const staffCard = document.querySelector('#workForm .form-section-card .bi-people-fill')?.closest('.form-section-card');
    if (!staffCard) return;

    const staffPicker = staffCard.querySelector('#staffPicker');
    if (!staffPicker || staffCard._groupBtnAdded) return;
    staffCard._groupBtnAdded = true;

    const groupBtn = document.createElement('button');
    groupBtn.type = 'button';
    groupBtn.className = 'btn btn-sm btn-outline-info mt-2';
    groupBtn.innerHTML = '<i class="bi bi-collection me-1"></i>班组管理';
    groupBtn.onclick = function() {
      createGroupModal();
      const modal = new bootstrap.Modal(document.getElementById('staffGroupModal'));
      modal.show();
    };

    const sectionBody = staffCard.querySelector('.section-body');
    if (sectionBody) {
      sectionBody.insertBefore(groupBtn, sectionBody.querySelector('#selectedStaffTags')?.nextSibling || sectionBody.lastChild);
    }
  }

  function setupCustomerQuickAddEnhanced() {
    const addBtn = document.querySelector('#workForm button[onclick*="openCustomerQuickAdd"]');
    if (!addBtn) return;
    if (addBtn._enhanced) return;
    addBtn._enhanced = true;

    addBtn.classList.add('btn-sm', 'ms-1');
    addBtn.title = '快速添加客户';
  }

  function initWorkFormSteps() {
    const form = document.getElementById('workForm');
    if (!form || form._stepInit) return;

    allSections = Array.from(form.querySelectorAll('.form-section-card'));

    const recordTypeToggle = form.querySelector('.d-flex.justify-content-center.gap-2');
    const templatePicks = form.querySelector('.template-quick-picks');

    const indicator = createStepIndicator(form);

    if (templatePicks) {
      templatePicks.parentNode.insertBefore(indicator, templatePicks.nextSibling);
    } else if (recordTypeToggle) {
      recordTypeToggle.parentNode.insertBefore(indicator, recordTypeToggle.nextSibling);
    } else {
      form.insertBefore(indicator, form.firstChild);
    }

    const originalSubmitBtn = form.querySelector('button[type="submit"]');
    if (originalSubmitBtn) {
      originalSubmitBtn.style.display = 'none';
    }

    const stepNav = createStepNavButtons();
    form.appendChild(stepNav);

    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        goToStep(currentStep - 1, form);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (validateCurrentStep(form)) {
          goToStep(currentStep + 1, form);
        }
      });
    }

    initSmartDefaults(form);

    setTimeout(function() {
      addStaffGroupButton();
    }, 300);

    form._stepInit = true;
    currentStep = 1;
    updateStepDisplay(form);
  }

  function hookOpenFunctions() {
    const _origOpenNewWork = window.openNewWork;
    if (_origOpenNewWork && !_origOpenNewWork._stepHooked) {
      window.openNewWork = function(type) {
        const result = _origOpenNewWork.apply(this, arguments);
        setTimeout(function() {
          initWorkFormSteps();
          currentStep = 1;
          const form = document.getElementById('workForm');
          if (form) updateStepDisplay(form);
        }, 200);
        return result;
      };
      window.openNewWork._stepHooked = true;
    }

    const _origOpenEditWork = window.openEditWork;
    if (_origOpenEditWork && !_origOpenEditWork._stepHooked) {
      window.openEditWork = function(id) {
        const result = _origOpenEditWork.apply(this, arguments);
        setTimeout(function() {
          initWorkFormSteps();
          currentStep = 1;
          const form = document.getElementById('workForm');
          if (form) updateStepDisplay(form);
        }, 300);
        return result;
      };
      window.openEditWork._stepHooked = true;
    }
  }

  const stepStyles = `
    .step-indicator {
      padding: 8px 4px;
    }
    .step-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #e9ecef;
      color: #6c757d;
      font-size: 16px;
      transition: all 0.3s ease;
      border: 2px solid #dee2e6;
    }
    .step-circle.step-active {
      background-color: #0d6efd;
      color: white;
      border-color: #0d6efd;
      box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.15);
    }
    .step-circle.step-completed {
      background-color: #198754;
      color: white;
      border-color: #198754;
    }
    .step-line {
      height: 2px;
      background-color: #dee2e6;
      border-radius: 1px;
      transition: background-color 0.3s ease;
    }
    .step-line.step-line-active {
      background-color: #198754;
    }
    .step-item {
      min-width: 70px;
    }
    .step-navigation {
      position: sticky;
      bottom: 0;
      background: white;
      padding: 12px 0;
      border-top: 1px solid #e9ecef;
      margin: 0 -12px -12px -12px;
      padding-left: 12px;
      padding-right: 12px;
      z-index: 10;
    }
    @media (max-width: 576px) {
      .step-circle {
        width: 36px;
        height: 36px;
        font-size: 14px;
      }
      .step-label {
        font-size: 11px;
      }
      .step-item {
        min-width: 56px;
      }
    }
  `;

  function injectStyles() {
    if (document.getElementById('workFormStepStyles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'workFormStepStyles';
    styleEl.textContent = stepStyles;
    document.head.appendChild(styleEl);
  }

  function init() {
    injectStyles();
    hookOpenFunctions();
    setupCustomerQuickAddEnhanced();

    if (document.getElementById('workForm')) {
      setTimeout(initWorkFormSteps, 100);
    }

    const observer = new MutationObserver(function() {
      if (document.getElementById('workForm') && !document.getElementById('workForm')._stepInit) {
        initWorkFormSteps();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  window.WorkFormOptimizer = {
    initWorkFormSteps: initWorkFormSteps,
    goToStep: goToStep,
    getStaffGroups: getStaffGroups,
    saveStaffGroups: saveStaffGroups,
    createGroupModal: createGroupModal
  };

})();

(function() {
  'use strict';

  if (window._unifiedFinanceLoaded) return;
  window._unifiedFinanceLoaded = true;

  let state = {
    filterType: 'all',
    startDate: '',
    endDate: '',
    payments: [],
    expenses: [],
    salaries: [],
    projects: [],
    loading: false
  };

  function fmtMoney(val) {
    const num = parseFloat(val) || 0;
    return '¥' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function fmtMoney0(val) {
    const num = parseFloat(val) || 0;
    return '¥' + num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getMonthRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  }

  function isInCurrentMonth(dateStr) {
    if (!dateStr) return false;
    const now = new Date();
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  function isInDateRange(dateStr, start, end) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (start && d < new Date(start)) return false;
    if (end && d > new Date(end + 'T23:59:59')) return false;
    return true;
  }

  function getProjectName(projectId) {
    if (!projectId) return '-';
    const p = state.projects.find(x => x.id == projectId);
    return p ? (p.name || '-') : '-';
  }

  function createFinanceTab() {
    const tabContent = document.querySelector('.tab-content');
    if (!tabContent) return;

    if (document.getElementById('tab-finance-unified')) return;

    const tabPane = document.createElement('div');
    tabPane.className = 'tab-pane fade';
    tabPane.id = 'tab-finance-unified';
    tabPane.innerHTML = `
      <div class="container py-3">
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h5 class="mb-0"><i class="bi bi-wallet2 me-2 text-primary"></i>财务中心</h5>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="refreshUnifiedFinance()">
              <i class="bi bi-arrow-clockwise"></i> 刷新
            </button>
          </div>
        </div>

        <div class="row g-3 mb-3" id="financeStatsCards">
          <div class="col-6 col-md-3">
            <div class="card shadow-sm stat-card h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <div class="text-muted small">本月收入</div>
                    <div class="fs-4 fw-bold text-success mt-1" id="statMonthIncome">¥0.00</div>
                  </div>
                  <div class="stat-icon bg-success bg-opacity-10 text-success rounded p-2">
                    <i class="bi bi-arrow-down-left fs-4"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card shadow-sm stat-card h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <div class="text-muted small">本月支出</div>
                    <div class="fs-4 fw-bold text-danger mt-1" id="statMonthExpense">¥0.00</div>
                  </div>
                  <div class="stat-icon bg-danger bg-opacity-10 text-danger rounded p-2">
                    <i class="bi bi-arrow-up-right fs-4"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card shadow-sm stat-card h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <div class="text-muted small">本月工资</div>
                    <div class="fs-4 fw-bold text-warning mt-1" id="statMonthSalary">¥0.00</div>
                  </div>
                  <div class="stat-icon bg-warning bg-opacity-10 text-warning rounded p-2">
                    <i class="bi bi-cash-coin fs-4"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card shadow-sm stat-card h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <div class="text-muted small">本月利润</div>
                    <div class="fs-4 fw-bold mt-1" id="statMonthProfit">¥0.00</div>
                  </div>
                  <div class="stat-icon bg-primary bg-opacity-10 text-primary rounded p-2">
                    <i class="bi bi-graph-up fs-4"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h6 class="mb-0"><i class="bi bi-lightning-charge me-1 text-primary"></i>快捷操作</h6>
            </div>
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-success" onclick="quickAddPayment()">
                <i class="bi bi-plus-lg me-1"></i>新增收款
              </button>
              <button class="btn btn-danger" onclick="quickAddExpense()">
                <i class="bi bi-plus-lg me-1"></i>新增支出
              </button>
              <button class="btn btn-warning" onclick="quickAddSalary()">
                <i class="bi bi-plus-lg me-1"></i>记工资
              </button>
            </div>
          </div>
        </div>

        <div class="card shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h6 class="mb-0"><i class="bi bi-list-ul me-1 text-primary"></i>交易流水</h6>
              <div class="d-flex gap-2 flex-wrap">
                <div class="btn-group btn-group-sm" role="group">
                  <button type="button" class="btn btn-outline-primary active" data-filter-type="all" onclick="setFinanceFilterType('all')">全部</button>
                  <button type="button" class="btn btn-outline-primary" data-filter-type="income" onclick="setFinanceFilterType('income')">收入</button>
                  <button type="button" class="btn btn-outline-primary" data-filter-type="expense" onclick="setFinanceFilterType('expense')">支出</button>
                  <button type="button" class="btn btn-outline-primary" data-filter-type="salary" onclick="setFinanceFilterType('salary')">工资</button>
                </div>
                <input type="date" class="form-control form-control-sm" id="financeStartDate" style="width:auto" onchange="applyFinanceDateFilter()">
                <span class="align-self-center text-muted">至</span>
                <input type="date" class="form-control form-control-sm" id="financeEndDate" style="width:auto" onchange="applyFinanceDateFilter()">
              </div>
            </div>
            <div id="financeTransactionList">
              <div class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm mb-2"></div>
                <div class="small">加载中...</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="mb-0"><i class="bi bi-bar-chart me-1 text-primary"></i>项目收支对比</h6>
            </div>
            <div id="financeProjectCompare">
              <div class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm mb-2"></div>
                <div class="small">加载中...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const refTab = document.getElementById('tab-payments') || document.getElementById('tab-expenses');
    if (refTab && refTab.parentNode) {
      refTab.parentNode.insertBefore(tabPane, refTab);
    } else {
      tabContent.appendChild(tabPane);
    }
  }

  function addFinanceNavItem() {
    const dropdown = document.querySelector('#financeDropdown + .dropdown-menu');
    if (!dropdown || dropdown._financeCenterAdded) return;

    const firstItem = dropdown.querySelector('li');
    const centerLi = document.createElement('li');
    centerLi.innerHTML = `
      <a class="dropdown-item" href="#" onclick="switchTab('tab-finance-unified')">
        <i class="bi bi-wallet2 me-2"></i>财务中心
      </a>
    `;

    if (firstItem) {
      dropdown.insertBefore(centerLi, firstItem);
    } else {
      dropdown.appendChild(centerLi);
    }

    const dividerLi = document.createElement('li');
    dividerLi.innerHTML = '<hr class="dropdown-divider">';
    centerLi.after(dividerLi);

    dropdown._financeCenterAdded = true;
  }

  function mergeTransactions() {
    const transactions = [];

    state.payments.forEach(p => {
      transactions.push({
        id: 'p_' + p.id,
        type: 'income',
        date: p.payment_date || p.created_at || '',
        amount: parseFloat(p.amount) || 0,
        related: p.customer_name || p.customer || '-',
        projectId: p.project_id,
        projectName: getProjectName(p.project_id),
        remark: p.remark || p.note || '',
        raw: p
      });
    });

    state.expenses.forEach(e => {
      transactions.push({
        id: 'e_' + e.id,
        type: 'expense',
        date: e.expense_date || e.date || e.created_at || '',
        amount: parseFloat(e.amount) || 0,
        related: e.category || e.expense_type || '-',
        projectId: e.project_id,
        projectName: getProjectName(e.project_id),
        remark: e.remark || e.note || '',
        raw: e
      });
    });

    state.salaries.forEach(s => {
      transactions.push({
        id: 's_' + s.id,
        type: 'salary',
        date: s.salary_date || s.date || s.created_at || '',
        amount: parseFloat(s.amount) || 0,
        related: s.staff_name || s.employee_name || '-',
        projectId: s.project_id,
        projectName: getProjectName(s.project_id),
        remark: s.remark || s.note || '',
        raw: s
      });
    });

    transactions.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });

    return transactions;
  }

  function filterTransactions(transactions) {
    return transactions.filter(t => {
      if (state.filterType !== 'all' && t.type !== state.filterType) return false;
      if (state.startDate || state.endDate) {
        if (!isInDateRange(t.date, state.startDate, state.endDate)) return false;
      }
      return true;
    });
  }

  function calcMonthStats() {
    let income = 0, expense = 0, salary = 0;

    state.payments.forEach(p => {
      if (isInCurrentMonth(p.payment_date || p.created_at)) {
        income += parseFloat(p.amount) || 0;
      }
    });

    state.expenses.forEach(e => {
      if (isInCurrentMonth(e.expense_date || e.date || e.created_at)) {
        expense += parseFloat(e.amount) || 0;
      }
    });

    state.salaries.forEach(s => {
      if (isInCurrentMonth(s.salary_date || s.date || s.created_at)) {
        salary += parseFloat(s.amount) || 0;
      }
    });

    const profit = income - expense - salary;

    return { income, expense, salary, profit };
  }

  function updateStatsCards() {
    const stats = calcMonthStats();
    const incomeEl = document.getElementById('statMonthIncome');
    const expenseEl = document.getElementById('statMonthExpense');
    const salaryEl = document.getElementById('statMonthSalary');
    const profitEl = document.getElementById('statMonthProfit');

    if (incomeEl) incomeEl.textContent = fmtMoney0(stats.income);
    if (expenseEl) expenseEl.textContent = fmtMoney0(stats.expense);
    if (salaryEl) salaryEl.textContent = fmtMoney0(stats.salary);
    if (profitEl) {
      profitEl.textContent = fmtMoney0(stats.profit);
      profitEl.className = 'fs-4 fw-bold mt-1 ' + (stats.profit >= 0 ? 'text-success' : 'text-danger');
    }
  }

  function renderTransactionList() {
    const container = document.getElementById('financeTransactionList');
    if (!container) return;

    const all = mergeTransactions();
    const filtered = filterTransactions(all);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="text-center py-5 text-muted small">暂无交易记录</div>';
      return;
    }

    const typeBadge = {
      income: '<span class="badge bg-success">收入</span>',
      expense: '<span class="badge bg-danger">支出</span>',
      salary: '<span class="badge bg-warning text-dark">工资</span>'
    };

    const amountClass = {
      income: 'text-success fw-semibold',
      expense: 'text-danger fw-semibold',
      salary: 'text-warning fw-semibold text-dark'
    };

    const amountPrefix = {
      income: '+',
      expense: '-',
      salary: '-'
    };

    let html = `
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th style="width:120px">日期</th>
              <th style="width:80px">类型</th>
              <th>关联</th>
              <th style="width:120px">项目</th>
              <th style="width:120px" class="text-end">金额</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
    `;

    filtered.forEach(t => {
      html += `
        <tr>
          <td><code class="small">${escapeHtml(t.date || '-')}</code></td>
          <td>${typeBadge[t.type]}</td>
          <td>${escapeHtml(t.related || '-')}</td>
          <td class="text-truncate" style="max-width:150px" title="${escapeHtml(t.projectName || '-')}">${escapeHtml(t.projectName || '-')}</td>
          <td class="${amountClass[t.type]} text-end">${amountPrefix[t.type]}${fmtMoney(t.amount)}</td>
          <td class="text-truncate" style="max-width:200px" title="${escapeHtml(t.remark || '')}">${escapeHtml(t.remark || '-')}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <div class="text-muted small mt-2 text-end">共 ${filtered.length} 条记录</div>
    `;

    container.innerHTML = html;
  }

  function calcProjectStats() {
    const projectMap = {};

    state.projects.forEach(p => {
      projectMap[p.id] = {
        id: p.id,
        name: p.name || '-',
        income: 0,
        expense: 0,
        salary: 0
      };
    });

    state.payments.forEach(p => {
      const pid = p.project_id;
      if (pid && projectMap[pid]) {
        projectMap[pid].income += parseFloat(p.amount) || 0;
      }
    });

    state.expenses.forEach(e => {
      const pid = e.project_id;
      if (pid && projectMap[pid]) {
        projectMap[pid].expense += parseFloat(e.amount) || 0;
      }
    });

    state.salaries.forEach(s => {
      const pid = s.project_id;
      if (pid && projectMap[pid]) {
        projectMap[pid].salary += parseFloat(s.amount) || 0;
      }
    });

    return Object.values(projectMap).filter(p => p.income > 0 || p.expense > 0 || p.salary > 0);
  }

  function renderProjectCompare() {
    const container = document.getElementById('financeProjectCompare');
    if (!container) return;

    const stats = calcProjectStats();

    if (stats.length === 0) {
      container.innerHTML = '<div class="text-center py-5 text-muted small">暂无项目收支数据</div>';
      return;
    }

    stats.sort((a, b) => (b.income - b.expense - b.salary) - (a.income - a.expense - a.salary));

    let html = `
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>项目名称</th>
              <th class="text-end" style="width:120px">收入</th>
              <th class="text-end" style="width:120px">支出</th>
              <th class="text-end" style="width:120px">工资</th>
              <th class="text-end" style="width:120px">利润</th>
              <th style="width:80px">利润率</th>
            </tr>
          </thead>
          <tbody>
    `;

    let totalIncome = 0, totalExpense = 0, totalSalary = 0;

    stats.forEach(s => {
      const profit = s.income - s.expense - s.salary;
      const rate = s.income > 0 ? ((profit / s.income) * 100).toFixed(1) + '%' : '-';
      const profitClass = profit >= 0 ? 'text-success' : 'text-danger';

      totalIncome += s.income;
      totalExpense += s.expense;
      totalSalary += s.salary;

      html += `
        <tr>
          <td class="text-truncate" style="max-width:250px" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</td>
          <td class="text-end text-success">${fmtMoney(s.income)}</td>
          <td class="text-end text-danger">${fmtMoney(s.expense)}</td>
          <td class="text-end text-warning">${fmtMoney(s.salary)}</td>
          <td class="text-end fw-semibold ${profitClass}">${fmtMoney(profit)}</td>
          <td class="text-center"><span class="badge ${profit >= 0 ? 'bg-success' : 'bg-danger'}">${rate}</span></td>
        </tr>
      `;
    });

    const totalProfit = totalIncome - totalExpense - totalSalary;
    const totalRate = totalIncome > 0 ? ((totalProfit / totalIncome) * 100).toFixed(1) + '%' : '-';

    html += `
          </tbody>
          <tfoot class="table-light fw-semibold">
            <tr>
              <td>合计 (${stats.length} 个项目)</td>
              <td class="text-end text-success">${fmtMoney(totalIncome)}</td>
              <td class="text-end text-danger">${fmtMoney(totalExpense)}</td>
              <td class="text-end text-warning">${fmtMoney(totalSalary)}</td>
              <td class="text-end ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">${fmtMoney(totalProfit)}</td>
              <td class="text-center"><span class="badge ${totalProfit >= 0 ? 'bg-success' : 'bg-danger'}">${totalRate}</span></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }

  window.setFinanceFilterType = function(type) {
    state.filterType = type;
    document.querySelectorAll('#tab-finance-unified [data-filter-type]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filterType === type);
    });
    renderTransactionList();
  };

  window.applyFinanceDateFilter = function() {
    const startEl = document.getElementById('financeStartDate');
    const endEl = document.getElementById('financeEndDate');
    state.startDate = startEl ? startEl.value : '';
    state.endDate = endEl ? endEl.value : '';
    renderTransactionList();
  };

  window.refreshUnifiedFinance = function() {
    loadAllFinanceData();
  };

  window.quickAddPayment = function() {
    if (typeof window.switchTab === 'function') {
      window.switchTab('tab-payments');
      setTimeout(function() {
        const addBtn = document.querySelector('#tab-payments .btn-primary');
        if (addBtn) addBtn.click();
      }, 300);
    }
  };

  window.quickAddExpense = function() {
    if (typeof window.switchTab === 'function') {
      window.switchTab('tab-expenses');
      setTimeout(function() {
        const addBtn = document.querySelector('#tab-expenses .btn-primary');
        if (addBtn) addBtn.click();
      }, 300);
    }
  };

  window.quickAddSalary = function() {
    if (typeof window.switchTab === 'function') {
      window.switchTab('tab-salary');
      setTimeout(function() {
        const addBtn = document.querySelector('#tab-salary .btn-primary');
        if (addBtn) addBtn.click();
      }, 300);
    }
  };

  function loadAllFinanceData() {
    const listEl = document.getElementById('financeTransactionList');
    const projEl = document.getElementById('financeProjectCompare');

    if (listEl) {
      listEl.innerHTML = `
        <div class="text-center py-4 text-muted">
          <div class="spinner-border spinner-border-sm mb-2"></div>
          <div class="small">加载中...</div>
        </div>
      `;
    }
    if (projEl) {
      projEl.innerHTML = `
        <div class="text-center py-4 text-muted">
          <div class="spinner-border spinner-border-sm mb-2"></div>
          <div class="small">加载中...</div>
        </div>
      `;
    }

    state.loading = true;

    const apiFetch = window.apiFetch || fetch;

    const pPayments = apiFetch('/api/payments?per_page=50').then(r => {
      if (window.apiFetch) return r;
      return r.json();
    }).then(r => {
      state.payments = r.records || r.data || r || [];
    }).catch(() => { state.payments = []; });

    const pExpenses = apiFetch('/api/expenses?per_page=50').then(r => {
      if (window.apiFetch) return r;
      return r.json();
    }).then(r => {
      state.expenses = r.records || r.data || r || [];
    }).catch(() => { state.expenses = []; });

    const pSalaries = apiFetch('/api/salaries?per_page=50').then(r => {
      if (window.apiFetch) return r;
      return r.json();
    }).then(r => {
      state.salaries = r.records || r.data || r || [];
    }).catch(() => { state.salaries = []; });

    const pProjects = apiFetch('/api/projects').then(r => {
      if (window.apiFetch) return r;
      return r.json();
    }).then(r => {
      state.projects = r.records || r.data || r || [];
    }).catch(() => { state.projects = []; });

    Promise.all([pPayments, pExpenses, pSalaries, pProjects]).then(() => {
      state.loading = false;
      updateStatsCards();
      renderTransactionList();
      renderProjectCompare();
    }).catch(() => {
      state.loading = false;
      if (listEl) {
        listEl.innerHTML = '<div class="alert alert-warning small mb-0">部分数据加载失败，请刷新重试</div>';
      }
    });
  }

  function hookSwitchTab() {
    if (typeof window.switchTab !== 'function') return;
    if (window.switchTab._unifiedFinanceHooked) return;

    const _origSwitchTab = window.switchTab;
    window.switchTab = function(tabId) {
      const result = _origSwitchTab.apply(this, arguments);

      if (tabId === 'tab-finance-unified') {
        setTimeout(function() {
          createFinanceTab();
          loadAllFinanceData();
        }, 50);
      }

      return result;
    };
    window.switchTab._unifiedFinanceHooked = true;
  }

  function init() {
    createFinanceTab();
    addFinanceNavItem();
    hookSwitchTab();

    const monthRange = getMonthRange();
    state.startDate = monthRange.start;
    state.endDate = monthRange.end;

    setTimeout(function() {
      const startEl = document.getElementById('financeStartDate');
      const endEl = document.getElementById('financeEndDate');
      if (startEl) startEl.value = state.startDate;
      if (endEl) endEl.value = state.endDate;
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }

  window.UnifiedFinance = {
    refresh: loadAllFinanceData,
    setFilterType: window.setFinanceFilterType,
    applyDateFilter: window.applyFinanceDateFilter,
    quickAddPayment: window.quickAddPayment,
    quickAddExpense: window.quickAddExpense,
    quickAddSalary: window.quickAddSalary,
    getState: () => state
  };

})();

(function() {
  'use strict';

  // 防止重复执行标记位
  if (window._navReorganized) return;
  window._navReorganized = true;

  /* ---------- 工具函数：跳转到工单tab并切换到维修类型 ---------- */
  function switchToRepairWork() {
    if (typeof window.switchTab === 'function') {
      window.switchTab('tab-work');
    }
    setTimeout(function() {
      var repairRadio = document.getElementById('rtRepair');
      if (repairRadio && !repairRadio.checked) {
        repairRadio.checked = true;
        if (typeof window.toggleRecordType === 'function') {
          window.toggleRecordType();
        }
      }
    }, 100);
  }

  /* ---------- 工具函数：收支流水（统一视图入口） ---------- */
  function openFinanceFlow() {
    // 收支流水：默认跳转到收款管理作为统一视图入口
    // 后续可扩展为独立的收支合并列表页面
    if (typeof window.switchTab === 'function') {
      window.switchTab('tab-payments');
    }
  }

  /* ---------- 工具函数：获取报修待办徽章HTML ---------- */
  function getPendingBadgeHtml() {
    var badge = document.getElementById('pendingBadge');
    if (badge) {
      return badge.outerHTML;
    }
    return '<span class="badge bg-danger rounded-pill ms-1 is-12" id="pendingBadge">0</span>';
  }

  /* ---------- 主函数：重组导航菜单 ---------- */
  function reorganizeNavigation() {
    var navList = document.querySelector('#navMenu .navbar-nav');
    if (!navList) return;

    // 标记已经处理过，防止重复执行
    if (navList._navReorganizedV2) return;

    // ==========================================
    // 第一步：移除旧的项目管理菜单（之前custom.js添加的）
    // ==========================================
    var oldProjectDropdown = document.getElementById('projectDropdown');
    if (oldProjectDropdown) {
      var oldProjectLi = oldProjectDropdown.closest('li.nav-item');
      if (oldProjectLi) oldProjectLi.remove();
    }

    // ==========================================
    // 第二步：移除"查询统计"一级菜单
    // ==========================================
    var insightDropdown = document.getElementById('insightDropdown');
    if (insightDropdown) {
      var insightLi = insightDropdown.closest('li.nav-item');
      if (insightLi) insightLi.remove();
    }

    // ==========================================
    // 第三步：重组"业务"下拉菜单
    // ==========================================
    var businessDropdown = document.getElementById('businessDropdown');
    if (businessDropdown) {
      var businessMenu = businessDropdown.nextElementSibling;
      if (businessMenu) {
        // 保存报修待办徽章元素的引用
        var pendingBadgeEl = businessMenu.querySelector('#pendingBadge');
        var pendingBadgeHtml = pendingBadgeEl ? pendingBadgeEl.outerHTML : '';

        // 重建业务菜单内容
        businessMenu.innerHTML =
          // 工单相关
          '<li><h6 class="dropdown-header">工单管理</h6></li>' +
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-work\')"><i class="bi bi-tools me-2"></i>施工工单</a></li>' +
          '<li><a class="dropdown-item" href="#" onclick="_navSwitchToRepair()"><i class="bi bi-wrench-adjustable me-2"></i>维修工单</a></li>' +
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-query\')"><i class="bi bi-search me-2"></i>工单查询</a></li>' +
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-templates\')"><i class="bi bi-journal-plus me-2"></i>工单模板</a></li>' +
          '<li><hr class="dropdown-divider"></li>' +
          // 待办
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-pending\')"><i class="bi bi-clock-history me-2"></i>报修待办 ' + pendingBadgeHtml + '</a></li>' +
          '<li><hr class="dropdown-divider"></li>' +
          // 更多工具（保留原有功能）
          '<li><h6 class="dropdown-header">更多工具</h6></li>' +
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-calendar\')"><i class="bi bi-calendar3 me-2"></i>日历视图</a></li>' +
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-maintenance\')"><i class="bi bi-calendar-check me-2"></i>巡检计划</a></li>' +
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-stats\')"><i class="bi bi-graph-up me-2"></i>经营统计</a></li>' +
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-advanced-stats\')"><i class="bi bi-pie-chart me-2"></i>高级统计</a></li>';
      }

      // 更新业务菜单图标和文字
      businessDropdown.innerHTML = '<i class="bi bi-clipboard-check me-1"></i>业务';
    }

    // ==========================================
    // 第四步：创建"项目"一级菜单
    // ==========================================
    var businessLi = document.getElementById('businessDropdown')?.closest('li.nav-item');
    if (businessLi) {
      var projectNavLi = document.createElement('li');
      projectNavLi.className = 'nav-item dropdown';
      projectNavLi.innerHTML =
        '<a class="nav-link" href="#" id="projectDropdownV2" role="button" data-bs-toggle="dropdown">' +
        '<i class="bi bi-hammer me-1"></i>项目' +
        '</a>' +
        '<ul class="dropdown-menu dropdown-menu-end ry-nav-menu">' +
        '<li><h6 class="dropdown-header">项目</h6></li>' +
        '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-projects\')"><i class="bi bi-list-ul me-2"></i>项目清单</a></li>' +
        '<li><hr class="dropdown-divider"></li>' +
        '<li><h6 class="dropdown-header">快速新增</h6></li>' +
        '<li><a class="dropdown-item" href="#" onclick="openNewWork(\'construction\')"><i class="bi bi-tools me-2"></i>新增施工工单</a></li>' +
        '<li><a class="dropdown-item" href="#" onclick="_navOpenProjectExpenseQuickAdd()"><i class="bi bi-receipt-cutoff me-2"></i>新增费用开支</a></li>' +
        '</ul>';

      // 插在"业务"后面
      businessLi.after(projectNavLi);
    }

    // ==========================================
    // 第五步：重组"财务"下拉菜单（新增收支流水）
    // ==========================================
    var financeDropdown = document.getElementById('financeDropdown');
    if (financeDropdown) {
      var financeMenu = financeDropdown.nextElementSibling;
      if (financeMenu) {
        financeMenu.innerHTML =
          '<li><h6 class="dropdown-header">总览</h6></li>' +
          '<li><a class="dropdown-item" href="#" onclick="_navOpenFinanceFlow()"><i class="bi bi-sort-down-alt me-2"></i>收支流水</a></li>' +
          '<li><hr class="dropdown-divider"></li>' +
          '<li><h6 class="dropdown-header">收入</h6></li>' +
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-payments\')"><i class="bi bi-credit-card me-2"></i>收款管理</a></li>' +
          '<li><hr class="dropdown-divider"></li>' +
          '<li><h6 class="dropdown-header">支出</h6></li>' +
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-expenses\')"><i class="bi bi-receipt-cutoff me-2"></i>支出管理</a></li>' +
          '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-salary\')"><i class="bi bi-cash-coin me-2"></i>工资管理</a></li>';
      }
    }

    // ==========================================
    // 第六步：重命名"管理"为"资源"，移除项目管理
    // ==========================================
    var manageDropdown = document.getElementById('manageDropdown');
    if (manageDropdown) {
      // 重命名菜单标题
      manageDropdown.innerHTML = '<i class="bi bi-box-seam me-1"></i>资源';

      var manageMenu = manageDropdown.nextElementSibling;
      if (manageMenu) {
        // 移除项目管理项
        var projectItem = manageMenu.querySelector('a[onclick*="tab-projects"]')?.closest('li');
        if (projectItem) projectItem.remove();

        // 更新分组标题
        var headerEl = manageMenu.querySelector('.dropdown-header');
        if (headerEl) {
          headerEl.textContent = '资源档案';
        }
      }
    }

    // ==========================================
    // 第七步：更新工作台图标（可选美化）
    // ==========================================
    var dashboardLink = document.querySelector('a[onclick*="tab-dashboard"]');
    if (dashboardLink) {
      var iconEl = dashboardLink.querySelector('i');
      if (iconEl) {
        iconEl.className = 'bi bi-house-door me-1';
      }
    }

    // 标记处理完成
    navList._navReorganizedV2 = true;
  }

  /* ---------- 兼容函数：项目费用快速新增 ---------- */
  // 如果之前已经定义了 openProjectExpenseQuickAdd 就复用，没有就用简易实现
  function openProjectExpenseQuickAddFallback() {
    if (typeof window.openProjectExpenseQuickAdd === 'function') {
      window.openProjectExpenseQuickAdd();
    } else {
      // 简易实现：跳转到项目页
      if (typeof window.switchTab === 'function') {
        window.switchTab('tab-projects');
      }
    }
  }

  /* ---------- 暴露全局函数供菜单调用 ---------- */
  window._navSwitchToRepair = switchToRepairWork;
  window._navOpenFinanceFlow = openFinanceFlow;
  window._navOpenProjectExpenseQuickAdd = openProjectExpenseQuickAddFallback;

  /* ---------- 初始化：等待DOM就绪 ---------- */
  function init() {
    // 尝试立即执行
    if (document.querySelector('#navMenu .navbar-nav')) {
      reorganizeNavigation();
    }

    // 延迟执行兜底（等待菜单渲染完成）
    setTimeout(function() {
      reorganizeNavigation();
    }, 300);

    setTimeout(function() {
      reorganizeNavigation();
    }, 800);

    // MutationObserver 监听导航DOM变化
    var navMenu = document.getElementById('navMenu');
    if (navMenu && !navMenu._navReorgObserver) {
      var observer = new MutationObserver(function() {
        reorganizeNavigation();
      });
      observer.observe(navMenu, { childList: true, subtree: true });
      navMenu._navReorgObserver = observer;
    }
  }

  // 启动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NavReorganize = {
    reorganize: reorganizeNavigation,
    switchToRepairWork: switchToRepairWork,
    openFinanceFlow: openFinanceFlow
  };

})();