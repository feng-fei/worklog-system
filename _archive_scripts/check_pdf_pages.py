with open('/tmp/test_output.pdf', 'rb') as f:
    data = f.read()

# Count pages by looking for /Type /Page entries (not /Pages)
import re
pages = len(re.findall(rb'/Type\s*/Page[^s]', data))
print(f'PDF size: {len(data)} bytes')
print(f'Page count: {pages}')

# Also check /Count in the page tree
counts = re.findall(rb'/Count\s+(\d+)', data)
for c in counts:
    print(f'/Count: {c.decode()}')
