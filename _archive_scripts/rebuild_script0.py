#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""重建Script #0，使用enhance_frontend.py中的正确代码"""

import re

HTML_FILE = r'c:\Users\Administrator\Documents\traework\index.html'
ENHANCE_FILE = r'c:\Users\Administrator\Documents\traework\enhance_frontend.py'

# 1. 从enhance_frontend.py中提取new_js变量的内容
# 需要通过Python执行来正确解析转义字符
with open(ENHANCE_FILE, 'r', encoding='utf-8') as f:
    enhance_content = f.read()

enhance_lines = enhance_content.split('\n')

# 用exec来执行new_js的赋值
exec_globals = {}
# 找到new_js = ''' 到 ''' 的完整Python代码行
start_idx = None
end_idx = None
for i, line in enumerate(enhance_lines):
    if line.startswith("new_js = '''"):
        start_idx = i
    if start_idx is not None and i > start_idx and line.rstrip().endswith("'''"):
        # 检查是不是结束（行末是'''）
        # 结束的行应该是 // ========== 简化分页组件 =========='''
        if '简化分页组件' in line or line.strip() == "'''":
            end_idx = i
            break

if start_idx is not None and end_idx is not None:
    new_js_code = '\n'.join(enhance_lines[start_idx:end_idx+1])
    # 执行这段代码
    exec(new_js_code, exec_globals)
    new_js_content = exec_globals.get('new_js', '')
    print(f'✅ 从enhance_frontend.py提取了 {len(new_js_content)} 字符的代码（已正确转义）')
else:
    print(f'❌ 找不到new_js的完整定义 (start={start_idx}, end={end_idx})')
    exit(1)

# 2. 从当前Script #0中提取批量操作的7个函数
with open(HTML_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# 找到第一个内联script标签
bootstrap_idx = html.find('<script src="js/bootstrap.bundle.min.js">')
script_start = html.find('<script>', bootstrap_idx)
script_end = html.find('</script>', script_start)
old_script_content = html[script_start + 8:script_end]

print(f'✅ 当前Script #0: {len(old_script_content)} 字符')

# 提取批量操作相关的函数
# 从 _renderSimplePagination 开始，到文件末尾（但要去掉多余的代码）
batch_start_marker = '// ========== 简化分页组件 =========='
batch_start = old_script_content.find(batch_start_marker)
if batch_start == -1:
    print('❌ 找不到批量操作代码的开始')
    exit(1)

batch_content_raw = old_script_content[batch_start:]
print(f'✅ 批量操作区域: {len(batch_content_raw)} 字符')

# 找出batch_content_raw中的函数定义
batch_funcs = re.findall(r'^function\s+(\w+)\s*\(', batch_content_raw, re.MULTILINE)
print(f'   批量操作区域的函数: {batch_funcs}')

# 我们需要提取 _renderSimplePagination, _initBatchOperation, _addCheckboxesToCards, 
# _toggleRecordSelect, _updateBatchUI, batchUpdateStatus, batchDeleteRecords 这7个函数
# 但需要确保这些函数是正确的

# 让我们先提取前7个函数（应该就是我们需要的）
def extract_functions(code, func_names):
    """从代码中提取指定的函数"""
    lines = code.split('\n')
    result_lines = []
    found_funcs = set()
    
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r'^function\s+(\w+)\s*\(', line)
        if m and m.group(1) in func_names and m.group(1) not in found_funcs:
            func_name = m.group(1)
            found_funcs.add(func_name)
            # 提取整个函数
            brace_count = 0
            started = False
            j = i
            while j < len(lines):
                for ch in lines[j]:
                    if ch == '{':
                        brace_count += 1
                        started = True
                    elif ch == '}':
                        brace_count -= 1
                result_lines.append(lines[j])
                if started and brace_count == 0:
                    break
                j += 1
            result_lines.append('')
            result_lines.append('')
            i = j + 1
        else:
            i += 1
    
    return '\n'.join(result_lines), found_funcs

batch_func_names = ['_renderSimplePagination', '_initBatchOperation', '_addCheckboxesToCards',
                    '_toggleRecordSelect', '_updateBatchUI', 'batchUpdateStatus', 'batchDeleteRecords']

batch_functions, found = extract_functions(batch_content_raw, batch_func_names)
print(f'✅ 提取了 {len(found)} 个批量操作函数: {found}')

# 检查batchDeleteRecords是否正确（之前发现它有问题）
# 让我们重新从batch_content_raw中找一个正确的batchDeleteRecords
# 实际上，让我们直接用node检查每个函数的语法
import subprocess
import tempfile
import os

tmpfile = os.path.join(tempfile.gettempdir(), '_check_batch.js')

# 先检查batch_functions的语法
with open(tmpfile, 'w', encoding='utf-8') as f:
    f.write(batch_functions)

result = subprocess.run(['node', '--check', tmpfile], capture_output=True, text=True, timeout=10)
if result.returncode == 0:
    print('✅ 批量操作函数语法正确')
else:
    print(f'❌ 批量操作函数有语法错误: {result.stderr[:200]}')
    # batchDeleteRecords可能有问题，让我们看看能不能修复它
    # 从之前的分析，batchDeleteRecords函数本身应该是好的，问题可能在它后面的代码

# 3. 构建新的Script #0内容
new_script_parts = []

# 添加变量声明和所有功能函数（来自enhance_frontend.py）
new_script_parts.append(new_js_content)
new_script_parts.append('')

# 添加批量操作函数（带变量声明）
batch_vars = '''// ========== 批量操作 ==========
var _selectedRecordIds = [];
var _batchObserver = null;

'''
new_script_parts.append(batch_vars)
new_script_parts.append(batch_functions)
new_script_parts.append('')

# 添加switchTab包装代码（一份，正确的）
# 这个应该在函数外部
switch_tab_code = '''// 包装switchTab函数以添加数据加载
if (typeof window.switchTab === 'function') {
    var _originalSwitchTab = window.switchTab;
    window.switchTab = function(tabId) {
        _originalSwitchTab.apply(this, arguments);
        // 延迟加载各页面数据
        setTimeout(function() {
            if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
            if (tabId === 'tab-templates') { loadTemplates(); }
            if (tabId === 'tab-projects') { loadProjects(); }
            if (tabId === 'tab-materials') { loadMaterials(); }
            if (tabId === 'tab-equipments') { loadEquipments(); }
            if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
            if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
            if (tabId === 'tab-notifications') { loadNotifySettings(); }
        }, 50);
    };
}
'''
new_script_parts.append(switch_tab_code)
new_script_parts.append('')

# 添加DOMContentLoaded初始化代码
# 1. 初始化模态框
# 2. 初始化批量操作
# 3. 模板费用计算绑定
init_code = '''// 初始化模态框
document.addEventListener('DOMContentLoaded', function() {
    _initModals();
});

// 初始化批量操作
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(_initBatchOperation, 500);
});

// 模板费用计算绑定
document.addEventListener('DOMContentLoaded', function() {
    ['templateLaborFee', 'templateMaterialFee', 'templateTransportFee', 'templateOtherFee', 'templateTaxType', 'templateTaxRate'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', _calcTemplateTotal);
    });
    var tplType = document.getElementById('templateType');
    if (tplType) tplType.addEventListener('change', _toggleTemplateType);
});
'''
new_script_parts.append(init_code)

new_script_content = '\n'.join(new_script_parts)
print(f'\n新Script #0总长度: {len(new_script_content)} 字符')

# 4. 检查语法
with open(tmpfile, 'w', encoding='utf-8') as f:
    f.write(new_script_content)

result = subprocess.run(['node', '--check', tmpfile], capture_output=True, text=True, timeout=10)
if result.returncode == 0:
    print('✅ 语法检查通过！')
else:
    print(f'❌ 语法错误: {result.stderr[:300]}')
    exit(1)

# 5. 替换HTML中的Script #0
new_html = html[:script_start + 8] + new_script_content + html[script_end:]

with open(HTML_FILE, 'w', encoding='utf-8') as f:
    f.write(new_html)

print('\n✅ Script #0 重建完成！')
