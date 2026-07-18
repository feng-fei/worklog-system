import paramiko
import time

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

BACKUP_DIR = '/app/data/backup_20260717'

print(f'创建备份目录 {BACKUP_DIR} ...')
stdin, stdout, stderr = ssh.exec_command(f'docker exec worklog mkdir -p {BACKUP_DIR}')
print(stdout.read().decode(), stderr.read().decode())

print('备份 /app/app/ (后端代码) ...')
stdin, stdout, stderr = ssh.exec_command(f'docker exec worklog cp -a /app/app {BACKUP_DIR}/app')
print(stdout.read().decode(), stderr.read().decode())

print('备份 /app/frontend/ (旧前端) ...')
stdin, stdout, stderr = ssh.exec_command(f'docker exec worklog cp -a /app/frontend {BACKUP_DIR}/frontend')
print(stdout.read().decode(), stderr.read().decode())

print('备份 /app/frontend-web/ (新前端) ...')
stdin, stdout, stderr = ssh.exec_command(f'docker exec worklog cp -a /app/frontend-web {BACKUP_DIR}/frontend-web')
print(stdout.read().decode(), stderr.read().decode())

print('备份 /app/run.py ...')
stdin, stdout, stderr = ssh.exec_command(f'docker exec worklog cp -a /app/run.py {BACKUP_DIR}/run.py')
print(stdout.read().decode(), stderr.read().decode())

print('\n备份完成，检查备份内容:')
stdin, stdout, stderr = ssh.exec_command(f'docker exec worklog ls -la {BACKUP_DIR}/')
print(stdout.read().decode())

print('备份目录大小:')
stdin, stdout, stderr = ssh.exec_command(f'docker exec worklog du -sh {BACKUP_DIR}/')
print(stdout.read().decode())

ssh.close()
print('\n✅ 备份完成！备份在容器内 /app/data/backup_20260717/')
print('   对应宿主机路径: /vol1/1000/docker/work-log-system/db/backup_20260717/')
