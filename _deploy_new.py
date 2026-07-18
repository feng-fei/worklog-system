import paramiko
import time
from pathlib import Path

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_PROJECT_DIR = '/vol1/1000/docker/worklog-code/new-worklog-clean'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

def upload_dir(local_dir, remote_dir, exclude_dirs=None, exclude_files=None):
    if exclude_dirs is None:
        exclude_dirs = {'__pycache__', 'node_modules', '.git', '.venv', 'venv'}
    if exclude_files is None:
        exclude_files = {'.DS_Store', '*.pyc'}

    sftp = ssh.open_sftp()
    local_path = Path(local_dir)
    count = 0
    for item in local_path.rglob('*'):
        if item.is_dir():
            if item.name in exclude_dirs:
                continue
        if item.is_file():
            if item.name in exclude_dirs:
                continue
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

print(f'在 NAS 上创建项目目录: {NAS_PROJECT_DIR}')
ssh.exec_command(f'mkdir -p {NAS_PROJECT_DIR}')

print('\n上传 Dockerfile.flask ...')
sftp = ssh.open_sftp()
sftp.put('Dockerfile.flask', f'{NAS_PROJECT_DIR}/Dockerfile.flask')
sftp.close()

print('上传 run.py ...')
sftp = ssh.open_sftp()
sftp.put('run.py', f'{NAS_PROJECT_DIR}/run.py')
sftp.close()

print('上传后端代码 (backend/) ...')
n = upload_dir('backend', f'{NAS_PROJECT_DIR}/backend')
print(f'  上传了 {n} 个文件')

print('上传新前端 (frontend-web/) ...')
n = upload_dir('frontend-web', f'{NAS_PROJECT_DIR}/frontend-web',
               exclude_dirs={'node_modules', '.git', 'dist_dev'})
print(f'  上传了 {n} 个文件')

print('上传旧前端 (frontend/) ...')
n = upload_dir('frontend', f'{NAS_PROJECT_DIR}/frontend')
print(f'  上传了 {n} 个文件')

print('\n=== NAS 上项目目录内容 ===')
stdin, stdout, stderr = ssh.exec_command(f'ls -la {NAS_PROJECT_DIR}/')
print(stdout.read().decode())

print('开始构建 Docker 镜像 (worklog-flask:new) ...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_PROJECT_DIR} && DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t worklog-flask:new . 2>&1',
    get_pty=True
)
for line in stdout:
    line = line.strip()
    if line:
        if 'Step' in line or 'Successfully' in line or 'error' in line.lower():
            print(f'  {line}')

print('\n停止旧容器 worklog ...')
stdin, stdout, stderr = ssh.exec_command('docker stop worklog 2>&1 && docker rename worklog worklog-old 2>&1')
print(stdout.read().decode())

print('用新镜像启动新容器 worklog ...')
stdin, stdout, stderr = ssh.exec_command(
    f'cd {NAS_PROJECT_DIR} && docker run -d --name worklog '
    f'-p 8085:5000 '
    f'-v /vol1/1000/docker/work-log-system/db:/app/data '
    f'-v /vol1/1000/docker/work-log-system/uploads:/app/uploads '
    f'-e USE_MODULAR_BLUEPRINTS=true '
    f'--restart unless-stopped '
    f'worklog-flask:new 2>&1'
)
print(stdout.read().decode())
print(stderr.read().decode())

time.sleep(10)

print('=== 容器状态 ===')
stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" 2>&1')
print(stdout.read().decode())

print('=== 容器日志 (最后 20 行) ===')
stdin, stdout, stderr = ssh.exec_command('docker logs worklog --tail 20 2>&1')
print(stdout.read().decode())

print('=== 测试 API ===')
stdin, stdout, stderr = ssh.exec_command('wget -q -O - http://127.0.0.1:8085/api/test 2>&1 || curl -s http://127.0.0.1:8085/api/test 2>&1')
print(stdout.read().decode())

ssh.close()
print('\n✅ 新容器部署完成!')
print('   访问地址: http://172.28.10.2:8085/')
print('   旧容器已重命名为 worklog-old，如需回滚可执行:')
print('   docker stop worklog && docker rm worklog && docker rename worklog-old worklog && docker start worklog')
