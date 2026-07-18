import requests, json

BASE = 'http://172.28.10.2:8085/api'

r = requests.post(f'{BASE}/auth/login', json={'username': 'admin', 'password': 'admin123'})
print('登录状态:', r.status_code)
print('返回内容:', json.dumps(r.json(), indent=2, ensure_ascii=False))
