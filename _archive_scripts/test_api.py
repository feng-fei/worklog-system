
import urllib.request
import json

url = 'http://localhost:8085/api/auth/login'
data = json.dumps({'username': 'admin', 'password': 'admin123'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        print(f"Status: {response.status}")
        result = response.read().decode('utf-8')
        print(f"Response: {result}")
except Exception as e:
    print(f"Error: {e}")

url2 = 'http://localhost:8085/api/test'
try:
    with urllib.request.urlopen(url2, timeout=10) as response:
        print(f"\nTest endpoint status: {response.status}")
        result = response.read().decode('utf-8')
        print(f"Test response: {result}")
except Exception as e:
    print(f"\nTest endpoint error: {e}")
