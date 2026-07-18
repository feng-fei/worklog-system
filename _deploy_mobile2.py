import paramiko
import os
from pathlib import Path
import time

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_REMOTE_PATH = '/vol1/1000/docker/worklog-code/new-worklog0517/'

LOCAL_MOBILE_DIST = Path('frontend-mobile/dist')
LOCAL_STATIC_HANDLER = Path('backend/static_handler.py')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)
sftp = ssh.open_sftp()

# 1. 上传 frontend-mobile dist
remote_mobile_dir = NAS_REMOTE_PATH + 'frontend-mobile'
print(f'上传前端文件到 {remote_mobile_dir} ...')
try:
    sftp.stat(remote_mobile_dir)
except IOError:
    sftp.mkdir(remote_mobile_dir)

def upload_dir(local_dir, remote_dir):
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + '/' + item
        if os.path.isfile(local_path):
            sftp.put(local_path, remote_path)
        elif os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)
            except IOError:
                sftp.mkdir(remote_path)
            upload_dir(local_path, remote_path)

upload_dir(str(LOCAL_MOBILE_DIST), remote_mobile_dir)
print('  前端上传完成')

# 2. 上传 static_handler.py 到 backend/app/
remote_static_handler = NAS_REMOTE_PATH + 'backend/app/static_handler.py'
sftp.put(str(LOCAL_STATIC_HANDLER), remote_static_handler)
print(f'  static_handler.py 已上传')

sftp.close()

# 3. 重新构建 Docker 镜像
print('\n重新构建镜像...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_REMOTE_PATH} && DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t worklog-flask:alpine3 . 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line and ('Successfully' in line or 'error' in line.lower()):
        print(f'  {line}')

# 4. 重启容器
print('\n重启容器...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_REMOTE_PATH} && docker compose down && docker compose up -d 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line:
        print(f'  {line}')

time.sleep(5)

# 5. 验证
stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}" 2>&1')
print('\n容器状态:')
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls /app/frontend-mobile/ 2>&1')
print('容器内 frontend-mobile 目录:')
print(stdout.read().decode())

ssh.close()
print('\n部署完成!')
print(f'访问地址: http://{NAS_HOST}:8085/')
