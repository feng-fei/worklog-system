"""检查容器内数据库路径"""
import paramiko

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)

print('=== 查找数据库文件 ===')
stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} find /app -name "*.db" 2>/dev/null')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print('错误:', err)

print('\n=== 检查 instance 目录 ===')
stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} ls -la /app/instance/ 2>/dev/null || echo "instance dir not found"')
print(stdout.read().decode('utf-8'))

print('\n=== 检查 app 目录结构 ===')
stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} ls -la /app/ 2>/dev/null')
print(stdout.read().decode('utf-8'))

ssh.close()
