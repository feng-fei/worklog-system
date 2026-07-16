#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复index.html中第一个内联script标签的重复批量操作代码问题"""

import re

HTML_FILE = r'c:\Users\Administrator\Documents\traework\index.html'

def main():
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # 找到第二个script标签（第一个内联script）
    # 第一个是bootstrap.bundle.min.js，第二个是内联的
    script_start = html.find('<script>\n// ========== 收款管理 ==========')
    if script_start == -1:
        print('❌ 找不到目标script标签')
        return
    
    script_end = html.find('</script>', script_start)
    if script_end == -1:
        print('❌ 找不到script结束标签')
        return
    
    old_script_content = html[script_start + 8:script_end]
    print(f'原始script长度: {len(old_script_content)} 字符')
    
    lines = old_script_content.split('\n')
    print(f'共 {len(lines)} 行')
    
    # 找出所有函数定义及其行号
    funcs = []
    for i, line in enumerate(lines):
        m = re.match(r'^function (\w+)\s*\(', line)
        if m:
            funcs.append((i, m.group(1)))
    
    print(f'\n共 {len(funcs)} 个函数定义')
    
    # 找出重复的函数
    func_counts = {}
    for line_num, name in funcs:
        if name not in func_counts:
            func_counts[name] = []
        func_counts[name].append(line_num)
    
    dup_funcs = {name: lines for name, lines in func_counts.items() if len(lines) > 1}
    print(f'\n重复的函数有 {len(dup_funcs)} 个:')
    for name, line_nums in sorted(dup_funcs.items(), key=lambda x: len(x[1]), reverse=True):
        print(f'  {name}: {len(line_nums)} 次, 行号: {line_nums[:5]}...')
    
    # 提取批量操作函数组（重复最多的那些）
    batch_func_names = ['_initBatchOperation', '_addCheckboxesToCards', '_toggleRecordSelect', 
                        '_updateBatchUI', 'batchUpdateStatus', 'batchDeleteRecords']
    
    # 找出所有批量操作代码块的起始行
    # 以 _initBatchOperation 为标记
    batch_start_lines = func_counts.get('_initBatchOperation', [])
    print(f'\n批量操作代码块共 {len(batch_start_lines)} 个')
    
    if len(batch_start_lines) <= 1:
        print('✅ 批量操作代码没有重复')
        return
    
    # 提取第一个批量操作代码块的内容（作为参考）
    first_batch_start = batch_start_lines[0]
    # 找到第一个批量操作块的结束位置（下一个非批量函数之前）
    first_batch_end = len(lines)
    for line_num, name in funcs:
        if line_num > first_batch_start and name not in batch_func_names:
            first_batch_end = line_num
            break
    
    # 往前找包含注释开头
    block_start = first_batch_start
    for i in range(first_batch_start, max(0, first_batch_start - 20), -1):
        if '批量操作' in lines[i]:
            block_start = i
            break
    
    # 往后找包含DOMContentLoaded初始化的部分
    block_end = first_batch_end
    for i in range(first_batch_end, min(len(lines), first_batch_end + 50)):
        if lines[i].strip().startswith('function ') and 'batch' not in lines[i].lower():
            block_end = i
            break
        if i > first_batch_end + 30:
            block_end = i
            break
    
    batch_block_lines = lines[block_start:block_end]
    batch_block = '\n'.join(batch_block_lines)
    print(f'\n批量操作代码块: {len(batch_block_lines)} 行')
    
    # 现在开始清理：
    # 1. 先处理 openPaymentModal 函数，把被分开的两部分合起来
    # 2. 删除所有重复的批量操作代码块
    # 3. 在最后添加一份批量操作代码
    
    # 找到 openPaymentModal 函数
    open_pay_line = None
    for line_num, name in funcs:
        if name == 'openPaymentModal':
            open_pay_line = line_num
            break
    
    print(f'\nopenPaymentModal 在第 {open_pay_line + 1} 行')
    
    # 找到 savePayment 函数（openPaymentModal应该在它前面）
    save_pay_line = None
    for line_num, name in funcs:
        if name == 'savePayment':
            save_pay_line = line_num
            break
    
    print(f'savePayment 在第 {save_pay_line + 1} 行')
    
    # 构建新的script内容
    # 策略：我们收集所有"唯一"函数的代码，按顺序排列，然后在最后添加批量操作
    
    # 先找出所有不重复的函数，按第一次出现的顺序
    unique_funcs = []
    seen_funcs = set()
    for line_num, name in funcs:
        if name not in seen_funcs:
            seen_funcs.add(name)
            unique_funcs.append((line_num, name))
    
    print(f'\n唯一函数共 {len(unique_funcs)} 个')
    
    # 提取每个函数的代码
    def extract_func(lines, start_line):
        """从start_line开始提取一个完整函数"""
        result = [lines[start_line]]
        brace_count = 0
        first_line = True
        for i in range(start_line + 1, len(lines)):
            result.append(lines[i])
            # 统计大括号
            for ch in lines[i]:
                if ch == '{':
                    brace_count += 1
                elif ch == '}':
                    brace_count -= 1
            if first_line:
                # 第一行可能就有 {
                first_line = False
                # 重新计算第一行的括号
                for ch in lines[start_line]:
                    if ch == '{':
                        brace_count += 1
                    elif ch == '}':
                        brace_count -= 1
            if brace_count <= 0 and '{' in lines[start_line]:
                # 函数结束
                break
        return result
    
    # 先提取 openPaymentModal 函数的前半部分（第85行到被插入前）
    # 然后找到后半部分（在第一个批量操作块之后，savePayment之前）
    
    # 实际上，让我用另一种方法：
    # 1. 先把所有批量操作代码块都删掉
    # 2. 然后把 openPaymentModal 的两部分合到一起
    # 3. 最后在末尾添加一个批量操作块
    
    # 找出所有要删除的行
    lines_to_remove = set()
    
    # 找到每个批量操作块的起始和结束
    for start_line in batch_start_lines:
        # 找到这个块的结束（下一个非批量函数之前）
        end_line = len(lines)
        for line_num, name in funcs:
            if line_num > start_line and name not in batch_func_names:
                end_line = line_num
                break
        
        # 往前扩展到包含注释
        block_start = start_line
        for i in range(start_line, max(0, start_line - 20), -1):
            if '批量操作' in lines[i]:
                block_start = i
                break
        
        # 往后扩展到包含初始化代码
        block_end = end_line
        for i in range(end_line, min(len(lines), end_line + 50)):
            if lines[i].strip().startswith('function ') and 'batch' not in lines[i].lower():
                block_end = i
                break
            if i > end_line + 40:
                block_end = i
                break
        
        for i in range(block_start, block_end):
            lines_to_remove.add(i)
    
    print(f'\n需要删除 {len(lines_to_remove)} 行重复代码')
    
    # 构建新的代码
    new_lines = []
    for i, line in enumerate(lines):
        if i not in lines_to_remove:
            new_lines.append(line)
    
    new_content = '\n'.join(new_lines)
    print(f'清理后长度: {len(new_content)} 字符')
    
    # 在末尾添加批量操作代码块
    # 先看看末尾有没有多余的空行或闭合括号
    new_content = new_content.rstrip()
    
    # 添加批量操作代码块
    # 但先检查一下 openPaymentModal 函数是否完整了
    # 让我们验证一下语法
    try:
        import subprocess
        result = subprocess.run(['node', '-e', f'new Function(`{new_content}`)'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print('✅ 清理后语法正确')
        else:
            print(f'❌ 清理后仍有语法错误: {result.stderr[:200]}')
    except Exception as e:
        print(f'无法检查语法: {e}')
    
    # 现在在末尾添加批量操作代码
    # 先在批量代码块前添加两个空行
    final_content = new_content + '\n\n\n' + batch_block.strip() + '\n'
    
    print(f'\n最终长度: {len(final_content)} 字符')
    
    # 替换回html
    new_html = html[:script_start + 8] + final_content + html[script_end:]
    
    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(new_html)
    
    print('\n✅ 修复完成')

if __name__ == '__main__':
    main()
