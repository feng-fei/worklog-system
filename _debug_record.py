import requests, json

BASE = 'http://172.28.10.2:8085/api'
r = requests.post(f'{BASE}/auth/login', json={'username': 'admin', 'password': 'admin123'})
token = r.json().get('token', '')
headers = {'Authorization': f'Bearer {token}'}

r = requests.get(f'{BASE}/records?page=1&per_page=1', headers=headers)
d = r.json()
records = d.get('records', [])
if records:
    rid = records[0]['id']
    print(f'测试工单ID: {rid}')
    r2 = requests.get(f'{BASE}/records/{rid}', headers=headers)
    print(f'详情状态: {r2.status_code}')
    d2 = r2.json()
    if 'error' in d2:
        print(f'错误: {d2["error"]}')
    else:
        print(f'详情keys: {list(d2.keys())}')
else:
    print('没有工单记录')
