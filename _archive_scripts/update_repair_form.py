#!/usr/bin/env python3
"""更新维修工单前端表单"""

# 读取当前 index.html
with open('/app/frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到 repairFields 的结束标签
start_marker = '<div id="repairFields">'
end_marker = '</div>\n<!-- 客户意见 -->'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("未找到 repairFields 区块")
    exit(1)

# 新的维修表单内容
new_repair_form = '''<div id="repairFields">
<!-- 服务类别 -->
<div class="col-md-3">
<label class="form-label fw500">服务类别</label>
<select class="form-select" name="service_category">
<option value="">请选择</option>
<option value="维修">维修</option>
<option value="新装">新装</option>
<option value="保养">保养</option>
<option value="巡检">巡检</option>
<option value="移机">移机</option>
</select>
</div>
<!-- 保修情况 -->
<div class="col-md-3">
<label class="form-label fw500">保修情况</label>
<select class="form-select" name="warranty_status">
<option value="">请选择</option>
<option value="在保">在保</option>
<option value="过保">过保</option>
<option value="无保">无保</option>
</select>
</div>
<!-- 勘查时间 -->
<div class="col-md-3">
<label class="form-label fw500">勘查时间</label>
<input type="date" class="form-control" name="survey_time">
</div>
<!-- 报价时间 -->
<div class="col-md-3">
<label class="form-label fw500">报价时间</label>
<input type="date" class="form-control" name="quote_time">
</div>
<!-- 到达/完工时间 -->
<div class="col-md-3">
<label class="form-label fw500">到达时间</label>
<input type="time" class="form-control" name="arrival_time">
</div>
<div class="col-md-3">
<label class="form-label fw500">完工时间</label>
<input type="time" class="form-control" name="completion_time">
</div>
<!-- 验收时间 -->
<div class="col-md-3">
<label class="form-label fw500">验收时间</label>
<input type="date" class="form-control" name="accept_time">
</div>
<!-- 设备明细 -->
<div class="col-12 mt-3">
<label class="form-label fw500">设备明细</label>
<div id="equipmentList" class="border rounded p-2 mb-2" style="min-height: 100px;">
<!-- 设备明细项将动态添加到这里 -->
</div>
<button type="button" class="btn btn-sm btn-outline-primary" onclick="addEquipmentRow()">
<i class="bi bi-plus-circle"></i> 添加设备
</button>
</div>
<!-- 故障现象 -->
<div class="col-12 mt-3">
<label class="form-label fw500">故障现象</label>
<textarea class="form-control" name="fault_phenomenon" rows="2" placeholder="描述故障现象"></textarea>
</div>
<!-- 故障原因 -->
<div class="col-12">
<label class="form-label fw500">故障原因</label>
<textarea class="form-control" name="fault_cause" rows="2" placeholder="分析故障原因"></textarea>
</div>
<!-- 维修方案 -->
<div class="col-12">
<label class="form-label fw500">维修方案</label>
<textarea class="form-control" name="repair_solution" rows="2" placeholder="描述维修方案"></textarea>
</div>
<!-- 费用汇总 -->
<div class="col-12 mt-3">
<label class="form-label fw500">费用汇总</label>
<div class="row g-2">
<div class="col-md-3">
<label class="form-label small">设备费合计</label>
<input type="number" class="form-control" name="equipment_fee_total" step="0.01" value="0" readonly>
</div>
<div class="col-md-3">
<label class="form-label small">人工费</label>
<input type="number" class="form-control" name="labor_fee" step="0.01" value="0">
</div>
<div class="col-md-3">
<label class="form-label small">调试费</label>
<input type="number" class="form-control" name="debug_fee" step="0.01" value="0">
</div>
<div class="col-md-3">
<label class="form-label small">交通费</label>
<input type="number" class="form-control" name="transport_fee" step="0.01" value="0">
</div>
<div class="col-md-3">
<label class="form-label small">其他费用</label>
<input type="number" class="form-control" name="other_fee" step="0.01" value="0">
</div>
<div class="col-md-3">
<label class="form-label small">总计</label>
<input type="number" class="form-control fw-bold" name="total_fee" step="0.01" value="0" readonly style="color: #4f46e5;">
</div>
</div>
</div>
<!-- 客户意见 -->
<div class="col-12 mt-3">
<label class="form-label fw500">客户意见</label>
<textarea class="form-control" name="customer_feedback" rows="2" placeholder="客户对服务的评价"></textarea>
</div>
<!-- 客户签名 -->
<div class="col-12 mt-3">
<label class="form-label fw500">客户签名</label>
<canvas id="signatureCanvas" width="400" height="150" style="border: 1px solid #ccc; cursor: crosshair;"></canvas>
<button type="button" class="btn btn-sm btn-outline-secondary ms-2" onclick="clearSignature()">清除签名</button>
<input type="hidden" name="customer_signature" id="customerSignatureData">
</div>
</div>'''

# 替换内容
new_content = content[:start_idx] + new_repair_form + content[end_idx:]

# 写回文件
with open('/app/frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✓ 维修表单已更新")
