import paramiko, os, time

HOST = '172.28.10.2'
USER = 'root'
PASS = 'feng1021'
REMOTE_PATH = '/vol1/1000/docker/work-log-system'
LOCAL_PATH = os.path.dirname(os.path.abspath(__file__))

print('=' * 60)
print('  NAS 部署 - worklog-system')
print('=' * 60)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)
print(f'✅ 已连接到 NAS: {HOST}')

def run(cmd, timeout=600):
    print(f'\n>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out: print(out[-1200:])
    if err: print('ERR:', err[-400:])
    return out

def mkdir_p(remote_path):
    dirs = remote_path.split('/')
    path = ''
    for d in dirs:
        if d:
            path += '/' + d
            try:
                sftp.stat(path)
            except:
                try:
                    sftp.mkdir(path)
                except:
                    pass

def upload_dir(local_dir, remote_dir):
    if not os.path.isdir(local_dir):
        mkdir_p(os.path.dirname(remote_dir))
        sftp.put(local_dir, remote_dir)
        return
    mkdir_p(remote_dir)
    for f in os.listdir(local_dir):
        lf = os.path.join(local_dir, f)
        rf = f'{remote_dir}/{f}'
        if os.path.isdir(lf):
            upload_dir(lf, rf)
        else:
            sftp.put(lf, rf)

# 备份旧前端
print('\n📦 备份旧前端...')
run(f'mv {REMOTE_PATH}/frontend {REMOTE_PATH}/frontend_bak_$(date +%Y%m%d_%H%M%S) 2>/dev/null; echo done')

# 上传代码
sftp = ssh.open_sftp()

print('\n📤 上传后端代码...')
upload_dir(os.path.join(LOCAL_PATH, 'backend'), f'{REMOTE_PATH}/backend')
sftp.put(os.path.join(LOCAL_PATH, 'run.py'), f'{REMOTE_PATH}/run.py')
sftp.put(os.path.join(LOCAL_PATH, 'Dockerfile.flask'), f'{REMOTE_PATH}/Dockerfile.flask')

# 上传docker-compose
if os.path.exists(os.path.join(LOCAL_PATH, 'docker-compose.yml')):
    sftp.put(os.path.join(LOCAL_PATH, 'docker-compose.yml'), f'{REMOTE_PATH}/docker-compose.yml')

print('📤 上传新前端 dist...')
upload_dir(os.path.join(LOCAL_PATH, 'frontend-vue', 'dist'), f'{REMOTE_PATH}/frontend-vue/dist')

sftp.close()
print('✅ 上传完成')

# 停止旧容器
print('\n🛑 停止旧容器...')
run(f'cd {REMOTE_PATH} && docker stop worklog && docker rm worklog 2>/dev/null; echo done')

# 重新构建镜像
print('\n🔨 重新构建Docker镜像 (约2-5分钟)...')
run(f'cd {REMOTE_PATH} && DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t worklog-flask:alpine3 . 2>&1 | tail -20', timeout=900)

# 启动容器
print('\n🚀 启动新容器...')
run(f'cd {REMOTE_PATH} && docker run -d --name worklog -p 8085:5000 '
    f'-v {REMOTE_PATH}/db:/app/data '
    f'-v {REMOTE_PATH}/uploads:/app/uploads '
    f'--restart unless-stopped '
    f'worklog-flask:alpine3')

# 等待启动
print('\n⏳ 等待服务启动...')
time.sleep(5)

# 检查状态
print('\n📊 容器状态:')
run('docker ps --filter name=worklog')

print('\n📝 最近日志:')
run('docker logs --tail=30 worklog')

ssh.close()
print('\n' + '=' * 60)
print('  ✅ 部署完成！')
print('  访问地址: http://172.28.10.2:8085/')
print('  默认账号: admin / admin123')
print('=' * 60)
