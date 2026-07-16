
import os

js_dir = '/app/frontend/js'

app_path = os.path.join(js_dir, 'app.js')
with open(app_path, 'r', encoding='utf-8') as f:
    app_content = f.read()

if 'initAuth();' not in app_content:
    app_content += '\n\ninitAuth();\n'
    with open(app_path, 'w', encoding='utf-8') as f:
        f.write(app_content)
    print("✅ initAuth() added to app.js")
else:
    print("ℹ️ initAuth() already in app.js")

settings_path = os.path.join(js_dir, 'settings.js')
with open(settings_path, 'r', encoding='utf-8') as f:
    settings_content = f.read()

if 'initAuth();' in settings_content:
    lines = settings_content.split('\n')
    new_lines = []
    for line in lines:
        if line.strip() == 'initAuth();':
            print("ℹ️ Removing initAuth() from settings.js")
            continue
        new_lines.append(line)
    with open(settings_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))
    print("✅ initAuth() removed from settings.js")

print("\nDone!")
