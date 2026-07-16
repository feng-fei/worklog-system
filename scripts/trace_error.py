"""查看容器日志找出500错误原因"""
import paramiko

NAS_IP = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER = 'worklog'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_IP, username=NAS_USER, password=NAS_PASS)

# 查看最近的错误日志
out, err = ssh.exec_command(f'docker logs {CONTAINER} --tail 50 2>&1')
print('=== 容器日志（最后50行） ===')
print(out.read().decode())

# 用Python直接测试有问题的接口
test_script = '''
import traceback
import urllib.request, json

def api_call(url, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(f'http://localhost:5000{url}', headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return True, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return False, body
    except Exception as e:
        return False, str(e)

# 登录
ok, result = api_call('/api/auth/login')
import urllib.error
data = json.dumps({'username': 'admin', 'password': 'admin123'}).encode()
req = urllib.request.Request('http://localhost:5000/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
token = json.loads(resp.read())['token']

# 测试仪表盘并看服务端错误
try:
    req = urllib.request.Request('http://localhost:5000/api/dashboard', headers={'Authorization': f'Bearer {token}'})
    resp = urllib.request.urlopen(req)
    print('仪表盘OK')
except Exception as e:
    print(f'仪表盘错误: {e}')

print('完成')
'''

sftp = ssh.open_sftp()
sftp.open('/tmp/trace_error.py', 'w').write(test_script)
sftp.close()

ssh.exec_command(f'docker cp /tmp/trace_error.py {CONTAINER}:/tmp/trace_error.py')
_, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER} python3 /tmp/trace_error.py 2>&1')
print('\n=== 错误追踪 ===')
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
