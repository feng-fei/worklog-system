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

print('上传后端代码 ...')
upload_dir('backend', NAS_REMOTE_PATH + 'backend')

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
print('\n✅ 部署完成!')
