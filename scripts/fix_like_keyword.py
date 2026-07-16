"""
批量替换 routes.py 中的用户输入 LIKE 查询，添加 escape_like_keyword 转义
只替换用户可控的搜索参数：keyword, customer_name(搜索), staff_name(搜索)
不替换内部权限过滤变量（user_name, staff.name, _un等）
"""
import re

ROUTES_FILE = r'c:\Users\Administrator\Documents\traework\backend\routes.py'

with open(ROUTES_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 需要转义的用户输入变量名（搜索参数）
# 权限过滤的内部变量（如 user_name, _un, staff.name, user_staff 等）不转义
search_vars = [
    'keyword',
]

# 特殊处理：客户搜索 customer_name、员工搜索 staff_name
# 这些变量在搜索上下文中是用户输入，在权限上下文中是内部数据
# 我们通过上下文判断

count = 0
new_lines = []

for i, line in enumerate(lines):
    new_line = line
    
    # 1. 替换所有 keyword 变量的 LIKE 查询（keyword 始终是用户输入）
    pattern = r'\.like\(f\'%\{(keyword)\}%\'\)'
    if re.search(pattern, new_line):
        new_line = re.sub(pattern, r".like(f'%{escape_like_keyword(\1)}%')", new_line)
        count += len(re.findall(pattern, line))
        if re.search(pattern, line):
            print(f'L{i+1}: keyword -> escape_like_keyword(keyword)')
            print(f'  原: {line.strip()[:90]}')
    
    new_lines.append(new_line)

# 写回
with open(ROUTES_FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'\n共替换 {count} 处 keyword LIKE 查询')
print('\n注意：customer_name 和 staff_name 搜索参数需要手动检查，')
print('因为它们在不同上下文中可能是用户输入或内部数据。')
