
import re

index_path = '/app/frontend/index.html'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_script_pattern = r'<script[^>]*src=["\']app\.min\.js[^"\']*["\'][^>]*></script>'

new_scripts = '''<script src="js/common.js"></script>
    <script src="js/photos.js"></script>
    <script src="js/staff.js"></script>
    <script src="js/customers.js"></script>
    <script src="js/records.js"></script>
    <script src="js/pending.js"></script>
    <script src="js/salary.js"></script>
    <script src="js/statistics.js"></script>
    <script src="js/settings.js"></script>
    <script src="js/dashboard.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/app.js"></script>'''

match = re.search(old_script_pattern, content)
if match:
    old = match.group(0)
    print(f"Found old script: {old}")
    content = content.replace(old, new_scripts)
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ index.html 更新成功")
else:
    print("❌ 未找到 app.min.js 的引用")
    
    scripts = re.findall(r'<script[^>]*src=["\'][^"\']+["\'][^>]*></script>', content)
    print("\n当前所有 script 引用:")
    for s in scripts:
        print(f"  {s}")
