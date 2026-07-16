#!/usr/bin/env python3
"""上传备份脚本到容器并执行"""
import paramiko
import os

# 连接 NAS
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021')

# 上传备份脚本
sftp = ssh.open_sftp()
local_script = r'c:\Users\Administrator\Documents\traework\backup_pre_redesign.py'
remote_script = '/tmp/backup_pre_redesign.py'
sftp.put(local_script, remote_script)
sftp.close()

# 复制到容器并执行
stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/backup_pre_redesign.py worklog:/tmp/backup_pre_redesign.py')
stdout.read()

stdin, stdout, stderr = ssh.exec_command('docker exec worklog python3 /tmp/backup_pre_redesign.py')
output = stdout.read().decode('utf-8')
error = stderr.read().decode('utf-8')

print(output)
if error:
    print('ERROR:', error)

ssh.close()
