#!/usr/bin/env python3
"""备份现有代码"""
import os, shutil

backup_dir = '/app/data/backups'
os.makedirs(backup_dir, exist_ok=True)

files = [
    '/app/app/models.py',
    '/app/frontend/index.html', 
    '/app/app/routes/repair_export_routes.py',
    '/app/app/routes/__init__.py',
]

for f in files:
    if os.path.exists(f):
        dst = os.path.join(backup_dir, os.path.basename(f) + '.20260712-pre-redesign')
        shutil.copy2(f, dst)
        print(f'✓ {os.path.basename(f)} -> {dst}')

print('\n备份完成')
