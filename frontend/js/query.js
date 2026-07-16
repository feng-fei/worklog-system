// query.js — 查询结果扩展（下载按钮、showMore 包装）
// 注意：核心函数定义在 lib-core.js，此文件只包含覆盖/扩展代码

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
    var btn = document.createElement('button');
    btn.className = 'rc-action-btn rc-action-xlsx';
    btn.title = '下载维修单Excel';
    btn.setAttribute('aria-label', '下载维修单');
    btn.innerHTML = '<i class="bi bi-file-earmark-spreadsheet" aria-hidden="true"></i>';
    btn.onclick = function(e){
      e.stopPropagation();
      window.open('/api/repair-export/' + idMatch[1], '_blank');
    };
    actions.insertBefore(btn, actions.firstChild);
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
  // 检查是否为维修工单
  var body = document.getElementById('gModalBody');
  if(!body || !body.querySelector('.is-repair')) return;
  // 检查是否已有按钮
  if(modal.querySelector('.wd-download-btn')) return;
  var header = modal.querySelector('.modal-header');
  if(!header) return;
  var btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-outline-success wd-download-btn ms-auto';
  btn.innerHTML = '<i class="bi bi-file-earmark-spreadsheet me-1"></i>下载维修单';
  btn.onclick = function(){ window.open('/api/repair-export/' + recordId, '_blank'); };
  var closeBtn = header.querySelector('.btn-close');
  if(closeBtn){
    header.insertBefore(btn, closeBtn);
  } else {
    header.appendChild(btn);
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
