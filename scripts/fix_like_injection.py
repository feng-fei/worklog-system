"""
为 routes.py 中的 LIKE 查询添加 escape_like_keyword 转义
"""
import re

ROUTES_FILE = r'c:\Users\Administrator\Documents\traework\backend\routes.py'

with open(ROUTES_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# 模式：.like(f'%{变量}%') 或 .like(f'%{变量.xxx}%')
# 替换为：.like(f'%{escape_like_keyword(变量)}%')
# 注意：只替换用户可控的搜索关键词，不替换内部权限过滤的变量

# 先确认 escape_like_keyword 是否已经导入
if 'from .utils import' in content:
    # 检查是否已经导入 escape_like_keyword
    if 'escape_like_keyword' not in content.split('from .utils import')[1].split('\n')[0]:
        # 在 utils import 中添加
        content = content.replace(
            'from .utils import (',
            'from .utils import (\n    escape_like_keyword,',
            1
        )
        print('已添加 escape_like_keyword 导入')
    else:
        print('escape_like_keyword 已导入')

# 需要转义的用户输入变量（关键词搜索类）
user_input_vars = [
    'keyword',
    'customer_name',
    'staff_name',
]

count = 0
lines = content.split('\n')
new_lines = []

for line in lines:
    new_line = line
    # 匹配 .like(f'%{xxx}%') 或 .like(f'%{xxx.xxx}%')
    # 只对用户输入变量做转义
    for var in user_input_vars:
        # 精确匹配变量名（前后不是字母数字下划线）
        pattern = r'\.like\(f\'%\{(' + var + r')\}%\'\)'
        match = re.search(pattern, new_line)
        if match and not match.group(1).startswith('_'):
            replacement = f".like(f'%{{escape_like_keyword({var})}}%')"
            new_line = re.sub(pattern, replacement, new_line)
            count += 1
            print(f'  替换: {line.strip()[:80]}')
    
    new_lines.append(new_line)

content = '\n'.join(new_lines)

with open(ROUTES_FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\n共替换 {count} 处 LIKE 查询')
