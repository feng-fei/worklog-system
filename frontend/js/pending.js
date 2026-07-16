// pending.js — 待办事项模块
// 依赖 lib-core.js（apiFetch, todayStr, showModal, updatePendingBadge 等）

var pendingFilter="all";
function setPendingFilter(f){
  pendingFilter=f;
  document.querySelectorAll("#pendingFilterGroup .btn").forEach(function(b){b.classList.toggle("active",b.dataset.filter===f)});
  loadPendingWorks();
}

async function loadPendingWorks(){
  try{
    var r=await apiFetch("/api/pending?status=pending&per_page=100"),data=await r.json(),
        container=document.getElementById("pendingList"),
        badge=document.getElementById("pendingCountBadge");
    if(0===data.records.length)return container.innerHTML='<div class="empty-state"><i class="bi bi-check2-circle"></i>没有待办事项</div>',void(badge&&(badge.textContent="0"));
    badge&&(badge.textContent=data.records.length);
    var filtered=data.records;
    if("urgent"===pendingFilter)filtered=data.records.filter(function(p){return"urgent"===p.priority});
    else if("overdue"===pendingFilter){var t=todayStr();filtered=data.records.filter(function(p){return p.reminder_date&&p.reminder_date.split("T")[0]<t})}
    else if("today"===pendingFilter){var t=todayStr();filtered=data.records.filter(function(p){return p.reminder_date&&p.reminder_date.split("T")[0]===t})}
    if(0===filtered.length)return container.innerHTML='<div class="empty-state"><i class="bi bi-funnel"></i>没有匹配的待办事项</div>',void(badge&&(badge.textContent="0"));
    var today=todayStr(),
        overdue=filtered.filter(function(p){return p.reminder_date&&p.reminder_date.split("T")[0]<today}),
        todayItems=filtered.filter(function(p){return p.reminder_date&&p.reminder_date.split("T")[0]===today}),
        future=filtered.filter(function(p){return!p.reminder_date||p.reminder_date.split("T")[0]>today});
    var html="";
    overdue.length>0&&(html+='<div class="text-danger fw-semibold small mb-1"><i class="bi bi-exclamation-circle me-1"></i>过期 ('+overdue.length+')</div>',html+=overdue.map(function(p){return pendingCard(p,true)}).join(""));
    todayItems.length>0&&(html+='<div class="fw-semibold small mb-1 mt-2"><i class="bi bi-calendar-check me-1"></i>今天</div>',html+=todayItems.map(function(p){return pendingCard(p)}).join(""));
    future.length>0&&(html+='<div class="text-muted fw-semibold small mb-1 mt-2"><i class="bi bi-calendar3 me-1"></i>以后 ('+future.length+')</div>',html+=future.map(function(p){return pendingCard(p)}).join(""));
    container.innerHTML=html
  }catch(e){
    document.getElementById("pendingList").innerHTML='<div class="empty-state">加载失败</div>'
  }
}

function pendingCard(p,isOver){
  var remind=p.reminder_date?p.reminder_date.split("T")[0]:"",
      dayDiff=remind?Math.floor((new Date(todayStr())-new Date(remind))/864e5):0,
      priority="urgent"===p.priority?"紧急":"普通",
      type=p.todo_type||"客户报修",
      phone=p.contact_phone?'<span><i class="bi bi-telephone me-1"></i>'+p.contact_phone+'</span>':"",
      contact=p.contact_name?'<span><i class="bi bi-person-vcard me-1"></i>'+p.contact_name+'</span>':"",
      overdueText=isOver?'<span class="pc-overdue"><i class="bi bi-exclamation-triangle-fill me-1"></i>超期 '+Math.max(dayDiff,1)+' 天</span>':"";
  return '<div class="pending-card pending-priority-'+(p.priority||"normal")+(isOver?" pending-overdue":"")+'">'+
    '<div class="pc-head"><div class="pc-title">'+(p.title||p.customer_name)+'</div>'+
    '<div class="pc-badges"><span class="pc-type">'+type+'</span><span class="pc-priority">'+priority+'</span>'+overdueText+'</div></div>'+
    '<div class="pc-meta"><span><i class="bi bi-person me-1"></i>'+(p.customer_name||"-")+'</span>'+contact+
    '<span><i class="bi bi-person-badge me-1"></i>'+(p.staff_name||"未分配")+'</span>'+phone+
    '<span><i class="bi bi-calendar-event me-1"></i>'+remind+'</span></div>'+
    '<div class="pc-content">'+(p.work_content||"")+'</div>'+
    '<div class="pc-actions">'+
    '<button class="btn btn-primary btn-sm" onclick="transferPending('+p.id+',\'repair\')"><i class="bi bi-wrench-adjustable me-1"></i>转维修</button>'+
    '<button class="btn btn-success btn-sm" onclick="transferPending('+p.id+',\'construction\')"><i class="bi bi-tools me-1"></i>转施工</button>'+
    '<button class="btn btn-outline-success btn-sm" onclick="completePending('+p.id+')"><i class="bi bi-check-circle me-1"></i>完成</button>'+
    '<button class="btn btn-outline-primary btn-sm" onclick="editPending('+p.id+')"><i class="bi bi-pencil"></i></button>'+
    '<button class="btn btn-outline-danger btn-sm" onclick="deletePending('+p.id+')"><i class="bi bi-trash"></i></button>'+
    '</div></div>'
}

async function submitPendingWork(e){
  e.preventDefault();
  var fd=new FormData(e.target),data={
    title:fd.get("title")||"",
    customer_name:fd.get("customer_name"),
    contact_name:fd.get("contact_name")||"",
    contact_phone:fd.get("contact_phone")||"",
    todo_type:fd.get("todo_type")||"客户报修",
    priority:fd.get("priority")||"normal",
    work_address:fd.get("work_address")||"",
    staff_name:fd.get("staff_name")||"",
    work_content:fd.get("work_content"),
    reminder_date:fd.get("reminder_date")
  };
  try{
    var r=await apiFetch("/api/pending",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    if(r.ok)e.target.reset(),loadPendingWorks(),updatePendingBadge();
    else{var j=await r.json();alert(j.error||"添加失败")}
  }catch(e){alert("网络错误")}
}

async function transferPending(pendingId,type){
  try{
    (await apiFetch("/api/pending/"+pendingId+"/complete?record_type="+type,{method:"POST"})).ok?(
      loadPendingWorks(),updatePendingBadge(),queryRecordType=type,queryRecords(),switchTab("tab-query")
    ):alert("转单失败")
  }catch(e){alert("网络错误")}
}

async function completePending(pendingId){
  try{
    (await apiFetch("/api/pending/"+pendingId,{method:"PUT",body:JSON.stringify({status:"completed"})})).ok?(
      loadPendingWorks(),updatePendingBadge(),loadDashboard()
    ):alert("操作失败")
  }catch(e){alert("网络错误")}
}

async function editPending(pendingId){
  try{
    var r=await apiFetch("/api/pending?status=pending&per_page=200"),
        p=(await r.json()).records.find(function(x){return x.id===pendingId});
    if(!p)return;
    showModal("编辑待办事项",
      '<form id="editPendingForm2">'+
      '<input type="hidden" id="epiId" value="'+p.id+'">'+
      '<div class="mb-2"><label class="form-label fw500">标题</label><input type="text" class="form-control" id="epiTitle" value="'+(p.title||"")+'"></div>'+
      '<div class="mb-2"><label class="form-label fw500">客户</label><input type="text" class="form-control" id="epiCustomer" value="'+p.customer_name+'" required></div>'+
      '<div class="mb-2"><label class="form-label fw500">联系人</label><input type="text" class="form-control" id="epiContact" value="'+(p.contact_name||"")+'"></div>'+
      '<div class="mb-2"><label class="form-label fw500">联系电话</label><input type="text" class="form-control" id="epiPhone" value="'+(p.contact_phone||"")+'"></div>'+
      '<div class="mb-2"><label class="form-label fw500">地址</label><input type="text" class="form-control" id="epiAddress" value="'+(p.work_address||"")+'"></div>'+
      '<div class="mb-2"><label class="form-label fw500">内容</label><textarea class="form-control" id="epiContent" rows="3">'+(p.work_content)+'</textarea></div>'+
      '<div class="mb-2"><label class="form-label fw500">提醒日期</label><input type="date" class="form-control" id="epiDate" value="'+p.reminder_date.split("T")[0]+'"></div>'+
      '<button type="submit" class="btn btn-warning w-100"><i class="bi bi-check-lg me-1"></i>保存</button></form>'
    );
    document.getElementById("editPendingForm2").addEventListener("submit",async function(e){
      e.preventDefault();
      var d={
        title:document.getElementById("epiTitle").value||"",
        customer_name:document.getElementById("epiCustomer").value,
        contact_name:document.getElementById("epiContact").value||"",
        contact_phone:document.getElementById("epiPhone").value||"",
        work_address:document.getElementById("epiAddress").value||"",
        work_content:document.getElementById("epiContent").value,
        reminder_date:document.getElementById("epiDate").value
      };
      try{
        (await apiFetch("/api/pending/"+p.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)})).ok?(
          bootstrap.Modal.getInstance(document.getElementById("gModal")).hide(),
          loadPendingWorks(),
          updatePendingBadge()
        ):alert("修改失败")
      }catch(e){alert("网络错误")}
    })
  }catch(e){alert("加载失败")}
}

async function deletePending(pendingId){
  if(confirm("确认删除？")){
    try{
      (await apiFetch("/api/pending/"+pendingId,{method:"DELETE"})).ok?(
        loadPendingWorks(),updatePendingBadge()
      ):alert("删除失败")
    }catch(e){alert("网络错误")}
  }
}

async function updatePendingBadge(){
  try{
    var r=await apiFetch("/api/pending?status=pending"),
        data=await r.json(),
        badge=document.getElementById("pendingBadge");
    badge&&(data.records.length>0?(badge.textContent=data.records.length,badge.style.display="inline-block"):badge.style.display="none");
    var dockBadge=document.getElementById("dockPendingBadge");
    dockBadge&&(dockBadge.textContent=data.records.length,dockBadge.style.display=data.records.length>0?"inline-flex":"none")
  }catch(e){}
}
