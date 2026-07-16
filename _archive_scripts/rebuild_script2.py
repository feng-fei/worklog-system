#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""重建Script #2，提取唯一函数并按正确顺序组织"""

import re

HTML_FILE = r'c:\Users\Administrator\Documents\traework\index.html'

def extract_function(lines, start_idx):
    """从start_idx行开始提取一个完整的函数定义"""
    result = [lines[start_idx]]
    brace_count = 0
    first_line = True
    for i in range(start_idx + 1, len(lines)):
        result.append(lines[i])
        for ch in lines[i]:
            if ch == '{':
                brace_count += 1
            elif ch == '}':
                brace_count -= 1
        if first_line:
            first_line = False
            for ch in lines[start_idx]:
                if ch == '{':
                    brace_count += 1
                elif ch == '}':
                    brace_count -= 1
        if brace_count <= 0 and '{' in lines[start_idx]:
            break
    return result

def main():
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # 找到第二个script标签（第一个内联script）
    # 它在bootstrap.bundle.min.js之后
    bootstrap_idx = html.find('<script src="js/bootstrap.bundle.min.js">')
    if bootstrap_idx == -1:
        print('❌ 找不到bootstrap script')
        return
    
    # 找到下一个<script>
    script_start = html.find('<script>', bootstrap_idx)
    if script_start == -1:
        print('❌ 找不到目标script标签')
        return
    
    script_end = html.find('</script>', script_start)
    if script_end == -1:
        print('❌ 找不到script结束标签')
        return
    
    old_content = html[script_start + 8:script_end]
    lines = old_content.split('\n')
    print(f'原始Script #2: {len(lines)} 行, {len(old_content)} 字符')
    
    # 找出所有函数定义
    func_defs = []  # (line_idx, func_name, func_code)
    seen_names = set()
    
    for i, line in enumerate(lines):
        m = re.match(r'^function (\w+)\s*\(', line)
        if m:
            name = m.group(1)
            if name not in seen_names:
                seen_names.add(name)
                func_code = extract_function(lines, i)
                func_defs.append((i, name, '\n'.join(func_code)))
    
    print(f'\n唯一函数: {len(func_defs)} 个')
    for idx, name, code in func_defs[:10]:
        print(f'  {name} (第{idx+1}行)')
    if len(func_defs) > 10:
        print(f'  ... 还有 {len(func_defs) - 10} 个')
    
    # 找出所有非函数的顶层代码（变量声明、事件监听等）
    # 这部分比较复杂，我们先收集变量声明
    var_declarations = []
    event_listeners = []
    other_top_level = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        # 跳过函数定义
        is_func = False
        for fidx, fname, fcode in func_defs:
            if fidx == i:
                i += len(fcode.split('\n'))
                is_func = True
                break
        if is_func:
            continue
        
        stripped = line.strip()
        if re.match(r'^(let|var|const)\s+\w+', stripped):
            var_declarations.append(line)
        elif stripped.startswith('document.addEventListener'):
            # 收集整个事件监听器代码块
            block = [line]
            brace_count = 0
            for ch in line:
                if ch == '{':
                    brace_count += 1
                elif ch == '}':
                    brace_count -= 1
            j = i + 1
            while j < len(lines) and brace_count > 0:
                block.append(lines[j])
                for ch in lines[j]:
                    if ch == '{':
                        brace_count += 1
                    elif ch == '}':
                        brace_count -= 1
                j += 1
            event_listeners.append(('\n'.join(block), i))
            i = j
            continue
        
        i += 1
    
    print(f'\n变量声明: {len(var_declarations)} 行')
    print(f'事件监听器: {len(event_listeners)} 个')
    
    # 现在构建新的script内容
    # 结构：
    # 1. 变量声明（去重）
    # 2. 所有函数（按第一次出现顺序）
    # 3. 事件监听器和其他初始化代码（去重）
    
    new_lines = []
    
    # 1. 变量声明（去重，按第一次出现顺序）
    seen_vars = set()
    for line in var_declarations:
        stripped = line.strip()
        if stripped not in seen_vars:
            seen_vars.add(stripped)
            new_lines.append(line)
    
    new_lines.append('')
    new_lines.append('')
    
    # 2. 所有函数
    for idx, name, code in func_defs:
        new_lines.append(code)
        new_lines.append('')
        new_lines.append('')
    
    # 3. 事件监听器（去重）
    seen_listeners = set()
    for code, idx in event_listeners:
        # 用代码的前50字符作为key来去重
        key = code.strip()[:80]
        if key not in seen_listeners:
            seen_listeners.add(key)
            new_lines.append(code)
            new_lines.append('')
    
    new_content = '\n'.join(new_lines)
    print(f'\n新Script #2: {len(new_lines)} 行, {len(new_content)} 字符')
    
    # 检查语法
    try:
        import subprocess
        import tempfile
        import os
        
        tmpfile = os.path.join(tempfile.gettempdir(), '_check_script.js')
        with open(tmpfile, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        result = subprocess.run(['node', '--check', tmpfile], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print('✅ 语法检查通过')
        else:
            print(f'❌ 语法错误: {result.stderr[:300]}')
            return
    except Exception as e:
        print(f'无法检查语法: {e}')
    
    # 替换回html
    new_html = html[:script_start + 8] + new_content + html[script_end:]
    
    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(new_html)
    
    print('\n✅ Script #2 重建完成')

if __name__ == '__main__':
    main()
