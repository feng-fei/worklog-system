
import re

with open('/app/frontend/script.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_functions_in_range(start, end):
    funcs = []
    for i in range(start, min(end, len(lines))):
        line = lines[i].strip()
        if re.match(r'^function \w+', line):
            func_name = re.match(r'^function (\w+)', line).group(1)
            funcs.append((i+1, func_name))
        elif re.match(r'^(const|let|var) \w+ = function', line):
            func_name = re.match(r'^(?:const|let|var) (\w+) = function', line).group(1)
            funcs.append((i+1, func_name))
    return funcs

print("Functions in '性能工具' section (lines 265-817):")
funcs = get_functions_in_range(264, 817)
for line_num, name in funcs:
    print(f"  Line {line_num}: {name}")

print(f"\nTotal functions: {len(funcs)}")

print("\n\nAll functions with their line numbers:")
all_funcs = get_functions_in_range(0, len(lines))
for line_num, name in all_funcs:
    print(f"  Line {line_num}: {name}")
