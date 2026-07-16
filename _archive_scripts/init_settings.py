from app import create_app, db
from app.models import SystemSetting

app = create_app()
with app.app_context():
    defaults = {
        'company_name': '珠海市瑞翼智能科技有限公司',
        'company_address': '珠海市香洲区',
        'company_phone': '',
        'company_contact': '',
        'company_bank_name': '',
        'company_bank_account': ''
    }
    for key, val in defaults.items():
        if not SystemSetting.query.filter_by(key=key).first():
            db.session.add(SystemSetting(key=key, value=val))
    db.session.commit()
    settings = SystemSetting.query.all()
    for s in settings:
        print(f'{s.key} = {s.value}')
    print("Done")