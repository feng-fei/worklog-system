
import re

html_path = '/app/frontend/index.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 更新 CSS 版本号
old_css = 'style.css?v=20260711-salary-grid'
new_css = 'style.css?v=20260712-salary-form'
if old_css in content:
    content = content.replace(old_css, new_css)
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ CSS 版本号已更新")
    print(f"  旧版本: {old_css}")
    print(f"  新版本: {new_css}")
else:
    # 尝试找其他版本号
    match = re.search(r'style\.css\?v=([^\'"]+)', content)
    if match:
        old = match.group(0)
        new = 'style.css?v=20260712-salary-form'
        content = content.replace(old, new)
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ CSS 版本号已更新: {old} → {new}")
    else:
        print("⚠️ 未找到 CSS 版本号")
