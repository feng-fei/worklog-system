import os
import re

# 读取原始 routes.py
with open('/app/app/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# 找出所有路由函数的起止
# 方法：找到每个 @api_bp.route 的位置，然后找到下一个 @api_bp.route 之前的位置

route_positions = []  # (start_line_idx, end_line_idx, route_path, func_name)
n = len(lines)

for i, line in enumerate(lines):
    m = re.match(r'@api_bp\.route\([\'"]([^\'"]+)[\'"]', line.strip())
    if m:
        route_path = m.group(1)
        # 找 def
        func_name = ''
        for j in range(i+1, min(i+5, n)):
            def_m = re.match(r'def\s+(\w+)\s*\(', lines[j].strip())
            if def_m:
                func_name = def_m.group(1)
                break
        route_positions.append([i, None, route_path, func_name])

# 设置每个函数的结束位置 = 下一个路由函数开始位置的前一行
for idx in range(len(route_positions)):
    if idx < len(route_positions) - 1:
        end_line = route_positions[idx+1][0] - 1
        # 回溯去掉多余的空行
        while end_line > route_positions[idx][0] and lines[end_line].strip() == '':
            end_line -= 1
        route_positions[idx][1] = end_line + 1  # 包含最后一行
    else:
        # 最后一个函数到文件末尾
        route_positions[idx][1] = n

print(f"找到 {len(route_positions)} 个路由")
for rp in route_positions[:5]:
    print(f"  {rp[2]}: 行{rp[0]+1}-{rp[1]} ({rp[1]-rp[0]} 行)")

# 验证：所有函数的行数加起来应该约等于总行数
total_lines = sum(rp[1] - rp[0] for rp in route_positions)
print(f"\n所有函数总行数: {total_lines}")
print(f"文件总行数: {n}")

# 按模块分组
module_map = {}

def get_module(route_path):
    if route_path.startswith('/auth/') or route_path == '/test':
        return 'auth'
    elif route_path.startswith('/customers'):
        return 'customers'
    elif route_path.startswith('/staffs'):
        return 'staff'
    elif '/edits' in route_path:
        return 'records'
    elif route_path.startswith('/records'):
        return 'records'
    elif route_path.startswith('/pending'):
        return 'pending'
    elif route_path.startswith('/salaries'):
        return 'salary'
    elif route_path.startswith('/statistics'):
        return 'statistics'
    elif route_path.startswith('/export'):
        return 'export'
    elif route_path.startswith('/uploads'):
        return 'files'
    elif route_path.startswith('/settings'):
        return 'settings'
    elif route_path.startswith('/backup'):
        return 'backup'
    elif route_path in ['/dashboard', '/calendar']:
        return 'dashboard'
    else:
        return 'other'

for rp in route_positions:
    mod = get_module(rp[2])
    module_map.setdefault(mod, []).append(rp)

print("\n=== 模块分布 ===")
for mod, rps in sorted(module_map.items()):
    total = sum(rp[1]-rp[0] for rp in rps)
    print(f"  {mod}: {len(rps)} 路由, {total} 行")

# ===== 生成模块文件 =====
routes_dir = '/app/app/routes'

# 公共头部
def build_header(bp_name, extra_imports=''):
    return f'''from flask import request, jsonify, current_app, Blueprint, send_from_directory, g
from .. import db
from ..models import WorkRecord, PendingWork, Staff, Customer, WorkerUser, SystemSetting, SalaryRecord
from ..auth import login_required, admin_required, create_token, get_login_user_name
from datetime import datetime, timedelta
from sqlalchemy import func, or_
import json
import os
import uuid
import re
{extra_imports}

{bp_name} = Blueprint('{bp_name.replace('_bp', '')}', __name__)
'''

# 需要工具函数的模块
modules_with_utils = ['files', 'records', 'staff', 'export']
utils_code = '''
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_filename(original_name):
    """生成安全的文件名"""
    ext = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else 'jpg'
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    short_id = str(uuid.uuid4())[:8]
    return f'{ts}_{short_id}.{ext}'
'''

# 特殊导入
extra_imports_map = {
    'export': '''from fpdf import FPDF
import io
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import cm
''',
}

module_bp_names = {
    'auth': 'auth_bp',
    'customers': 'customers_bp',
    'staff': 'staff_bp',
    'records': 'records_bp',
    'pending': 'pending_bp',
    'salary': 'salary_bp',
    'statistics': 'statistics_bp',
    'export': 'export_bp',
    'files': 'files_bp',
    'settings': 'settings_bp',
    'backup': 'backup_bp',
    'dashboard': 'dashboard_bp',
}

for mod, rps in module_map.items():
    if mod == 'other':
        continue
    
    bp_name = module_bp_names.get(mod, f'{mod}_bp')
    extra_imp = extra_imports_map.get(mod, '')
    header = build_header(bp_name, extra_imp)
    
    # 工具函数
    if mod in modules_with_utils:
        header += utils_code + '\n'
    
    # 提取所有函数代码
    body = ''
    for rp in rps:
        start, end = rp[0], rp[1]
        func_lines = lines[start:end]
        func_code = '\n'.join(func_lines)
        # 替换蓝图名
        func_code = func_code.replace('@api_bp.route', f'@{bp_name}.route')
        body += func_code + '\n\n'
    
    file_content = header + body
    file_path = os.path.join(routes_dir, f'{mod}_routes.py')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(file_content)
    
    line_count = file_content.count('\n')
    print(f"✅ {mod}_routes.py: {line_count} 行, {len(file_content)} bytes")

# 生成 __init__.py
init_lines = ['"""路由模块 - 按功能拆分""", '']
bp_imports = []
register_lines = []

for mod in sorted(module_bp_names.keys()):
    if mod not in module_map:
        continue
    bp_var = module_bp_names[mod]
    bp_imports.append(f'from .{mod}_routes import {bp_var}')
    register_lines.append(f"    app.register_blueprint({bp_var}, url_prefix=url_prefix)")

init_content = '\n'.join(bp_imports) + '\n\n\ndef register_blueprints(app, url_prefix="/api"):\n'
init_content += '    """注册所有路由蓝图"""\n'
init_content += '\n'.join(register_lines) + '\n'

init_path = os.path.join(routes_dir, '__init__.py')
with open(init_path, 'w', encoding='utf-8') as f:
    f.write(init_content)

print(f"\n✅ routes/__init__.py 已生成")

# 列出目录
print("\n=== routes 目录 ===")
for f in sorted(os.listdir(routes_dir)):
    fpath = os.path.join(routes_dir, f)
    size = os.path.getsize(fpath)
    print(f"  {f} ({size/1024:.1f} KB)")
