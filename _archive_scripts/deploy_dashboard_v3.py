"""部署Dashboard V3 精致工业风 到 worklog 容器"""
import paramiko
import os

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

print('=== 部署 Dashboard V3 精致工业风 ===\n')

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
print('（按 Ctrl+F5 强制刷新缓存，CSS版本 v28）')
print('\n设计亮点：')
print('1. Hero 大卡片统领全局：青绿色渐变 + 光晕装饰')
print('2. 今日数据大字号展示 + 玻璃拟态财务卡片')
print('3. 快捷操作按钮：顶部彩条hover动效 + 图标缩放')
print('4. 数据卡片：渐变色图标 + 统一视觉节奏')
print('5. 预警卡片：右上角装饰圆 + 渐变背景')
print('6. 内容列表：自定义滚动条 + 列表项hover效果')
print('7. 完整暗色模式适配 + 响应式布局')
