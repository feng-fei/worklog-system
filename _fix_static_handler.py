import paramiko
import time

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_REMOTE_PATH = '/vol1/1000/docker/worklog-code/new-worklog0517/'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

sftp = ssh.open_sftp()
sftp.put('backend/static_handler.py', NAS_REMOTE_PATH + 'backend/app/static_handler.py')
sftp.close()
print('static_handler.py 已上传到 backend/app/')

print('\n重新构建镜像...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_REMOTE_PATH} && DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t worklog-flask:alpine3 . 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line and ('Step' in line or 'Successfully' in line or 'error' in line.lower()):
        print(f'  {line}')

print('\n重启容器...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_REMOTE_PATH} && docker compose down && docker compose up -d 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line:
        print(f'  {line}')

time.sleep(8)

stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}" 2>&1')
print('\n容器状态:')
print(stdout.read().decode())

ssh.close()
print('\n✅ 完成!')
