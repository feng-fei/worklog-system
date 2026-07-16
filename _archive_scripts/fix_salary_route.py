
file_path = '/app/app/routes/salary_routes.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 找到第一个路由函数之前的位置
# 在 "salary_bp = Blueprint..." 之后，第一个 "@salary_bp.route" 之前插入
import re

# 找到 blueprint 定义和第一个路由之间的位置
pattern = r'(salary_bp = Blueprint\([^\)]+\)\n+)(@salary_bp\.route)'

helper_func = '''
def _generate_salary_no(work_date):
    date_str = work_date.strftime("%Y%m%d")
    day_count = SalaryRecord.query.filter(db.func.date(SalaryRecord.work_date) == work_date.date()).count()
    return f'RY-GZ-{date_str}-{day_count + 1:03d}'


'''

new_content = re.sub(pattern, r'\1' + helper_func + r'\2', content)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("✅ _generate_salary_no 函数已添加")
else:
    print("⚠️ 未找到匹配位置")

# 验证
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f"\n文件总行数: {len(lines)}")
for i, line in enumerate(lines):
    if '_generate_salary_no' in line:
        print(f"  第 {i+1} 行: {line.rstrip()}")
