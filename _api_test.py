import requests, json, traceback

BASE = 'http://172.28.10.2:8085/api'
results = []

def test(name, method, path, json_data=None, expected_keys=None):
    try:
        r = requests.post(f'{BASE}/auth/login', json={'username': 'admin', 'password': 'admin123'}, timeout=10)
        token = r.json().get('token', '')
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        
        if method == 'GET':
            resp = requests.get(f'{BASE}{path}', headers=headers, timeout=10)
        elif method == 'POST':
            resp = requests.post(f'{BASE}{path}', headers=headers, json=json_data, timeout=10)
        else:
            resp = requests.request(method, f'{BASE}{path}', headers=headers, json=json_data, timeout=10)
        
        d = resp.json()
        success = d.get('success', resp.status_code == 200)
        data = d.get('data', d)
        record_count = 0
        missing_keys = []
        
        if isinstance(data, dict):
            for key in ['records', 'items', 'list', 'backups', 'logs', 'templates', 'customers', 'staffs']:
                if key in data and isinstance(data[key], list):
                    record_count = len(data[key])
            if expected_keys:
                for k in expected_keys:
                    if k not in data:
                        missing_keys.append(k)
        
        status = '✅' if success and not missing_keys else '⚠️' if success else '❌'
        result = {
            'name': name, 'path': path, 'status': status,
            'http_status': resp.status_code, 'success': success,
            'count': record_count, 'missing_keys': missing_keys,
            'error': d.get('error') or d.get('message') if not success else None
        }
        results.append(result)
        print(f"{status} {name}: {path} (count={record_count})")
        if missing_keys:
            print(f"   缺少字段: {missing_keys}")
        if result['error']:
            print(f"   错误: {result['error'][:100]}")
        return data
    except Exception as e:
        results.append({'name': name, 'path': path, 'status': '❌', 'error': str(e)})
        print(f"❌ {name}: EXCEPTION {e}")
        return None

print('=== API 端到端测试 ===\n')

# 1. 认证
test('登录', 'POST', '/auth/login', {'username': 'admin', 'password': 'admin123'})

# 2. Dashboard
test('工作台统计', 'GET', '/dashboard')

# 3. 工单
test('工单列表', 'GET', '/records?page=1&per_page=5')
test('工单列表(独立)', 'GET', '/records?page=1&per_page=5&no_project=true')
records = test('工单列表(含项目)', 'GET', '/records?page=1&per_page=5')
if records and records.get('records'):
    rid = records['records'][0]['id']
    test(f'工单详情#{rid}', 'GET', f'/records/{rid}')

# 4. 待办事项
test('待办列表', 'GET', '/pending?page=1&per_page=5')

# 5. 项目
test('项目列表', 'GET', '/projects?page=1&per_page=5')
projects = test('项目列表2', 'GET', '/projects?page=1&per_page=5')
if projects and projects.get('records'):
    pid = projects['records'][0]['id']
    test(f'项目详情#{pid}', 'GET', f'/projects/{pid}')
    test(f'项目工单#{pid}', 'GET', f'/projects/{pid}/records')

# 6. 客户
test('客户列表', 'GET', '/customers?page=1&per_page=5')
customers = test('客户列表2', 'GET', '/customers?page=1&per_page=5')
if customers and customers.get('records'):
    cid = customers['records'][0]['id']
    test(f'客户详情#{cid}', 'GET', f'/customers/{cid}')

# 7. 员工
test('员工列表', 'GET', '/staffs?page=1&per_page=5')
staffs = test('员工列表2', 'GET', '/staffs?page=1&per_page=5')
if staffs and staffs.get('records'):
    sid = staffs['records'][0]['id']
    test(f'员工详情#{sid}', 'GET', f'/staffs/{sid}')

# 8. 物料
test('物料列表', 'GET', '/materials?page=1&per_page=5')
materials = test('物料列表2', 'GET', '/materials?page=1&per_page=5')
if materials and materials.get('records'):
    mid = materials['records'][0]['id']
    test(f'物料详情#{mid}', 'GET', f'/materials/{mid}')
test('物料库存日志', 'GET', '/material-logs?page=1&per_page=5')

# 9. 财务
test('支出列表', 'GET', '/expenses?page=1&per_page=5')
test('收款列表', 'GET', '/payments?page=1&per_page=5')
test('工资列表', 'GET', '/salaries?page=1&per_page=5')
test('支出分类', 'GET', '/expense-categories')

# 10. 工单模板
test('工单模板列表', 'GET', '/templates?page=1&per_page=5')

# 11. 系统管理
test('操作日志', 'GET', '/operation-logs?page=1&per_page=5')
test('数据备份列表', 'GET', '/backup/list')
test('日历记录', 'GET', '/records/calendar?start=2026-07-01&end=2026-07-31')

# 12. 测试创建工单（维修单）- 验证表单验证问题
test_data = {
    'order_type': 'construction',
    'title': 'API测试工单',
    'customer_name': '测试客户',
    'work_address': '测试地址',
    'work_date': '2026-07-18',
    'work_content': '测试施工内容',
    'staff_names': '管理员',
    'fee_items': [],
    'expense_items': []
}
test('创建施工单(最小字段)', 'POST', '/records', test_data)

# 13. 测试工资API路径
test('工资API(/salaries)', 'GET', '/salaries?page=1&per_page=5')
test('工资API(/finance/salaries)', 'GET', '/finance/salaries?page=1&per_page=5')

print('\n=== 测试总结 ===')
passed = sum(1 for r in results if r['status'] == '✅')
warned = sum(1 for r in results if r['status'] == '⚠️')
failed = sum(1 for r in results if r['status'] == '❌')
print(f'通过: {passed}, 警告: {warned}, 失败: {failed}, 总计: {len(results)}')
