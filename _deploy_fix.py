import paramiko
import os
from pathlib import Path
import time

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_PROJECT_DIR = '/vol1/1000/docker/worklog-code/new-worklog-clean'
CONTAINER_NAME = 'worklog'

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
            rel = item.relative_to(local_path)
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

print('上传后端代码 (backend/) ...')
n = upload_dir('backend', f'{NAS_PROJECT_DIR}/backend')
print(f'  上传了 {n} 个文件')

print('\n上传前端 dist (frontend-web/dist/) ...')
n = upload_dir('frontend-web/dist', f'{NAS_PROJECT_DIR}/frontend-web/dist')
print(f'  上传了 {n} 个文件')

print('\n重启容器...')
stdin, stdout, stderr = ssh.exec_command(
    f'docker restart {CONTAINER_NAME} 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line:
        print(f'  {line}')

time.sleep(5)

stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}" 2>&1')
print('\n容器状态:')
print(stdout.read().decode())

ssh.close()
print('\n部署完成!')
print(f'访问地址: http://{NAS_HOST}:8085/')
