
import re

index_path = '/app/frontend/index.html'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

version = 'v=20260711-split1'

def add_version(match):
    src = match.group(1)
    if '?' in src:
        return f'<script src="{src}&{version}"></script>'
    else:
        return f'<script src="{src}?{version}"></script>'

content = re.sub(
    r'<script src="(js/[^"]+\.js)"></script>',
    add_version,
    content
)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ JS 文件版本号已添加")

scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\'][^>]*></script>', content)
print("\n更新后的 script 列表:")
for s in scripts:
    print(f"  {s}")
