"""查看容器日志找出500错误原因"""
import paramiko

NAS_IP = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER = 'worklog'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_IP, username=NAS_USER, password=NAS_PASS)

# 查看最近的错误日志
stdin, stdout, stderr = ssh.exec_command(f'docker logs {CONTAINER} --tail 80 2>&1')
print('=== 容器日志（最后80行） ===')
print(stdout.read().decode())

# 在容器内直接用Python调用接口看错误
test_code = '''
import sys
sys.path.insert(0, '/app')
from app import create_app
app = create_app()

with app.test_client() as client:
    # 登录
    resp = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    data = resp.get_json()
    token = data.get('token', '')
    print(f"登录: {resp.status_code}")

    # 测试仪表盘
    print("\\n=== 测试仪表盘 ===")
    resp = client.get('/api/dashboard', headers={'Authorization': f'Bearer {token}'})
    print(f"状态码: {resp.status_code}")
    if resp.status_code >= 400:
        print(f"错误: {resp.get_json()}")
    else:
        print(f"成功: keys={list(resp.get_json().keys())[:10]}...")

    # 测试工单编辑日志
    print("\\n=== 测试工单编辑日志 ===")
    resp = client.get('/api/records/1/edits', headers={'Authorization': f'Bearer {token}'})
    print(f"状态码: {resp.status_code}")
    if resp.status_code >= 400:
        print(f"错误: {resp.get_json()}")

    # 测试工单收款列表
    print("\\n=== 测试工单收款列表 ===")
    resp = client.get('/api/records/1/payments', headers={'Authorization': f'Bearer {token}'})
    print(f"状态码: {resp.status_code}")
    if resp.status_code >= 400:
        print(f"错误: {resp.get_json()}")

    # 测试利润统计
    print("\\n=== 测试利润统计 ===")
    resp = client.get('/api/statistics/profit', headers={'Authorization': f'Bearer {token}'})
    print(f"状态码: {resp.status_code}")
    if resp.status_code >= 400:
        print(f"错误: {resp.get_json()}")
'''

sftp = ssh.open_sftp()
sftp.open('/tmp/debug_api.py', 'w').write(test_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/debug_api.py {CONTAINER}:/tmp/debug_api.py')
stdout.read()

stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER} python3 /tmp/debug_api.py 2>&1')
print('\n=== API调试结果 ===')
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print('STDERR:', err)

ssh.close()
