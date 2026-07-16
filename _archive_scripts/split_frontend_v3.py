
import os
import re

script_path = '/app/frontend/script.js'
output_dir = '/app/frontend/js'

os.makedirs(output_dir, exist_ok=True)

with open(script_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

module_ranges = [
    {
        'filename': 'common.js',
        'ranges': [
            (0, 97),
            (220, 263),
            (866, 870),
            (1439, 1440),
        ],
        'extra_funcs': ['debounce', 'debouncedLoadCustomers', 'todayStr', 'photoUrl'],
    },
]

def get_func_name(line):
    stripped = line.strip()
    m = re.match(r'^function (\w+)', stripped)
    if m:
        return m.group(1)
    m = re.match(r'^(?:const|let|var) (\w+)\s*=\s*function', stripped)
    if m:
        return m.group(1)
    m = re.match(r'^(?:const|let|var) (\w+)\s*=\s*\([^)]*\)\s*=>', stripped)
    if m:
        return m.group(1)
    return None

func_lines = []
for i, line in enumerate(lines):
    fname = get_func_name(line)
    if fname:
        func_lines.append((i, fname))

print(f"Total functions: {len(func_lines)}")

def find_func_end(start_idx):
    brace_count = 0
    started = False
    for i in range(start_idx, len(lines)):
        line = lines[i]
        for ch in line:
            if ch == '{':
                brace_count += 1
                started = True
            elif ch == '}':
                brace_count -= 1
        if started and brace_count == 0:
            return i + 1
    return len(lines)

module_assignments = {}

for i, (func_start, func_name) in enumerate(func_lines):
    func_end = find_func_end(func_start) if i + 1 < len(func_lines) else func_lines[i+1][0]
    
    if func_name in ['getToken', 'setToken', 'clearToken', 'getUserName', 'getUserRole', 'isAdmin', 
                      'apiFetch', 'updateWelcomeBar', 'showApp', 'showLoginPage', 'doLogout', 
                      'showChangePasswordModal', 'initPwa', 'switchTab', 'updateMobileDockState',
                      'showModal', 'closeGlobalModal', 'debounce', 'debouncedLoadCustomers',
                      'escapeHtml', 'attrHtml', 'fmtDate', 'todayStr', 'photoUrl',
                      'isMobileNavLayout', 'closeMobileNavMenu', 'setupMobileNavMenu']:
        module = 'common'
    elif func_name.startswith('onSu') or func_name.startswith('staff') or func_name.startswith('openStaff') or \
         func_name.startswith('editStaff') or func_name.startswith('onStaff') or func_name.startswith('renderStaff') or \
         func_name.startswith('toggleStaff') or func_name.startswith('closeStaff') or func_name.startswith('deselectStaff') or \
         func_name.startswith('updateTemp') or func_name.startswith('collectTemp') or func_name.startswith('calcAuto') or \
         func_name.startswith('onSe') or func_name.startswith('editCalc') or func_name.startswith('initStaff') or \
         func_name.startswith('uploadStaff') or func_name.startswith('uploadEdit') or func_name.startswith('edi'):
        module = 'staff'
    elif func_name.startswith('customer') or func_name.startswith('Customer') or func_name.startswith('onCustomer') or \
         func_name.startswith('showCustomer') or func_name.startswith('selectCustomer') or func_name.startswith('fillCustomer') or \
         func_name.startswith('openCustomer') or func_name.startswith('editCustomer') or func_name.startswith('renderCustomer') or \
         func_name.startswith('showMore'):
        module = 'customers'
    elif func_name.startswith('record') or func_name.startswith('Record') or func_name.startswith('work') or func_name.startswith('Work') or \
         func_name.startswith('toggleRecord') or func_name.startswith('toggleRepair') or func_name.startswith('fillWork') or \
         func_name.startswith('openNewWork') or func_name.startswith('calcWork') or func_name.startswith('getWork') or \
         func_name.startswith('loadImage') or func_name.startswith('roundRect') or func_name.startswith('syncWork') or \
         func_name.startswith('renderWork') or func_name.startswith('openSelected') or func_name.startswith('removeWork') or \
         func_name.startswith('clearQuery') or func_name.startswith('setQuery') or func_name.startswith('resetQuery') or \
         func_name.startswith('export') or func_name.startswith('renderQuery') or func_name.startswith('showMoreQuery') or \
         func_name.startswith('renderEdit') or func_name.startswith('onEdit') or func_name.startswith('removeEdit') or \
         func_name.startswith('ediToggle') or func_name.startswith('ediClose') or func_name.startswith('ediStaff') or \
         func_name.startswith('ediDeselect') or func_name.startswith('ediCalc') or func_name.startswith('ediToggle') or \
         func_name.startswith('closeModal') or func_name.startswith('pendingCard'):
        module = 'records'
    elif func_name.startswith('pending') or func_name.startswith('Pending') or func_name.startswith('loadPending') or \
         func_name.startswith('submitPending') or func_name.startswith('updatePending'):
        module = 'pending'
    elif func_name.startswith('salary') or func_name.startswith('Salary') or func_name.startswith('fillSalary') or \
         func_name.startswith('calcSalary') or func_name.startswith('submitSalary') or func_name.startswith('loadSalary'):
        module = 'salary'
    elif func_name.startswith('stat') or func_name.startswith('Stat') or func_name.startswith('loadStat') or \
         func_name.startswith('setStats') or func_name.startswith('renderStat'):
        module = 'statistics'
    elif func_name.startswith('pv') or func_name.startswith('photo') or func_name.startswith('Photo') or \
         func_name.startswith('loadImage') or func_name.startswith('renderWorkPhoto') or func_name.startswith('openSelected') or \
         func_name.startswith('removeWorkPhoto'):
        module = 'photos'
    elif func_name.startswith('company') or func_name.startswith('Company') or func_name.startswith('showCompany') or \
         func_name.startswith('updateCompany') or func_name.startswith('calcDailyFrom') or func_name.startswith('showBackup') or \
         func_name.startswith('backup'):
        module = 'settings'
    elif func_name.startswith('dashboard') or func_name.startswith('Dashboard') or func_name.startswith('loadDashboard') or \
         func_name.startswith('renderDashboard') or func_name.startswith('calendar') or func_name.startswith('Calendar') or \
         func_name.startswith('renderCalendar'):
        module = 'dashboard'
    elif func_name.startswith('auth') or func_name.startswith('Auth') or func_name.startswith('initAuth') or \
         func_name.startswith('initLogin') or func_name.startswith('login') or func_name.startswith('Login') or \
         func_name.startswith('submitLogin'):
        module = 'auth'
    else:
        module = 'common'
    
    module_assignments[func_start] = (module, func_end)
    print(f"  Line {func_start+1}: {func_name:40s} -> {module}")

modules_content = {}
for mod in ['common', 'staff', 'customers', 'records', 'pending', 'salary', 'statistics', 'photos', 'settings', 'dashboard', 'auth']:
    modules_content[mod] = []

added_lines = set()

header_end = 9
for i in range(header_end):
    modules_content['common'].append(lines[i])
    added_lines.add(i)
modules_content['common'].append('\n')

for func_start, (module, func_end) in sorted(module_assignments.items()):
    for i in range(func_start, func_end):
        if i not in added_lines:
            modules_content[module].append(lines[i])
            added_lines.add(i)
    modules_content[module].append('\n')

unadded = []
for i in range(len(lines)):
    if i not in added_lines and lines[i].strip():
        unadded.append((i, lines[i].rstrip()))

print(f"\nUnadded non-empty lines: {len(unadded)}")
for line_num, content in unadded[:50]:
    print(f"  Line {line_num+1}: {content[:80]}")

total_out = 0
for mod, content_lines in modules_content.items():
    filename = f'{mod}.js'
    filepath = os.path.join(output_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(content_lines)
    line_count = len(content_lines)
    total_out += line_count
    print(f"Created {filename}: {line_count} lines")

print(f"\nTotal output lines: {total_out}")
print(f"Original lines: {len(lines)}")
print("Done!")
