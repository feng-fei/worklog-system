"""验证数据库迁移结果"""
import paramiko

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)

print('=== 验证数据库迁移结果 ===\n')

# 检查数据条数
check_sql = """
SELECT 
    '总记录数' as item,
    COUNT(*) as value 
FROM payment_records
UNION ALL
SELECT 
    '有工单ID的记录' as item,
    COUNT(*) as value 
FROM payment_records 
WHERE record_id IS NOT NULL
UNION ALL
SELECT 
    '有客户名称的记录' as item,
    COUNT(*) as value 
FROM payment_records 
WHERE customer_name IS NOT NULL AND customer_name != '';
"""

# 将 SQL 写入脚本
sql_script = f"""
import sqlite3
conn = sqlite3.connect('/app/data/worklog.db')
cursor = conn.cursor()
cursor.execute(\"\"\"{check_sql}\"\"\")
rows = cursor.fetchall()
for row in rows:
    print(f'  {{row[0]}}: {{row[1]}}')
conn.close()
"""

# 写入文件并执行
import tempfile
sftp = ssh.open_sftp()
sftp.open('/tmp/check_migration.py', 'w').write(sql_script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/check_migration.py {CONTAINER_NAME}:/tmp/check_migration.py')
stdout.read()

stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} python3 /tmp/check_migration.py')
print('数据统计:')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print('错误:', err)

# 测试插入一条只有客户名称没有工单ID的记录
print('\n测试插入无工单ID的收款记录...')
test_sql = """
import sqlite3
conn = sqlite3.connect('/app/data/worklog.db')
cursor = conn.cursor()
try:
    cursor.execute(\"\"\"
        INSERT INTO payment_records 
        (customer_name, amount, payment_date, payment_method, remark, created_by)
        VALUES ('测试客户', 100.00, '2026-07-14', 'cash', '迁移测试', 'admin')
    \"\"\")
    new_id = cursor.lastrowid
    conn.commit()
    print(f'  插入成功，新记录ID: {new_id}')
    
    # 查询刚插入的记录
    cursor.execute('SELECT id, customer_name, record_id, amount FROM payment_records WHERE id = ?', (new_id,))
    row = cursor.fetchone()
    print(f'  验证记录: id={row[0]}, customer={row[1]}, record_id={row[2]}, amount={row[3]}')
    
    # 删除测试记录
    cursor.execute('DELETE FROM payment_records WHERE id = ?', (new_id,))
    conn.commit()
    print('  测试记录已删除')
except Exception as e:
    print(f'  插入失败: {e}')
    conn.rollback()
conn.close()
"""

sftp = ssh.open_sftp()
sftp.open('/tmp/test_insert.py', 'w').write(test_sql)
sftp.close()

stdin, stdout, stderr = ssh.exec_command(f'docker cp /tmp/test_insert.py {CONTAINER_NAME}:/tmp/test_insert.py')
stdout.read()

stdin, stdout, stderr = ssh.exec_command(f'docker exec {CONTAINER_NAME} python3 /tmp/test_insert.py')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print('错误:', err)

ssh.close()
print('\n✅ 验证完成！')
