#!/usr/bin/env python3
"""下载当前 index.html"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021')

sftp = ssh.open_sftp()
stdin, stdout, stderr = ssh.exec_command('docker cp worklog:/app/frontend/index.html /tmp/index.html')
stdout.read()
sftp.get('/tmp/index.html', r'c:\Users\Administrator\Documents\traework\index.html')
sftp.close()

print('✓ 下载 index.html 完成')
ssh.close()
