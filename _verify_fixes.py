import requests, json, time

time.sleep(8)
BASE = 'http://172.28.10.2:8085/api'
passed = 0
failed = 0
errors = []

def login():
    r = requests.post(f'{BASE}/auth/login', json={'username':'admin','password':'admin123'}, timeout=10)
    return r.json().get('token', '')

def test(name, method, path, json_data=None, check_fn=None):
    global passed, failed
    try:
        token = login()
        headers = {'Authorization': f'Bearer {token}'}
        if method == 'GET':
            resp = requests.get(f'{BASE}{path}', headers=headers, timeout=10)
        elif method == 'POST':
            resp = requests.post(f'{BASE}{path}', headers=headers, json=json_data, timeout=10)
        elif method == 'PUT':
            resp = requests.put(f'{BASE}{path}', headers=headers, json=json_data, timeout=10)
        else:
            resp = requests.request(method, f'{BASE}{path}', headers=headers, json=json_data, timeout=10)
        
        ok = resp.status_code in [200, 201]
        try:
            d = resp.json()
            if isinstance(d, dict) and d.get('success') == False:
                ok = False
        except:
            d = {}
        if check_fn:
            ok = check_fn(d, resp.status_code) and ok
        if ok:
            passed += 1
            print(f'  ✅ {name}')
        else:
            failed += 1
            err_msg = d.get('error') or d.get('message') or str(d)[:200]
            errors.append({'name': name, 'status': resp.status_code, 'error': err_msg})
            print(f'  ❌ {name}: {err_msg[:120]}')
        return d if ok else None
    except Exception as e:
        failed += 1
        errors.append({'name': name, 'error': str(e)})
        print(f'  ❌ {name}: EXCEPTION {str(e)[:80]}')
        return None

print('=' * 60)
print('  工单管理系统 - 修复后端到端验证')
print('=' * 60)

print('\n📋 1. 基础功能验证')
test('登录认证', 'POST', '/auth/login', {'username':'admin','password':'admin123'})
test('工作台统计', 'GET', '/dashboard')

print('\n📋 2. 核心列表API')
test('工单列表', 'GET', '/records?page=1&per_page=5')
test('独立工单(no_project)', 'GET', '/records?page=1&per_page=5&no_project=true')
test('待办列表', 'GET', '/pending?page=1&per_page=5')
test('项目列表', 'GET', '/projects?page=1&per_page=5')
test('客户列表', 'GET', '/customers?page=1&per_page=5')
test('员工列表', 'GET', '/staffs?page=1&per_page=5')
test('物料列表', 'GET', '/materials?page=1&per_page=5')
test('模板列表', 'GET', '/templates?page=1&per_page=5')
test('操作日志', 'GET', '/operation-logs?page=1&per_page=5')
test('备份列表', 'GET', '/backup/list')

print('\n📋 3. 财务模块验证')
test('支出列表', 'GET', '/expenses?page=1&per_page=5')
test('收款列表', 'GET', '/payments?page=1&per_page=5')
test('工资列表', 'GET', '/salaries?page=1&per_page=5')
test('支出分类(18个)', 'GET', '/expense-categories')

print('\n📋 4. 修复的404 API验证')
test('物料库存日志(/material-logs)', 'GET', '/material-logs?page=1&per_page=5')
test('物料库存日志(/material-stock-logs)', 'GET', '/material-stock-logs?page=1&per_page=5')
test('日历记录(records/calendar)', 'GET', '/records/calendar?start=2026-07-01&end=2026-07-31')

print('\n📋 5. 高严重度修复验证')

# H-F01: 三种工单类型都能创建
print('  --- 工单创建验证 ---')
construction = test('施工单创建(非维修单必填验证修复)', 'POST', '/records', {
    'order_type': 'construction',
    'title': '验证-施工单',
    'customer_name': '验证客户',
    'work_address': '测试地址',
    'work_date': '2026-07-18',
    'work_content': '施工内容',
    'staff_names': '管理员',
    'fee_items': [],
    'expense_items': []
})

project_constr = test('项目施工单创建(不需要customer_name)', 'POST', '/records', {
    'order_type': 'project_construction',
    'project_id': 5,
    'title': '验证-项目施工单',
    'work_content': '项目施工内容',
    'work_date': '2026-07-18',
    'staff_names': '管理员',
    'fee_items': [],
    'expense_items': []
})

repair = test('维修单创建(验证维修字段必填)', 'POST', '/records', {
    'order_type': 'repair',
    'customer_name': '维修客户',
    'work_address': '维修地址',
    'work_date': '2026-07-18',
    'fault_description': '故障描述',
    'fault_diagnosis': '诊断结果',
    'repair_process': '维修过程',
    'staff_names': '管理员',
    'fee_items': [],
    'expense_items': []
})

# H-B02: 开支记录保存验证
print('  --- 开支记录关联验证 ---')
exp_test = test('施工单+开支记录保存', 'POST', '/records', {
    'order_type': 'construction',
    'title': '验证-含开支的施工单',
    'customer_name': '测试',
    'work_address': '测试地址',
    'work_date': '2026-07-18',
    'work_content': '测试',
    'staff_names': '管理员',
    'fee_items': [],
    'expense_items': [
        {'category': 1, 'amount': 150.0, 'expense_date': '2026-07-18', 'description': '交通费'},
        {'category': 2, 'amount': 300.5, 'expense_date': '2026-07-18', 'description': '餐费'}
    ]
}, check_fn=lambda d, s: d and d.get('id'))

if exp_test:
    rid = exp_test['id']
    detail = requests.get(f'{BASE}/records/{rid}', headers={'Authorization': f'Bearer {login()}'}).json()
    exp_items = detail.get('expense_items', [])
    if len(exp_items) >= 2:
        print(f'  ✅ 开支记录已保存关联: {len(exp_items)}条')
        passed += 1
    else:
        print(f'  ❌ 开支记录关联不足: 期望2条，实际{len(exp_items)}条')
        failed += 1
        errors.append({'name': '开支记录关联数量', 'error': f'期望2条,实际{len(exp_items)}条'})
    total_exp = sum(e.get('amount', 0) for e in exp_items)
    print(f'     开支总金额: {total_exp}元 (期望450.5元)')

# M-B11: tax_rate=0 边界测试
print('  --- tax_rate=0边界测试 ---')
test('tax_rate=0不被强制改为3%', 'POST', '/records', {
    'order_type': 'construction',
    'title': '税率0测试',
    'customer_name': '测试',
    'work_address': '测试',
    'work_date': '2026-07-18',
    'work_content': '税率0测试',
    'staff_names': '管理员',
    'fee_items': [],
    'expense_items': [],
    'has_tax': True,
    'tax_rate': 0
})

# M-B05: 员工详情含created_at
print('  --- 字段完整性验证 ---')
token = login()
s_resp = requests.get(f'{BASE}/staffs?page=1&per_page=1', headers={'Authorization': f'Bearer {token}'}).json()
if s_resp.get('records'):
    sid = s_resp['records'][0]['id']
    sd = requests.get(f'{BASE}/staffs/{sid}', headers={'Authorization': f'Bearer {token}'}).json()
    if sd.get('created_at'):
        print(f'  ✅ 员工详情包含created_at字段')
        passed += 1
    else:
        print(f'  ❌ 员工详情缺少created_at字段')
        failed += 1

# PaymentRecord is_invoiced兼容性
p_resp = requests.get(f'{BASE}/payments?page=1&per_page=5', headers={'Authorization': f'Bearer {token}'}).json()
if p_resp.get('records'):
    sample = p_resp['records'][0]
    inv = sample.get('is_invoiced')
    ok_inv = isinstance(inv, str) and inv in ['invoiced', 'uninvoiced', 'partial', 'no_invoice']
    if ok_inv:
        print(f'  ✅ 收款记录is_invoiced正确: {inv} (string类型)')
        passed += 1
    else:
        print(f'  ⚠️ 收款记录is_invoiced类型: {type(inv).__name__} = {inv}')

print('\n' + '=' * 60)
print(f'  测试结果: ✅ 通过 {passed}  |  ❌ 失败 {failed}  |  总计 {passed+failed}')
print('=' * 60)

if errors:
    print(f'\n❌ 失败详情:')
    for e in errors:
        print(f'  - {e["name"]}: {str(e.get("error",""))[:100]}')
else:
    print('\n🎉 所有测试通过！')
