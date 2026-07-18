import requests, json

BASE = 'http://172.28.10.2:8085/api'

r = requests.post(f'{BASE}/auth/login', json={'username': 'admin', 'password': 'admin123'})
token = r.json().get('token', '')
headers = {'Authorization': f'Bearer {token}'}
print(f'✅ 登录成功，token长度: {len(token)}')

def test(name, path):
    try:
        r = requests.get(f'{BASE}{path}', headers=headers, timeout=10)
        d = r.json()
        success = d.get('success', r.status_code == 200)
        data = d.get('data', d)
        count = 0
        keys = list(data.keys()) if isinstance(data, dict) else str(type(data))
        if isinstance(data, dict):
            for k in ['records', 'items', 'backups', 'logs', 'list', 'templates', 'customers', 'staffs', 'salaries', 'expenses', 'payments']:
                if k in data and isinstance(data[k], list):
                    count = len(data[k])
        print(f'{"✅" if success else "❌"} {name}: status={r.status_code} keys={keys} count={count}')
        if not success:
            print(f'   msg: {d.get("error") or d.get("message") or str(d)[:200]}')
        return data
    except Exception as e:
        print(f'❌ {name}: EXCEPTION {e}')
        return None

print('\n=== 核心数据API ===')
stats = test('工作台', '/dashboard')
test('工单模板', '/templates?page=1&per_page=10')
test('支出列表', '/expenses?page=1&per_page=10')
test('收款列表', '/payments?page=1&per_page=10')
test('工资列表', '/salaries?page=1&per_page=10')
test('备份列表', '/backup/list')
test('操作日志', '/operation-logs?page=1&per_page=10')
test('客户列表', '/customers?page=1&per_page=5')
test('物料列表', '/materials?page=1&per_page=5')
test('工单列表(全部)', '/records?page=1&per_page=5')
test('工单列表(排除项目)', '/records?page=1&per_page=5&exclude_project=true')

print('\n=== 工作台数据详情 ===')
if isinstance(stats, dict):
    for k in ['recent_records', 'today_records', 'month_records', 'pending_count', 'records_today']:
        v = stats.get(k)
        if v is not None:
            print(f'  {k}: {len(v) if isinstance(v, list) else v}')
