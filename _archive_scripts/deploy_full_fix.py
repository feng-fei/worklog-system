"""部署完整修复 + 验证 - 使用独立验证脚本"""
import paramiko, os, time

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

print('=== 完整修复部署 (v35) ===\n')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)
sftp = ssh.open_sftp()

def upload_and_copy(local_path, container_path, label):
    remote_tmp = '/tmp/' + os.path.basename(local_path)
    sftp.put(local_path, remote_tmp)
    stdin, stdout, stderr = ssh.exec_command('docker cp ' + remote_tmp + ' ' + CONTAINER_NAME + ':' + container_path)
    err = stderr.read().decode()
    if err.strip(): print('  \u26a0 ' + label + ': ' + err.strip())
    print('  \u2713 ' + label)

# 备份
print('[1/5] 备份原文件...')
ssh.exec_command('docker exec ' + CONTAINER_NAME + ' cp /app/app/routes.py /app/app/routes.py.bak')
ssh.exec_command('docker exec ' + CONTAINER_NAME + ' cp /app/app/models.py /app/app/models.py.bak')
print('  \u2713 备份完成')

# 上传后端文件
print('\n[2/5] 上传 backend 文件...')
upload_and_copy(os.path.join(LOCAL_DIR, 'backend', 'models.py'), '/app/app/models.py', 'models.py')
upload_and_copy(os.path.join(LOCAL_DIR, 'backend', 'routes.py'), '/app/app/routes.py', 'routes.py')

# 上传前端文件
print('\n[3/5] 上传 frontend 文件...')
upload_and_copy(os.path.join(LOCAL_DIR, 'index.html'), '/app/frontend/index.html', 'index.html')
upload_and_copy(os.path.join(LOCAL_DIR, 'style-app.css'), '/app/frontend/style-app.css', 'style-app.css')

# 上传验证脚本
print('\n[4/5] 上传验证脚本...')
verify_path = os.path.join(LOCAL_DIR, 'verify_deploy.py')
verify_code = '''import json, urllib.request
req = urllib.request.Request("http://localhost:5000/api/auth/login",
    data=json.dumps({"username":"admin","password":"admin123"}).encode(),
    headers={"Content-Type":"application/json"})
resp = json.loads(urllib.request.urlopen(req).read())
token = resp.get("token","")
print("TOKEN ok")

def test(desc, url):
    req = urllib.request.Request(url, headers={"Authorization": "Bearer "+token})
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode())
        if isinstance(data, dict):
            print("  OK " + desc + ": " + str(list(data.keys())))
        else:
            print("  OK " + desc)
        return data
    except Exception as e:
        print("  FAIL " + desc + ": " + str(e))
        return None

print("\\n--- API 验证 ---")
test("Expense Categories", "http://localhost:5000/api/expense-categories")
test("Expenses list", "http://localhost:5000/api/expenses?page=1&per_page=5")
test("Payments", "http://localhost:5000/api/payments?page=1&per_page=5")
test("Advanced Stats", "http://localhost:5000/api/statistics/advanced")
test("Profit Stats", "http://localhost:5000/api/statistics/profit")

req2 = urllib.request.Request("http://localhost:5000/api/dashboard",
    headers={"Authorization": "Bearer "+token})
data2 = json.loads(urllib.request.urlopen(req2).read())
print("  recent_payments: " + ("YES" if "recent_payments" in data2 else "MISSING"))
print("  recent_expenses: " + ("YES" if "recent_expenses" in data2 else "MISSING"))
print("  top_customers: " + ("YES" if "top_customers" in data2 else "MISSING"))
print("  customer_count: " + ("YES" if "customer_count" in data2 else "MISSING"))
print("  low_stock_count: " + ("YES" if "low_stock_count" in data2 else "MISSING"))
'''
with open(verify_path, 'w') as f: f.write(verify_code)
upload_and_copy(verify_path, '/tmp/verify_deploy.py', 'verify_deploy.py')

# 重启容器
print('\n[5/5] 重启容器...')
ssh.exec_command('docker restart ' + CONTAINER_NAME)
print('  \u2713 等待容器重启...')
time.sleep(10)

# 执行验证
print('\n=== 验证 API ===')
stdin, stdout, stderr = ssh.exec_command('docker exec ' + CONTAINER_NAME + ' python3 /tmp/verify_deploy.py')
for line in stdout.read().decode().split('\n'):
    line = line.strip()
    if line: print('  ' + line)
for line in stderr.read().decode().split('\n'):
    line = line.strip()
    if line: print('  ERR: ' + line)

sftp.close()
ssh.close()
print('\n\u2705 全部完成！访问: http://172.28.10.2:8085/ (Ctrl+F5, v35)')
