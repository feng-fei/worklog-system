#!/usr/bin/env python3
"""上传设备明细路由并注册"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021')

# 上传路由文件
sftp = ssh.open_sftp()
sftp.put(r'c:\Users\Administrator\Documents\traework\equipment_routes.py', '/tmp/equipment_routes.py')
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/equipment_routes.py worklog:/app/app/routes/equipment_routes.py')
stdout.read()
print('✓ 上传 equipment_routes.py')

# 读取 __init__.py
stdin, stdout, stderr = ssh.exec_command('docker exec worklog cat /app/app/routes/__init__.py')
init_content = stdout.read().decode('utf-8')

# 添加导入和注册
if 'equipment_bp' not in init_content:
    # 在导入区域添加
    if 'from .equipment_routes import equipment_bp' not in init_content:
        init_content = init_content.replace(
            'from .repair_export_routes import repair_export_bp',
            'from .repair_export_routes import repair_export_bp\nfrom .equipment_routes import equipment_bp'
        )
    
    # 在注册区域添加
    if 'app.register_blueprint(equipment_bp' not in init_content:
        init_content = init_content.replace(
            'app.register_blueprint(repair_export_bp, url_prefix=url_prefix)',
            'app.register_blueprint(repair_export_bp, url_prefix=url_prefix)\n    app.register_blueprint(equipment_bp, url_prefix=url_prefix)'
        )
    
    # 写回
    sftp = ssh.open_sftp()
    with sftp.open('/tmp/__init__.py', 'w') as f:
        f.write(init_content)
    sftp.close()
    
    stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/__init__.py worklog:/app/app/routes/__init__.py')
    stdout.read()
    print('✓ 注册 equipment_bp')
else:
    print('- equipment_bp 已注册')

ssh.close()
