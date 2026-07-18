import paramiko
import os
from pathlib import Path
import time

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_PROJECT_DIR = '/vol1/1000/docker/worklog-code/new-worklog-clean'
CONTAINER_NAME = 'worklog'
IMAGE_NAME = 'worklog-flask:alpine3'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

def upload_dir(local_dir, remote_dir, exclude_dirs=None):
    if exclude_dirs is None:
        exclude_dirs = {'__pycache__', 'node_modules', '.git', '.venv'}
    sftp = ssh.open_sftp()
    local_path = Path(local_dir)
    count = 0
    for item in local_path.rglob('*'):
        if item.is_dir() and item.name in exclude_dirs:
            continue
        if item.is_file():
            rel = item.relative_to(local_dir)
            parts = rel.parts
            skip = False
            for p in parts[:-1]:
                if p in exclude_dirs:
                    skip = True
                    break
            if skip:
                continue
            remote_path = remote_dir + '/' + str(rel).replace('\\', '/')
            remote_parent = '/'.join(remote_path.split('/')[:-1])
            try:
                sftp.stat(remote_parent)
            except IOError:
                parts_path = remote_parent.split('/')
                cur = ''
                for part in parts_path:
                    if not part:
                        continue
                    cur += '/' + part
                    try:
                        sftp.stat(cur)
                    except IOError:
                        sftp.mkdir(cur)
            sftp.put(str(item), remote_path)
            count += 1
    sftp.close()
    return count

print('='*60)
print('紧急修复后端部署')
print('='*60)

print('\n[1/5] 上传后端代码 (backend/) 和 Dockerfile...')
n = upload_dir('backend', f'{NAS_PROJECT_DIR}/backend')
print(f'  ✓ 上传了 {n} 个后端文件')

sftp = ssh.open_sftp()
sftp.put('Dockerfile.flask', f'{NAS_PROJECT_DIR}/Dockerfile.flask')
sftp.close()
print('  ✓ 上传了 Dockerfile.flask')

print('\n[2/5] 停止并删除旧容器...')
stdin, stdout, stderr = ssh.exec_command(f'docker stop {CONTAINER_NAME} && docker rm {CONTAINER_NAME} 2>&1', get_pty=True)
for line in stdout:
    line = line.strip()
    if line:
        print(f'  {line}')

print('\n[3/5] 删除旧镜像...')
stdin, stdout, stderr = ssh.exec_command(f'docker rmi {IMAGE_NAME} 2>&1', get_pty=True)
for line in stdout:
    line = line.strip()
    if line:
        print(f'  {line}')

print('\n[4/5] 重新构建镜像...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_PROJECT_DIR} && DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t {IMAGE_NAME} . 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line:
        if 'Step' in line or 'Successfully' in line or 'error' in line.lower() or 'writing image' in line or 'naming to' in line:
            print(f'  {line}')

print('\n[5/5] 启动新容器...')
stdin, stdout, stderr = ssh.exec_command(
    f'docker run -d --name {CONTAINER_NAME} --restart always '
    f'-p 8085:5000 '
    f'-v /vol1/1000/docker/work-log-system/db:/app/data '
    f'-v /vol1/1000/docker/work-log-system/uploads:/app/uploads '
    f'-e TZ=Asia/Shanghai '
    f'{IMAGE_NAME} 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line:
        print(f'  {line}')

print('\n等待容器启动...')
time.sleep(15)

stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1')
print('\n容器状态:')
print(stdout.read().decode())

print('\n检查容器内代码版本:')
stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} grep -n "v3.8" /app/backend/__init__.py 2>&1')
print(stdout.read().decode())

print('\n检查容器日志 (最近40行)...')
stdin, stdout, stderr = ssh.exec_command(f'docker logs --tail 40 {CONTAINER_NAME} 2>&1')
logs = stdout.read().decode()
print(logs)

ssh.close()
print('\n' + '='*60)
print('部署完成!')
print(f'访问地址: http://{NAS_HOST}:8085/')
print('='*60)
