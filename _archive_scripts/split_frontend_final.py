
import os

script_path = '/app/frontend/script.js'
output_dir = '/app/frontend/js'

os.makedirs(output_dir, exist_ok=True)

with open(script_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

modules = [
    {
        'filename': 'common.js',
        'sections': [
            (0, 97),
            (193, 263),
            (265, 274),
        ],
    },
    {
        'filename': 'staff.js',
        'sections': [
            (264, 264),
            (275, 817),
        ],
    },
    {
        'filename': 'customers.js',
        'sections': [
            (818, 1144),
        ],
    },
    {
        'filename': 'records.js',
        'sections': [
            (1145, 1987),
        ],
    },
    {
        'filename': 'pending.js',
        'sections': [
            (1988, 2136),
            (2704, 2706),
        ],
    },
    {
        'filename': 'statistics.js',
        'sections': [
            (2137, 2159),
        ],
    },
    {
        'filename': 'photos.js',
        'sections': [
            (2160, 2205),
        ],
    },
    {
        'filename': 'settings.js',
        'sections': [
            (2206, 2282),
            (2707, 2772),
        ],
    },
    {
        'filename': 'auth.js',
        'sections': [
            (2283, 2393),
        ],
    },
    {
        'filename': 'salary.js',
        'sections': [
            (2394, 2462),
        ],
    },
    {
        'filename': 'dashboard.js',
        'sections': [
            (2544, 2703),
        ],
    },
    {
        'filename': 'app.js',
        'sections': [
            (98, 192),
            (2463, 2543),
        ],
    },
]

total_added = 0
for mod in modules:
    filename = mod['filename']
    content = []
    for start, end in mod['sections']:
        for i in range(start, min(end + 1, len(lines))):
            content.append(lines[i])
        content.append('\n')
    
    filepath = os.path.join(output_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(content)
    
    line_count = len(content)
    total_added += line_count
    print(f"Created {filename}: {line_count} lines")

print(f"\nTotal output lines: {total_added}")
print(f"Original lines: {len(lines)}")
print("Done!")
