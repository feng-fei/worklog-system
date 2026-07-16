"""测试容器内 API 是否正常"""
import paramiko

NAS_IP = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER = 'worklog'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_IP, username=NAS_USER, password=NAS_PASS)

def exec_cmd(cmd):
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out.strip(), err.strip()

# 写一个测试脚本到容器内
test_script = '''
import urllib.request, json

def test_api(url, method='GET', data=None):
    try:
        headers = {'Content-Type': 'application/json'}
        body = json.dumps(data).encode() if data else None
        req = urllib.request.Request(f'http://localhost:5000{url}', data=body, headers=headers, method=method)
        resp = urllib.request.urlopen(req, timeout=5)
        result = json.loads(resp.read())
        return True, result
    except Exception as e:
        return False, str(e)

# 1. 测试 /api/test
ok, result = test_api('/api/test')
print(f'1. /api/test: {ok} - {result.get("message") if ok else result}')

# 2. 测试登录
ok, result = test_api('/api/auth/login', 'POST', {'username': 'admin', 'password': 'admin123'})
if ok and 'token' in result:
    token = result['token']
    print(f'2. /api/auth/login: 成功 - user: {result["user"].get("username")}, role: {result["user"].get("role")}')
else:
    print(f'2. /api/auth/login: 失败 - {result}')
    token = None

if token:
    # 3. 测试获取工单列表
    headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    req = urllib.request.Request('http://localhost:5000/api/records?page=1&per_page=5', headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        result = json.loads(resp.read())
        total = result.get('total', 0)
        print(f'3. /api/records: 成功 - 共 {total} 条记录')
    except Exception as e:
        print(f'3. /api/records: 失败 - {e}')

    # 4. 测试仪表盘
    req = urllib.request.Request('http://localhost:5000/api/dashboard', headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        result = json.loads(resp.read())
        print(f'4. /api/dashboard: 成功 - 今日工单: {result.get("today_count", 0)}')
    except Exception as e:
        print(f'4. /api/dashboard: 失败 - {e}')

    # 5. 测试客户列表
    req = urllib.request.Request('http://localhost:5000/api/customers?page=1&per_page=5', headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        result = json.loads(resp.read())
        print(f'5. /api/customers: 成功 - 共 {result.get("total", 0)} 个客户')
    except Exception as e:
        print(f'5. /api/customers: 失败 - {e}')

print('\\n所有测试完成!')
'''

# 将脚本写入临时文件
sftp = ssh.open_sftp()
sftp.open('/tmp/test_api.py', 'w').write(test_script)
sftp.close()

# 复制到容器并执行
exec_cmd(f'docker cp /tmp/test_api.py {CONTAINER}:/tmp/test_api.py')
out, err = exec_cmd(f'docker exec {CONTAINER} python3 /tmp/test_api.py')
print(out)
if err:
    print(f'错误: {err}')

ssh.close()
