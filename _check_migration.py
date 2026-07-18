import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021', timeout=30)

print('容器完整启动日志:')
stdin, stdout, stderr = ssh.exec_command('docker logs worklog 2>&1')
logs = stdout.read().decode()
for line in logs.split('\n'):
    if 'v3.' in line or '✅' in line or '⚠️' in line or 'migration' in line.lower() or 'Column' in line or 'column' in line or 'fee_items' in line or 'is_invoiced' in line or 'Blueprints' in line:
        print(line)

ssh.close()
