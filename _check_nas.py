import paramiko

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_PROJECT_DIR = '/vol1/1000/docker/worklog-code/new-worklog-clean'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

print('检查项目目录文件:')
stdin, stdout, stderr = ssh.exec_command(f'ls -la {NAS_PROJECT_DIR}/')
print(stdout.read().decode())

print('\n检查docker-compose文件:')
stdin, stdout, stderr = ssh.exec_command(f'ls -la {NAS_PROJECT_DIR}/docker* 2>/dev/null || echo "No docker files found"')
print(stdout.read().decode())

print('\n检查容器详情:')
stdin, stdout, stderr = ssh.exec_command('docker inspect worklog --format "{{.Config.Image}} {{.Mounts}}" 2>&1')
print(stdout.read().decode())

print('\n检查容器内的代码是否更新:')
stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls -la /app/backend/__init__.py 2>&1')
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command('docker exec worklog grep -n "v3.8" /app/backend/__init__.py 2>&1 || echo "v3.8 not found"')
print('v3.8迁移检查:')
print(stdout.read().decode())

ssh.close()
