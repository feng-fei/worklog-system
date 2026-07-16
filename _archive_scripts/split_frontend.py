
import os
import re

script_path = '/app/frontend/script.js'
output_dir = '/app/frontend/js'

os.makedirs(output_dir, exist_ok=True)

with open(script_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

section_starts = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('// =====') and '=====' in stripped:
        match = re.search(r'//\s*=+\s*(.+?)\s*=+', stripped)
        if match:
            section_name = match.group(1).strip()
            section_starts.append((i, section_name))
            print(f"  Line {i+1}: {section_name}")

module_map = [
    ('common.js', [
        '认证管理',
        '性能工具',
    ]),
    ('app.js', [
        '初始化',
        'Tab 切换',
        '全局模态框',
        '手机端菜单交互',
    ]),
    ('staff.js', [
        '员工管理',
    ]),
    ('customers.js', [
        '客户管理',
    ]),
    ('records.js', [
        '记录类型切换',
        '工作记录',
        '查询',
        '工作记录详情',
        '编辑记录（含照片增删）',
        '工单状态变更',
    ]),
    ('pending.js', [
        '待办事项',
        '超期待办高亮',
    ]),
    ('salary.js', [
        '工资记录',
    ]),
    ('statistics.js', [
        '统计',
    ]),
    ('photos.js', [
        '照片查看器（居中控件）',
    ]),
    ('settings.js', [
        '公司设置',
        '数据备份',
    ]),
    ('dashboard.js', [
        '仪表盘',
        '日历',
    ]),
    ('auth.js', [
        '登录处理',
    ]),
]

def find_section_end(start_idx):
    for i in range(start_idx + 1, len(lines)):
        stripped = lines[i].strip()
        if stripped.startswith('// =====') and '=====' in stripped:
            return i
    return len(lines)

modules_content = {}
for filename, _ in module_map:
    modules_content[filename] = []

header_lines = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('// =====') and '=====' in stripped:
        break
    header_lines.append(line)

modules_content['common.js'] = header_lines.copy()

for filename, sections in module_map:
    for section_name in sections:
        found = False
        for start_idx, sname in section_starts:
            if sname == section_name:
                end_idx = find_section_end(start_idx)
                section_lines = lines[start_idx:end_idx]
                modules_content[filename].extend(section_lines)
                modules_content[filename].append('\n')
                found = True
                break
        if not found:
            print(f"  WARNING: Section '{section_name}' not found for {filename}")

total_out = 0
for filename, content_lines in modules_content.items():
    filepath = os.path.join(output_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(content_lines)
    line_count = len(content_lines)
    total_out += line_count
    print(f"Created {filename}: {line_count} lines")

print(f"Total output lines: {total_out}")
print(f"Original lines: {len(lines)}")
print("Done!")
