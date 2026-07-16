
import os

css_path = '/app/frontend/style.css'

# 读取现有内容
with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 要追加的样式 - 工资表单多列布局
new_styles = '''

/* ===== 工资表单 - 多列网格布局 ===== */
body.app-v3 .salary-form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
}

body.app-v3 .salary-form-grid .form-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

body.app-v3 .salary-form-grid .form-item .form-label {
  margin-bottom: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ry-muted, #9ca3af);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

body.app-v3 .salary-form-grid .form-item .form-control,
body.app-v3 .salary-form-grid .form-item .form-select {
  width: 100%;
}

/* 跨列样式 */
body.app-v3 .salary-form-grid .span-2 {
  grid-column: span 2;
}

body.app-v3 .salary-form-grid .span-3 {
  grid-column: span 3;
}

body.app-v3 .salary-form-grid .span-full {
  grid-column: 1 / -1;
}

/* 大屏幕 - 4列 */
@media (min-width: 1200px) {
  body.app-v3 .salary-form-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }
}

/* 中等屏幕 - 3列 */
@media (max-width: 1199px) and (min-width: 769px) {
  body.app-v3 .salary-form-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
}

/* 平板 - 2列 */
@media (max-width: 768px) {
  body.app-v3 .salary-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  
  body.app-v3 .salary-form-grid .span-2 {
    grid-column: span 2;
  }
}

/* 手机 - 2列 */
@media (max-width: 480px) {
  body.app-v3 .salary-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  
  body.app-v3 .salary-form-grid .form-item .form-label {
    font-size: 0.75rem;
  }
}

/* 超小屏 - 单列 */
@media (max-width: 360px) {
  body.app-v3 .salary-form-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  body.app-v3 .salary-form-grid .span-2,
  body.app-v3 .salary-form-grid .span-3,
  body.app-v3 .salary-form-grid .span-full {
    grid-column: 1 / -1;
  }
}

/* 保存按钮样式调整 */
body.app-v3 #salaryForm + .btn,
body.app-v3 #tab-salary .card-body > form + .btn {
  margin-top: 14px !important;
}
'''

# 追加到文件末尾
with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content + new_styles)

print("✅ 工资表单多列布局样式已添加到 style.css")
print(f"文件新大小: {os.path.getsize(css_path)} 字节")
