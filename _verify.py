import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021', timeout=30)

print('=== 容器内时区和时间 ===')
stdin, stdout, stderr = ssh.exec_command('docker exec worklog date')
print('容器时间:', stdout.read().decode().strip())

print('\n=== 检查容器启动日志 ===')
stdin, stdout, stderr = ssh.exec_command('docker logs worklog 2>&1 | tail -20')
print(stdout.read().decode())

print('\n=== 测试API健康检查 ===')
stdin, stdout, stderr = ssh.exec_command('wget -qO- http://127.0.0.1:8085/api/test 2>&1')
print(stdout.read().decode())

ssh.close()
