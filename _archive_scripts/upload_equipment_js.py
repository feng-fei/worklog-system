#!/usr/bin/env python3
"""上传并执行 JavaScript 添加脚本"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021')

# 上传脚本
sftp = ssh.open_sftp()
sftp.put(r'c:\Users\Administrator\Documents\traework\add_equipment_js.py', '/tmp/add_equipment_js.py')
sftp.close()

# 复制到容器
stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/add_equipment_js.py worklog:/tmp/add_equipment_js.py')
stdout.read()

# 执行
stdin, stdout, stderr = ssh.exec_command('docker exec worklog python3 /tmp/add_equipment_js.py')
output = stdout.read().decode('utf-8')
error = stderr.read().decode('utf-8')

print(output)
if error:
    print('ERROR:', error)

ssh.close()
