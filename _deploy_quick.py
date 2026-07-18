import paramiko
import os
from pathlib import Path
import time

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_REMOTE_PATH = '/vol1/1000/docker/worklog-code/new-worklog0517/'

LOCAL_MOBILE_DIST = Path('frontend-mobile/dist')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)
sftp = ssh.open_sftp()

remote_mobile_dir = NAS_REMOTE_PATH + 'frontend-mobile'
print(f'上传前端文件到 {remote_mobile_dir} ...')

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

sftp.close()

# 重启容器
print('\n重启容器...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_REMOTE_PATH} && docker restart worklog 2>&1',
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
print(f'移动端访问: http://{NAS_HOST}:8085/mobile/')
