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

def upload_file(local_path, remote_path):
    sftp = ssh.open_sftp()
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
    sftp.put(local_path, remote_path)
    sftp.close()

def upload_dir(local_dir, remote_dir, skip_dirs=None):
    if skip_dirs is None:
        skip_dirs = []
    sftp = ssh.open_sftp()
    local_path = Path(local_dir)
    for item in local_path.rglob('*'):
        if item.is_file():
            skip = False
            for sd in skip_dirs:
                if sd in str(item).replace('\\', '/'):
                    skip = True
                    break
            if skip:
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

print('1. 上传 Dockerfile.flask 和 run.py ...')
upload_file('Dockerfile.flask', NAS_REMOTE_PATH + 'Dockerfile.flask')
upload_file('run.py', NAS_REMOTE_PATH + 'run.py')

print('2. 上传后端代码 ...')
upload_dir('backend', NAS_REMOTE_PATH + 'backend', skip_dirs=['__pycache__', '.pytest_cache'])

print('3. 清理并上传前端构建产物 ...')
sftp = ssh.open_sftp()
import stat
def rm_r(path):
    try:
        files = sftp.listdir_attr(path)
        for f in files:
            full = path + '/' + f.filename
            if stat.S_ISDIR(f.st_mode):
                rm_r(full)
            else:
                sftp.remove(full)
        sftp.rmdir(path)
    except IOError:
        pass
try:
    rm_r(NAS_REMOTE_PATH + 'frontend-web/dist')
except:
    pass
sftp.close()
upload_dir('frontend-web/dist', NAS_REMOTE_PATH + 'frontend-web/dist')

print('4. 停止并删除旧容器...')
stdin, stdout, stderr = ssh.exec_command(f'cd {NAS_REMOTE_PATH} && docker compose down 2>&1', get_pty=True)
print(stdout.read().decode())
time.sleep(2)
stdin, stdout, stderr = ssh.exec_command('docker rm -f worklog 2>&1', get_pty=True)
print(stdout.read().decode())

print('\n5. 重新构建镜像（使用缓存）...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_REMOTE_PATH} && DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t worklog-flask:alpine3 . 2>&1',
    get_pty=True
)
build_success = False
for line in stdout:
    line = line.strip()
    if line:
        print(f'  {line}')
        if 'Successfully built' in line or 'Successfully tagged' in line:
            build_success = True

if not build_success:
    print('\n⚠️  使用缓存构建可能失败，尝试--no-cache...')
    stdin, stdout, stderr = ssh.exec_command(
        f'cd {NAS_REMOTE_PATH} && DOCKER_BUILDKIT=0 docker build --no-cache -f Dockerfile.flask -t worklog-flask:alpine3 . 2>&1',
        get_pty=True
    )
    for line in stdout:
        line = line.strip()
        if line:
            print(f'  {line}')
            if 'Successfully built' in line or 'Successfully tagged' in line:
                build_success = True

print('\n6. 启动容器...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_REMOTE_PATH} && docker compose up -d 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line:
        print(f'  {line}')

time.sleep(10)

stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}" 2>&1')
print('\n容器状态:')
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls /app/frontend-web/dist/assets/ 2>&1 | tail -10')
print('最新dist/assets文件:')
print(stdout.read().decode())

# Check for new hash
stdin, stdout, stderr = ssh.exec_command('docker exec worklog cat /app/frontend-web/dist/index.html 2>&1 | head -20')
html_content = stdout.read().decode()
if 'CVI0G4SE' in html_content or 'Byw7d5Om' in html_content:
    print('✅ 最新前端版本已部署!')
else:
    print('⚠️  检查前端版本...')

ssh.close()
print(f'\n✅ 部署完成!')
print(f'   访问地址: http://{NAS_HOST}:8085/')
