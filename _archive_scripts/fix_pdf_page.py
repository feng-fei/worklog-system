with open('/app/app/routes/repair_export_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace auto_page_break setting
content = content.replace(
    "pdf.set_auto_page_break(auto=True, margin=10)",
    "pdf.set_auto_page_break(auto=False)"
)

# 2. Replace max_row calculation
content = content.replace(
    "max_row = min(ws.max_row, 60)",
    "max_row = ws.max_row"
)

# 3. Replace page_w
content = content.replace(
    "    page_w = 190",
    "    margin = 5\n    page_w = 210 - 2 * margin  # 200mm\n    page_h = 297 - 2 * margin  # 287mm"
)

# 4. Replace column width calculation to use new variables
content = content.replace(
    "    excel_widths = []\n    for col_idx in range(1, max_col + 1):\n        col_letter = openpyxl.utils.get_column_letter(col_idx)\n        cd = ws.column_dimensions[col_letter]\n        excel_widths.append(cd.width if cd.width else 10)\n    total = sum(excel_widths)\n    col_w = [page_w * w / total for w in excel_widths]",
    "    excel_widths = []\n    for col_idx in range(1, max_col + 1):\n        col_letter = openpyxl.utils.get_column_letter(col_idx)\n        cd = ws.column_dimensions[col_letter]\n        excel_widths.append(cd.width if cd.width else 10)\n    total_w = sum(excel_widths)\n    col_w = [page_w * w / total_w for w in excel_widths]"
)

# 5. Replace row height calculation - proportional scaling to fit page
old_row_h = """    # 计算行高（mm）
    row_h = []
    for row_idx in range(1, max_row + 1):
        rd = ws.row_dimensions[row_idx]
        row_h.append((rd.height if rd.height else 20) * 0.35)"""

new_row_h = """    # 计算行高（mm）按比例缩放到页面高度
    excel_heights = []
    for row_idx in range(1, max_row + 1):
        rd = ws.row_dimensions[row_idx]
        excel_heights.append(rd.height if rd.height else 15)
    total_h = sum(excel_heights)
    scale = page_h / total_h
    row_h = [h * scale for h in excel_heights]"""

content = content.replace(old_row_h, new_row_h)

# 6. Replace x_pos start
content = content.replace(
    "    x_pos = [10]",
    "    x_pos = [margin]"
)

# 7. Replace y_pos start
content = content.replace(
    "    y_pos = [10]",
    "    y_pos = [margin]"
)

# 8. Replace font size calculation
content = content.replace(
    "            fs = max(6, min(font.size if font and font.size else 9, 14))\n            bold = font.bold if font else False",
    "            base_fs = font.size if font and font.size else 9\n            fs = max(4, min(base_fs * scale * 0.9, 14))"
)

# 9. Replace multi_cell line height
content = content.replace(
    "pdf.multi_cell(cw - 1, fs * 0.4, val, border=0, align=ha)",
    "pdf.multi_cell(cw - 1, fs * 0.35, val, border=0, align=ha)"
)

# 10. Update docstring
content = content.replace(
    '"""使用 fpdf2 直接从工作表构建 PDF"""',
    '"""使用 fpdf2 直接从工作表构建 PDF（单页 A4）"""'
)

with open('/app/app/routes/repair_export_routes.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: PDF updated to single-page layout')
