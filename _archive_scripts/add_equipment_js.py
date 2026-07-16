#!/usr/bin/env python3
"""添加设备明细表和签名的 JavaScript 代码"""

# 读取当前 index.html
with open('/app/frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到 </body> 标签前插入新代码
insert_pos = content.rfind('</body>')

if insert_pos == -1:
    print("未找到 </body> 标签")
    exit(1)

# 新的 JavaScript 代码
new_js = '''
<script>
// 设备明细管理
let equipmentCounter = 0;

function addEquipmentRow() {
    const container = document.getElementById('equipmentList');
    const index = equipmentCounter++;
    
    const row = document.createElement('div');
    row.className = 'equipment-row border rounded p-2 mb-2';
    row.id = `equipment-${index}`;
    row.innerHTML = `
        <div class="row g-2">
            <div class="col-md-3">
                <label class="form-label small">系统类型 <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" name="equipments[${index}][system_type]" required>
                    <option value="">请选择</option>
                    <option value="视频监控">视频监控</option>
                    <option value="门禁系统">门禁系统</option>
                    <option value="网络系统">网络系统</option>
                    <option value="综合布线">综合布线</option>
                    <option value="低压强电">低压强电</option>
                    <option value="广播系统">广播系统</option>
                    <option value="停车系统">停车系统</option>
                    <option value="楼宇对讲">楼宇对讲</option>
                    <option value="巡更系统">巡更系统</option>
                    <option value="其他">其他</option>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label small">设备名称 <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" name="equipments[${index}][device_name]" required>
            </div>
            <div class="col-md-2">
                <label class="form-label small">品牌</label>
                <input type="text" class="form-control form-control-sm" name="equipments[${index}][device_brand]">
            </div>
            <div class="col-md-2">
                <label class="form-label small">型号</label>
                <input type="text" class="form-control form-control-sm" name="equipments[${index}][device_model]">
            </div>
            <div class="col-md-2">
                <label class="form-label small">数量</label>
                <input type="number" class="form-control form-control-sm" name="equipments[${index}][quantity]" value="1" min="1">
            </div>
        </div>
        <div class="row g-2 mt-1">
            <div class="col-md-3">
                <label class="form-label small">安装位置</label>
                <input type="text" class="form-control form-control-sm" name="equipments[${index}][location]">
            </div>
            <div class="col-md-3">
                <label class="form-label small">故障描述</label>
                <input type="text" class="form-control form-control-sm" name="equipments[${index}][fault_description]">
            </div>
            <div class="col-md-2">
                <label class="form-label small">维修方式</label>
                <select class="form-select form-select-sm" name="equipments[${index}][repair_method]">
                    <option value="">请选择</option>
                    <option value="维修">维修</option>
                    <option value="更换">更换</option>
                    <option value="调试">调试</option>
                    <option value="新增设备">新增设备</option>
                    <option value="移机">移机</option>
                    <option value="其他">其他</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small">维修结果</label>
                <select class="form-select form-select-sm" name="equipments[${index}][repair_result]">
                    <option value="">请选择</option>
                    <option value="缺少配件">缺少配件</option>
                    <option value="设备需更换">设备需更换</option>
                    <option value="客户现场条件不具备">客户现场条件不具备</option>
                    <option value="需厂家/上级技术支持">需厂家/上级技术支持</option>
                    <option value="客户改期">客户改期</option>
                    <option value="费用/报价待确认">费用/报价待确认</option>
                    <option value="其他原因">其他原因</option>
                </select>
            </div>
            <div class="col-md-1">
                <label class="form-label small">单价</label>
                <input type="number" class="form-control form-control-sm" name="equipments[${index}][unit_price]" step="0.01" value="0" onchange="calculateEquipmentTotal()">
            </div>
            <div class="col-md-1">
                <label class="form-label small">小计</label>
                <input type="number" class="form-control form-control-sm" name="equipments[${index}][subtotal]" step="0.01" value="0" readonly style="background: #f8f9fa;">
            </div>
        </div>
        <div class="row g-2 mt-1">
            <div class="col-md-11">
                <label class="form-label small">备注</label>
                <input type="text" class="form-control form-control-sm" name="equipments[${index}][remark]">
            </div>
            <div class="col-md-1 d-flex align-items-end">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteEquipment(${index})">
                    <i class="bi bi-trash"></i> 删除
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(row);
}

function deleteEquipment(index) {
    const row = document.getElementById(`equipment-${index}`);
    if (row) {
        row.remove();
        calculateEquipmentTotal();
    }
}

function calculateEquipmentTotal() {
    let total = 0;
    const rows = document.querySelectorAll('.equipment-row');
    
    rows.forEach(row => {
        const quantity = parseFloat(row.querySelector('[name*="[quantity]"]')?.value || 0);
        const unitPrice = parseFloat(row.querySelector('[name*="[unit_price]"]')?.value || 0);
        const subtotal = quantity * unitPrice;
        
        const subtotalInput = row.querySelector('[name*="[subtotal]"]');
        if (subtotalInput) {
            subtotalInput.value = subtotal.toFixed(2);
        }
        
        total += subtotal;
    });
    
    // 更新设备费合计
    const equipmentFeeInput = document.querySelector('[name="equipment_fee_total"]');
    if (equipmentFeeInput) {
        equipmentFeeInput.value = total.toFixed(2);
    }
    
    // 更新总计
    updateTotalFee();
}

function updateTotalFee() {
    const equipmentFee = parseFloat(document.querySelector('[name="equipment_fee_total"]')?.value || 0);
    const laborFee = parseFloat(document.querySelector('[name="labor_fee"]')?.value || 0);
    const debugFee = parseFloat(document.querySelector('[name="debug_fee"]')?.value || 0);
    const transportFee = parseFloat(document.querySelector('[name="transport_fee"]')?.value || 0);
    const otherFee = parseFloat(document.querySelector('[name="other_fee"]')?.value || 0);
    
    const total = equipmentFee + laborFee + debugFee + transportFee + otherFee;
    const totalInput = document.querySelector('[name="total_fee"]');
    if (totalInput) {
        totalInput.value = total.toFixed(2);
    }
}

// 监听费用输入变化
document.addEventListener('DOMContentLoaded', function() {
    const feeInputs = ['labor_fee', 'debug_fee', 'transport_fee', 'other_fee'];
    feeInputs.forEach(name => {
        const input = document.querySelector(`[name="${name}"]`);
        if (input) {
            input.addEventListener('input', updateTotalFee);
        }
    });
});

// 电子签名功能
let signatureCanvas = null;
let signatureCtx = null;
let isDrawing = false;

function initSignaturePad() {
    signatureCanvas = document.getElementById('signatureCanvas');
    if (!signatureCanvas) return;
    
    signatureCtx = signatureCanvas.getContext('2d');
    signatureCtx.strokeStyle = '#000';
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    
    // 鼠标事件
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // 触摸事件
    signatureCanvas.addEventListener('touchstart', handleTouchStart);
    signatureCanvas.addEventListener('touchmove', handleTouchMove);
    signatureCanvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const rect = signatureCanvas.getBoundingClientRect();
    signatureCtx.beginPath();
    signatureCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = signatureCanvas.getBoundingClientRect();
    signatureCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    signatureCtx.stroke();
}

function stopDrawing() {
    isDrawing = false;
    saveSignature();
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    signatureCanvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    signatureCanvas.dispatchEvent(mouseEvent);
}

function clearSignature() {
    if (signatureCtx && signatureCanvas) {
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        saveSignature();
    }
}

function saveSignature() {
    if (signatureCanvas) {
        const dataUrl = signatureCanvas.toDataURL('image/png');
        const hiddenInput = document.getElementById('customerSignatureData');
        if (hiddenInput) {
            hiddenInput.value = dataUrl;
        }
    }
}

// 初始化签名板
document.addEventListener('DOMContentLoaded', initSignaturePad);
</script>
'''

# 插入新代码
new_content = content[:insert_pos] + new_js + content[insert_pos:]

# 写回文件
with open('/app/frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✓ JavaScript 代码已添加")
