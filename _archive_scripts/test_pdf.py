import requests, json

# Login
r = requests.post('http://localhost:8085/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
data = r.json()
token = data.get('token', '')
print('Token:', token[:20] + '...' if token else 'FAILED')

# Find a repair record
r = requests.get('http://localhost:8085/api/records?page=1&per_page=10', headers={'Authorization': f'Bearer {token}'})
data = r.json()
records = data.get('records', data.get('data', []))
repair_id = None
for rec in records:
    if rec.get('record_type') == 'repair':
        repair_id = rec['id']
        print('Found repair record:', rec.get('order_no'), rec.get('customer_name'))
        break
print('Repair ID:', repair_id)

if repair_id:
    r = requests.get(f'http://localhost:8085/api/repair-pdf/{repair_id}', headers={'Authorization': f'Bearer {token}'})
    print('Status:', r.status_code)
    if r.status_code == 200:
        print('PDF size:', len(r.content), 'bytes')
        print('Content-Type:', r.headers.get('Content-Type'))
        # Save for inspection
        with open('/tmp/test_output.pdf', 'wb') as f:
            f.write(r.content)
        print('Saved to /tmp/test_output.pdf')
    else:
        print('Error:', r.text[:500])
else:
    print('No repair records found, checking all records...')
    for rec in records:
        print(f"  ID={rec.get('id')} type={rec.get('record_type')} no={rec.get('order_no')}")