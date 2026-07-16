"""Dogfood testing for worklog - v2"""
from playwright.sync_api import sync_playwright
import os, time, json

OUTPUT_DIR = r'C:\Users\Administrator\Documents\traework\dogfood-output'
SCREENSHOTS = os.path.join(OUTPUT_DIR, 'screenshots')
VIDEOS = os.path.join(OUTPUT_DIR, 'videos')
os.makedirs(SCREENSHOTS, exist_ok=True)
os.makedirs(VIDEOS, exist_ok=True)

ISSUES = []
CONSOLE_ERRS = []
issue_n = 0

def report(title, severity, category, desc, steps, screenshots):
    global issue_n
    issue_n += 1
    ISSUES.append({'n': issue_n, 'title': title, 'severity': severity, 'category': category,
                   'description': desc, 'steps': steps, 'screenshots': screenshots})
    print(f'\n  ** ISSUE-{issue_n:03d} [{severity.upper()}] {title}')

def ss(page, name):
    path = os.path.join(SCREENSHOTS, name)
    page.screenshot(path=path, full_page=True)
    return path

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1280, 'height': 900})
    page = ctx.new_page()
    page.on('console', lambda msg: CONSOLE_ERRS.append(msg.text) if msg.type == 'error' else None)
    page.on('pageerror', lambda err: CONSOLE_ERRS.append(f'PAGEERROR: {err}'))

    # ===== 1. 登录 =====
    print('=== 1. 登录 ===')
    page.goto('http://172.28.10.2:8085/')
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    s = ss(page, '01-login.png')
    has_pwd = page.locator('#loginPassword').count() > 0
    if has_pwd:
        page.locator('#loginUsername').fill('admin')
        page.locator('#loginPassword').fill('admin123')
        page.locator('button:has-text("登录")').first.click()
        page.wait_for_load_state('networkidle')
        time.sleep(3)
    s = ss(page, '02-dashboard.png')
    print('  登录后截图')

    # ===== 2. Dashboard =====
    print('\n=== 2. Dashboard ===')
    hero_labels = page.locator('.dash-hero-stat-label').all()
    for lbl in hero_labels:
        box = lbl.bounding_box()
        txt = lbl.text_content()
        if box and box['height'] > 25:
            report('Hero标签文字换行', 'minor', 'UI',
                f'"{txt}" 高度{box["height"]:.0f}px',
                '首页加载即现，无交互',
                [s])
            break

    # Check data cards
    cards = {
        '#dsCustomerCount': '客户总数',
        '#dsUnpaidAmount': '待收款',
        '#dsUnpaidSalary': '待发工资',
        '#dsActiveProjects': '进行中项目'
    }
    for sel, label in cards.items():
        val = page.locator(sel).text_content()
        print(f'  {label}: {val}')

    # ===== 3. 快捷操作跳转测试 =====
    print('\n=== 3. 快捷操作跳转 ===')
    test_tabs = [
        ('新增施工', lambda: page.evaluate("switchTab('tab-work')"), 'tab-work'),
        ('新增维修', lambda: page.evaluate("switchTab('tab-work')"), 'tab-work'),
        ('新增待办', lambda: page.evaluate("switchTab('tab-pending')"), 'tab-pending'),
        ('新增客户', lambda: page.evaluate("switchTab('tab-customer')"), 'tab-customer'),
        ('待收款卡片', lambda: page.evaluate("switchTab('tab-payments')"), 'tab-payments'),
        ('进行中项目', lambda: page.evaluate("switchTab('tab-projects')"), 'tab-projects'),
    ]
    for label, click_fn, expected in test_tabs:
        click_fn()
        time.sleep(1.5)
        active = page.locator('.tab-pane.active').first
        tab_id = active.get_attribute('id') or ''
        ok = expected in tab_id
        print(f'  {label}: {"OK" if ok else "FAIL"} ({tab_id})')
        if not ok:
            report(f'{label}跳转失败', 'high', '功能',
                f'点击后激活tab={tab_id}，期望包含{expected}',
                [f'1. 打开Dashboard', f'2. 点击"{label}"', f'3. 实际tab={tab_id}'],
                [ss(page, f'03-jump-{label}.png')])

    # ===== 4. 收款页面 =====
    print('\n=== 4. 收款管理 ===')
    page.evaluate("switchTab('tab-payments')")
    time.sleep(2)
    s = ss(page, '04-payments.png')

    # Open payment modal
    add_btn = page.locator('button:has-text("新增收款")')
    if add_btn.count() > 0:
        add_btn.click()
        time.sleep(1.5)
        s_modal = ss(page, '05-payment-modal.png')

        # Check customer dropdown
        cust = page.locator('#paymentCustomer')
        if cust.count() > 0:
            wrap = page.locator('.customer-select-wrap').last
            has_dd = wrap.locator('.customer-dropdown').count() > 0
            print(f'  客户下拉: {has_dd}')
            if not has_dd:
                report('收款客户无下拉检索', 'high', '功能',
                    '新增收款的客户输入没有customer-dropdown组件',
                    ['1. 收款管理', '2. 新增收款', '3. 无下拉检索'],
                    [s_modal])
        else:
            report('收款客户输入框不存在', 'critical', '功能',
                'paymentCustomer元素不存在',
                ['1. 收款管理', '2. 新增收款'],
                [s_modal])

        # Check record select
        rec_sel = page.locator('#paymentRecordSelect')
        if rec_sel.count() > 0:
            print(f'  关联工单下拉: OK')
        else:
            report('关联工单选择器不存在', 'high', '功能',
                'paymentRecordSelect元素不存在',
                ['1. 收款管理', '2. 新增收款'],
                [s_modal])

        # Close modal
        page.keyboard.press('Escape')
        time.sleep(1)

    # ===== 5. 支出页面 =====
    print('\n=== 5. 支出管理 ===')
    page.evaluate("switchTab('tab-expenses')")
    time.sleep(2)
    s = ss(page, '06-expenses.png')

    # Open expense modal
    add_exp = page.locator('button:has-text("新增支出")')
    if add_exp.count() > 0:
        add_exp.click()
        time.sleep(1.5)
        s_modal = ss(page, '07-expense-modal.png')

        # Check category
        cat_select = page.locator('#expenseCategory')
        cat_opts = cat_select.locator('option').count()
        print(f'  分类选项数: {cat_opts}')
        if cat_opts <= 1:
            report('支出分类无选项', 'high', '功能',
                '新增支出弹窗分类下拉只有默认选项',
                ['1. 支出管理', '2. 新增支出', '3. 分类下拉空'],
                [s_modal])

        # Test + button
        cat_btn = page.locator('button[title="新增分类"]')
        if cat_btn.count() > 0:
            cat_btn.click()
            time.sleep(1)
            s_inline = ss(page, '08-expense-cat-inline.png')
            cat_input = page.locator('#expenseCatInput')
            visible = cat_input.is_visible() if cat_input.count() > 0 else False
            print(f'  分类输入框可见: {visible}')
            if not visible:
                report('分类+号输入框不显示', 'high', '功能',
                    '点击+后内联输入框不可见',
                    ['1. 新增支出', '2. 点+', '3. 输入框不显示'],
                    [s_inline])
        else:
            report('分类+号按钮不存在', 'high', '功能',
                '新增支出弹窗找不到+按钮',
                ['1. 新增支出', '2. 无+按钮'],
                [s_modal])

        page.keyboard.press('Escape')
        time.sleep(1)

    # ===== 6. 待办页面 =====
    print('\n=== 6. 报修待办 ===')
    page.evaluate("switchTab('tab-pending')")
    time.sleep(2)
    s = ss(page, '09-pending.png')

    # ===== 7. 客户页面 =====
    print('\n=== 7. 客户管理 ===')
    page.evaluate("switchTab('tab-customer')")
    time.sleep(2)
    s = ss(page, '10-customer.png')
    body_text = page.locator('#tab-customer').text_content() or ''
    if len(body_text.strip()) < 30:
        report('客户管理页面内容缺失', 'high', '功能',
            f'页面文本仅{len(body_text.strip())}字符',
            ['1. 切换到客户管理', '2. 页面空白'],
            [s])

    # ===== 8. 工单查询 =====
    print('\n=== 8. 工单查询 ===')
    page.evaluate("switchTab('tab-query')")
    time.sleep(2)
    s = ss(page, '11-query.png')

    # ===== 9. 工资管理 =====
    print('\n=== 9. 工资管理 ===')
    page.evaluate("switchTab('tab-salary')")
    time.sleep(2)
    s = ss(page, '12-salary.png')

    # ===== 10. 物料管理 =====
    print('\n=== 10. 物料管理 ===')
    page.evaluate("switchTab('tab-materials')")
    time.sleep(2)
    s = ss(page, '13-materials.png')

    # ===== 11. 设备档案 =====
    print('\n=== 11. 设备档案 ===')
    page.evaluate("switchTab('tab-equipments')")
    time.sleep(2)
    s = ss(page, '14-equipments.png')

    # ===== 12. 维护计划 =====
    print('\n=== 12. 维护计划 ===')
    page.evaluate("switchTab('tab-maintenance')")
    time.sleep(2)
    s = ss(page, '15-maintenance.png')

    # ===== 13. 项目管理 =====
    print('\n=== 13. 项目管理 ===')
    page.evaluate("switchTab('tab-projects')")
    time.sleep(2)
    s = ss(page, '16-projects.png')

    # ===== 14. 统计报表 =====
    print('\n=== 14. 统计报表 ===')
    page.evaluate("switchTab('tab-advanced-stats')")
    time.sleep(3)
    s = ss(page, '17-stats.png')

    # ===== 15. 日历 =====
    print('\n=== 15. 日历 ===')
    page.evaluate("switchTab('tab-calendar')")
    time.sleep(2)
    s = ss(page, '18-calendar.png')

    # ===== 16. 通知设置 =====
    print('\n=== 16. 通知设置 ===')
    page.evaluate("switchTab('tab-notifications')")
    time.sleep(2)
    s = ss(page, '19-notifications.png')

    # ===== 17. 操作日志 =====
    print('\n=== 17. 操作日志 ===')
    page.evaluate("switchTab('tab-oplogs')")
    time.sleep(2)
    s = ss(page, '20-oplogs.png')

    # ===== 18. 回到Dashboard查控制台 =====
    print('\n=== 18. 控制台错误汇总 ===')
    page.evaluate("switchTab('tab-dashboard')")
    time.sleep(2)

    # Filter unique errors
    unique_errors = list(set(CONSOLE_ERRS))
    print(f'  总错误数: {len(CONSOLE_ERRS)}, 唯一: {len(unique_errors)}')
    for err in unique_errors[:10]:
        print(f'  - {err[:120]}')

    browser.close()

# Write report
with open(os.path.join(OUTPUT_DIR, 'issues.json'), 'w', encoding='utf-8') as f:
    json.dump({'issues': ISSUES, 'console_errors': unique_errors if 'unique_errors' in dir() else []}, 
              f, ensure_ascii=False, indent=2)

print(f'\n========================================')
print(f'发现 {len(ISSUES)} 个问题:')
for iss in ISSUES:
    print(f'  ISSUE-{iss["n"]:03d} [{iss["severity"]}] {iss["title"]}')
print(f'控制台错误: {len(unique_errors) if "unique_errors" in dir() else 0} 个')
print(f'========================================')
