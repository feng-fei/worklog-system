"""部署Dashboard美化到 worklog 容器"""
import paramiko
import os

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

print('=== 部署 Dashboard 美化 ===\n')

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

# 上传 style-app.css
print('[2/2] 上传 style-app.css...')
sftp.put(os.path.join(LOCAL_DIR, 'style-app.css'), '/tmp/style-app.css')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/style-app.css {CONTAINER_NAME}:/app/frontend/style-app.css')
stdout.read()
stderr.read()
print('✓ style-app.css 上传完成')

ssh.close()

print('\n✅ 部署完成！')
print('\n访问地址: http://172.28.10.2:8085/')
print('（按 Ctrl+F5 强制刷新缓存，CSS版本 v26）')
print('\n本次更新内容：')
print('1. Dashboard按功能权重重新排序')
print('2. 核心财务数据（收入/支出/利润）大卡片展示，最显眼')
print('3. 今日业务、预警提醒分类展示')
print('4. 每个卡片有独立的颜色主题和图标')
print('5. 快捷操作区美化')
print('6. 内容卡片hover动效')
print('7. 支持暗色模式自动适配')
print('8. 移动端响应式适配')
