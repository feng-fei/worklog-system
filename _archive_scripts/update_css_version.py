
import re

html_path = '/app/frontend/index.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 更新 CSS 版本号
old_css = 'style.css?v=20260711-app49'
new_css = 'style.css?v=20260711-salary-grid'
content = content.replace(old_css, new_css)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ CSS 版本号已更新")
print(f"  旧版本: {old_css}")
print(f"  新版本: {new_css}")
