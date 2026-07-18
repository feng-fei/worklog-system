import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021', timeout=30)

print('=== 验证容器状态 ===')
stdin, stdout, stderr = ssh.exec_command('docker ps --filter name=worklog --format "{{.Names}}: {{.Status}}"')
print(stdout.read().decode())

print('=== 检查index.html中的JS版本 ===')
stdin, stdout, stderr = ssh.exec_command('docker exec worklog grep -o "index-[A-Za-z0-9_]*\\.js" /app/frontend-web/dist/index.html | head -1')
print('当前index JS:', stdout.read().decode().strip())

print('=== 验证API ===')
stdin, stdout, stderr = ssh.exec_command('wget -qO- http://127.0.0.1:8085/api/test 2>&1')
print('API健康检查:', stdout.read().decode())

print('=== 检查数据库迁移是否执行 ===')
stdin, stdout, stderr = ssh.exec_command('docker logs worklog 2>&1 | grep -i "migrat\|v3\." | tail -10')
logs = stdout.read().decode()
if logs:
    print('迁移日志:')
    print(logs)
else:
    print('(无迁移日志或已完成)')

print('=== 容器最新日志 ===')
stdin, stdout, stderr = ssh.exec_command('docker logs worklog 2>&1 | tail -10')
print(stdout.read().decode())

ssh.close()
