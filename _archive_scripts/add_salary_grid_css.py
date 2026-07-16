
import os

css_path = '/app/frontend/style.css'

# 读取现有内容
with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 要追加的样式
new_styles = '''

/* ===== 工资记录列表 - 多列网格布局 ===== */
body.app-v3 #salaryList {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  align-items: start;
}

body.app-v3 #salaryList .record-card {
  margin-bottom: 0 !important;
  height: 100%;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

body.app-v3 #salaryList .record-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
}

body.app-v3 #salaryList .rc-top-row {
  flex-wrap: wrap;
  gap: 8px;
}

body.app-v3 #salaryList .rc-customer-name-lg {
  font-size: 1rem !important;
  font-weight: 700 !important;
}

body.app-v3 #salaryList .rc-fee {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--ry-line, rgba(255,255,255,0.08));
  font-weight: 600;
}

/* 工资汇总卡片优化 */
body.app-v3 #salarySummary .stat-card {
  text-align: center;
  padding: 16px 12px;
  border-radius: 16px;
  border: 1px solid var(--ry-line, rgba(255,255,255,0.08));
  background: var(--ry-surface, #111416);
}

body.app-v3 #salarySummary .sc-number {
  font-size: 1.4rem;
  font-weight: 800;
  font-family: 'DIN Alternate', system-ui, sans-serif;
  margin-bottom: 4px;
}

body.app-v3 #salarySummary .sc-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ry-muted, #9ca3af);
}

/* 大屏幕增加列数 */
@media (min-width: 1200px) {
  body.app-v3 #salaryList {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }
}

@media (min-width: 1600px) {
  body.app-v3 #salaryList {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  body.app-v3 #salaryList {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}

@media (max-width: 480px) {
  body.app-v3 #salaryList {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
'''

# 追加到文件末尾
with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content + new_styles)

print("✅ 工资记录多列布局样式已添加到 style.css")
print(f"文件新大小: {os.path.getsize(css_path)} 字节")
