import paramiko

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_REMOTE_PATH = '/vol1/1000/docker/worklog-code/new-worklog0517/'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

print('=== docker-compose.yml ===')
stdin, stdout, stderr = ssh.exec_command(f'cat {NAS_REMOTE_PATH}docker-compose.yml')
print(stdout.read().decode())

print('=== 容器挂载的卷 ===')
stdin, stdout, stderr = ssh.exec_command('docker inspect worklog --format "{{json .Mounts}}" 2>&1 | python3 -m json.tool 2>&1 || docker inspect worklog --format "{{.Mounts}}"')
print(stdout.read().decode())

print('=== 容器内 /app 目录 ===')
stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls -la /app/')
print(stdout.read().decode())

ssh.close()
