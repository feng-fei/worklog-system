"""部署Dashboard v2优化到 worklog 容器"""
import paramiko
import os

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

print('=== 部署 Dashboard v2 优化 ===\n')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)

sftp = ssh.open_sftp()

# 上传 index.html
print('[1/3] 上传 index.html...')
sftp.put(os.path.join(LOCAL_DIR, 'index.html'), '/tmp/index.html')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/index.html {CONTAINER_NAME}:/app/frontend/index.html')
stdout.read()
stderr.read()
print('✓ index.html 上传完成')

# 上传 style-app.css
print('[2/3] 上传 style-app.css...')
sftp.put(os.path.join(LOCAL_DIR, 'style-app.css'), '/tmp/style-app.css')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/style-app.css {CONTAINER_NAME}:/app/frontend/style-app.css')
stdout.read()
stderr.read()
print('✓ style-app.css 上传完成')

# 上传 backend/routes.py
print('[3/3] 上传 backend/routes.py...')
sftp.put(os.path.join(LOCAL_DIR, 'backend', 'routes.py'), '/tmp/routes.py')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/routes.py {CONTAINER_NAME}:/app/backend/routes.py')
stdout.read()
stderr.read()
print('✓ routes.py 上传完成')

# 重启容器
print('\n重启容器...')
stdin, stdout, stderr = ssh.exec_command(f'docker restart {CONTAINER_NAME}')
stdout.read()
stderr.read()
print('✓ 容器重启完成')

import time
print('\n等待容器启动...')
time.sleep(5)

stdin, stdout, stderr = ssh.exec_command(f'docker ps --filter name={CONTAINER_NAME} --format "{{{{.Status}}}}"')
status = stdout.read().decode('utf-8').strip()
print(f'容器状态: {status}')

ssh.close()

print('\n✅ 部署完成！')
print('\n访问地址: http://172.28.10.2:8085/')
print('（按 Ctrl+F5 强制刷新缓存，CSS版本 v27）')
print('\n本次更新内容：')
print('1. Dashboard按功能分区，添加分区标题，更有层次感')
print('2. 业务概览区新增今日汇总大卡片（工单/施工/维修）')
print('3. 快捷操作按钮美化，统一边框和hover效果')
print('4. 修复快捷操作区深色模式背景适配')
print('5. 内容区改为2x2网格布局（4个卡片）')
print('6. 新增「活跃客户」模块（近30天工单最多的客户）')
print('7. 移动端响应式适配优化')
