import shutil
import os

# 备份文件
files_to_backup = [
    '/app/app/__init__.py',
    '/app/app/routes.py',
    '/app/frontend/index.html',
    '/app/frontend/script.js',
    '/app/frontend/app.min.js',
    '/app/frontend/style.css',
]

print("=== 备份文件 ===")
for f in files_to_backup:
    if os.path.exists(f):
        backup_path = f + '.split_backup'
        shutil.copy2(f, backup_path)
        size = os.path.getsize(backup_path)
        print(f"  ✅ {f} -> {backup_path} ({size} bytes)")
    else:
        print(f"  ⏭️  {f} 不存在")

# 读取 __init__.py
print("\n=== __init__.py 内容 ===")
with open('/app/app/__init__.py', 'r', encoding='utf-8') as f:
    print(f.read())

# 读取 routes.py 的前 100 行（导入和开头部分）
print("\n=== routes.py 前 100 行 ===")
with open('/app/app/routes.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines[:100]):
        print(f"{i+1:4d}: {line}", end='')

print(f"\n\n总行数: {len(lines)}")

# 找出 routes.py 中各个功能块的位置
print("\n=== routes.py 功能块划分 ===")
import re
with open('/app/app/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 找所有 @api_bp.route 定义
pattern = r"@api_bp\.route\(['\"]([^'\"]+)['\"]"
routes = list(re.finditer(pattern, content))

for r in routes:
    route_path = r.group(1)
    line_num = content[:r.start()].count('\n') + 1
    print(f"  行{line_num:4d}: {route_path}")
