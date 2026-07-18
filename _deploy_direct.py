import paramiko
import os
from pathlib import Path
import time

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

def upload_dir_to_container(local_dir, container_dir):
    sftp = ssh.open_sftp()
    local_path = Path(local_dir)
    remote_tmp = f'/tmp/dist_upload_{int(time.time())}'
    sftp.mkdir(remote_tmp)
    count = 0
    for item in local_path.rglob('*'):
        if item.is_file():
            rel = item.relative_to(local_path)
            remote_path = remote_tmp + '/' + str(rel).replace('\\', '/')
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
    
    stdin, stdout, stderr = ssh.exec_command(
        f'docker cp {remote_tmp}/. {CONTAINER_NAME}:{container_dir} && rm -rf {remote_tmp}'
    )
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print('Error:', err)
    return count

print('上传前端 dist 到容器...')
n = upload_dir_to_container('frontend-web/dist', '/app/frontend-web/dist')
print(f'  上传了 {n} 个文件')

print('\n上传后端代码到容器...')
sftp = ssh.open_sftp()
backend_tmp = f'/tmp/backend_upload_{int(time.time())}'
sftp.mkdir(backend_tmp)
local_backend = Path('backend')
count = 0
for item in local_backend.rglob('*'):
    if item.is_file() and '__pycache__' not in str(item):
        rel = item.relative_to(local_backend)
        remote_path = backend_tmp + '/' + str(rel).replace('\\', '/')
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
print(f'  上传了 {count} 个文件')

stdin, stdout, stderr = ssh.exec_command(
    f'docker cp {backend_tmp}/. {CONTAINER_NAME}:/app/backend/ && rm -rf {backend_tmp}'
)
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print('Error:', err)

print('\n重启容器...')
stdin, stdout, stderr = ssh.exec_command(f'docker restart {CONTAINER_NAME}')
print(stdout.read().decode())

time.sleep(3)

stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}"')
print('\n容器状态:')
print(stdout.read().decode())

ssh.close()
print('\n完成!')
