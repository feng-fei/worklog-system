import paramiko

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

print('容器内 /app 目录结构:')
stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls -la /app/')
print(stdout.read().decode())

print('容器内 /app/app 目录:')
stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls -la /app/app/ 2>&1')
print(stdout.read().decode())

print('查找 static_handler.py:')
stdin, stdout, stderr = ssh.exec_command('docker exec worklog find /app -name "static_handler.py" 2>&1')
print(stdout.read().decode())

print('查找 run.py:')
stdin, stdout, stderr = ssh.exec_command('docker exec worklog find /app -name "run.py" 2>&1')
print(stdout.read().decode())

ssh.close()
