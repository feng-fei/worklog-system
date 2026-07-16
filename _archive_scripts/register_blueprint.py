import re

with open('/app/app/routes/__init__.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_line = 'from .backup_routes import backup_bp\n'
new_import = 'from .repair_export_routes import repair_export_bp\n'
if 'repair_export_routes' not in content:
    content = content.replace(import_line, import_line + new_import)

# Add register
register_line = 'app.register_blueprint(backup_bp, url_prefix=url_prefix)\n'
new_register = 'app.register_blueprint(repair_export_bp, url_prefix=url_prefix)\n'
if 'repair_export_bp' not in content.split('register_blueprint')[0]:
    pass  # already added
if 'repair_export_bp' not in content:
    content = content.replace(register_line, register_line + new_register)

with open('/app/app/routes/__init__.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Blueprint registered")
print(content[content.find('repair_export'):content.find('repair_export')+100])