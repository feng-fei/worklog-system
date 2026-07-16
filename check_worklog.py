import paramiko
import sys

HOST = "172.28.10.2"
PORT = 22
USER = "root"
PASSWORD = "feng1021"
CONTAINER = "worklog"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("=" * 70)
print("SSH 连接 NAS (172.28.10.2) 中...")
print("=" * 70)

try:
    ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=15)
    print("SSH 连接成功！\n")
except Exception as e:
    print(f"SSH 连接失败: {e}")
    sys.exit(1)

def exec_command(cmd, label=""):
    if label:
        print("\n" + "=" * 70)
        print(f">>> {label}")
        print("=" * 70)
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    if out:
        print(out)
    if err:
        print(f"[STDERR] {err}")
    return out

# ===== 1. 列出 /app/ 下所有文件 =====
exec_command(
    f"docker exec {CONTAINER} sh -c \"find /app -type f \\( -name '*.py' -o -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.json' -o -name '*.txt' -o -name '*.sql' -o -name '*.sqlite' \\) | sort\"",
    "1. /app/ 下所有文件"
)

# ===== 2. 列出 /app/ 下所有目录 =====
exec_command(
    f"docker exec {CONTAINER} sh -c \"find /app -type d | sort\"",
    "2. /app/ 下所有目录"
)

# ===== 3. 每个 .py 文件头5行 =====
exec_command(
    f"docker exec {CONTAINER} sh -c 'for f in $(find /app -name \"*.py\" -type f | sort); do echo \"=== $f ===\"; head -5 \"$f\"; echo; done'",
    "3. 每个 .py 文件头5行"
)

# ===== 4. 检查 sqlite 数据库文件 =====
exec_command(
    f"docker exec {CONTAINER} sh -c \"find /app -name '*.sqlite' -o -name '*.db' | xargs ls -la 2>/dev/null; echo '---'; find /app -name '*.sqlite' -o -name '*.db'\"",
    "4. 检查 sqlite 数据库文件"
)

# ===== 5. /app/frontend/ 完整列表 =====
exec_command(
    f"docker exec {CONTAINER} sh -c \"ls -la /app/frontend/ 2>&1\"",
    "5. /app/frontend/ 目录完整列表"
)

# ===== 6. /app/app/ 完整列表 =====
exec_command(
    f"docker exec {CONTAINER} sh -c \"ls -la /app/app/ 2>&1\"",
    "6. /app/app/ 目录完整列表"
)

# ===== 7. 确认登录 API 路径 =====
exec_command(
    f"docker exec {CONTAINER} sh -c \"grep -rn 'auth/login\\|api/login' /app/app/ 2>/dev/null | head -10\"",
    "7. 登录 API 路径 (auth/login 或 api/login)"
)

# ===== 8. Dockerfile 或构建信息 =====
exec_command(
    f"docker exec {CONTAINER} sh -c \"cat /app/Dockerfile 2>/dev/null || echo 'No Dockerfile found'\"",
    "8. Dockerfile 内容"
)

ssh.close()
print("\n" + "=" * 70)
print("检查完毕！SSH 连接已关闭。")
print("=" * 70)
