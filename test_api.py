import paramiko, json
host='172.28.10.2';pw='feng1021'
ssh=paramiko.SSHClient();ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host,port=22,username='root',password=pw,timeout=10)
def run(cmd):
    stdin,stdout,stderr=ssh.exec_command(cmd)
    return stdout.read().decode('utf-8',errors='replace'),stderr.read().decode('utf-8',errors='replace'),stdout.channel.recv_exit_status()

# login
o,e,rc=run("""curl -s -X POST http://localhost:8085/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}'""")
login=json.loads(o);token=login.get('token','')
print('Login:', 'OK' if token else 'FAIL')

# test record creation with minimal fields
create_data = json.dumps({
    "customer_name": "测试客户",
    "work_address": "测试地址",
    "work_date": "2026-07-16",
    "work_content": "测试工单内容",
    "record_type": "repair",
    "staff_names": "冯飞",
    "labor_fee": 0,
    "material_fee": 0,
    "transport_fee": 0,
    "other_fee": 0,
    "total_fee": 0,
    "work_photos": "",
    "fee_items": json.dumps([]),
    "priority": "medium"
})
cmd = f"""curl -s -X POST http://localhost:8085/api/records -H 'Content-Type: application/json' -H 'Authorization: Bearer {token}' -d '{create_data}'"""
o,e,rc=run(cmd)
print('Create record response:', o[:500])
if e: print('STDERR:', e[:200])

# Test templates
o,e,rc=run(f"""curl -s http://localhost:8085/api/templates -H 'Authorization: Bearer {token}'""")
try:
    ts=json.loads(o)
    print(f'\nTemplates: {len(ts) if isinstance(ts,list) else "not array"} templates')
    if isinstance(ts,list) and ts:
        print('First template keys:', list(ts[0].keys())[:15])
except:
    print('Templates parse error:', o[:200])

ssh.close()
