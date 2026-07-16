
import re

with open('/app/frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\'][^>]*></script>', content)
print("Script loading order:")
for i, s in enumerate(scripts, 1):
    print(f"  {i}. {s}")
