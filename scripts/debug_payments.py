"""调试工单收款列表500错误"""
import paramiko

NAS_IP = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER = 'worklog'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_IP, username=NAS_USER, password=NAS_PASS)

test_code = '''
import sys, traceback
sys.path.insert(0, '/app')
from app import create_app
app = create_app()

with app.test_client() as client:
    resp = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    token = resp.get_json()['token']
    
    # 先获取一个有效的工单ID
    resp = client.get('/api/records?page=1&per_page=1', headers={'Authorization': f'Bearer {token}'})
    rid = resp.get_json()['records'][0]['id']
    print(f"测试工单ID: {rid}")
    
    # 测试工单收款列表
    try:
        resp = client.get(f'/api/records/{rid}/payments', headers={'Authorization': f'Bearer {token}'})
        print(f"状态码: {resp.status_code}")
        print(f"响应: {resp.get_json()}")
    except Exception as e:
        traceback.print_exc()
'''

sftp = ssh.open_sftp()
sftp.open('/tmp/debug_payments.py', 'w').write(test_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/debug_payments.py {CONTAINER}:/tmp/debug_payments.py')
stdout.read()

stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER} python3 /tmp/debug_payments.py 2>&1')
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print('STDERR:', err)

ssh.close()
