"""
后端路由自动拆分脚本
从 routes.py 中按模块提取路由函数到 blueprints/ 目录
"""
import os
import re

ROUTES_FILE = os.path.join(os.path.dirname(__file__), '..', 'backend', 'routes.py')
BLUEPRINTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'backend', 'blueprints')

# 模块配置：(模块名, 蓝图变量名, url_prefix, 路由前缀匹配列表)
MODULES = [
    ('auth', 'auth_bp', '/auth', ['/auth/']),
    ('records', 'records_bp', '/records', [
        '/records', '/export/records', '/export/pdf', '/calendar',
    ]),
    ('pending', 'pending_bp', '/pending', ['/pending']),
    ('customers', 'customers_bp', '/customers', [
        '/customers', '/customer-equipments', '/maintenance-plans',
    ]),
    ('staffs', 'staffs_bp', '/staffs', ['/staffs']),
    ('finance', 'finance_bp', '/finance', [
        '/payments', '/expenses', '/expense-categories', '/salaries',
    ]),
    ('projects', 'projects_bp', '/projects', ['/projects']),
    ('materials', 'materials_bp', '/materials', ['/materials']),
    ('templates', 'templates_bp', '/templates', ['/templates']),
    ('statistics', 'statistics_bp', '/statistics', ['/statistics', '/dashboard']),
    ('system', 'system_bp', '/system', [
        '/operation-logs', '/backup/', '/system-', '/notifications',
        '/settings', '/uploads/', '/test',
    ]),
]


def find_route_blocks(lines):
    """找出所有路由块（从装饰器到下一个装饰器或文件末尾）"""
    blocks = []
    current_start = None
    current_path = None

    for i, line in enumerate(lines):
        if line.strip().startswith('@api_bp.route('):
            if current_start is not None:
                blocks.append((current_start, i, current_path))
            current_start = i
            match = re.search(r"@api_bp\.route\('([^']+)'", line)
            current_path = match.group(1) if match else ''

    if current_start is not None:
        blocks.append((current_start, len(lines), current_path))

    return blocks


def get_module_for_path(path):
    """根据路径确定所属模块（按优先级匹配）"""
    # 项目子路由优先级最高
    if path.startswith('/projects/'):
        return 'projects', 'projects_bp'
    # 然后是各模块路由
    for module_name, bp_name, prefix, path_prefixes in MODULES:
        for pp in path_prefixes:
            if path.startswith(pp) or pp in path:
                return module_name, bp_name
    return 'other', None


def generate_blueprint_file(module_name, bp_name, blocks, lines):
    """生成蓝图文件内容"""
    imports = '''from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import ''' + bp_name + '''
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


'''

    content = imports

    for start, end, path in blocks:
        block_lines = lines[start:end]
        # 替换 @api_bp.route 为 @bp_name.route
        modified_lines = []
        for line in block_lines:
            modified = line.replace('@api_bp.route(', '@' + bp_name + '.route(')
            modified_lines.append(modified)
        content += ''.join(modified_lines)
        content += '\n'

    return content


def main():
    with open(ROUTES_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    blocks = find_route_blocks(lines)
    print(f"找到 {len(blocks)} 个路由块")

    # 按模块分组
    module_blocks = {}
    for block in blocks:
        start, end, path = block
        module_name, bp_name = get_module_for_path(path)
        if module_name not in module_blocks:
            module_blocks[module_name] = []
        module_blocks[module_name].append(block)

    for module_name, blocks_in_module in sorted(module_blocks.items()):
        print(f"  {module_name}: {len(blocks_in_module)} 个路由")

    # 生成蓝图文件
    os.makedirs(BLUEPRINTS_DIR, exist_ok=True)

    for module_name, bp_name, prefix, _ in MODULES:
        if module_name in module_blocks:
            file_path = os.path.join(BLUEPRINTS_DIR, f'{module_name}_routes.py')
            content = generate_blueprint_file(module_name, bp_name, module_blocks[module_name], lines)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"生成: {file_path} ({len(module_blocks[module_name])} 个路由)")

    # 生成 __init__.py
    init_content = 'from flask import Blueprint\n\n'
    for module_name, bp_name, _, _ in MODULES:
        init_content += f'{bp_name} = Blueprint("{module_name}", __name__)\n'

    init_content += '\n'
    for module_name, bp_name, _, _ in MODULES:
        init_content += f'from . import {module_name}_routes\n'

    init_path = os.path.join(BLUEPRINTS_DIR, '__init__.py')
    with open(init_path, 'w', encoding='utf-8') as f:
        f.write(init_content)
    print(f"生成: {init_path}")


if __name__ == '__main__':
    main()
