#!/usr/bin/env python3
"""修复维修表单字段显示问题"""
import re

# 读取文件
with open('/app/frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 移除 repairFields 的 is-0 类
old = '<div id="repairFields" class="is-0">'
new = '<div id="repairFields">'
if old in content:
    content = content.replace(old, new)
    print(f"✓ 已移除 repairFields 的 is-0 类")
else:
    print(f"- repairFields 没有 is-0 类或已修复")

# 同时检查 repairIncompleteBox 是否也有同样问题
old2 = '<div class="col-12 is-0" id="repairIncompleteBox">'
new2 = '<div class="col-12" id="repairIncompleteBox">'
if old2 in content:
    content = content.replace(old2, new2)
    print(f"✓ 已移除 repairIncompleteBox 的 is-0 类")

# 写回文件
with open('/app/frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ 修复完成")
