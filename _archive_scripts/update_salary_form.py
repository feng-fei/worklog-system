
import re

html_path = '/app/frontend/index.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 找到工资表单部分，替换为新的布局
# 旧的表单从 <form id="salaryForm"> 到 </form>
old_form_start = '<form id="salaryForm">'
old_form_end = '</form></div></div>'

# 找到表单的起止位置
form_start_idx = content.find(old_form_start)
form_end_idx = content.find('</form>', form_start_idx) + len('</form>')

if form_start_idx == -1 or form_end_idx == -1:
    print("❌ 未找到工资表单")
    exit(1)

# 新的表单 HTML，使用 salary-form-grid class
new_form = '''<form id="salaryForm" class="salary-form-grid">
<div class="form-item span-2">
<label class="form-label fw500">员工</label>
<select class="form-select" name="staff_name" id="salaryStaff" required>
<option value="">请选择</option>
</select>
</div>
<div class="form-item">
<label class="form-label fw500">工作日期</label>
<input type="date" class="form-control" name="work_date" id="salaryDate">
</div>
<div class="form-item">
<label class="form-label fw500">日薪</label>
<input type="number" class="form-control" name="daily_wage" id="salaryDaily" min="0" step="1" value="0" oninput="calcSalaryForm()">
</div>
<div class="form-item">
<label class="form-label fw500">天数/工时</label>
<input type="number" class="form-control" name="work_units" id="salaryUnits" min="0" step="0.5" value="1" oninput="calcSalaryForm()">
</div>
<div class="form-item">
<label class="form-label fw500">应发金额</label>
<input type="text" class="form-control fw-bold" id="salaryPayable" value="0.00" readonly>
</div>
<div class="form-item">
<label class="form-label fw500">业务类型</label>
<select class="form-select" name="business_type">
<option>其他</option>
<option>施工记录</option>
<option>维修工单</option>
</select>
</div>
<div class="form-item">
<label class="form-label fw500">业务编号</label>
<input type="text" class="form-control" name="business_no">
</div>
<div class="form-item">
<label class="form-label fw500">客户</label>
<input type="text" class="form-control" name="customer_name">
</div>
<div class="form-item">
<label class="form-label fw500">支付方式</label>
<select class="form-select" name="payment_method">
<option value="">未选择</option>
<option>现金</option>
<option>微信</option>
<option>支付宝</option>
<option>转账</option>
</select>
</div>
<div class="form-item span-full">
<label class="form-label fw500">工作内容/备注</label>
<input type="text" class="form-control" name="work_content">
</div>
</form>'''

# 替换表单内容
old_form_content = content[form_start_idx:form_end_idx]
new_content = content[:form_start_idx] + new_form + content[form_end_idx:]

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ 工资表单 HTML 结构已更新")
print(f"  旧表单长度: {len(old_form_content)} 字符")
print(f"  新表单长度: {len(new_form)} 字符")
