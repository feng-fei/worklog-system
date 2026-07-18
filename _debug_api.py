import requests, json
BASE = 'http://172.28.10.2:8085/api'
r = requests.post(f'{BASE}/auth/login', json={'username': 'admin', 'password': 'admin123'})
token = r.json().get('token', '')
headers = {'Authorization': f'Bearer {token}'}

# 测试创建施工单
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
r = requests.post(f'{BASE}/records', headers=headers, json=test_data)
print('创建施工单状态:', r.status_code)
print('响应:', json.dumps(r.json(), indent=2, ensure_ascii=False)[:500])

print()
# 测试物料库存日志
r = requests.get(f'{BASE}/material-logs?page=1&per_page=5', headers=headers)
print('物料库存日志状态:', r.status_code, r.text[:200] if r.status_code != 200 else 'OK')

# 测试日历
r = requests.get(f'{BASE}/records/calendar?start=2026-07-01&end=2026-07-31', headers=headers)
print('日历状态:', r.status_code, r.text[:200] if r.status_code != 200 else 'OK')

# 测试/finance/salaries
r = requests.get(f'{BASE}/finance/salaries?page=1&per_page=5', headers=headers)
print('/finance/salaries状态:', r.status_code, r.text[:200] if r.status_code != 200 else 'OK')
