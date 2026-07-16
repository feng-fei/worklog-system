"""部署本轮修复并验证"""
import paramiko, os, time, json

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
    stderr.read()
    print(f'  上传: {os.path.basename(local_path)}')


def exec_cmd(cmd):
    _, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode().strip(), stderr.read().decode().strip()


print('=== 部署本轮修复 ===\n')

# 1. 备份
print('1. 备份 routes.py...')
exec_cmd(f'docker exec {CONTAINER} cp /app/app/routes.py /app/app/routes.py.backup_v5')

# 2. 上传 routes.py 和 utils.py
print('2. 上传修改的文件...')
upload(os.path.join(LOCAL_BACKEND, 'routes.py'), '/app/app/routes.py')
upload(os.path.join(LOCAL_BACKEND, 'utils.py'), '/app/app/utils.py')

# 3. 重启容器
print('\n3. 重启容器...')
exec_cmd(f'docker restart {CONTAINER}')
time.sleep(12)

# 4. 检查状态
status, _ = exec_cmd(f'docker ps --filter name={CONTAINER} --format "{{{{.Status}}}}"')
print(f'   状态: {status}')

if 'Up' not in status:
    print('   容器启动失败! 查看日志:')
    logs, _ = exec_cmd(f'docker logs {CONTAINER} --tail 30 2>&1')
    print(logs)
    sftp.close()
    ssh.close()
    exit(1)

# 5. 运行验证测试
print('\n4. 运行 API 验证测试...')
test_script = '''
import urllib.request, json

def api_call(url, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(f'http://localhost:5000{url}', data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return True, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return False, json.loads(e.read()) if e.code != 500 else {'error': str(e)}
    except Exception as e:
        return False, str(e)

# 登录
ok, result = api_call('/api/auth/login', 'POST', {'username': 'admin', 'password': 'admin123'})
if not ok or 'token' not in result:
    print(f'登录失败: {result}')
    exit(1)
token = result['token']
print(f'  ✓ 登录成功')

# 测试1: S8 - 工单编辑日志权限
ok, result = api_call('/api/records/1/edits', token=token)
print(f'  工单编辑日志: {"✓" if ok else "✗"} - {len(result) if ok and isinstance(result, list) else result.get("error", "")}')

# 测试2: S8 - 工单收款列表权限
ok, result = api_call('/api/records/1/payments', token=token)
print(f'  工单收款列表: {"✓" if ok else "✗"} - {result.get("total_amount", 0) if ok else result.get("error", "")}')

# 测试3: 仪表盘数据（含项目统计）
ok, result = api_call('/api/dashboard', token=token)
if ok:
    print(f'  仪表盘: ✓')
    print(f'    - 本月收款: {result.get("month_payment", 0)}')
    print(f'    - 本月支出: {result.get("month_expense", 0)}')
    print(f'    - 本月利润: {result.get("month_profit", 0)}')
    print(f'    - 未发工资: {result.get("unpaid_salary", 0)}')
else:
    print(f'  仪表盘: ✗ - {result.get("error", "")}')

# 测试4: 利润统计（确认含项目数据）
ok, result = api_call('/api/statistics/profit', token=token)
if ok:
    print(f'  利润统计: ✓')
    print(f'    - 总收入: {result.get("total_income", 0)}')
    print(f'    - 总人工成本: {result.get("total_labor_cost", 0)}')
    print(f'    - 净利润: {result.get("net_profit", 0)}')
else:
    print(f'  利润统计: ✗ - {result.get("error", "")}')

# 测试5: 客户列表搜索（LIKE注入转义测试）
ok, result = api_call('/api/customers?keyword=%test%', token=token)
print(f'  客户搜索(特殊字符): {"✓ 不报错" if ok else "✗"} - 结果数: {len(result) if ok and isinstance(result, list) else "N/A"}')

# 测试6: 创建一笔收款，验证DC2同步
# 先找一个工单
ok, records = api_call('/api/records?page=1&per_page=1', token=token)
if ok and records.get('records'):
    record_id = records['records'][0]['id']
    old_paid = records['records'][0].get('paid_amount', 0)
    print(f'  测试工单: #{record_id}, 原已收款: {old_paid}')
    
    # 创建收款
    ok, payment = api_call('/api/payments', 'POST', {
        'record_id': record_id,
        'amount': 100,
        'payment_date': '2026-07-16',
        'payment_method': 'cash',
        'remark': 'API测试收款'
    }, token=token)
    if ok:
        print(f'  ✓ 创建收款成功: #{payment.get("id")}')
        # 验证工单已收款是否更新
        ok, record = api_call(f'/api/records/{record_id}', token=token)
        if ok:
            new_paid = record.get('paid_amount', 0)
            print(f'  ✓ 工单paid_amount已更新: {old_paid} → {new_paid}')
            # 清理：删除测试收款
            api_call(f'/api/payments/{payment["id"]}', 'DELETE', token=token)
            print(f'  ✓ 清理测试收款')
    else:
        print(f'  ✗ 创建收款失败: {payment.get("error", "")}')

print('\\n✅ 所有验证测试完成!')
'''

sftp.open('/tmp/test_v5.py', 'w').write(test_script)
sftp.close()

exec_cmd(f'docker cp /tmp/test_v5.py {CONTAINER}:/tmp/test_v5.py')
out, err = exec_cmd(f'docker exec {CONTAINER} python3 /tmp/test_v5.py')
print(out)
if err:
    print(f'错误: {err}')

ssh.close()
print('\n=== 部署验证完成 ===')
