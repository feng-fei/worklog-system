import paramiko
import os
from pathlib import Path

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_REMOTE_PATH = '/vol1/1000/docker/worklog-code/new-worklog0517/'
LOCAL_MOBILE_DIST = Path(__file__).parent / 'frontend-mobile' / 'dist'
LOCAL_BACKEND = Path(__file__).parent / 'backend'


def deploy():
    print(f'连接NAS: {NAS_HOST}...')
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)
    print('SSH连接成功')

    sftp = ssh.open_sftp()

    # 1. 上传 mobile 前端
    remote_mobile_dir = NAS_REMOTE_PATH + 'frontend-mobile'
    print(f'\n=== 上传 mobile 前端到 {remote_mobile_dir} ===')
    ssh.exec_command(f'mkdir -p {remote_mobile_dir}/assets')

    def upload_dir(local_dir: Path, remote_dir_path: str):
        count = 0
        for item in sorted(local_dir.iterdir()):
            if item.is_file():
                rel_path = item.name
                remote_file = f'{remote_dir_path}/{rel_path}'
                print(f'  上传: {rel_path} ({item.stat().st_size // 1024} KB)')
                sftp.put(str(item), remote_file)
                count += 1
            elif item.is_dir():
                sub_remote = f'{remote_dir_path}/{item.name}'
                ssh.exec_command(f'mkdir -p {sub_remote}')
                count += upload_dir(item, sub_remote)
        return count

    total = upload_dir(LOCAL_MOBILE_DIST, remote_mobile_dir)
    print(f'mobile 前端上传完成，共 {total} 个文件')

    # 2. 上传后端 static_handler.py
    print(f'\n=== 上传后端 static_handler.py ===')
    sftp.put(
        str(LOCAL_BACKEND / 'static_handler.py'),
        NAS_REMOTE_PATH + 'backend/static_handler.py'
    )
    print('static_handler.py 上传完成')

    sftp.close()

    # 3. 重建 Docker 镜像并重启
    print('\n=== 重建 Docker 镜像 ===')
    stdin, stdout, stderr = ssh.exec_command(
        f'cd {NAS_REMOTE_PATH} && DOCKER_BUILDKIT=0 docker build -f Dockerfile.flask -t worklog-flask:alpine3 . 2>&1',
        get_pty=True
    )
    for line in stdout:
        line = line.strip()
        if line and ('Step' in line or 'Successfully' in line or 'error' in line.lower() or 'ERROR' in line):
            print(f'  {line}')
    err = stderr.read().decode()
    if err:
        print('构建错误:', err[:500])

    print('\n=== 重启容器 ===')
    stdin, stdout, stderr = ssh.exec_command(
        f'cd {NAS_REMOTE_PATH} && docker compose down && docker compose up -d 2>&1',
        get_pty=True
    )
    for line in stdout:
        line = line.strip()
        if line:
            print(f'  {line}')
    err = stderr.read().decode()
    if err:
        print('重启错误:', err[:500])

    import time
    print('\n等待容器启动...')
    time.sleep(5)

    stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}" 2>&1')
    print('\n容器状态:')
    print(stdout.read().decode())

    ssh.close()
    print(f'\n✅ 部署完成!')
    print(f'   PC 端: http://{NAS_HOST}:8085/')
    print(f'   移动端: http://{NAS_HOST}:8085/mobile/')
    print(f'   旧版本: http://{NAS_HOST}:8085/old/')


if __name__ == '__main__':
    deploy()
