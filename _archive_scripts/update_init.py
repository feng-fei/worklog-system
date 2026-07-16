
import os

init_path = '/app/app/__init__.py'

with open(init_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''    # 注册蓝图 - 关键修复
    from .routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')'''

new_code = '''    # 注册蓝图 - 模块化路由
    from .routes import register_blueprints
    register_blueprints(app)'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(init_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ __init__.py 更新成功")
else:
    print("❌ 未找到要替换的代码")
    print("当前内容中包含的 routes 相关代码:")
    for line in content.split('\n'):
        if 'routes' in line.lower():
            print(f"  {line}")
