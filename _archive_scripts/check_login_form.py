
import re

with open('/app/frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

forms = re.findall(r'<form[^>]*id=["\']([^"\']+)["\'][^>]*>', content)
print("All form IDs:")
for f in forms:
    print(f"  {f}")

print()
print("Searching for login form...")
login_form_match = re.search(r'<form[^>]*id=["\']([^"\']*login[^"\']*)["\'][^>]*>', content, re.IGNORECASE)
if login_form_match:
    print(f"Found login form ID: {login_form_match.group(1)}")
else:
    print("No login form ID found with 'login' in ID")
    print()
    print("Looking at login page section...")
    login_page_start = content.find('id="loginPage"')
    if login_page_start > 0:
        section = content[login_page_start:login_page_start + 2000]
        forms_in_login = re.findall(r'<form[^>]*>', section)
        print(f"Forms in loginPage section:")
        for f in forms_in_login:
            print(f"  {f[:200]}")
