import paramiko

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_REMOTE_PATH = '/vol1/1000/docker/worklog-code/new-worklog0517/'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

print('=== NAS 上 backend/ 目录结构 ===')
stdin, stdout, stderr = ssh.exec_command(f'find {NAS_REMOTE_PATH}backend -maxdepth 2 -type f -o -type d | sort')
print(stdout.read().decode())

print('=== NAS 上项目根目录文件 ===')
stdin, stdout, stderr = ssh.exec_command(f'ls -la {NAS_REMOTE_PATH}')
print(stdout.read().decode())

ssh.close()
