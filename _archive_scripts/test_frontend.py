
import urllib.request
import re

base_url = 'http://localhost:8085'

def test_url(path):
    url = base_url + path
    try:
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, response.headers.get('Content-Length', '?')
    except Exception as e:
        return None, str(e)

print("Testing frontend files...\n")

files_to_test = [
    '/',
    '/index.html',
    '/js/common.js',
    '/js/photos.js',
    '/js/staff.js',
    '/js/customers.js',
    '/js/records.js',
    '/js/pending.js',
    '/js/salary.js',
    '/js/statistics.js',
    '/js/settings.js',
    '/js/dashboard.js',
    '/js/auth.js',
    '/js/app.js',
    '/style.css',
    '/js/bootstrap.bundle.min.js',
]

for path in files_to_test:
    status, size = test_url(path)
    if status == 200:
        print(f"✅ {path:40s} - {status} - {size} bytes")
    else:
        print(f"❌ {path:40s} - {status} - {size}")

print("\nTesting API login...")
import json
import urllib.request

url = base_url + '/api/auth/login'
data = json.dumps({'username': 'admin', 'password': 'admin123'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(req, timeout=10) as response:
        result = json.loads(response.read().decode('utf-8'))
        print(f"✅ Login API - Status: {response.status}")
        print(f"   Token: {result.get('token', '')[:50]}...")
except Exception as e:
    print(f"❌ Login API Error: {e}")
