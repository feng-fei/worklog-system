import paramiko

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

# 检查容器里的目录结构
stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls -la /app/frontend-web/')
print('frontend-web 根目录:')
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls -la /app/frontend-web/dist/ 2>&1')
print('frontend-web/dist 目录:')
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls /app/frontend-web/dist/assets/ 2>&1 | head -5')
print('dist/assets 样例:')
print(stdout.read().decode())

# 看看之前的 mobile 是怎么弄的... 等等，现在已经没有 mobile 目录了
# 检查 static_handler 里的路径

ssh.close()
