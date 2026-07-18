import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021', timeout=30)

print('=== 检查数据库表记录数（使用正确模型名）===')
stdin, stdout, stderr = ssh.exec_command('''docker exec worklog python -c "
import sys
sys.path.insert(0, '/app')
sys.path.insert(0, '/app/backend')
from backend.models import *
from backend import db, create_app
app = create_app()
with app.app_context():
    tables = [
        ('WorkRecord', WorkRecord),
        ('WorkTemplate', WorkTemplate),
        ('Customer', Customer),
        ('Staff', Staff),
        ('Material', Material),
        ('Expense (not ExpenseRecord)', Expense),
        ('PaymentRecord', PaymentRecord),
        ('SalaryRecord', SalaryRecord),
        ('PendingWork', PendingWork),
        ('OperationLog', OperationLog),
        ('Project', Project),
        ('ExpenseCategory', ExpenseCategory),
    ]
    for name, model in tables:
        try:
            count = model.query.count()
            first = model.query.first()
            if first:
                print(f'{name}: {count} 条, 第一条keys: {list(first.to_dict().keys())[:8]}')
            else:
                print(f'{name}: {count} 条')
        except Exception as e:
            print(f'{name}: ERROR - {e}')
" 2>&1 | tail -20
''')
print(stdout.read().decode())

print('\n=== 检查Expense模型字段 ===')
stdin, stdout, stderr = ssh.exec_command('''docker exec worklog python -c "
import sys
sys.path.insert(0, '/app')
sys.path.insert(0, '/app/backend')
from backend.models import Expense, PaymentRecord
print('Expense columns:')
for c in Expense.__table__.columns:
    print(f'  {c.name}: {c.type}')
print()
print('PaymentRecord columns:')
for c in PaymentRecord.__table__.columns:
    print(f'  {c.name}: {c.type}')
" 2>&1
''')
print(stdout.read().decode())

print('\n=== 测试带认证的API（先获取token）===')
stdin, stdout, stderr = ssh.exec_command('''wget -qO- --post-data='{"username":"admin","password":"admin123"}' --header='Content-Type: application/json' http://127.0.0.1:8085/api/auth/login 2>&1''')
login_out = stdout.read().decode()
print('Login response:', login_out[:200])

import json
try:
    token = json.loads(login_out).get('token', '')
    if token:
        print(f'\nGot token: {token[:20]}...')
        stdin, stdout, stderr = ssh.exec_command(f'wget -qO- --header="Authorization: Bearer {token}" http://127.0.0.1:8085/api/templates 2>&1')
        print('Templates API:', stdout.read().decode()[:300])
        stdin, stdout, stderr = ssh.exec_command(f'wget -qO- --header="Authorization: Bearer {token}" "http://127.0.0.1:8085/api/expenses?per_page=3" 2>&1')
        print('Expenses API:', stdout.read().decode()[:300])
        stdin, stdout, stderr = ssh.exec_command(f'wget -qO- --header="Authorization: Bearer {token}" "http://127.0.0.1:8085/api/dashboard" 2>&1')
        print('Dashboard API:', stdout.read().decode()[:500])
except Exception as e:
    print('Parse error:', e)

ssh.close()
