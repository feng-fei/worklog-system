#!/usr/bin/env python3
"""部署全新 Linear 风格样式到容器"""
import paramiko
import os

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
CONTAINER_NAME = 'worklog'
REMOTE_PATH = '/app/frontend'

def main():
    print('=== 部署全新 Linear 风格样式 ===\n')
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)
    
    sftp = ssh.open_sftp()
    
    # 1. 上传新 CSS 文件
    local_css = r'c:\Users\Administrator\Documents\traework\style-app.css'
    remote_css = f'/tmp/style-app.css'
    print(f'[1/3] 上传 style-app.css...')
    sftp.put(local_css, remote_css)
    
    # 2. 上传更新后的 index.html
    local_html = r'c:\Users\Administrator\Documents\traework\index.html'
    remote_html = '/tmp/index.html'
    print(f'[2/3] 上传 index.html...')
    sftp.put(local_html, remote_html)
    
    sftp.close()
    
    # 3. 复制到容器
    print(f'[3/3] 复制到容器 {CONTAINER_NAME}...')
    
    stdin, stdout, stderr = ssh.exec_command(
        f'docker cp /tmp/style-app.css {CONTAINER_NAME}:{REMOTE_PATH}/style-app.css'
    )
    stdout.read()
    err = stderr.read().decode('utf-8')
    if err:
        print('  CSS 复制错误:', err)
    
    stdin, stdout, stderr = ssh.exec_command(
        f'docker cp /tmp/index.html {CONTAINER_NAME}:{REMOTE_PATH}/index.html'
    )
    stdout.read()
    err = stderr.read().decode('utf-8')
    if err:
        print('  HTML 复制错误:', err)
    
    # 验证文件
    stdin, stdout, stderr = ssh.exec_command(
        f'docker exec {CONTAINER_NAME} ls -la {REMOTE_PATH}/style-app.css {REMOTE_PATH}/index.html'
    )
    output = stdout.read().decode('utf-8')
    print('\n文件验证:')
    print(output)
    
    # 重启容器
    print('重启容器...')
    stdin, stdout, stderr = ssh.exec_command(f'docker restart {CONTAINER_NAME}')
    output = stdout.read().decode('utf-8')
    print(output.strip())
    
    import time
    time.sleep(3)
    
    stdin, stdout, stderr = ssh.exec_command(
        f'docker ps --filter name={CONTAINER_NAME} --format "{{.Status}}"'
    )
    output = stdout.read().decode('utf-8')
    print('容器状态:', output.strip())
    
    ssh.close()
    
    print('\n✅ 部署完成！')
    print('请访问: http://172.28.10.2:8085')
    print('强制刷新: Ctrl+F5 (Windows) / Cmd+Shift+R (Mac)')

if __name__ == '__main__':
    main()
