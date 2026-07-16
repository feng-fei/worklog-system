import os
import re

# 读取原始 routes.py
with open('/app/app/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# 先提取公共的导入和工具函数（前 25 行左右）
# 然后按功能模块拆分

# ===== 步骤1: 找出各个路由函数的起止位置 =====
# 用正则匹配 @api_bp.route 装饰器和对应的 def 函数

route_starts = []  # (line_index, route_path, function_name)
for i, line in enumerate(lines):
    m = re.match(r'@api_bp\.route\([\'"]([^\'"]+)[\'"]', line.strip())
    if m:
        route_path = m.group(1)
        # 找下一行的 def
        for j in range(i+1, min(i+5, len(lines))):
            def_m = re.match(r'def\s+(\w+)\s*\(', lines[j].strip())
            if def_m:
                route_starts.append((i, route_path, def_m.group(1)))
                break

print(f"找到 {len(route_starts)} 个路由")

# ===== 步骤2: 按模块分组 =====
module_map = {
    'auth': [],
    'customers': [],
    'staff': [],
    'records': [],
    'pending': [],
    'salary': [],
    'statistics': [],
    'export': [],
    'files': [],
    'settings': [],
    'backup': [],
    'dashboard': [],
}

for start_info in route_starts:
    line_idx, route_path, func_name = start_info
    
    if route_path.startswith('/auth/') or route_path == '/test':
        module_map['auth'].append(start_info)
    elif route_path.startswith('/customers'):
        module_map['customers'].append(start_info)
    elif route_path.startswith('/staffs'):
        module_map['staff'].append(start_info)
    elif '/edits' in route_path:
        module_map['records'].append(start_info)
    elif route_path.startswith('/records'):
        module_map['records'].append(start_info)
    elif route_path.startswith('/pending'):
        module_map['pending'].append(start_info)
    elif route_path.startswith('/salaries'):
        module_map['salary'].append(start_info)
    elif route_path.startswith('/statistics'):
        module_map['statistics'].append(start_info)
    elif route_path.startswith('/export'):
        module_map['export'].append(start_info)
    elif route_path.startswith('/uploads'):
        module_map['files'].append(start_info)
    elif route_path.startswith('/settings'):
        module_map['settings'].append(start_info)
    elif route_path.startswith('/backup'):
        module_map['backup'].append(start_info)
    elif route_path == '/dashboard' or route_path == '/calendar':
        module_map['dashboard'].append(start_info)

for mod, routes in module_map.items():
    print(f"\n[{mod}] ({len(routes)} 个路由)")
    for r in routes:
        print(f"  {r[1]} -> {r[2]}")

# ===== 步骤3: 提取每个函数的代码 =====
def extract_function(lines, start_line_idx):
    """从 start_line_idx（@装饰器行）开始，提取完整的函数代码"""
    # 找到 def 那一行
    def_line_idx = start_line_idx
    for i in range(start_line_idx, len(lines)):
        if lines[i].strip().startswith('def '):
            def_line_idx = i
            break
    
    # 计算缩进
    def_line = lines[def_line_idx]
    indent = len(def_line) - len(def_line.lstrip())
    
    # 从 def 行开始，找到函数结束（下一个相同或更少缩进的非空行）
    end_idx = len(lines)
    for i in range(def_line_idx + 1, len(lines)):
        line = lines[i]
        if line.strip() == '':
            continue
        cur_indent = len(line) - len(line.lstrip())
        # 如果缩进等于或小于函数定义的缩进，且不是空行，说明函数结束了
        # 但要排除装饰器（以 @ 开头）
        if cur_indent <= indent and not line.strip().startswith('@') and not line.strip().startswith('#'):
            # 检查是不是函数内部的内容
            if not line.strip().startswith('def '):
                end_idx = i
                break
    
    # 包含装饰器和空行
    # 从装饰器开始，到 end_idx 之前
    result_lines = lines[start_line_idx:end_idx]
    return '\n'.join(result_lines)

# 测试提取一个
print("\n\n=== 测试提取 auth_login ===")
test_func = extract_function(lines, 42)  # /auth/login 在第43行（0-indexed是42）
print(test_func[:500])
print("...")

# ===== 步骤4: 创建 routes 目录 =====
routes_dir = '/app/app/routes'
os.makedirs(routes_dir, exist_ok=True)

# 公共导入
common_imports = '''from flask import request, jsonify, current_app, Blueprint, send_from_directory, g
from .. import db
from ..models import WorkRecord, PendingWork, Staff, Customer, WorkerUser, SystemSetting, SalaryRecord
from ..auth import login_required, admin_required, create_token, get_login_user_name
from datetime import datetime, timedelta
from sqlalchemy import func, or_
import json
import os
import uuid
import re
'''

# 工具函数（从原文件提取）
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

def build_module_file(module_name, routes_info, extra_imports=''):
    """构建模块文件内容"""
    bp_name = f'{module_name}_bp'
    bp_var = f"{module_name}_bp"
    
    header = f'''from flask import request, jsonify, current_app, Blueprint, send_from_directory, g
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

{bp_var} = Blueprint('{module_name}', __name__)
'''
    
    # 添加工具函数（所有模块都可能需要）
    if module_name in ['files', 'records', 'staff']:
        header += utils_code + '\n'
    
    # 添加所有函数
    body = ''
    for start_info in routes_info:
        line_idx, route_path, func_name = start_info
        func_code = extract_function(lines, line_idx)
        # 替换 api_bp 为 {bp_var}
        func_code = func_code.replace('@api_bp.route', f'@{bp_var}.route')
        body += func_code + '\n\n'
    
    return header + body

# ===== 步骤5: 生成各个模块文件 =====
modules_to_create = [
    ('auth', module_map['auth']),
    ('customers', module_map['customers']),
    ('staff', module_map['staff']),
    ('records', module_map['records']),
    ('pending', module_map['pending']),
    ('salary', module_map['salary']),
    ('statistics', module_map['statistics']),
    ('export', module_map['export'], 'from fpdf import FPDF\nimport io\nfrom reportlab.lib.pagesizes import A4\nfrom reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle\nfrom reportlab.lib.styles import getSampleStyleSheet\nfrom reportlab.lib import colors\nfrom reportlab.pdfbase import pdfmetrics\nfrom reportlab.pdfbase.ttfonts import TTFont\nfrom reportlab.lib.units import cm\n'),
    ('files', module_map['files']),
    ('settings', module_map['settings']),
    ('backup', module_map['backup']),
    ('dashboard', module_map['dashboard']),
]

for item in modules_to_create:
    if len(item) == 2:
        module_name, routes_info = item
        extra_imports = ''
    else:
        module_name, routes_info, extra_imports = item
    
    file_path = os.path.join(routes_dir, f'{module_name}_routes.py')
    content = build_module_file(module_name, routes_info, extra_imports)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ 生成: {file_path} ({len(content)} bytes, {len(routes_info)} 路由)")

# ===== 步骤6: 生成 routes/__init__.py =====
init_content = '''"""路由模块"""

from .auth_routes import auth_bp
from .customers_routes import customers_bp
from .staff_routes import staff_bp
from .records_routes import records_bp
from .pending_routes import pending_bp
from .salary_routes import salary_bp
from .statistics_routes import statistics_bp
from .export_routes import export_bp
from .files_routes import files_bp
from .settings_routes import settings_bp
from .backup_routes import backup_bp
from .dashboard_routes import dashboard_bp

def register_blueprints(app, url_prefix='/api'):
    """注册所有路由蓝图"""
    app.register_blueprint(auth_bp, url_prefix=url_prefix)
    app.register_blueprint(customers_bp, url_prefix=url_prefix)
    app.register_blueprint(staff_bp, url_prefix=url_prefix)
    app.register_blueprint(records_bp, url_prefix=url_prefix)
    app.register_blueprint(pending_bp, url_prefix=url_prefix)
    app.register_blueprint(salary_bp, url_prefix=url_prefix)
    app.register_blueprint(statistics_bp, url_prefix=url_prefix)
    app.register_blueprint(export_bp, url_prefix=url_prefix)
    app.register_blueprint(files_bp, url_prefix=url_prefix)
    app.register_blueprint(settings_bp, url_prefix=url_prefix)
    app.register_blueprint(backup_bp, url_prefix=url_prefix)
    app.register_blueprint(dashboard_bp, url_prefix=url_prefix)
'''

init_path = os.path.join(routes_dir, '__init__.py')
with open(init_path, 'w', encoding='utf-8') as f:
    f.write(init_content)
print(f"\n✅ 生成: {init_path}")

# ===== 步骤7: 保留旧的 routes.py 作为兼容入口（可选，直接修改__init__.py引用新模块） =====
# 先不删除旧的，先验证新的能工作

print("\n🎉 后端路由拆分完成！")
print(f"目录: {routes_dir}")
for f in sorted(os.listdir(routes_dir)):
    fpath = os.path.join(routes_dir, f)
    size = os.path.getsize(fpath)
    print(f"  {f} ({size/1024:.1f} KB)")
