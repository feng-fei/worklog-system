// template.js — 模板管理（loadTemplateInfo、loadCompanySettings、uploadTemplate 等）
// 注意：核心函数定义在 lib-core.js，此文件只包含覆盖/扩展代码

async function loadTemplateInfo(){
  try{
    const r = await apiFetch('/api/template/info');
    const data = await r.json();
    const el = document.getElementById('templateInfo');
    if(data.exists){
      el.innerHTML = '<div class="d-flex align-items-center gap-3 p-3 bg-light rounded-3"><i class="bi bi-file-earmark-spreadsheet fs-2 text-success"></i><div><strong>'+data.filename+'</strong><br><small class="text-muted">大小: '+data.size_kb+' KB | 更新: '+data.updated_at+'</small></div></div>';
    } else {
      el.innerHTML = '<div class="alert alert-warning mb-0"><i class="bi bi-exclamation-triangle me-1"></i>尚未上传模板文件，请上传 Excel 模板</div>';
    }
  }catch(e){
    document.getElementById('templateInfo').innerHTML = '<div class="alert alert-danger mb-0">加载模板信息失败</div>';
  }
}

async function loadCompanySettings(){
  try{
    const r = await apiFetch('/api/company-settings');
    const data = await r.json();
    Object.keys(data).forEach(function(key){
      var inp = document.querySelector('#companyForm [name="'+key+'"]');
      if(inp) inp.value = data[key] || '';
    });
  }catch(e){}
}

async function saveCompanySettings(e){
  e.preventDefault();
  var form = document.getElementById('companyForm');
  var data = {};
  form.querySelectorAll('input').forEach(function(inp){ data[inp.name] = inp.value; });
  var msg = document.getElementById('companyMsg');
  msg.className = 'small ms-2 text-info';
  msg.textContent = '保存中...';
  try{
    var r = await apiFetch('/api/company-settings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    var result = await r.json();
    if(result.message){
      msg.className = 'small ms-2 text-success';
      msg.textContent = '已保存';
      setTimeout(function(){ msg.className = 'small ms-2 is-0'; }, 2000);
    } else {
      msg.className = 'small ms-2 text-danger';
      msg.textContent = result.error || '保存失败';
    }
  }catch(e){
    msg.className = 'small ms-2 text-danger';
    msg.textContent = '保存失败';
  }
}

function downloadTemplate(){
  window.open('/api/template/download', '_blank');
}

async function uploadTemplate(input){
  var file = input.files[0];
  if(!file) return;
  var formData = new FormData();
  formData.append('file', file);
  var msg = document.getElementById('templateMsg');
  msg.className = 'small mt-2 text-info';
  msg.textContent = '上传中...';
  try{
    var r = await apiFetch('/api/template/upload', { method: 'POST', body: formData });
    var data = await r.json();
    if(data.error){
      msg.className = 'small mt-2 text-danger';
      msg.textContent = data.error;
    } else {
      msg.className = 'small mt-2 text-success';
      msg.textContent = data.message || '上传成功';
      loadTemplateInfo();
      setTimeout(function(){ msg.className = 'small mt-2 is-0'; }, 3000);
    }
  }catch(e){
    msg.className = 'small mt-2 text-danger';
    msg.textContent = '上传失败';
  }
  input.value = '';
}

// 切换到模板管理 tab 时自动加载数据
(function(){
  var _origSwitchTab = window.switchTab;
  window.switchTab = function(tabId){
    _origSwitchTab(tabId);
    if(tabId === 'tab-template'){
      loadTemplateInfo();
      loadCompanySettings();
    }
  };
})();
