import paramiko, time

HOST = '172.28.10.2'
USER = 'root'
PASS = 'wz0516@.'
REMOTE_PATH = '/new-worklog0517/'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd, timeout=300):
    print(f'>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out: print(out[-500:])
    if err: print('ERR:', err[-200:])
    return out

run(f'cd {REMOTE_PATH} && docker stop worklog && docker rm worklog 2>/dev/null; echo done')
run(f'cd {REMOTE_PATH} && DOCKER_BUILDKIT=0 docker build --no-cache -f Dockerfile.flask -t worklog-flask:alpine3 . 2>&1 | tail -20', timeout=600)
run(f'cd {REMOTE_PATH} && docker compose up -d 2>&1')
time.sleep(3)
run('docker ps --filter name=worklog')
run('docker exec worklog ls /app/frontend-web/dist/assets/ | grep index')
ssh.close()
print('\n✅ 强制重建部署完成')
