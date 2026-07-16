
import os
import re

def split_routes():
    with open('/app/app/routes.py', 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.split('\n')
    
    print(f"Total lines: {len(lines)}")
    
    route_pattern = re.compile(r'^@api_bp\.route\([\'"]([^\'"]+)[\'"]')
    
    route_starts = []
    for i, line in enumerate(lines):
        m = route_pattern.match(line.strip())
        if m:
            route_starts.append((i, m.group(1)))
    
    print(f"Found {len(route_starts)} routes")
    
    module_map = {
        'auth': [
            '/test',
            '/auth/debug',
            '/auth/login',
            '/auth/me',
            '/auth/change-password',
            '/auth/users',
            '/auth/users/<int:user_id>',
            '/auth/reset-password-by-admin/<int:user_id>',
        ],
        'customers': [
            '/customers',
            '/customers/<int:customer_id>',
        ],
        'staff': [
            '/staffs',
            '/staffs/<int:staff_id>',
            '/staffs/<int:staff_id>/id_photo',
            '/staffs/<int:staff_id>/cert_photo',
        ],
        'records': [
            '/records',
            '/records/<int:record_id>',
            '/records/<int:record_id>/edits',
        ],
        'pending': [
            '/pending',
            '/pending/<int:pending_id>',
            '/pending/<int:pending_id>/complete',
        ],
        'salary': [
            '/salaries',
            '/salaries/<int:salary_id>/settle',
        ],
        'statistics': [
            '/statistics',
        ],
        'export': [
            '/export/records',
            '/export/pdf/<int:record_id>',
            '/export/pdf',
        ],
        'files': [
            '/uploads/<filename>',
        ],
        'settings': [
            '/settings',
        ],
        'backup': [
            '/backup/create',
            '/backup/list',
            '/backup/download/<filename>',
            '/backup/restore',
        ],
        'dashboard': [
            '/dashboard',
            '/calendar',
        ],
    }
    
    def get_module(route_path):
        for module, paths in module_map.items():
            for p in paths:
                if route_path == p:
                    return module
        return None
    
    route_modules = {}
    for line_idx, route_path in route_starts:
        module = get_module(route_path)
        if module:
            route_modules[line_idx] = module
            print(f"  Line {line_idx+1}: {route_path} -> {module}")
        else:
            print(f"  WARNING: No module for {route_path} at line {line_idx+1}")
    
    common_imports = [
        'from flask import request, jsonify, current_app, Blueprint, send_from_directory, g',
        'from .. import db',
    ]
    
    module_imports = {
        'auth': [
            'from ..models import WorkerUser',
            'from ..auth import login_required, admin_required, create_token, get_login_user_name',
            'import json',
        ],
        'customers': [
            'from ..models import Customer',
            'from ..auth import login_required, admin_required',
            'from sqlalchemy import func, or_',
        ],
        'staff': [
            'from ..models import Staff',
            'from ..auth import login_required, admin_required',
            'from sqlalchemy import func, or_',
            'import os',
            'import uuid',
            'from datetime import datetime',
        ],
        'records': [
            'from ..models import WorkRecord, Customer, Staff',
            'from ..auth import login_required',
            'from datetime import datetime, timedelta',
            'from sqlalchemy import func, or_',
            'import json',
            'import os',
        ],
        'pending': [
            'from ..models import PendingWork, Staff',
            'from ..auth import login_required',
            'from datetime import datetime',
            'from sqlalchemy import func, or_',
            'import json',
        ],
        'salary': [
            'from ..models import SalaryRecord, Staff',
            'from ..auth import login_required, admin_required',
            'from datetime import datetime',
            'from sqlalchemy import func',
            'import json',
        ],
        'statistics': [
            'from ..models import WorkRecord, Staff',
            'from ..auth import login_required',
            'from datetime import datetime, timedelta',
            'from sqlalchemy import func',
        ],
        'export': [
            'from ..models import WorkRecord, Customer, Staff, SalaryRecord',
            'from ..auth import login_required',
            'from datetime import datetime',
            'from sqlalchemy import func',
            'import io',
            'import csv',
        ],
        'files': [
            'from ..auth import login_required',
            'import os',
            'ALLOWED_EXTENSIONS = {\'png\', \'jpg\', \'jpeg\', \'gif\', \'webp\'}',
            '',
            'def allowed_file(filename):',
            '    return \'.\' in filename and filename.rsplit(\'.\', 1)[1].lower() in ALLOWED_EXTENSIONS',
            '',
            'def safe_filename(original_name):',
            '    """生成安全的文件名"""',
            '    ext = original_name.rsplit(\'.\', 1)[1].lower() if \'.\' in original_name else \'jpg\'',
            '    ts = datetime.now().strftime(\'%Y%m%d_%H%M%S\')',
            '    short_id = str(uuid.uuid4())[:8]',
            '    return f\'{ts}_{short_id}.{ext}\'',
            'import uuid',
            'from datetime import datetime',
        ],
        'settings': [
            'from ..models import SystemSetting',
            'from ..auth import login_required, admin_required',
            'import json',
        ],
        'backup': [
            'from ..auth import admin_required',
            'from datetime import datetime',
            'import os',
            'import shutil',
            'import glob',
        ],
        'dashboard': [
            'from ..models import WorkRecord, PendingWork, Staff',
            'from ..auth import login_required',
            'from datetime import datetime, timedelta',
            'from sqlalchemy import func',
        ],
    }
    
    modules_content = {}
    
    for module_name in module_map.keys():
        modules_content[module_name] = []
    
    def add_imports_for_module(module_name):
        if module_name not in modules_content:
            return
        bp_name = f"{module_name}_bp"
        if module_name == 'staff':
            bp_name = 'staff_bp'
        header = [
            f'from flask import request, jsonify, current_app, Blueprint, send_from_directory, g',
            f'from .. import db',
            '',
        ]
        for imp in module_imports.get(module_name, []):
            header.append(imp)
        header.append('')
        header.append('')
        header.append(f'{bp_name} = Blueprint(\'{module_name}\', __name__)')
        header.append('')
        header.append('')
        modules_content[module_name].extend(header)
    
    for module_name in module_map.keys():
        add_imports_for_module(module_name)
    
    for i, (start_line, route_path) in enumerate(route_starts):
        module_name = route_modules.get(start_line)
        if not module_name:
            continue
        
        end_line = len(lines)
        if i + 1 < len(route_starts):
            end_line = route_starts[i + 1][0]
        
        while end_line > start_line and lines[end_line - 1].strip() == '':
            end_line -= 1
        
        route_lines = lines[start_line:end_line]
        
        modified_lines = []
        for line in route_lines:
            modified_line = line.replace('api_bp', f'{module_name}_bp' if module_name != 'staff' else 'staff_bp')
            modified_lines.append(modified_line)
        
        modules_content[module_name].extend(modified_lines)
        modules_content[module_name].append('')
        modules_content[module_name].append('')
    
    routes_dir = '/app/app/routes'
    os.makedirs(routes_dir, exist_ok=True)
    
    total_out_lines = 0
    for module_name, content_lines in modules_content.items():
        filename = f'{module_name}_routes.py'
        filepath = os.path.join(routes_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(content_lines))
        print(f"Created {filename}: {len(content_lines)} lines")
        total_out_lines += len(content_lines)
    
    print(f"Total output lines: {total_out_lines}")
    
    init_content = '''"""路由模块"""

'''
    for module_name in module_map.keys():
        bp_var = f'{module_name}_bp'
        if module_name == 'staff':
            bp_var = 'staff_bp'
        init_content += f'from .{module_name}_routes import {bp_var}\n'
    
    init_content += '''
def register_blueprints(app, url_prefix='/api'):
    """注册所有路由蓝图"""
'''
    for module_name in module_map.keys():
        bp_var = f'{module_name}_bp'
        if module_name == 'staff':
            bp_var = 'staff_bp'
        init_content += f'    app.register_blueprint({bp_var}, url_prefix=url_prefix)\n'
    
    with open(os.path.join(routes_dir, '__init__.py'), 'w', encoding='utf-8') as f:
        f.write(init_content)
    
    print(f"Created __init__.py")
    print("Done!")

if __name__ == '__main__':
    split_routes()
