import requests, json

BASE = 'http://172.28.10.2:8085/api'
r = requests.post(f'{BASE}/auth/login', json={'username': 'admin', 'password': 'admin123'})
token = r.json().get('token', '')
headers = {'Authorization': f'Bearer {token}'}

for path in ['/customers?page=1&per_page=2', '/templates?page=1&per_page=2', '/expenses?page=1&per_page=2', '/backup/list', '/dashboard']:
    r = requests.get(f'{BASE}{path}', headers=headers)
    d = r.json()
    print(f'=== {path} ===')
    print(f'  顶层keys: {list(d.keys())}')
    if 'data' in d and isinstance(d['data'], dict):
        print(f'  data层keys: {list(d["data"].keys())}')
        print(f'  success={d.get("success")}')
    print()
