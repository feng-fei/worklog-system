#!/usr/bin/env python3
"""更新数据库和后端模板映射"""
import sys
sys.path.insert(0, '/app')

from app import db, create_app
from sqlalchemy import inspect

app = create_app()

with app.app_context():
    # 1. 数据库迁移：添加 involved_systems 字段
    inspector = inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns('work_records')]
    
    if 'involved_systems' not in columns:
        sql = "ALTER TABLE work_records ADD COLUMN involved_systems TEXT"
        db.session.execute(db.text(sql))
        db.session.commit()
        print("✓ 数据库新增字段: involved_systems")
    else:
        print("- 字段已存在: involved_systems")
    
    # 2. 更新 models.py
    with open('/app/app/models.py', 'r', encoding='utf-8') as f:
        models_content = f.read()
    
    # 添加 involved_systems 字段定义
    if 'involved_systems' not in models_content:
        # 在 device_sn 字段后添加
        old = "    device_sn = db.Column(db.String(100), default='')  # 设备序列号"
        new = """    device_sn = db.Column(db.String(100), default='')  # 设备序列号
    involved_systems = db.Column(db.Text, default='')  # 涉及系统/设备（系统级维修）"""
        models_content = models_content.replace(old, new)
        
        # 在 to_dict 中添加
        old_dict = "            'device_sn': self.device_sn or '',"
        new_dict = """            'device_sn': self.device_sn or '',
            'involved_systems': self.involved_systems or '',"""
        models_content = models_content.replace(old_dict, new_dict)
        
        with open('/app/app/models.py', 'w', encoding='utf-8') as f:
            f.write(models_content)
        print("✓ 更新 models.py")
    
    # 3. 更新 repair_export_routes.py 的 fill_template
    with open('/app/app/routes/repair_export_routes.py', 'r', encoding='utf-8') as f:
        routes_content = f.read()
    
    # 找到设备信息映射部分，改为使用 involved_systems
    if 'involved_systems' not in routes_content:
        # 在故障描述映射前添加涉及系统映射
        old_fault = "fault_desc = record.fault_description or record.work_content or ''"
        new_fault = """# 涉及系统/设备
        systems_info = record.involved_systems or ''
        systems_prefix = f'涉及系统/设备：{systems_info}\\n' if systems_info else ''
        
        fault_desc = record.fault_description or record.work_content or ''"""
        routes_content = routes_content.replace(old_fault, new_fault)
        
        # 修改故障描述写入，加上系统信息
        old_write = "safe_write_cell(ws, 9, 1, f'{device_info}故障状况：\\n{fault_desc}' if device_info else fault_desc)"
        new_write = "safe_write_cell(ws, 9, 1, f'{systems_prefix}{device_info}故障状况：\\n{fault_desc}' if (systems_prefix or device_info) else fault_desc)"
        routes_content = routes_content.replace(old_write, new_write)
        
        with open('/app/app/routes/repair_export_routes.py', 'w', encoding='utf-8') as f:
            f.write(routes_content)
        print("✓ 更新 repair_export_routes.py")
    
    print("\n✓ 数据库和后端更新完成")
