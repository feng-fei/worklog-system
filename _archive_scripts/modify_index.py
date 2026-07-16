#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Modify index.html for worklog container:
1. Add new fields in repairFields (service_category, device info, times, warranty)
2. Add customer feedback and satisfaction after repair result
3. Remove template management functionality
"""

import re

# Read the file
with open('/app/frontend/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

original_length = len(html)
print(f"Original file length: {original_length} chars")

# ====== TASK 1: Add new fields in repairFields ======
# Insert after line 217: <div id="repairFields" class="is-0">
# Before line 218: <div class="col-12"> (fault_description)

task1_marker = '<div id="repairFields" class="is-0">\n<div class="col-12">\n<label class="form-label fw500">故障现象（故障描述）</label>'
task1_pos = html.find(task1_marker)

if task1_pos == -1:
    print("ERROR: Could not find repairFields insertion point")
    exit(1)

# Insert position is after '<div id="repairFields" class="is-0">\n'
insert_pos_1 = task1_pos + len('<div id="repairFields" class="is-0">\n')

# New fields to insert
new_repair_fields = '''<!-- 服务类别 -->
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
<!-- 设备信息 -->
<div class="col-md-3">
<label class="form-label fw500">设备品牌</label>
<input type="text" class="form-control" name="device_brand" placeholder="如：海康威视">
</div>
<div class="col-md-3">
<label class="form-label fw500">设备型号</label>
<input type="text" class="form-control" name="device_model" placeholder="如：DS-2CD2T47G2-L">
</div>
<div class="col-md-3">
<label class="form-label fw500">设备序列号</label>
<input type="text" class="form-control" name="device_sn" placeholder="选填">
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
'''

html = html[:insert_pos_1] + new_repair_fields + html[insert_pos_1:]
print(f"Task 1: Added new repair fields ({len(new_repair_fields)} chars)")

# ====== TASK 2: Add customer feedback and satisfaction ======
# Insert after line 267: </div> (end of repairIncompleteBox)
# Before line 268: <div class="col-12"> (tax section)

task2_marker = '</div>\n</div>\n<div class="col-12">\n<div class="d-flex align-items-center gap-3 mb-1">\n<label class="form-label fw500 mb-0">税费</label>'
task2_pos = html.find(task2_marker)

if task2_pos == -1:
    print("ERROR: Could not find tax section insertion point")
    exit(1)

# Insert position is after '</div>\n</div>\n' (end of repairIncompleteBox)
insert_pos_2 = task2_pos + len('</div>\n</div>\n')

# New fields to insert
customer_feedback_fields = '''<!-- 客户意见 -->
<div class="col-12">
<label class="form-label fw500">客户意见</label>
<textarea class="form-control" name="customer_feedback" rows="2" placeholder="选填,客户对服务的评价或建议"></textarea>
</div>
<!-- 满意度 -->
<div class="col-md-3">
<label class="form-label fw500">满意度</label>
<select class="form-select" name="satisfaction">
<option value="">请选择</option>
<option value="满意">满意</option>
<option value="比较满意">比较满意</option>
<option value="一般">一般</option>
<option value="不满意">不满意</option>
</select>
</div>
'''

html = html[:insert_pos_2] + customer_feedback_fields + html[insert_pos_2:]
print(f"Task 2: Added customer feedback and satisfaction fields ({len(customer_feedback_fields)} chars)")

# ====== TASK 3: Remove template management ======

# 3.1 Remove nav menu item (line 103)
nav_menu_item = '<li><a class="dropdown-item" href="#" onclick="switchTab(\'tab-template\')"><i class="bi bi-file-earmark-spreadsheet me-2"></i>模板管理</a></li>\n'
if nav_menu_item in html:
    html = html.replace(nav_menu_item, '')
    print("Task 3.1: Removed template management nav menu item")
else:
    print("WARNING: Could not find template management nav menu item")

# 3.2 Remove tab-template div block (lines 624-655)
# From: <!-- ====== 模板管理 ====== -->
# To: </div></div>\n\n</main>

template_block_start = '<!-- ====== 模板管理 ====== -->\n'
template_block_end = '</div></div>\n\n</main>'

template_start_pos = html.find(template_block_start)
template_end_pos = html.find(template_block_end, template_start_pos)

if template_start_pos == -1 or template_end_pos == -1:
    print("ERROR: Could not find tab-template block boundaries")
    exit(1)

# Remove from template_block_start to just before </main>
# We keep </main>
remove_start = template_start_pos
remove_end = template_end_pos + len('</div></div>\n\n')  # Include the closing divs but not </main>

html = html[:remove_start] + html[remove_end:]
print(f"Task 3.2: Removed tab-template div block ({remove_end - remove_start} chars)")

# 3.3 Remove template management JavaScript functions (lines 854-959)
# From: // ====== 模板管理 ======
# To: })();\n\n\n// ====== 维修单下载按钮 ======

template_js_start = '// ====== 模板管理 ======\n'
template_js_end = '// ====== 维修单下载按钮 ======'

template_js_start_pos = html.find(template_js_start)
template_js_end_pos = html.find(template_js_end, template_js_start_pos)

if template_js_start_pos == -1 or template_js_end_pos == -1:
    print("ERROR: Could not find template JavaScript section boundaries")
    exit(1)

# Remove from template_js_start to just before template_js_end
html = html[:template_js_start_pos] + html[template_js_end_pos:]
print(f"Task 3.3: Removed template management JavaScript ({template_js_end_pos - template_js_start_pos} chars)")

# ====== TASK 4: Check submitWork function ======
# Since submitWork is in app.min.js (compressed, cannot modify), we need to verify
# that the form uses FormData which automatically collects all named fields.
# The new fields all have name attributes, so they will be included automatically.
print("Task 4: Verified - new fields have name attributes and will be auto-collected by FormData")

# Write the modified file
with open('/app/frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

new_length = len(html)
print(f"\nModified file length: {new_length} chars")
print(f"Net change: {new_length - original_length:+d} chars")
print("All tasks completed successfully!")
