import paramiko

HOST = '172.28.10.2'
USER = 'root'
PASS = 'feng1021'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    return out + err

# 检查NAS上的__init__.py最后部分
print('=== NAS上 __init__.py 最后30行 ===')
print(run('tail -30 /vol1/1000/docker/work-log-system/backend/__init__.py'))

print('\n=== 容器内 __init__.py 最后30行 ===')
print(run('docker exec worklog tail -30 /app/backend/__init__.py'))

ssh.close()
