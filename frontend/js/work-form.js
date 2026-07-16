// work-form.js — 工单表单编辑（费用、设备清单、签名等覆盖）
// 注意：核心函数定义在 lib-core.js，此文件只包含覆盖/扩展代码


// ====== 覆盖 toggleRecordType（追加维修结果显示逻辑） ======

toggleRecordType=function(){
  var type=document.querySelector("[name=record_type]:checked").value;
  document.getElementById("constructionFields").style.display="construction"===type?"":"none";
  document.getElementById("repairFields").style.display="repair"===type?"":"none";
  document.getElementById("repairFieldsHeader").style.display="repair"===type?"":"none";
  if(typeof toggleRepairIncompleteFields==="function") toggleRepairIncompleteFields();
  var s=document.getElementById("statusSelect");
  var ft=document.getElementById("faultTypeGroup");
  var cs=document.getElementById("constructionStatusGroup");
  if(s){
    var opts=s.getElementsByTagName("option");
    if(opts.length){
      var statuses={
        construction:["待施工","已派工","施工中","待客户确认","待结算","待回访","已完成","需返工","暂停处理","已取消"],
        repair:["待处理","已派单","处理中","待客户确认","待回访","待结算","已完成","需返工","无法处理","暂停处理","已取消"]
      };
      s.innerHTML="";
      var items=statuses[type]||[];
      items.forEach(function(t){
        var o=document.createElement("option");
        o.value=t;o.textContent=t;s.appendChild(o);
      });
    }
  }
  if(cs) cs.style.display="construction"===type?"":"none";
  if(ft) ft.style.display="repair"===type?"":"none";
};


// ====== 费用计算（覆盖原始版本，支持通用字段名） ======

calcWorkTotal=function(){
  var labor=parseFloat(document.querySelector('#workForm [name=labor_fee]')?.value)||0;
  var material=parseFloat(document.querySelector('#workForm [name=material_fee]')?.value)||0;
  var transport=parseFloat(document.querySelector('#workForm [name=transport_fee]')?.value)||0;
  var other=parseFloat(document.querySelector('#workForm [name=other_fee]')?.value)||0;
  var equip=parseFloat(document.querySelector('#equipment_fee_total')?.value)||0;
  var subtotal=equip+labor+material+transport+other;
  var taxType=document.querySelector('[name=tax_type]:checked')?.value||'no';
  var taxRate=parseFloat(document.getElementById('taxRate')?.value)||0.03;
  var taxAmount=0;
  if('tax'===taxType) taxAmount=Math.round(subtotal*taxRate*100)/100;
  document.getElementById('woTaxAmount').value=taxAmount.toFixed(2);
  document.getElementById('woTotalFee').value=(subtotal+taxAmount).toFixed(2);
};


// ====== 设备清单模块 ======

function addEquipmentRow(){
  var el=document.getElementById('equipmentList');
  if(!el) return;
  var idx=document.querySelectorAll('.equipment-row').length;
  var labels=['设备名称','品牌型号','数量','单价(¥)','小计'];
  var names=['equipment_name_','equipment_model_','equipment_qty_','equipment_price_','equipment_subtotal_'];
  var placeholders=['如：摄像头、NVR','选填','','',''];
  var types=['text','text','number','number','text'];
  var steps=['','','1','0.01',''];
  var extras=['','','min="1" value="1" onchange="calcEquipmentTotal()"','step="0.01" min="0" value="0" onchange="calcEquipmentTotal()"','readonly'];
  var fields='';
  for(var i=0;i<5;i++){
    fields+='<div class="col-md-2">'+
      '<label class="small text-muted">'+labels[i]+'</label>'+
      '<input type="'+types[i]+'" class="form-control form-control-sm" name="'+names[i]+idx+'" '+
      (placeholders[i]?'placeholder="'+placeholders[i]+'" ':'')+
      (steps[i]!==''?'step="'+steps[i]+'" ':'')+
      extras[i]+
      '></div>';
  }
  var row='<div class="equipment-row row g-2 align-items-end mb-2 pb-2 border-bottom">'+
    fields+
    '<div class="col-12 mt-1"><label class="small text-muted">备注</label>'+
    '<input type="text" class="form-control form-control-sm" name="equipment_remark_'+idx+'" placeholder="选填，如序列号、故障描述"></div>'+
    '<div class="col-12 text-end mt-1">'+
    '<button type="button" class="btn btn-sm btn-outline-danger" onclick="removeEquipmentRow(this)"><i class="bi bi-trash"></i></button></div></div>';
  el.insertAdjacentHTML('beforeend', row);
  calcEquipmentTotal();
}

function removeEquipmentRow(btn){
  var row=btn.closest('.equipment-row');
  if(row) row.parentNode.removeChild(row);
  calcEquipmentTotal();
}

/* 重新编号（删除后修正 name 索引）——暂不需要，后端按 name 前缀匹配 */

/* 计算设备费总和 */
function calcEquipmentTotal(){
  var total=0;
  document.querySelectorAll('[name^="equipment_subtotal_"]').forEach(function(el){
    var idx=el.name.replace('equipment_subtotal_','');
    var qtyEl=document.querySelector('[name="equipment_qty_'+idx+'"]');
    var priceEl=document.querySelector('[name="equipment_price_'+idx+'"]');
    if(qtyEl&&priceEl){
      var qty=parseFloat(qtyEl.value)||0;
      var price=parseFloat(priceEl.value)||0;
      var sub=qty*price;
      el.value=sub.toFixed(2);
      total+=sub;
    }
  });
  var feeEl=document.getElementById('equipment_fee_total');
  if(!feeEl){
    feeEl=document.createElement('input');
    feeEl.type='hidden';
    feeEl.id='equipment_fee_total';
    feeEl.name='equipment_fee_total';
    feeEl.value='0';
    document.getElementById('workForm').appendChild(feeEl);
  }
  feeEl.value=total.toFixed(2);
  /* 更新总计费用 */
  if(typeof calcWorkTotal==='function') calcWorkTotal();
}


// ====== 覆盖 submitWorkRecord（增加设备清单提交、调用 calcWorkTotal） ======

submitWorkRecord=async function(e){
  e.preventDefault();
  try{
    saveSignature();
    /* 收集设备清单到隐藏字段 */
    var equipData=[];
    document.querySelectorAll('.equipment-row').forEach(function(row){
      var id=Array.prototype.indexOf.call(document.querySelectorAll('.equipment-row'), row);
      equipData.push({
        name:(row.querySelector('[name^="equipment_name_"]')||{}).value||'',
        model:(row.querySelector('[name^="equipment_model_"]')||{}).value||'',
        qty:parseFloat((row.querySelector('[name^="equipment_qty_"]')||{}).value)||0,
        price:parseFloat((row.querySelector('[name^="equipment_price_"]')||{}).value)||0,
        subtotal:parseFloat((row.querySelector('[name^="equipment_subtotal_"]')||{}).value)||0,
        remark:(row.querySelector('[name^="equipment_remark_"]')||{}).value||''
      });
    });
    var equipHidden=document.querySelector('[name="equipment_items"]');
    if(!equipHidden){
      equipHidden=document.createElement('input');
      equipHidden.type='hidden';
      equipHidden.name='equipment_items';
      document.getElementById('workForm').appendChild(equipHidden);
    }
    equipHidden.value=JSON.stringify(equipData);
    calcEquipmentTotal();
    calcWorkTotal();

    /* 验证维修未完成原因 */
    var isRepair="repair"===document.querySelector("[name=record_type]:checked")?.value;
    var isPending="pending"===document.querySelector("input[name=repair_result]:checked")?.value;
    if(isRepair&&isPending&&!document.getElementById("incompleteReason")?.value.trim()){
      alert("未维修完成时请填写原因说明");
      document.getElementById("incompleteReason")?.focus();
      return;
    }

    var fd=new FormData(e.target);
    fd.delete("photos");
    selectedWorkPhotos.forEach(function(p){fd.append("photos",p.file);});
    var r=await apiFetch("/api/records",{method:"POST",body:fd});
    if(r.ok){
      e.target.reset();
      document.getElementById("workDate").value=todayStr();
      document.getElementById("woTotalFee").value="0.00";
      document.getElementById("woTaxAmount").value="0.00";
      selectedWorkPhotos=[];
      document.getElementById("workPhotoPreview").innerHTML="";
      document.querySelectorAll('#staffPickPanel input[name="staff_check"]').forEach(function(cb){cb.checked=false;});
      document.getElementById("selectedStaffTags").innerHTML="";
      document.getElementById("woStaffNames").value="";
      document.getElementById("woTempStaffDetails").value="[]";
      document.getElementById("woTempStaffFields").style.display="none";
      document.getElementById("woTempStaffRows").innerHTML="";
      clearSignature();
      document.querySelectorAll('.equipment-row').forEach(function(el){el.parentNode.removeChild(el);});
      var eft=document.getElementById('equipment_fee_total');
      if(eft) eft.value='0';
      toggleRepairIncompleteFields();
      loadDashboard();
      loadSalaries();
      alert("✅ 记录保存成功！");
    }else{
      var j=await r.json();
      alert("保存失败: "+(j.error||""));
    }
  }catch(err){
    alert("网络错误");
  }
};
