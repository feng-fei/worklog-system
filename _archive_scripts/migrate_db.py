#!/usr/bin/env python3
"""数据库迁移：为WorkRecord模型新增字段"""

import sys
sys.path.insert(0, '/app')

from app import db, create_app
from app.models import WorkRecord

app = create_app()

with app.app_context():
    # 检查是否已存在这些字段
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns('work_records')]
    
    new_fields = {
        'device_brand': 'VARCHAR(50)',
        'device_model': 'VARCHAR(100)',
        'device_sn': 'VARCHAR(100)',
        'arrival_time': 'VARCHAR(10)',
        'completion_time': 'VARCHAR(10)',
        'customer_feedback': 'TEXT',
        'satisfaction': 'VARCHAR(20)',
        'service_category': 'VARCHAR(30)',
        'warranty_status': 'VARCHAR(20)',
        'warranty_days': 'INTEGER',
    }
    
    added = []
    for field, field_type in new_fields.items():
        if field not in columns:
            sql = f"ALTER TABLE work_records ADD COLUMN {field} {field_type}"
            db.session.execute(db.text(sql))
            added.append(field)
            print(f"✓ 新增字段: {field}")
        else:
            print(f"- 字段已存在: {field}")
    
    if added:
        db.session.commit()
        print(f"\n✓ 数据库迁移完成，新增 {len(added)} 个字段")
    else:
        print("\n- 所有字段已存在，无需迁移")
