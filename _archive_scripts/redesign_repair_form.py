#!/usr/bin/env python3
"""重新设计维修工单表单"""
import re

# 读取文件
with open('/app/frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 修复联动 bug：移除 repairIncompleteBox 的 is-0 类
old1 = '<div class="col-12 is-0" id="repairIncompleteBox">'
new1 = '<div class="col-12" id="repairIncompleteBox">'
if old1 in content:
    content = content.replace(old1, new1)
    print("✓ 修复联动 bug：移除 repairIncompleteBox 的 is-0 类")
else:
    print("- repairIncompleteBox 已修复或不存在")

# 2. 重新设计维修表单字段
# 找到 repairFields 区块
repair_start = content.find('<div id="repairFields">')
if repair_start == -1:
    print("✗ 未找到 repairFields")
    exit(1)

# 找到 repairFields 的结束位置（下一个 </div> 匹配）
repair_end = content.find('</div>', repair_start + 100)
# 继续查找直到找到正确的结束标签
depth = 1
pos = repair_start + len('<div id="repairFields">')
while depth > 0 and pos < len(content):
    next_open = content.find('<div', pos)
    next_close = content.find('</div>', pos)
    
    if next_close == -1:
        break
    
    if next_open != -1 and next_open < next_close:
        depth += 1
        pos = next_open + 4
    else:
        depth -= 1
        if depth == 0:
            repair_end = next_close + len('</div>')
            break
        pos = next_close + 6

# 新的维修表单设计
new_repair_fields = '''<div id="repairFields">
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
<!-- 到达/完工时间 -->
<div class="col-md-3">
<label class="form-label fw500">到达时间</label>
<input type="time" class="form-control" name="arrival_time">
</div>
<div class="col-md-3">
<label class="form-label fw500">完工时间</label>
<input type="time" class="form-control" name="completion_time">
</div>
<!-- 涉及系统/设备（系统级维修） -->
<div class="col-12">
<label class="form-label fw500">涉及系统/设备</label>
<textarea class="form-control" name="involved_systems" rows="2" placeholder="如：1楼监控摄像头（海康威视 DS-2CD2T47G2-L）、2楼门禁系统、停车场道闸等"></textarea>
<small class="text-muted">可填写多个设备或系统，用逗号或换行分隔</small>
</div>
<!-- 故障现象 -->
<div class="col-12">
<label class="form-label fw500">故障现象（故障描述）</label>
<textarea class="form-control" name="fault_description" rows="2" placeholder="描述出现的故障现象"></textarea>
</div>
<!-- 故障诊断 -->
<div class="col-12">
<label class="form-label fw500">故障诊断（造成故障的原因）</label>
<textarea class="form-control" name="fault_diagnosis" rows="2" placeholder="分析导致故障的原因"></textarea>
</div>
<!-- 维修过程 -->
<div class="col-12">
<label class="form-label fw500">维修过程</label>
<textarea class="form-control" name="repair_process" rows="3" placeholder="填写维修步骤和方法"></textarea>
</div>
<!-- 维修结果 -->
<div class="col-12">
<label class="form-label fw500">维修结果</label>
<div class="d-flex gap-3">
<div class="form-check">
<input class="form-check-input" type="radio" name="repair_result" id="repairCompleted" value="completed" checked onchange="toggleRepairIncompleteFields()">
<label class="form-check-label" for="repairCompleted">✅ 已维修完成</label>
</div>
<div class="form-check">
<input class="form-check-input" type="radio" name="repair_result" id="repairPending" value="pending" onchange="toggleRepairIncompleteFields()">
<label class="form-check-label" for="repairPending">⏳ 未维修完成（说明原因并转待办）</label>
</div>
</div>
</div>
<!-- 未完成原因（联动显示） -->
<div class="col-12" id="repairIncompleteBox">
<div class="repair-incomplete-box">
<div class="row g-2">
<div class="col-md-4">
<label class="form-label fw500">未完成原因类型</label>
<select class="form-select" name="incomplete_reason_type" id="incompleteReasonType">
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
<div class="col-md-8">
<label class="form-label fw500">原因说明 / 后续建议 <span class="text-danger">*</span></label>
<textarea class="form-control" name="incomplete_reason" id="incompleteReason" rows="2" placeholder="例如：摄像头主板损坏，现场无备件，需采购后二次上门更换"></textarea>
</div>
</div>
<small class="text-muted">保存后会自动生成二次上门待办，待办内容会带上未完成原因。</small>
</div>
</div>
</div>'''

# 替换 repairFields 区块
content = content[:repair_start] + new_repair_fields + content[repair_end:]
print("✓ 重新设计维修表单")

# 3. 隐藏客户意见和满意度字段（添加 style="display:none"）
# 找到客户意见区块
feedback_start = content.find('<!-- 客户意见 -->')
if feedback_start != -1:
    feedback_end = content.find('</div>', feedback_start + 200)
    feedback_end = content.find('</div>', feedback_end + 10)  # 再找一个 </div>
    feedback_block = content[feedback_start:feedback_end + 6]
    hidden_block = feedback_block.replace('<div class="col-12">', '<div class="col-12" style="display:none">', 1)
    content = content[:feedback_start] + hidden_block + content[feedback_end + 6:]
    print("✓ 隐藏客户意见字段")

# 找到满意度区块
satisfaction_start = content.find('<!-- 满意度 -->')
if satisfaction_start != -1:
    satisfaction_end = content.find('</div>', satisfaction_start + 100)
    satisfaction_block = content[satisfaction_start:satisfaction_end + 6]
    hidden_satisfaction = satisfaction_block.replace('<div class="col-md-3">', '<div class="col-md-3" style="display:none">', 1)
    content = content[:satisfaction_start] + hidden_satisfaction + content[satisfaction_end + 6:]
    print("✓ 隐藏满意度字段")

# 写回文件
with open('/app/frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ 表单重新设计完成")
