"""
后端模块化拆分脚本 - 按模块从 routes.py 提取路由到 blueprints/

使用方式：python scripts/split_routes.py
注意：这是一个辅助脚本，拆分后需要手动验证和调整。
"""
import os
import re

ROUTES_FILE = os.path.join(os.path.dirname(__file__), '..', 'backend', 'routes.py')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'backend', 'blueprints')

MODULES = {
    'auth': [
        ('/auth/', 'auth'),
    ],
    'customers': [
        ('/customers', 'customers'),
    ],
    'staffs': [
        ('/staffs', 'staffs'),
    ],
    'records': [
        ('/records', 'records'),
    ],
    'pending': [
        ('/pending', 'pending'),
    ],
    'finance': [
        ('/payments', 'payments'),
        ('/expenses', 'expenses'),
        ('/salaries', 'salaries'),
    ],
    'projects': [
        ('/projects', 'projects'),
    ],
    'materials': [
        ('/materials', 'materials'),
    ],
    'templates': [
        ('/templates', 'templates'),
    ],
    'statistics': [
        ('/statistics', 'statistics'),
        ('/dashboard', 'dashboard'),
    ],
    'system': [
        ('/operation-logs', 'operation_logs'),
        ('/backup/', 'backup'),
        ('/system-', 'system_settings'),
        ('/notifications', 'notifications'),
    ],
}


def extract_routes():
    """从 routes.py 读取内容，按模块打印路由分布"""
    with open(ROUTES_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 找出所有 @api_bp.route 装饰器的行号
    route_lines = []
    for i, line in enumerate(lines):
        if line.strip().startswith('@api_bp.route('):
            match = re.search(r"@api_bp\.route\('([^']+)'", line)
            if match:
                route_lines.append((i + 1, match.group(1)))

    print(f"共找到 {len(route_lines)} 个路由\n")

    # 按模块分类
    module_routes = {}
    for line_no, path in route_lines:
        assigned = False
        for module, prefixes in MODULES.items():
            for prefix, _ in prefixes:
                if path.startswith(prefix) or prefix in path:
                    if module not in module_routes:
                        module_routes[module] = []
                    module_routes[module].append((line_no, path))
                    assigned = True
                    break
            if assigned:
                break
        if not assigned:
            if 'other' not in module_routes:
                module_routes['other'] = []
            module_routes['other'].append((line_no, path))

    for module, routes in sorted(module_routes.items()):
        print(f"\n=== {module} ({len(routes)} 个路由) ===")
        for line_no, path in routes:
            print(f"  L{line_no}: {path}")


if __name__ == '__main__':
    extract_routes()
