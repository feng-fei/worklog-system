"""部署物料同步、设备档案同步、工作台增强到 worklog 容器"""
import paramiko
import os

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

print('=== 部署物料同步+设备档案+工作台增强 ===\n')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)

sftp = ssh.open_sftp()

# 上传 backend/models.py
print('[1/4] 上传 backend/models.py...')
sftp.put(os.path.join(LOCAL_DIR, 'backend', 'models.py'), '/tmp/models.py')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/models.py {CONTAINER_NAME}:/app/backend/models.py')
stdout.read()
stderr.read()
print('✓ models.py 上传完成')

# 上传 backend/routes.py
print('[2/4] 上传 backend/routes.py...')
sftp.put(os.path.join(LOCAL_DIR, 'backend', 'routes.py'), '/tmp/routes.py')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/routes.py {CONTAINER_NAME}:/app/backend/routes.py')
stdout.read()
stderr.read()
print('✓ routes.py 上传完成')

# 上传 index.html
print('[3/4] 上传 index.html...')
sftp.put(os.path.join(LOCAL_DIR, 'index.html'), '/tmp/index.html')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/index.html {CONTAINER_NAME}:/app/frontend/index.html')
stdout.read()
stderr.read()
print('✓ index.html 上传完成')

# 重启容器
print('[4/4] 重启容器...')
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

# 检查启动日志
stdin, stdout, stderr = ssh.exec_command(f'docker logs --tail 20 {CONTAINER_NAME}')
logs = stdout.read().decode('utf-8', errors='ignore')
print(f'\n最近启动日志:\n{logs}')

ssh.close()

print('\n✅ 部署完成！')
print('\n访问地址: http://172.28.10.2:8085/')
print('（按 Ctrl+F5 强制刷新缓存）')
print('\n本次更新内容：')
print('1. 设备明细保存集成到工单创建/更新流程')
print('2. 工单使用设备材料自动扣减物料库存')
print('3. 工单"新增设备"自动同步到客户设备档案')
print('4. 工作台新增：本月收入/支出/利润、低库存预警、待维护设备、进行中项目、客户总数')
print('5. 工作台新增快捷按钮：新增收款/支出/客户/物料入库')
print('6. 工作台新增「最近收支」卡片')
