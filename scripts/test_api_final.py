"""验证更多 API 接口"""
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

result = api_call('/api/auth/login', 'POST', {'username': 'admin', 'password': 'admin123'})
token = result['token']

# 模板列表
templates = api_call('/api/templates', token=token)
print(f'模板列表: {len(templates) if isinstance(templates, list) else templates.get("total")} 个')

# 统计
stats = api_call('/api/statistics', token=token)
print(f'统计数据: {len(stats)} 个字段 - keys: {list(stats.keys())[:8]}...')

# 系统设置
settings = api_call('/api/settings', token=token)
print(f'系统设置: {len(settings)} 个配置项')

# 通知
notifications = api_call('/api/notifications', token=token)
n_total = len(notifications) if isinstance(notifications, list) else notifications.get('total', 0)
print(f'通知列表: {n_total} 条')

# 操作日志
oplogs = api_call('/api/operation-logs?page=1&per_page=5', token=token)
print(f'操作日志: 共 {oplogs.get("total", 0)} 条')

# 工资列表
salaries = api_call('/api/salaries?page=1&per_page=5', token=token)
print(f'工资列表: 共 {salaries.get("total", 0)} 条')

# 支出分类
cats = api_call('/api/expense-categories', token=token)
print(f'支出分类: {len(cats) if isinstance(cats, list) else cats.get("total")} 个')

# 客户设备
eqs = api_call('/api/customer-equipments?page=1&per_page=5', token=token)
print(f'客户设备: {len(eqs) if isinstance(eqs, list) else eqs.get("total")} 台')

# 巡检计划
plans = api_call('/api/maintenance-plans?page=1&per_page=5', token=token)
print(f'巡检计划: {len(plans) if isinstance(plans, list) else plans.get("total")} 个')

# 仪表盘
dash = api_call('/api/dashboard', token=token)
print(f'仪表盘: {len(dash)} 个字段')

# 日历
cal = api_call('/api/calendar?year=2026&month=7', token=token)
print(f'日历数据: {len(cal)} 天有记录')

# 导出记录 (不下载，只看是否返回)
print('\\n核心 API 全部正常!')
'''

sftp = ssh.open_sftp()
sftp.open('/tmp/test_api3.py', 'w').write(test_script)
sftp.close()

exec_cmd(f'docker cp /tmp/test_api3.py {CONTAINER}:/tmp/test_api3.py')
out, err = exec_cmd(f'docker exec {CONTAINER} python3 /tmp/test_api3.py')
print(out)
if err:
    print(f'错误: {err}')

ssh.close()
