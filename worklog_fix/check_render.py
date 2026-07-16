import re
html = open(r'C:\Users\Administrator\Documents\traework\worklog_fix\now.html', encoding='utf-8').read()
idx = html.find('id="tab-work"')
end_idx = html.find('id="tab-pending"')
region = html[idx:end_idx + 100]
lines = region.split('\n')
print("=== rendered tab-work ending ===")
for i, l in enumerate(lines[-12:]):
    print(f"  L{i}: {l.strip()[:120]}")
divs = len(re.findall(r'<div\b', region))
closes = len(re.findall(r'</div>', region))
print(f"\n<div={divs} </div>={closes} bal={divs - closes} (expect 0 for closed tab-work)")
# Also check the actual customer dropdown HTML
print("\n=== customer-select-wrap in rendered ===")
for m in re.finditer(r'<div class="customer-select-wrap">', html):
    end = html.find('</div>', m.start() + 50)
    ctx = html[m.start():end + 6]
    print(f"  pos={m.start()}: ...{ctx[:100]}...")
