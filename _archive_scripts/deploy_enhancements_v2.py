"""部署功能增强 v2 到 worklog 容器"""
import paramiko
import os

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

print('=== 部署功能增强 v2 ===\n')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)

sftp = ssh.open_sftp()

# 上传 index.html
print('[1/2] 上传 index.html...')
sftp.put(os.path.join(LOCAL_DIR, 'index.html'), '/tmp/index.html')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/index.html {CONTAINER_NAME}:/app/frontend/index.html')
stdout.read()
stderr.read()
print('✓ index.html 上传完成')

# 重启容器
print('[2/2] 重启容器...')
stdin, stdout, stderr = ssh.exec_command(f'docker restart {CONTAINER_NAME}')
stdout.read()
stderr.read()
print('✓ 容器重启完成')

import time
print('\n等待容器启动...')
time.sleep(3)

stdin, stdout, stderr = ssh.exec_command(f'docker ps --filter name={CONTAINER_NAME} --format "{{{{.Status}}}}"')
status = stdout.read().decode('utf-8').strip()
print(f'容器状态: {status}')

ssh.close()

print('\n✅ 部署完成！')
print('\n本次更新内容：')
print('1. 工单详情 - 显示收款记录明细（可新增收款）')
print('2. 客户列表 - 点击客户可查看详情面板')
print('3. 物料库存 - 添加库存流水查看功能')
print('4. 低库存预警 - 列表中高亮显示预警物料')
