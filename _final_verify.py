import requests, json, time
time.sleep(8)
BASE = 'http://172.28.10.2:8085/api'

def login():
    r = requests.post(f'{BASE}/auth/login', json={'username':'admin','password':'admin123'}, timeout=10)
    return r.json().get('token', '')

passed = 0
failed = 0

def test(name, method, path, json_data=None, check=None):
    global passed, failed
    token = login()
    headers = {'Authorization': f'Bearer {token}'}
    try:
        if method == 'GET':
            r = requests.get(f'{BASE}{path}', headers=headers, timeout=10)
        else:
            r = requests.post(f'{BASE}{path}', headers=headers, json=json_data, timeout=10)
        ok = r.status_code in [200, 201]
        d = r.json() if r.headers.get('content-type','').startswith('application/json') else {}
        if isinstance(d, dict) and d.get('success') == False:
            ok = False
        if check: ok = check(d, r.status_code) and ok
        if ok:
            passed += 1
            print(f'✅ {name}')
        else:
            failed += 1
            err = d.get('error') or d.get('message') or str(d)[:100]
            print(f'❌ {name}: {err}')
        return d if ok else None
    except Exception as e:
        failed += 1
        print(f'❌ {name}: {e}')
        return None

print('='*55)
print('  最终验证测试')
print('='*55)

# 核心功能
print('\n📌 核心功能')
test('登录', 'POST', '/auth/login', {'username':'admin','password':'admin123'})
test('工作台', 'GET', '/dashboard')
test('工单列表', 'GET', '/records?page=1&per_page=3')
test('项目列表', 'GET', '/projects?page=1&per_page=3')
test('客户列表', 'GET', '/customers?page=1&per_page=3')
test('员工列表', 'GET', '/staffs?page=1&per_page=3')
test('物料列表', 'GET', '/materials?page=1&per_page=3')
test('支出列表', 'GET', '/expenses?page=1&per_page=3')
test('收款列表', 'GET', '/payments?page=1&per_page=3')
test('工资列表', 'GET', '/salaries?page=1&per_page=3')

# 三种工单创建（核心H-F01修复）
print('\n📌 三种工单类型创建')
test('施工单创建', 'POST', '/records', {
    'order_type':'construction','title':'最终验证-施工单',
    'customer_name':'测试客户','work_address':'测试地址',
    'work_date':'2026-07-18','work_content':'测试施工',
    'staff_names':'管理员','fee_items':[],'expense_items':[]
})
test('项目施工单创建(不需要客户名)', 'POST', '/records', {
    'order_type':'project_construction','project_id':5,
    'title':'最终验证-项目施工单','work_content':'项目施工',
    'work_date':'2026-07-18','staff_names':'管理员',
    'fee_items':[],'expense_items':[]
})
test('维修单创建', 'POST', '/records', {
    'order_type':'repair','customer_name':'维修客户','work_address':'维修地址',
    'work_date':'2026-07-18','fault_description':'故障描述',
    'fault_diagnosis':'诊断','repair_process':'维修',
    'staff_names':'管理员','fee_items':[],'expense_items':[]
})

# 开支记录保存验证（H-B02修复）
print('\n📌 开支记录关联')
exp_r = test('带开支记录的工单创建', 'POST', '/records', {
    'order_type':'construction','title':'开支记录最终验证',
    'customer_name':'测试','work_address':'测试地址',
    'work_date':'2026-07-18','work_content':'开支测试',
    'staff_names':'管理员','fee_items':[],
    'expense_items':[
        {'category':1,'amount':100,'expense_date':'2026-07-18','description':'交通'},
        {'category':2,'amount':200,'expense_date':'2026-07-18','description':'餐饮'}
    ]
})
if exp_r and exp_r.get('id'):
    token = login()
    detail = requests.get(f'{BASE}/records/{exp_r["id"]}', headers={'Authorization':f'Bearer {token}'}).json()
    exps = detail.get('expense_items', [])
    if len(exps) >= 2:
        print(f'  ✅ 开支记录关联成功: {len(exps)}条, 合计{sum(e["amount"] for e in exps)}元')
        passed += 1
    else:
        print(f'  ❌ 开支记录关联失败: {len(exps)}条')
        failed += 1

# 修复的404
print('\n📌 之前404的API')
test('物料库存日志', 'GET', '/material-logs?page=1&per_page=5')
test('日历API', 'GET', '/records/calendar?start=2026-07-01&end=2026-07-31')

# tax_rate=0
print('\n📌 边界情况')
test('tax_rate=0', 'POST', '/records', {
    'order_type':'construction','title':'税率0验证','customer_name':'测试',
    'work_address':'测试','work_date':'2026-07-18','work_content':'税率0',
    'staff_names':'管理员','fee_items':[],'expense_items':[],
    'has_tax':True,'tax_rate':0
})

print(f'\n{"="*55}')
print(f'  最终结果: ✅{passed}  ❌{failed}  共{passed+failed}项')
print(f'{"="*55}')
if failed == 0:
    print('\n🎉 所有测试通过！系统修复完成！')
