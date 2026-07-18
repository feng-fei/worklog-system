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
            if 'node_modules' in str(item):
                continue
            rel = item.relative_to(local_path)
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

print('1. 上传 Dockerfile.flask ...')
sftp = ssh.open_sftp()
sftp.put('Dockerfile.flask', NAS_REMOTE_PATH + 'Dockerfile.flask')
sftp.close()

print('2. 上传后端代码 ...')
upload_dir('backend', NAS_REMOTE_PATH + 'backend')

print('3. 上传前端构建产物 (dist) ...')
import os
sftp = ssh.open_sftp()
dist_local = Path('frontend-web/dist')
dist_remote = NAS_REMOTE_PATH + 'frontend-web/dist'
for item in dist_local.rglob('*'):
    if item.is_file():
        rel = item.relative_to(dist_local)
        remote_path = dist_remote + '/' + str(rel).replace('\\', '/')
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

print('4. 停止并删除旧容器...')
stdin, stdout, stderr = ssh.exec_command('cd ' + NAS_REMOTE_PATH + ' && docker compose down 2>&1', get_pty=True)
print(stdout.read().decode())
time.sleep(2)
stdin, stdout, stderr = ssh.exec_command('docker rm -f worklog 2>&1', get_pty=True)
print(stdout.read().decode())

print('\n5. 重新构建镜像...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_REMOTE_PATH} && DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t worklog-flask:alpine3 . 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line:
        print(f'  {line}')

print('\n6. 启动容器...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_REMOTE_PATH} && docker compose up -d 2>&1',
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

stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls /app/frontend-web/dist/assets/ 2>&1 | head -10')
print('dist/assets 目录:')
print(stdout.read().decode())

ssh.close()
print('\n✅ 部署完成!')
print(f'   访问地址: http://{NAS_HOST}:8085/')
