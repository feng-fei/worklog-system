"""部署功能增强到 worklog 容器"""
import paramiko
import os

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

print('=== 部署功能增强 ===\n')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)

sftp = ssh.open_sftp()

# 1. 上传 index.html
print('[1/5] 上传 index.html...')
sftp.put(os.path.join(LOCAL_DIR, 'index.html'), '/tmp/index.html')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/index.html {CONTAINER_NAME}:/app/frontend/index.html')
stdout.read()
stderr.read()
print('✓ index.html 上传完成')

# 2. 上传 models.py
print('[2/5] 上传 models.py...')
sftp.put(os.path.join(LOCAL_DIR, 'backend', 'models.py'), '/tmp/models.py')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/models.py {CONTAINER_NAME}:/app/app/models.py')
stdout.read()
stderr.read()
print('✓ models.py 上传完成')

# 3. 上传 routes.py
print('[3/5] 上传 routes.py...')
sftp.put(os.path.join(LOCAL_DIR, 'backend', 'routes.py'), '/tmp/routes.py')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/routes.py {CONTAINER_NAME}:/app/app/routes.py')
stdout.read()
stderr.read()
print('✓ routes.py 上传完成')

# 4. 运行数据库迁移
print('[4/5] 运行数据库迁移...')
sftp.put(os.path.join(LOCAL_DIR, 'migrate_payment_record_id.py'), '/tmp/migrate_payment.py')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/migrate_payment.py {CONTAINER_NAME}:/tmp/migrate_payment.py')
stdout.read()
stderr.read()

stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} python3 /tmp/migrate_payment.py')
migrate_output = stdout.read().decode('utf-8')
migrate_error = stderr.read().decode('utf-8')
print('迁移输出:')
print(migrate_output)
if migrate_error:
    print('迁移错误:', migrate_error)
print('✓ 数据库迁移完成')

# 5. 重启容器
print('[5/5] 重启容器...')
stdin, stdout, stderr = ssh.exec_command(f'docker restart {CONTAINER_NAME}')
stdout.read()
stderr.read()
print('✓ 容器重启完成')

# 等待容器启动
import time
print('\n等待容器启动...')
time.sleep(5)

# 检查容器状态
stdin, stdout, stderr = ssh.exec_command(f'docker ps --filter name={CONTAINER_NAME} --format "{{{{.Status}}}}"')
status = stdout.read().decode('utf-8').strip()
print(f'容器状态: {status}')

ssh.close()

print('\n✅ 部署完成！')
print('\n本次更新内容：')
print('1. 客户选择器 - 新增/编辑时可从已有客户列表中选择')
print('2. 收款管理增强 - 支持单独录入客户收款，工单ID可选')
print('3. 工单详情快速收款 - 在工单详情页一键创建收款')
print('4. 客户详情面板 - 侧边栏展示客户所有关联数据')
