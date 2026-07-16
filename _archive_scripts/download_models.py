#!/usr/bin/env python3
"""从容器下载 models.py"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021')

sftp = ssh.open_sftp()
# 从容器复制到宿主机
stdin, stdout, stderr = ssh.exec_command('docker cp worklog:/app/app/models.py /tmp/models.py')
stdout.read()

# 下载到本地
sftp.get('/tmp/models.py', r'c:\Users\Administrator\Documents\traework\models.py')
sftp.close()

print('✓ 下载 models.py 完成')
ssh.close()
