import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021', timeout=30)

print('=== 容器内数据库表记录数 ===')
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
        ('Expense', ExpenseRecord),
        ('PaymentRecord', PaymentRecord),
        ('SalaryRecord', SalaryRecord),
        ('PendingWork', PendingWork),
        ('OperationLog', OperationLog),
        ('Project', Project),
    ]
    for name, model in tables:
        try:
            count = model.query.count()
            print(f'{name}: {count} 条记录')
        except Exception as e:
            print(f'{name}: ERROR - {e}')
"
''')
print(stdout.read().decode())
print(stderr.read().decode())

print('\n=== 检查routes.py是否为最新版本（是否有expense-categories）===')
stdin, stdout, stderr = ssh.exec_command('''docker exec worklog grep -n "expense.categories\\|/expenses" /app/backend/routes.py | head -10''')
print(stdout.read().decode())

print('\n=== 检查blueprints是否启用 ===')
stdin, stdout, stderr = ssh.exec_command('''docker exec worklog env | grep USE_MODULAR''')
print(stdout.read().decode())

print('\n=== 检查后端启动日志 ===')
stdin, stdout, stderr = ssh.exec_command('docker logs worklog 2>&1 | head -30')
print(stdout.read().decode())

ssh.close()
