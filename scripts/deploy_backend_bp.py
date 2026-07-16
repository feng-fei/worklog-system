"""部署后端模块化代码到 Docker 容器"""
import paramiko, os, time

NAS_IP = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER = 'worklog'

LOCAL_BACKEND = r'c:\Users\Administrator\Documents\traework\backend'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_IP, username=NAS_USER, password=NAS_PASS)
sftp = ssh.open_sftp()


def upload(local_path, container_path):
    tmp = '/tmp/' + os.path.basename(local_path)
    sftp.put(local_path, tmp)
    stdin, stdout, stderr = ssh.exec_command(f'docker cp {tmp} {CONTAINER}:{container_path}')
    stdout.read()
    stderr.read()
    print(f'  上传: {os.path.basename(local_path)} -> {container_path}')


def exec_cmd(cmd):
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out.strip(), err.strip()


print('=== 部署后端模块化代码 ===\n')

# 1. 备份
print('1. 备份现有文件...')
exec_cmd(f'docker exec {CONTAINER} cp /app/app/utils.py /app/app/utils.py.backup_before_bp')
exec_cmd(f'docker exec {CONTAINER} cp /app/app/__init__.py /app/app/__init__.py.backup_before_bp')
print('   已备份')

# 2. 上传 utils.py
print('2. 上传 utils.py...')
upload(os.path.join(LOCAL_BACKEND, 'utils.py'), '/app/app/utils.py')

# 3. 创建 blueprints 目录
print('3. 创建 blueprints 目录...')
exec_cmd(f'docker exec {CONTAINER} mkdir -p /app/app/blueprints')

# 4. 上传所有蓝图文件
print('4. 上传蓝图文件...')
bp_dir = os.path.join(LOCAL_BACKEND, 'blueprints')
for f in sorted(os.listdir(bp_dir)):
    if f.endswith('.py'):
        upload(os.path.join(bp_dir, f), f'/app/app/blueprints/{f}')

# 5. 上传 __init__.py
print('5. 上传 __init__.py...')
upload(os.path.join(LOCAL_BACKEND, '__init__.py'), '/app/app/__init__.py')

# 6. 重启容器
print('\n6. 重启容器...')
exec_cmd(f'docker restart {CONTAINER}')
time.sleep(12)

# 7. 检查状态
print('7. 检查容器状态...')
status, _ = exec_cmd(f'docker ps --filter name={CONTAINER} --format "{{{{.Status}}}}"')
print(f'   状态: {status}')

# 8. 查看日志
print('\n8. 启动日志 (最后 40 行):')
logs, _ = exec_cmd(f'docker logs {CONTAINER} --tail 40 2>&1')
print(logs)

# 9. 测试登录 API
print('\n9. 测试登录 API...')
test_cmd = """python3 -c "
import urllib.request, json
data = json.dumps({'username': 'admin', 'password': 'admin123'}).encode()
req = urllib.request.Request('http://localhost:8085/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req, timeout=5)
    result = json.loads(resp.read())
    if 'token' in result:
        print('登录成功! user:', result['user'].get('username'))
    else:
        print('登录响应:', result)
except Exception as e:
    print('登录失败:', e)
"
"""
out, err = exec_cmd(f'docker exec {CONTAINER} sh -c \'{test_cmd}\'')
print(f'   {out}')
if err:
    print(f'   错误: {err}')

sftp.close()
ssh.close()
print('\n=== 部署完成 ===')
