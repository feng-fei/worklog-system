with open('/app/app/routes/repair_export_routes.py') as f:
    c = f.read()
print('_build_pdf_from_ws:', '_build_pdf_from_ws' in c)
print('_html_to_pdf:', '_html_to_pdf' in c)
print('weasyprint:', 'weasyprint' in c)
print('fpdf2:', 'fpdf2' in c)
print('fpdf import:', 'from fpdf import FPDF' in c)