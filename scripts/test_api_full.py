"""验证客户列表 API 和更多接口"""
import paramiko, json

NAS_IP = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER = 'worklog'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_IP, username=NAS_USER, password=NAS_PASS)

def exec_cmd(cmd):
    _, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode().strip(), stderr.read().decode().strip()

test_script = '''
import urllib.request, json

def api_call(url, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(f'http://localhost:5000{url}', data=body, headers=headers, method=method)
    resp = urllib.request.urlopen(req, timeout=5)
    return json.loads(resp.read())

# 登录
result = api_call('/api/auth/login', 'POST', {'username': 'admin', 'password': 'admin123'})
token = result['token']
print(f'登录成功: {result["user"]["username"]}')

# 测试客户列表
customers = api_call('/api/customers', token=token)
print(f'客户列表: {len(customers)} 个客户 (返回 list 格式，正常)')

# 测试员工列表
staffs = api_call('/api/staffs', token=token)
if isinstance(staffs, list):
    print(f'员工列表: {len(staffs)} 人')
else:
    print(f'员工列表: {staffs.get("total", 0)} 人 (分页格式)')

# 测试收款列表
payments = api_call('/api/payments?page=1&per_page=5', token=token)
print(f'收款列表: 共 {payments.get("total", 0)} 条')

# 测试支出列表
expenses = api_call('/api/expenses?page=1&per_page=5', token=token)
print(f'支出列表: 共 {expenses.get("total", 0)} 条')

# 测试待办列表
pending = api_call('/api/pending?page=1&per_page=5', token=token)
print(f'待办列表: 共 {pending.get("total", 0)} 条')

# 测试物料列表
materials = api_call('/api/materials?page=1&per_page=5', token=token)
print(f'物料列表: 共 {materials.get("total", 0)} 种')

# 测试项目列表
projects = api_call('/api/projects?page=1&per_page=5', token=token)
print(f'项目列表: 共 {projects.get("total", 0)} 个')

# 测试模板列表
templates = api_call('/api/templates?page=1&per_page=5', token=token)
print(f'模板列表: 共 {templates.get("total", 0)} 个')

# 测试统计
stats = api_call('/api/statistics', token=token)
print(f'统计数据: 包含 {len(stats)} 个字段')

# 测试系统设置
settings = api_call('/api/settings', token=token)
print(f'系统设置: 包含 {len(settings)} 个配置项')

# 测试通知
notifications = api_call('/api/notifications?page=1&per_page=5', token=token)
if isinstance(notifications, dict):
    print(f'通知列表: 共 {notifications.get("total", 0)} 条')
else:
    print(f'通知列表: {len(notifications)} 条')

# 测试操作日志
oplogs = api_call('/api/operation-logs?page=1&per_page=5', token=token)
print(f'操作日志: 共 {oplogs.get("total", 0)} 条')

print('\\n✅ 所有核心 API 测试通过!')
'''

sftp = ssh.open_sftp()
sftp.open('/tmp/test_api2.py', 'w').write(test_script)
sftp.close()

exec_cmd(f'docker cp /tmp/test_api2.py {CONTAINER}:/tmp/test_api2.py')
out, err = exec_cmd(f'docker exec {CONTAINER} python3 /tmp/test_api2.py')
print(out)
if err:
    print(f'错误: {err}')

ssh.close()
