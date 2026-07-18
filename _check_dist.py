import paramiko

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

# 查看容器里 dist/assets 的 index 文件
stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls /app/frontend-web/dist/assets/ | grep "index-"')
print('Container dist index files:')
print(stdout.read().decode())
print(stderr.read().decode())

# 查看一下 index.html 的内容，看看引用的是什么文件
stdin, stdout, stderr = ssh.exec_command('docker exec worklog cat /app/frontend-web/dist/index.html | grep -E "index-.*\\.(js|css)"')
print('\nindex.html references:')
print(stdout.read().decode())

ssh.close()
