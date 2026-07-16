"""
批量替换 customer_name 和 staff_name 搜索参数的 LIKE 查询
"""
import re

ROUTES_FILE = r'c:\Users\Administrator\Documents\traework\backend\routes.py'

with open(ROUTES_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

count = 0
new_lines = []

for i, line in enumerate(lines):
    new_line = line
    
    # customer_name 搜索参数（用户输入）
    # 排除权限过滤中的 customer_name（那些是内部数据）
    # 这里我们假设所有出现在 if xxx: 后面的 .like 查询都是搜索参数
    pattern = r'\.like\(f\'%\{(customer_name)\}%\'\)'
    if re.search(pattern, new_line):
        new_line = re.sub(pattern, r".like(f'%{escape_like_keyword(\1)}%')", new_line)
        count += len(re.findall(pattern, line))
        print(f'L{i+1}: customer_name -> escape_like_keyword(customer_name)')
        print(f'  原: {line.strip()[:90]}')
    
    # staff_name 搜索参数（用户输入的搜索）
    # 注意：权限过滤中的 staff_name 不要替换（如 user_staff_name, _un 等）
    pattern2 = r'\.like\(f\'%\{(staff_name)\}%\'\)'
    if re.search(pattern2, new_line):
        new_line = re.sub(pattern2, r".like(f'%{escape_like_keyword(\1)}%')", new_line)
        count += len(re.findall(pattern2, line))
        print(f'L{i+1}: staff_name -> escape_like_keyword(staff_name)')
        print(f'  原: {line.strip()[:90]}')
    
    new_lines.append(new_line)

with open(ROUTES_FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'\n共替换 {count} 处')
