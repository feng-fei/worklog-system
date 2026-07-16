"""重新部署并验证错误处理修复"""
import paramiko, time, os

NAS_IP = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER = 'worklog'
LOCAL_BACKEND = r'c:\Users\Administrator\Documents\traework\backend'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_IP, username=NAS_USER, password=NAS_PASS)
sftp = ssh.open_sftp()


def upload(local_path, container_path):
    tmp = '/tmp/' + os.path.basename(local_path)
    sftp.put(local_path, tmp)
    stdin, stdout, stderr = ssh.exec_command(f'docker cp {tmp} {CONTAINER}:{container_path}')
    stdout.read()
    print(f'  上传: {os.path.basename(local_path)}')


print('=== 部署错误处理修复 ===\n')
print('1. 上传routes.py...')
upload(os.path.join(LOCAL_BACKEND, 'routes.py'), '/app/app/routes.py')

print('\n2. 重启容器...')
stdin, stdout, stderr = ssh.exec_command(f'docker restart {CONTAINER}')
stdout.read()
time.sleep(12)

stdin, stdout, stderr = ssh.exec_command(f'docker ps --filter name={CONTAINER} --format "{{{{.Status}}}}"')
status = stdout.read().decode().strip()
print(f'   状态: {status}')

# 验证
print('\n3. 验证测试...')
test_code = r'''
import sys
sys.path.insert(0, '/app')
from app import create_app
app = create_app()

passed = 0
failed = 0

def check(name, condition, detail=''):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ {name}")
    else:
        failed += 1
        print(f"  ✗ {name} - {detail}")

with app.test_client() as client:
    resp = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    token = resp.get_json()['token']
    
    print("\n【错误处理验证】")
    
    # 测试各类404
    tests = [
        ("工单详情", '/api/records/99999'),
        ("客户详情", '/api/customers/99999'),
        ("员工详情", '/api/staffs/99999'),
        ("工资详情", '/api/salaries/99999'),
        ("支出详情", '/api/expenses/99999'),
        ("收款详情", '/api/payments/99999'),
        ("项目详情", '/api/projects/99999'),
        ("物料详情", '/api/materials/99999'),
        ("模板详情", '/api/templates/99999'),
        ("工单编辑日志", '/api/records/99999/edits'),
    ]
    
    for name, path in tests:
        resp = client.get(path, headers={'Authorization': f'Bearer {token}'})
        check(f"{name} 404", resp.status_code == 404, f"返回{resp.status_code}")
    
    # 测试正常接口不受影响
    print("\n【正常接口验证】")
    normal_tests = [
        ("工单列表", '/api/records?page=1&per_page=1'),
        ("客户列表", '/api/customers?page=1&per_page=1'),
        ("仪表盘", '/api/dashboard'),
        ("利润统计", '/api/statistics/profit'),
    ]
    
    for name, path in normal_tests:
        resp = client.get(path, headers={'Authorization': f'Bearer {token}'})
        check(f"{name} 正常", resp.status_code == 200, f"返回{resp.status_code}")
    
    print(f"\n{'='*50}")
    print(f"结果: {passed} 通过, {failed} 失败")
    print(f"{'='*50}")
'''

sftp.open('/tmp/test_error_handling.py', 'w').write(test_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/test_error_handling.py {CONTAINER}:/tmp/test_error_handling.py')
stdout.read()

stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER} python3 /tmp/test_error_handling.py 2>&1')
output = stdout.read().decode()
lines = output.split('\n')
in_test = False
for line in lines:
    if '错误处理验证' in line:
        in_test = True
    if in_test:
        print(line)

ssh.close()
print('\n=== 完成 ===')
