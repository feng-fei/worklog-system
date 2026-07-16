#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查后端数据同步情况"""

import paramiko

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)
    
    try:
        # 1. 检查后端文件
        print('=== 检查后端文件 ===')
        stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} ls -la /app/backend/')
        print(stdout.read().decode('utf-8'))
        
        # 2. 检查数据库表是否存在
        print('=== 检查数据库表 ===')
        check_tables_cmd = '''
cd /app && python -c "
from app import create_app, db
app = create_app()
with app.app_context():
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print('All tables:', tables)
    print()
    # 检查新功能相关的表
    new_tables = ['payment_records', 'work_templates', 'projects', 'materials', 'material_stock_logs', 'customer_equipments', 'maintenance_plans', 'notifications']
    for t in new_tables:
        exists = t in tables
        print(f'  {t}: {\"EXISTS\" if exists else \"MISSING\"}'  )
"
'''
        stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} sh -c {repr(check_tables_cmd)}')
        print(stdout.read().decode('utf-8'))
        err = stderr.read().decode('utf-8')
        if err.strip():
            print('stderr:', err)
        
        # 3. 检查各表数据量
        print('=== 检查各表数据量 ===')
        count_cmd = '''
cd /app && python -c "
from app import create_app, db
app = create_app()
with app.app_context():
    from app.models import PaymentRecord, WorkTemplate, Project, Material, CustomerEquipment, MaintenancePlan, Notification
    print('PaymentRecord:', PaymentRecord.query.count(), '条')
    print('WorkTemplate:', WorkTemplate.query.count(), '条')
    print('Project:', Project.query.count(), '条')
    print('Material:', Material.query.count(), '条')
    print('CustomerEquipment:', CustomerEquipment.query.count(), '条')
    print('MaintenancePlan:', MaintenancePlan.query.count(), '条')
    print('Notification:', Notification.query.count(), '条')
"
'''
        stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} sh -c {repr(count_cmd)}')
        print(stdout.read().decode('utf-8'))
        err = stderr.read().decode('utf-8')
        if err.strip():
            print('stderr:', err)
        
    finally:
        ssh.close()

if __name__ == '__main__':
    main()
