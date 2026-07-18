import requests, json

BASE = 'http://172.28.10.2:8085/api'
r = requests.post(f'{BASE}/auth/login', json={'username': 'admin', 'password': 'admin123'})
token = r.json().get('token', '')
headers = {'Authorization': f'Bearer {token}'}

for path in ['/customers/1', '/materials/1', '/templates/1', '/records/1']:
    try:
        r = requests.get(f'{BASE}{path}', headers=headers)
        d = r.json()
        print(f'=== {path} status={r.status_code} ===')
        print(f'  keys: {list(d.keys())}')
        if 'customer' in d:
            print(f'  customer keys: {list(d["customer"].keys())[:10]}...')
        elif 'material' in d:
            print(f'  material keys: {list(d["material"].keys())[:10]}...')
        elif 'template' in d:
            print(f'  template keys: {list(d["template"].keys())[:10]}...')
        elif 'record' in d:
            print(f'  record keys: {list(d["record"].keys())[:10]}...')
        print()
    except Exception as e:
        print(f'{path}: ERROR {e}')
