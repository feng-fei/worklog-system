import os

files_to_check = [
    '/app/app/routes.py',
    '/app/app/models.py',
    '/app/app/auth.py',
    '/app/app/utils.py',
    '/app/frontend/script.js',
    '/app/frontend/app.min.js',
    '/app/frontend/style.css',
    '/app/frontend/index.html',
]

print("=== 文件大小统计 ===\n")
for f in files_to_check:
    if os.path.exists(f):
        size = os.path.getsize(f)
        # 统计行数
        with open(f, 'r', encoding='utf-8') as fp:
            lines = len(fp.readlines())
        size_kb = size / 1024
        print(f"{f}")
        print(f"  大小: {size_kb:.1f} KB ({size} bytes)")
        print(f"  行数: {lines} 行")
        print()
    else:
        print(f"{f} - 不存在")
        print()

# 分析 routes.py 的函数/路由数量
print("\n=== routes.py 路由分析 ===")
with open('/app/app/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

import re
routes = re.findall(r"@api_bp\.route\(['\"]([^'\"]+)['\"]", content)
print(f"总路由数: {len(routes)}")
for r in routes:
    print(f"  {r}")

# 分析 script.js 的函数数量
print("\n=== script.js 函数分析 ===")
with open('/app/frontend/script.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

functions = re.findall(r'^function\s+(\w+)\s*\(', js_content, re.MULTILINE)
print(f"函数总数: {len(functions)}")
# 按功能分组
groups = {}
for func in functions:
    # 简单分组
    if 'login' in func.lower() or 'auth' in func.lower() or 'token' in func.lower() or 'logout' in func.lower():
        group = '认证'
    elif 'record' in func.lower() or 'work' in func.lower() or 'submit' in func.lower() or 'query' in func.lower():
        group = '工单'
    elif 'customer' in func.lower():
        group = '客户'
    elif 'staff' in func.lower() or 'salary' in func.lower():
        group = '人员/工资'
    elif 'photo' in func.lower() or 'upload' in func.lower() or 'image' in func.lower() or 'pv' in func.lower():
        group = '照片/上传'
    elif 'modal' in func.lower():
        group = '模态框'
    elif 'pwa' in func.lower():
        group = 'PWA'
    elif 'dashboard' in func.lower() or 'load' in func.lower() or 'init' in func.lower():
        group = '初始化/数据加载'
    else:
        group = '工具/其他'
    groups.setdefault(group, []).append(func)

for group, funcs in groups.items():
    print(f"\n[{group}] ({len(funcs)}个)")
    for f in funcs:
        print(f"  - {f}")
