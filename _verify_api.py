import paramiko
import time
import json
import requests

NAS_HOST = '172.28.10.2'
BASE_URL = f'http://{NAS_HOST}:8085'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username='root', password='feng1021', timeout=30)

print('等待应用完全启动...')
time.sleep(5)

print('\n检查容器日志:')
stdin, stdout, stderr = ssh.exec_command('docker logs --tail 50 worklog 2>&1')
logs = stdout.read().decode()
print(logs)

print('\n' + '='*60)
print('API测试')
print('='*60)

try:
    print('\n1. 登录获取token...')
    login_resp = requests.post(f'{BASE_URL}/api/auth/login', json={
        'username': 'admin',
        'password': 'admin123'
    }, timeout=10)
    print(f'  登录状态: {login_resp.status_code}')
    if login_resp.status_code == 200:
        token = login_resp.json().get('token')
        if token:
            print(f'  获取token成功')
            headers = {'Authorization': f'Bearer {token}'}
            
            print('\n2. 测试 /api/dashboard...')
            resp = requests.get(f'{BASE_URL}/api/dashboard', headers=headers, timeout=10)
            data = resp.json()
            print(f'  状态: {resp.status_code}')
            print(f'  包含recent_records: {"recent_records" in data}')
            if 'recent_records' in data:
                print(f'  recent_records数量: {len(data.get("recent_records", []))}')
            
            print('\n3. 测试 /api/templates...')
            resp = requests.get(f'{BASE_URL}/api/templates', headers=headers, timeout=10)
            data = resp.json()
            print(f'  状态: {resp.status_code}')
            print(f'  返回keys: {list(data.keys())}')
            print(f'  包含records: {"records" in data}')
            if 'records' in data:
                print(f'  records数量: {len(data.get("records", []))}')
            
            print('\n4. 测试 /api/customers...')
            resp = requests.get(f'{BASE_URL}/api/customers', headers=headers, timeout=10)
            data = resp.json()
            print(f'  状态: {resp.status_code}')
            print(f'  返回keys: {list(data.keys())}')
            print(f'  包含records: {"records" in data}')
            print(f'  包含page/per_page/pages: {"page" in data and "per_page" in data and "pages" in data}')
            
            print('\n5. 测试 /api/staffs...')
            resp = requests.get(f'{BASE_URL}/api/staffs', headers=headers, timeout=10)
            data = resp.json()
            print(f'  状态: {resp.status_code}')
            print(f'  返回keys: {list(data.keys())}')
            print(f'  包含records: {"records" in data}')
            print(f'  包含page/per_page/pages: {"page" in data and "per_page" in data and "pages" in data}')
            
            print('\n6. 测试 /api/expenses...')
            resp = requests.get(f'{BASE_URL}/api/expenses', headers=headers, timeout=10)
            data = resp.json()
            print(f'  状态: {resp.status_code}')
            print(f'  返回keys: {list(data.keys())}')
            print(f'  包含records: {"records" in data}')
            
            print('\n7. 测试 /api/payments...')
            resp = requests.get(f'{BASE_URL}/api/payments', headers=headers, timeout=10)
            data = resp.json()
            print(f'  状态: {resp.status_code}')
            print(f'  返回keys: {list(data.keys())}')
            print(f'  包含records: {"records" in data}')
            
            print('\n8. 测试 /api/salaries...')
            resp = requests.get(f'{BASE_URL}/api/salaries', headers=headers, timeout=10)
            data = resp.json()
            print(f'  状态: {resp.status_code}')
            print(f'  返回keys: {list(data.keys())}')
            print(f'  包含records: {"records" in data}')
            
            print('\n9. 测试 /api/backup/list...')
            resp = requests.get(f'{BASE_URL}/api/backup/list', headers=headers, timeout=10)
            data = resp.json()
            print(f'  状态: {resp.status_code}')
            print(f'  返回keys: {list(data.keys())}')
            print(f'  包含records: {"records" in data}')
            
            print('\n10. 测试 /api/operation-logs...')
            resp = requests.get(f'{BASE_URL}/api/operation-logs', headers=headers, timeout=10)
            data = resp.json()
            print(f'  状态: {resp.status_code}')
            print(f'  返回keys: {list(data.keys())}')
            print(f'  包含records: {"records" in data or "logs" in data}')
            
            print('\n11. 测试 /api/records?exclude_project=true...')
            resp = requests.get(f'{BASE_URL}/api/records?exclude_project=true', headers=headers, timeout=10)
            data = resp.json()
            print(f'  状态: {resp.status_code}')
            print(f'  返回keys: {list(data.keys())}')
            print(f'  包含records: {"records" in data}')
            
        else:
            print(f'  登录响应: {login_resp.text}')
    else:
        print(f'  登录失败: {login_resp.text}')
        
except Exception as e:
    print(f'  测试出错: {e}')
    import traceback
    traceback.print_exc()

ssh.close()
print('\n' + '='*60)
print('验证完成')
print('='*60)
