"""执行数据库迁移"""
import paramiko
import os

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

print('=== 执行数据库迁移 ===\n')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)

sftp = ssh.open_sftp()

# 上传迁移脚本
print('[1/2] 上传迁移脚本...')
sftp.put(os.path.join(LOCAL_DIR, 'migrate_payment_record_id_v2.py'), '/tmp/migrate_payment.py')
stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/migrate_payment.py {CONTAINER_NAME}:/tmp/migrate_payment.py')
stdout.read()
stderr.read()
print('✓ 迁移脚本上传完成')

# 执行迁移
print('\n[2/2] 执行数据库迁移...')
stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} python3 /tmp/migrate_payment.py')
output = stdout.read().decode('utf-8')
error = stderr.read().decode('utf-8')
print(output)
if error:
    print('错误输出:', error)

print('\n✓ 迁移执行完成')

ssh.close()
print('\n✅ 数据库迁移完成！')
