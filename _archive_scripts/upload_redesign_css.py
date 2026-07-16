#!/usr/bin/env python3
"""上传全新美化样式到容器"""
import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.28.10.2', username='root', password='feng1021')

sftp = ssh.open_sftp()

local_css = r'c:\Users\Administrator\Documents\traework\style-redesign.css'
remote_css = '/tmp/style-redesign.css'
sftp.put(local_css, remote_css)

local_html = r'c:\Users\Administrator\Documents\traework\index.html'
remote_html = '/tmp/index.html'
sftp.put(local_html, remote_html)

sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/style-redesign.css worklog:/app/frontend/style-redesign.css')
stdout.read()
err = stderr.read().decode('utf-8')
if err:
    print('CSS 复制错误:', err)

stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/index.html worklog:/app/frontend/index.html')
stdout.read()
err = stderr.read().decode('utf-8')
if err:
    print('HTML 复制错误:', err)

stdin, stdout, stderr = ssh.exec_command('docker exec worklog ls -la /app/frontend/style-redesign.css /app/frontend/index.html')
output = stdout.read().decode('utf-8')
print('文件验证:')
print(output)

stdin, stdout, stderr = ssh.exec_command('docker restart worklog')
output = stdout.read().decode('utf-8')
print('容器重启中...')
print(output)

import time
time.sleep(3)

stdin, stdout, stderr = ssh.exec_command('docker ps --filter name=worklog --format "{{.Status}}"')
output = stdout.read().decode('utf-8')
print('容器状态:', output.strip())

ssh.close()
print('\n部署完成！请刷新浏览器查看效果（Ctrl+F5 强制刷新）')
