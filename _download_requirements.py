import paramiko

NAS_HOST = '172.28.10.2'
NAS_USER = 'root'
NAS_PASS = 'feng1021'
NAS_REMOTE_PATH = '/vol1/1000/docker/worklog-code/new-worklog0517/'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS, timeout=30)

sftp = ssh.open_sftp()
sftp.get(NAS_REMOTE_PATH + 'backend/requirements.txt', 'backend/requirements.txt')
sftp.close()
print('requirements.txt 已下载到 backend/')

ssh.close()
