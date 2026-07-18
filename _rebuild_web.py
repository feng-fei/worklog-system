import paramiko
import time
from pathlib import Path

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_REMOTE_PATH = '/vol1/1000/docker/worklog-code/new-worklog0517/'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

def upload_dir(local_dir, remote_dir):
    sftp = ssh.open_sftp()
    local_path = Path(local_dir)
    for item in local_path.rglob('*'):
        if item.is_file():
            rel = item.relative_to(local_dir)
            remote_path = remote_dir + '/' + str(rel).replace('\\', '/')
            remote_parent = '/'.join(remote_path.split('/')[:-1])
            try:
                sftp.stat(remote_parent)
            except IOError:
                parts = remote_parent.split('/')
                cur = ''
                for part in parts:
                    if not part:
                        continue
                    cur += '/' + part
                    try:
                        sftp.stat(cur)
                    except IOError:
                        sftp.mkdir(cur)
            sftp.put(str(item), remote_path)
    sftp.close()

print('上传 Dockerfile.flask ...')
sftp = ssh.open_sftp()
sftp.put('Dockerfile.flask', NAS_REMOTE_PATH + 'Dockerfile.flask')
sftp.close()

print('上传后端代码 ...')
upload_dir('backend', NAS_REMOTE_PATH + 'backend')

print('上传 run.py ...')
sftp = ssh.open_sftp()
sftp.put('run.py', NAS_REMOTE_PATH + 'run.py')
sftp.close()

print('上传前端web dist目录 ...')
upload_dir('frontend-web/dist', NAS_REMOTE_PATH + 'frontend-web/dist')

print('上传旧版前端目录 ...')
upload_dir('frontend', NAS_REMOTE_PATH + 'frontend')

print('\n重新构建镜像（无缓存）...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_REMOTE_PATH} && DOCKER_BUILDKIT=0 docker build --no-cache -f Dockerfile.flask -t worklog-flask:alpine3 . 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line and ('Step' in line or 'Successfully' in line or 'error' in line.lower() or 'COPY' in line):
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

stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls -la /app/frontend-web/dist/ 2>&1')
print('容器内 frontend-web/dist 目录:')
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls /app/frontend-web/dist/assets/ | head -10 2>&1')
print('assets 目录样例:')
print(stdout.read().decode())

ssh.close()
print('\n✅ 部署完成!')
print(f'   访问地址: http://{NAS_HOST}:8085/')
