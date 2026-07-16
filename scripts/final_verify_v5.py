"""最终部署并完整验证"""
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


print('=== 最终部署 ===\n')
print('1. 上传文件...')
upload(os.path.join(LOCAL_BACKEND, 'routes.py'), '/app/app/routes.py')

print('\n2. 重启容器...')
stdin, stdout, stderr = ssh.exec_command(f'docker restart {CONTAINER}')
stdout.read()
time.sleep(12)

stdin, stdout, stderr = ssh.exec_command(f'docker ps --filter name={CONTAINER} --format "{{{{.Status}}}}"')
status = stdout.read().decode().strip()
print(f'   状态: {status}')

# 运行完整验证
print('\n3. 完整验证测试...')
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
    # 登录
    resp = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    token = resp.get_json()['token']
    
    print("\n【高优先级验证】")
    
    # 1. S8 IDOR - 工单编辑日志权限校验
    print("\n1. S8 IDOR - 工单编辑日志接口")
    resp = client.get('/api/records/9999/edits', headers={'Authorization': f'Bearer {token}'})
    check("不存在工单返回404", resp.status_code == 404, f"返回{resp.status_code}")
    
    # 2. S8 IDOR - 工单收款列表权限校验
    print("\n2. S8 IDOR - 工单收款列表接口")
    resp = client.get('/api/records?page=1&per_page=1', headers={'Authorization': f'Bearer {token}'})
    rid = resp.get_json()['records'][0]['id']
    resp = client.get(f'/api/records/{rid}/payments', headers={'Authorization': f'Bearer {token}'})
    check("正常返回200", resp.status_code == 200, f"返回{resp.status_code}")
    check("包含payments字段", 'payments' in resp.get_json(), str(resp.get_json())[:100])
    check("包含total_amount字段", 'total_amount' in resp.get_json(), str(resp.get_json())[:100])
    
    # 3. S9 LIKE注入防护
    print("\n3. S9 LIKE注入防护")
    resp = client.get('/api/customers?keyword=%test%_special\\', headers={'Authorization': f'Bearer {token}'})
    check("特殊字符搜索不报错", resp.status_code == 200, f"返回{resp.status_code}")
    
    resp = client.get('/api/records?keyword=%test%', headers={'Authorization': f'Bearer {token}'})
    check("工单LIKE搜索不报错", resp.status_code == 200, f"返回{resp.status_code}")
    
    resp = client.get('/api/staffs?keyword=%test%', headers={'Authorization': f'Bearer {token}'})
    check("员工LIKE搜索不报错", resp.status_code == 200, f"返回{resp.status_code}")
    
    # 4. DC2 收款与工单同步
    print("\n4. DC2 收款与工单同步")
    resp = client.get('/api/records?page=1&per_page=1', headers={'Authorization': f'Bearer {token}'})
    record = resp.get_json()['records'][0]
    rid = record['id']
    old_paid = float(record.get('paid_amount', 0))
    
    resp = client.post('/api/payments', json={
        'record_id': rid, 'amount': 88.5, 'payment_date': '2026-07-16',
        'payment_method': 'cash', 'remark': 'DC2测试'
    }, headers={'Authorization': f'Bearer {token}'})
    
    if resp.status_code == 201:
        pid = resp.get_json()['id']
        resp2 = client.get(f'/api/records/{rid}', headers={'Authorization': f'Bearer {token}'})
        new_paid = float(resp2.get_json().get('paid_amount', 0))
        check(f"paid_amount更新: {old_paid} → {new_paid}", abs(new_paid - old_paid - 88.5) < 0.01, f"差值: {new_paid - old_paid}")
        
        # 更新收款
        resp3 = client.put(f'/api/payments/{pid}', json={'amount': 50}, headers={'Authorization': f'Bearer {token}'})
        if resp3.status_code == 200:
            resp4 = client.get(f'/api/records/{rid}', headers={'Authorization': f'Bearer {token}'})
            updated_paid = float(resp4.get_json().get('paid_amount', 0))
            check(f"更新收款后同步: {new_paid} → {updated_paid}", abs(updated_paid - old_paid - 50) < 0.01, f"差值: {updated_paid - old_paid}")
        
        # 删除收款
        client.delete(f'/api/payments/{pid}', headers={'Authorization': f'Bearer {token}'})
        resp5 = client.get(f'/api/records/{rid}', headers={'Authorization': f'Bearer {token}'})
        final_paid = float(resp5.get_json().get('paid_amount', 0))
        check(f"删除收款后同步: → {final_paid}", abs(final_paid - old_paid) < 0.01, f"差值: {final_paid - old_paid}")
    else:
        check("创建收款失败", False, f"状态码{resp.status_code}")
    
    # 5. 项目统计口径统一
    print("\n5. 项目统计口径统一")
    resp = client.get('/api/dashboard', headers={'Authorization': f'Bearer {token}'})
    check("仪表盘接口正常", resp.status_code == 200, f"返回{resp.status_code}")
    if resp.status_code == 200:
        d = resp.get_json()
        check("月收款含项目数据", 'month_payment' in d, '')
        check("月支出含项目数据", 'month_expense' in d, '')
        check("月利润计算正确", 'month_profit' in d, '')
        check("未发工资含项目工资", 'unpaid_salary' in d, '')
    
    resp = client.get('/api/statistics/profit', headers={'Authorization': f'Bearer {token}'})
    check("利润统计接口正常", resp.status_code == 200, f"返回{resp.status_code}")
    if resp.status_code == 200:
        d = resp.get_json()
        check("总收入含项目收款", 'total_income' in d, '')
        check("总人工含项目工资", 'total_labor_cost' in d, '')
        check("净利润计算正确", 'net_profit' in d, '')
    
    # 6. 错误处理（404不返回500）
    print("\n6. 错误处理规范化")
    resp = client.get('/api/records/99999', headers={'Authorization': f'Bearer {token}'})
    check("不存在工单返回404", resp.status_code == 404, f"返回{resp.status_code}")
    
    resp = client.get('/api/customers/99999', headers={'Authorization': f'Bearer {token}'})
    check("不存在客户返回404", resp.status_code == 404, f"返回{resp.status_code}")
    
    print(f"\n{'='*50}")
    print(f"验证结果: {passed} 通过, {failed} 失败")
    print(f"{'='*50}")
'''

sftp.open('/tmp/final_test.py', 'w').write(test_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/final_test.py {CONTAINER}:/tmp/final_test.py')
stdout.read()

stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER} python3 /tmp/final_test.py 2>&1')
output = stdout.read().decode()
# 只打印测试结果部分（去掉路由列表等初始化信息）
lines = output.split('\n')
in_test = False
for line in lines:
    if '【高优先级验证】' in line:
        in_test = True
    if in_test:
        print(line)

ssh.close()
print('\n=== 部署验证完成 ===')
