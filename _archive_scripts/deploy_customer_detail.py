"""部署客户详情美化到 worklog 容器"""
import paramiko
import os

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

print('=== 部署客户详情美化 ===\n')

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
print('1. 客户详情卡片全新设计 - 渐变头部 + 圆形头像')
print('2. 美化统计卡片 - 图标 + 数字 + 四色主题')
print('3. 列表项优化 - 圆点指示 + 标题 + 描述 + 金额')
print('4. 底部固定快捷收款按钮')
print('5. 移动端全屏适配')
