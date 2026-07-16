#!/usr/bin/env python3
"""上传修改后的 models.py 到容器"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021')

sftp = ssh.open_sftp()
# 上传到宿主机
sftp.put(r'c:\Users\Administrator\Documents\traework\models.py', '/tmp/models.py')
sftp.close()

# 复制到容器
stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/models.py worklog:/app/app/models.py')
stdout.read()

print('✓ models.py 已更新到容器')

# 创建数据库迁移脚本
migrate_script = '''#!/usr/bin/env python3
"""数据库迁移：创建 repair_equipments 表 + 新增 WorkRecord 字段"""
import sys
sys.path.insert(0, '/app')

from app import db, create_app
from sqlalchemy import inspect, text

app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    
    # 1. 创建 repair_equipments 表
    if 'repair_equipments' not in inspector.get_table_names():
        db.create_all()
        print('✓ 创建 repair_equipments 表')
    else:
        print('- repair_equipments 表已存在')
    
    # 2. 新增 WorkRecord 字段
    columns = [col['name'] for col in inspector.get_columns('work_records')]
    
    new_fields = {
        'fault_phenomenon': 'TEXT',
        'fault_cause': 'TEXT',
        'repair_solution': 'TEXT',
        'equipment_fee_total': 'FLOAT',
        'debug_fee': 'FLOAT',
        'survey_time': 'VARCHAR(10)',
        'quote_time': 'VARCHAR(10)',
        'repair_start_time': 'VARCHAR(10)',
        'repair_end_time': 'VARCHAR(10)',
        'accept_time': 'VARCHAR(10)',
        'customer_signature': 'TEXT',
    }
    
    added = []
    for field, field_type in new_fields.items():
        if field not in columns:
            sql = f"ALTER TABLE work_records ADD COLUMN {field} {field_type}"
            db.session.execute(text(sql))
            added.append(field)
            print(f'✓ 新增字段: {field}')
    
    if added:
        db.session.commit()
        print(f'\\n✓ 数据库迁移完成，新增 {len(added)} 个字段')
    else:
        print('\\n- 所有字段已存在，无需迁移')
'''

# 上传迁移脚本
sftp = ssh.open_sftp()
with sftp.open('/tmp/migrate_repair.py', 'w') as f:
    f.write(migrate_script)
sftp.close()

# 复制到容器并执行
stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/migrate_repair.py worklog:/tmp/migrate_repair.py')
stdout.read()

stdin, stdout, stderr = ssh.exec_command('docker exec worklog python3 /tmp/migrate_repair.py')
output = stdout.read().decode('utf-8')
error = stderr.read().decode('utf-8')

print(output)
if error:
    print('ERROR:', error)

ssh.close()
