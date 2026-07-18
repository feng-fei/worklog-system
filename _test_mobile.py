import requests

BASE = 'http://172.28.10.2:8085'

# 1. 测试 mobile 首页
print('=== GET /mobile/ ===')
r = requests.get(f'{BASE}/mobile/')
print(f'Status: {r.status_code}')
print(f'Content-Type: {r.headers.get("Content-Type")}')
print(f'Body length: {len(r.text)}')
print(r.text[:500])
print()

# 2. 测试 mobile assets JS
print('=== GET /mobile/assets/index-D8qWSK_s.js ===')
r = requests.get(f'{BASE}/mobile/assets/index-D8qWSK_s.js')
print(f'Status: {r.status_code}')
print(f'Content-Type: {r.headers.get("Content-Type")}')
print(f'Body length: {len(r.text)}')
if r.status_code == 200 and r.text.strip().startswith('<!DOCTYPE'):
    print('ERROR: 返回了 HTML 而不是 JS!')
    print(r.text[:300])
else:
    print('OK: 返回了 JS 内容')
print()

# 3. 测试登录 API
print('=== POST /api/auth/login ===')
r = requests.post(f'{BASE}/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
print(f'Status: {r.status_code}')
print(f'Response: {r.text[:300]}')
