
import os
import re

script_path = '/app/frontend/script.js'
output_dir = '/app/frontend/js'

os.makedirs(output_dir, exist_ok=True)

with open(script_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

def is_main_section(line):
    stripped = line.strip()
    if not stripped.startswith('// '):
        return False
    if '=====' not in stripped:
        return False
    match = re.match(r'//\s*=+\s*(.+?)\s*=+\s*$', stripped)
    if not match:
        return False
    name = match.group(1).strip()
    if name.startswith('自定义'):
        return False
    return name

section_starts = []
for i, line in enumerate(lines):
    name = is_main_section(line)
    if name:
        section_starts.append((i, name))
        print(f"  Line {i+1}: {name}")

print(f"\nTotal sections: {len(section_starts)}")

module_defs = [
    {
        'filename': 'common.js',
        'include_header': True,
        'sections': ['认证管理', '性能工具'],
    },
    {
        'filename': 'app.js',
        'include_header': False,
        'sections': ['初始化', 'Tab 切换', '全局模态框', '手机端菜单交互'],
    },
    {
        'filename': 'staff.js',
        'include_header': False,
        'sections': ['员工管理'],
    },
    {
        'filename': 'customers.js',
        'include_header': False,
        'sections': ['客户管理'],
    },
    {
        'filename': 'records.js',
        'include_header': False,
        'sections': ['记录类型切换', '工作记录', '查询', '工作记录详情', '编辑记录（含照片增删）', '工单状态变更'],
    },
    {
        'filename': 'pending.js',
        'include_header': False,
        'sections': ['待办事项', '超期待办高亮'],
    },
    {
        'filename': 'salary.js',
        'include_header': False,
        'sections': ['工资记录'],
    },
    {
        'filename': 'statistics.js',
        'include_header': False,
        'sections': ['统计'],
    },
    {
        'filename': 'photos.js',
        'include_header': False,
        'sections': ['照片查看器（居中控件）'],
    },
    {
        'filename': 'settings.js',
        'include_header': False,
        'sections': ['公司设置', '数据备份'],
    },
    {
        'filename': 'dashboard.js',
        'include_header': False,
        'sections': ['仪表盘', '日历'],
    },
    {
        'filename': 'auth.js',
        'include_header': False,
        'sections': ['登录处理'],
    },
]

def find_section_end(start_idx):
    for i in range(start_idx + 1, len(lines)):
        if is_main_section(lines[i]):
            return i
    return len(lines)

first_section_line = section_starts[0][0]
header_lines = lines[:first_section_line]

section_contents = {}
for start_idx, section_name in section_starts:
    end_idx = find_section_end(start_idx)
    section_contents[section_name] = lines[start_idx:end_idx]
    print(f"  Section '{section_name}': {end_idx - start_idx} lines (lines {start_idx+1}-{end_idx})")

print()

modules_content = {}

for mod_def in module_defs:
    filename = mod_def['filename']
    content = []
    
    if mod_def['include_header']:
        content.extend(header_lines)
        content.append('\n')
    
    for section_name in mod_def['sections']:
        if section_name in section_contents:
            content.extend(section_contents[section_name])
            content.append('\n')
        else:
            print(f"  WARNING: Section '{section_name}' not found for {filename}")
    
    modules_content[filename] = content

total_out = 0
for filename, content_lines in modules_content.items():
    filepath = os.path.join(output_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(content_lines)
    line_count = len(content_lines)
    total_out += line_count
    print(f"Created {filename}: {line_count} lines")

print(f"\nTotal output lines: {total_out}")
print(f"Original lines: {len(lines)}")
print(f"Header lines: {len(header_lines)}")
print("Done!")
