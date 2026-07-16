import paramiko
import os
from pathlib import Path

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_REMOTE_PATH = '/vol1/1000/docker/worklog-code/new-worklog0517/'
LOCAL_PATH = Path(__file__).parent / 'frontend-vue'

files_to_upload = [
    'css/theme.css',
    'css/style.css',
    'css/modern.css',
    'index.html',
    'js/store.js',
    'js/app.js',
    'js/views/Layout.js',
    'js/views/Dashboard.js',
    'js/views/RecordList.js',
]

def deploy():
    print(f'连接NAS: {NAS_HOST}...')
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)
    print('SSH连接成功')

    sftp = ssh.open_sftp()

    for rel_path in files_to_upload:
        local_file = LOCAL_PATH / rel_path
        remote_file = NAS_REMOTE_PATH + 'frontend-vue/' + rel_path

        remote_dir = os.path.dirname(remote_file)
        try:
            sftp.stat(remote_dir)
        except IOError:
            print(f'创建目录: {remote_dir}')
            ssh.exec_command(f'mkdir -p {remote_dir}')

        print(f'上传: {rel_path}')
        sftp.put(str(local_file), remote_file)

    sftp.close()
    print('文件上传完成')

    print('重建Docker镜像...')
    stdin, stdout, stderr = ssh.exec_command(
        f'cd {NAS_REMOTE_PATH} && DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t worklog-flask:alpine3 . 2>&1',
        get_pty=True
    )
    for line in stdout:
        print(line.strip())
    err = stderr.read().decode()
    if err:
        print('构建错误:', err[:500])

    print('重启容器...')
    stdin, stdout, stderr = ssh.exec_command(
        f'cd {NAS_REMOTE_PATH} && docker compose down && docker compose up -d 2>&1',
        get_pty=True
    )
    for line in stdout:
        print(line.strip())
    err = stderr.read().decode()
    if err:
        print('重启错误:', err[:500])

    print('等待容器启动...')
    import time
    time.sleep(3)

    stdin, stdout, stderr = ssh.exec_command('docker compose ps 2>&1')
    print('容器状态:')
    print(stdout.read().decode())

    ssh.close()
    print('部署完成! 访问: http://172.28.10.2:8085')

if __name__ == '__main__':
    deploy()
