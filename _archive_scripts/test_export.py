#!/usr/bin/env python3
"""测试维修单导出功能"""
import sys
sys.path.insert(0, '/app')
from app import create_app
from app.models import WorkRecord

app = create_app()

with app.app_context():
    # 获取第一条维修工单
    record = WorkRecord.query.filter_by(record_type='repair').first()
    if not record:
        print("ERROR: 没有找到维修工单")
        sys.exit(1)
    
    print(f"工单ID: {record.id}")
    print(f"工单号: {record.order_no}")
    print(f"客户: {record.customer_name}")
    
    # 测试 Excel 导出
    import openpyxl
    import io
    TEMPLATE_PATH = '/app/data/templates/repair_template.xlsx'
    
    try:
        wb = openpyxl.load_workbook(TEMPLATE_PATH)
        ws = wb.active
        
        # 导入 fill_template
        from app.routes.repair_export_routes import fill_template, _num_to_chinese
        
        fill_template(ws, record)
        
        output = io.BytesIO()
        wb.save(output)
        excel_size = len(output.getvalue())
        print(f"Excel 导出成功: {excel_size} bytes")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Excel 导出失败: {e}")
    
    # 测试 PDF 导出
    try:
        from app.routes.repair_export_routes import _build_pdf_from_ws
        pdf_bytes = _build_pdf_from_ws(ws, record)
        print(f"PDF 导出成功: {len(pdf_bytes)} bytes")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"PDF 导出失败: {e}")
    
    # 测试大写金额转换
    print(f"\n大写金额测试:")
    print(f"  0 -> {_num_to_chinese(0)}")
    print(f"  130 -> {_num_to_chinese(130)}")
    print(f"  1234.56 -> {_num_to_chinese(1234.56)}")
    print(f"  80 -> {_num_to_chinese(80)}")
    
    # 检查新字段
    print(f"\n新字段值:")
    print(f"  device_brand: {record.device_brand or '(空)'}")
    print(f"  device_model: {record.device_model or '(空)'}")
    print(f"  arrival_time: {record.arrival_time or '(空)'}")
    print(f"  completion_time: {record.completion_time or '(空)'}")
    print(f"  customer_feedback: {record.customer_feedback or '(空)'}")
    print(f"  satisfaction: {record.satisfaction or '(空)'}")
    print(f"  service_category: {record.service_category or '(空)'}")
    print(f"  warranty_status: {record.warranty_status or '(空)'}")
    print(f"  warranty_days: {record.warranty_days or 0}")
    
    print("\n测试完成!")
