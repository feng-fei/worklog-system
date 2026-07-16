"""批量修复routes.py中except Exception，让HTTPException不被捕获"""
import re

file_path = r'c:\Users\Administrator\Documents\traework\backend\routes.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 先添加HTTPException的导入
if 'from werkzeug.exceptions import HTTPException' not in content:
    # 在from flask导入之后添加
    content = content.replace(
        'from flask import request, jsonify, current_app, Blueprint, send_from_directory, g',
        'from flask import request, jsonify, current_app, Blueprint, send_from_directory, g\nfrom werkzeug.exceptions import HTTPException'
    )

# 替换所有的 except Exception as e:
# 在 except 块的第一行添加: if isinstance(e, HTTPException): raise
# 模式：except Exception as e:\n        return jsonify({'error': str(e)}), 500
# 或者更通用的：except Exception as e:\n<缩进>...

# 我们用一个更稳妥的方式：找到所有 except Exception as e: 后面跟 return jsonify 的模式
# 只替换那些 return jsonify({'error': ...}), 500 的模式

# 模式1: 标准接口错误返回格式
pattern1 = r'except Exception as e:\n(\s+)return jsonify\(\{'"'"'error'"'"': str\(e\)\}\), 500'

def replacer1(match):
    indent = match.group(1)
    return (
        'except Exception as e:\n'
        f'{indent}if isinstance(e, HTTPException):\n'
        f'{indent}    raise\n'
        f'{indent}return jsonify({{\'error\': str(e)}}), 500'
    )

new_content = re.sub(pattern1, replacer1, content)

# 模式2: 有print或其他操作后再return的
# except Exception as e:
#     print(...)
#     return jsonify({'error': str(e)}), 500

# 统计替换了多少处
count = len(re.findall(pattern1, content))
print(f"替换了 {count} 处标准接口错误处理")

# 保存
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"已保存到 {file_path}")
