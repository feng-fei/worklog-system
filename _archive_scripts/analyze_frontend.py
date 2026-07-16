
import re

with open('/app/frontend/index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\'][^>]*>', html_content)
print("Script references in index.html:")
for s in scripts:
    print(f"  {s}")

print()
print("=" * 60)
print()

with open('/app/frontend/script.js', 'r', encoding='utf-8') as f:
    js_content = f.read()
    js_lines = js_content.split('\n')

print(f"script.js total lines: {len(js_lines)}")
print(f"script.js total bytes: {len(js_content.encode('utf-8'))}")

print()
print("Global variables (top-level var/let/const):")
for i, line in enumerate(js_lines[:200]):
    stripped = line.strip()
    if re.match(r'^(var|let|const)\s+\w+', stripped) and not re.match(r'^(var|let|const)\s+\w+\s*=\s*function', stripped):
        print(f"  Line {i+1}: {stripped[:100]}")

print()
print("DOMContentLoaded / window.onload:")
for i, line in enumerate(js_lines):
    if 'DOMContentLoaded' in line or 'window.onload' in line or '$(document).ready' in line:
        print(f"  Line {i+1}: {line.strip()[:100]}")
