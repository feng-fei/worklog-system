
import re

css_path = '/app/frontend/style.css'
html_path = '/app/frontend/index.html'

# ========== 1. 读取并修改 CSS ==========
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

css_lines = css.split('\n')
old_css_lines = len(css_lines)

# 找到重复的选择器并合并
# 先收集所有选择器和它们的内容
def find_duplicate_selectors(css_text):
    """找出重复的选择器及其行号"""
    lines = css_text.split('\n')
    selectors = {}  # selector -> list of (start_line, end_line, content_lines)
    
    current_selector = None
    current_start = None
    current_content = []
    brace_count = 0
    in_media = False
    media_context = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # 媒体查询
        if stripped.startswith('@media') and '{' in stripped:
            media_context.append(stripped)
            in_media = True
            i += 1
            continue
        if stripped == '}' and in_media and brace_count == 0:
            media_context.pop()
            if not media_context:
                in_media = False
            i += 1
            continue
        
        # 选择器行
        if stripped.endswith('{') and not stripped.startswith('@') and not in_media:
            sel = stripped[:-1].strip()
            current_selector = sel
            current_start = i
            current_content = []
            brace_count = 1
            i += 1
            continue
        
        # 规则内容
        if current_selector is not None:
            current_content.append(line)
            if '{' in stripped:
                brace_count += stripped.count('{')
            if '}' in stripped:
                brace_count -= stripped.count('}')
                if brace_count == 0:
                    # 规则结束
                    key = current_selector
                    if key not in selectors:
                        selectors[key] = []
                    selectors[key].append({
                        'start': current_start,
                        'end': i,
                        'content': current_content[:-1],  # 去掉最后一行的 }
                        'last_line': current_content[-1]
                    })
                    current_selector = None
                    current_start = None
                    current_content = []
        
        i += 1
    
    return selectors

selectors = find_duplicate_selectors(css)

print("=== 重复选择器清单 ===")
dupes = {k: v for k, v in selectors.items() if len(v) > 1}
for sel, occurrences in sorted(dupes.items(), key=lambda x: -len(x[1])):
    print(f"\n选择器: {sel}")
    print(f"  出现 {len(occurrences)} 次")
    for i, occ in enumerate(occurrences):
        print(f"  第 {i+1} 次: 第 {occ['start']+1}-{occ['end']+1} 行")
        for line in occ['content'][:3]:
            print(f"    {line.strip()}")
        if len(occ['content']) > 3:
            print(f"    ... ({len(occ['content'])} 行)")

print(f"\n共 {len(dupes)} 个重复选择器")

# ========== 2. 把 HTML 里的内联 style 加到 CSS 末尾 ==========
html_inline_styles = '''
/* 记录类型单选按钮样式（从 HTML 内联 style 移来） */
body.app-v3 .btn-check:checked + label[for="rtConstruction"] {
    background: linear-gradient(135deg,#059669,#10b981) !important;
    border-color: #059669 !important;
    color: #fff !important;
    box-shadow: 0 2px 12px rgba(5,150,105,.25) !important;
}
body.app-v3 .btn-check:checked + label[for="rtRepair"] {
    background: linear-gradient(135deg,#d97706,#f59e0b) !important;
    border-color: #d97706 !important;
    color: #fff !important;
    box-shadow: 0 2px 12px rgba(217,119,6,.25) !important;
}
body.app-v3 label[for="rtConstruction"]:hover, 
body.app-v3 label[for="rtRepair"]:hover {
    border-color: #cbd5e1 !important;
    background: #f8fafc !important;
}
body.app-v3 .btn-check:checked + label:hover {
    opacity: .92 !important;
    transform: translateY(-1px);
}
'''

new_css = css.rstrip() + '\n' + html_inline_styles

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(new_css)

print(f"\n✅ 已将 HTML 内联样式移到 style.css 末尾")

# ========== 3. 删除 HTML 里的内联 style 标签 ==========
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

old_html_len = len(html.split('\n'))

# 找到并删除 <style>...</style> 块
pattern = r'\n?<style>\n.*?</style>\n?'
new_html = re.sub(pattern, '\n', html, flags=re.DOTALL)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_html)

new_html_len = len(new_html.split('\n'))
print(f"✅ 已删除 HTML 中的内联 style 标签")
print(f"  HTML 行数: {old_html_len} → {new_html_len} (减少 {old_html_len - new_html_len} 行)")

# 更新 CSS 版本号
new_html = re.sub(r'style\.css\?v=[^\'"]+', 'style.css?v=20260712-cleanup', new_html)
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_html)

print(f"✅ CSS 版本号已更新为 20260712-cleanup")
