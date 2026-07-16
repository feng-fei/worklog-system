import urllib.request, json, sys

BASE = 'http://localhost:8085'

# Login
req = urllib.request.Request(f'{BASE}/api/auth/login',
    data=json.dumps({'username': 'admin', 'password': 'admin123'}).encode(),
    headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
token = data.get('token', '')
print('Token:', token[:20] + '...' if token else 'FAILED')

if not token:
    print('Login failed:', data)
    sys.exit(1)

# Find a repair record
req = urllib.request.Request(f'{BASE}/api/records?page=1&per_page=10',
    headers={'Authorization': f'Bearer {token}'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
records = data.get('records', data.get('data', []))
repair_id = None
for rec in records:
    if rec.get('record_type') == 'repair':
        repair_id = rec['id']
        print('Found repair record:', rec.get('order_no'), rec.get('customer_name'))
        break
print('Repair ID:', repair_id)

if not repair_id:
    print('No repair records found. Available records:')
    for rec in records[:5]:
        print(f"  ID={rec.get('id')} type={rec.get('record_type')} no={rec.get('order_no')}")
    sys.exit(1)

# Test PDF
req = urllib.request.Request(f'{BASE}/api/repair-pdf/{repair_id}',
    headers={'Authorization': f'Bearer {token}'})
try:
    resp = urllib.request.urlopen(req)
    pdf_data = resp.read()
    print('Status:', resp.status)
    print('PDF size:', len(pdf_data), 'bytes')
    print('Content-Type:', resp.headers.get('Content-Type'))
    with open('/tmp/test_output.pdf', 'wb') as f:
        f.write(pdf_data)
    print('Saved to /tmp/test_output.pdf')
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code)
    print('Response:', e.read().decode()[:500])