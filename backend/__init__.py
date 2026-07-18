from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import time
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

os.environ.setdefault('TZ', 'Asia/Shanghai')
try:
    time.tzset()
except AttributeError:
    pass

CN_TZ = timezone(timedelta(hours=8))

def cn_now():
    return datetime.now(CN_TZ).replace(tzinfo=None)

# 加载环境变量
load_dotenv()

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    
    # 配置
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///worklog.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['PERMANENT_SESSION_LIFETIME'] = 86400 * 7
    
    # 确保上传目录存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # 初始化数据库
    db.init_app(app)
    
    # 配置 CORS - 允许所有来源
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # 注册蓝图（模块化蓝图）
    from .blueprints import (
        auth_bp, records_bp, pending_bp, customers_bp, staffs_bp,
        finance_bp, projects_bp, materials_bp, templates_bp,
        statistics_bp, system_bp
    )
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(records_bp, url_prefix='/api')
    app.register_blueprint(pending_bp, url_prefix='/api')
    app.register_blueprint(customers_bp, url_prefix='/api')
    app.register_blueprint(staffs_bp, url_prefix='/api')
    app.register_blueprint(finance_bp, url_prefix='/api')
    app.register_blueprint(projects_bp, url_prefix='/api')
    app.register_blueprint(materials_bp, url_prefix='/api')
    app.register_blueprint(templates_bp, url_prefix='/api')
    app.register_blueprint(statistics_bp, url_prefix='/api')
    app.register_blueprint(system_bp, url_prefix='/api')
    print("✅ 已启用模块化 Blueprints")

    # API请求日志中间件
    import time
    import logging
    from flask import request, g

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    api_logger = logging.getLogger('api')

    @app.before_request
    def log_request_start():
        g._start_time = time.time()
        if request.path.startswith('/api/') and request.path != '/api/auth/login':
            api_logger.info(f'→ {request.method} {request.path} - user: {request.headers.get("X-User", "unknown")}')

    @app.after_request
    def log_request_end(response):
        if hasattr(g, '_start_time') and request.path.startswith('/api/'):
            duration = int((time.time() - g._start_time) * 1000)
            status = response.status_code
            api_logger.info(f'← {request.method} {request.path} - {status} - {duration}ms')
        return response

    @app.errorhandler(Exception)
    def log_unhandled_error(e):
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return e
        api_logger.error(f'✗ {request.method} {request.path} - {type(e).__name__}: {e}')
        raise e
    
    # 创建数据库表
    with app.app_context():
        from . import models
        db.create_all()
        
        # 迁移：添加 order_no 列（如果表已存在且列不存在）
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            if 'order_no' not in [c['name'] for c in insp.get_columns('work_records')]:
                db.session.execute(db.text('ALTER TABLE work_records ADD COLUMN order_no VARCHAR(50) DEFAULT ""'))
                db.session.commit()
                print("✅ order_no 列已添加")
        except: pass
        try:
            if 'status' not in [c['name'] for c in insp.get_columns('work_records')]:
                db.session.execute(db.text("ALTER TABLE work_records ADD COLUMN status VARCHAR(20) DEFAULT 'completed'"))
                db.session.commit()
                print('✅ status 列已添加')
        except: pass
        try:
            if 'tax_type' not in [c['name'] for c in insp.get_columns('work_records')]:
                db.session.execute(db.text("ALTER TABLE work_records ADD COLUMN tax_type VARCHAR(10) DEFAULT 'no'"))
                db.session.execute(db.text('ALTER TABLE work_records ADD COLUMN tax_rate FLOAT DEFAULT 0.03'))
                db.session.execute(db.text('ALTER TABLE work_records ADD COLUMN tax_amount FLOAT DEFAULT 0.0'))
                db.session.commit()
                print('✅ tax 列已添加')
            db.create_all()  # 创建新表
        except Exception as e:
            print(f'⚠️ tax 迁移跳过: {e}')
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            def add_col(table, col, ddl):
                if col not in [c['name'] for c in insp.get_columns(table)]:
                    db.session.execute(db.text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
            add_col('work_records', 'payment_status', "payment_status VARCHAR(20) DEFAULT 'unpaid'")
            add_col('work_records', 'paid_amount', 'paid_amount FLOAT DEFAULT 0.0')
            add_col('work_records', 'work_subtype', 'work_subtype VARCHAR(50) DEFAULT ""')
            add_col('work_records', 'priority', "priority VARCHAR(20) DEFAULT 'normal'")
            add_col('work_records', 'contact_name', 'contact_name VARCHAR(100) DEFAULT ""')
            add_col('work_records', 'incomplete_reason_type', 'incomplete_reason_type VARCHAR(50) DEFAULT ""')
            add_col('work_records', 'incomplete_reason', 'incomplete_reason TEXT DEFAULT ""')
            add_col('pending_works', 'todo_type', "todo_type VARCHAR(30) DEFAULT '客户报修'")
            add_col('pending_works', 'contact_phone', 'contact_phone VARCHAR(20) DEFAULT ""')
            add_col('pending_works', 'contact_name', 'contact_name VARCHAR(100) DEFAULT ""')
            add_col('pending_works', 'priority', "priority VARCHAR(20) DEFAULT 'normal'")
            add_col('pending_works', 'related_record_type', 'related_record_type VARCHAR(20) DEFAULT ""')
            add_col('pending_works', 'related_record_id', 'related_record_id INTEGER')
            add_col('customers', 'short_name', 'short_name VARCHAR(100) DEFAULT ""')
            add_col('customers', 'full_name', 'full_name VARCHAR(200) DEFAULT ""')
            add_col('customers', 'credit_code', 'credit_code VARCHAR(50) DEFAULT ""')
            add_col('customers', 'contact_name', 'contact_name VARCHAR(100) DEFAULT ""')
            db.session.commit()
            db.session.execute(db.text('UPDATE customers SET short_name = name WHERE short_name IS NULL OR short_name = ""'))
            db.session.execute(db.text('UPDATE customers SET full_name = name WHERE full_name IS NULL OR full_name = ""'))
            db.session.commit()
            db.create_all()
            print('✅ 业务字段和工资表已检查')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ 业务字段迁移跳过: {e}')
        
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            def add_col(table, col, ddl):
                if col not in [c['name'] for c in insp.get_columns(table)]:
                    db.session.execute(db.text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
            
            add_col('work_records', 'project_id', 'project_id INTEGER')
            try:
                with db.engine.connect() as conn:
                    conn.execute(db.text('CREATE INDEX IF NOT EXISTS ix_work_records_project_id ON work_records (project_id)'))
            except: pass
            
            add_col('projects', 'billing_type', "billing_type VARCHAR(20) DEFAULT 'lump_sum'")
            add_col('projects', 'project_stage', "project_stage VARCHAR(30) DEFAULT 'preparation'")
            add_col('projects', 'construction_phase', "construction_phase VARCHAR(30) DEFAULT ''")
            add_col('projects', 'actual_start_date', 'actual_start_date DATE')
            add_col('projects', 'actual_end_date', 'actual_end_date DATE')
            add_col('projects', 'staff_names', "staff_names VARCHAR(500) DEFAULT ''")
            add_col('projects', 'receipt_amount', 'receipt_amount FLOAT DEFAULT 0.0')
            add_col('projects', 'warranty_amount', 'warranty_amount FLOAT DEFAULT 0.0')
            add_col('project_work_records', 'billing_type', "billing_type VARCHAR(20) DEFAULT 'lump_sum'")
            add_col('project_work_records', 'staff_hours', "staff_hours TEXT DEFAULT ''")
            
            db.session.commit()
            db.create_all()
            print('✅ 项目管理字段和表已检查')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ 项目管理字段迁移跳过: {e}')
        
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            def add_col(table, col, ddl):
                if col not in [c['name'] for c in insp.get_columns(table)]:
                    db.session.execute(db.text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
            add_col('work_records', 'involved_systems', 'involved_systems TEXT DEFAULT ""')
            add_col('work_records', 'service_category', 'service_category VARCHAR(50) DEFAULT ""')
            add_col('work_records', 'warranty_status', "warranty_status VARCHAR(20) DEFAULT 'none'")
            add_col('work_records', 'warranty_days', 'warranty_days INTEGER DEFAULT 0')
            add_col('work_records', 'accept_time', 'accept_time VARCHAR(10) DEFAULT ""')
            add_col('work_records', 'customer_feedback', 'customer_feedback TEXT DEFAULT ""')
            add_col('work_records', 'satisfaction', 'satisfaction VARCHAR(20) DEFAULT ""')
            db.session.commit()
            db.create_all()
            print('✅ v3.1业务扩展字段已检查')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ v3.1字段迁移跳过: {e}')
        
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            def add_col(table, col, ddl):
                if col not in [c['name'] for c in insp.get_columns(table)]:
                    db.session.execute(db.text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
            
            add_col('staffs', 'status', "status VARCHAR(20) DEFAULT 'active'")
            
            add_col('work_templates', 'fault_diagnosis', 'fault_diagnosis TEXT DEFAULT ""')
            add_col('work_templates', 'repair_process', 'repair_process TEXT DEFAULT ""')
            add_col('work_templates', 'repair_result', "repair_result VARCHAR(20) DEFAULT 'completed'")
            
            db.session.commit()
            db.create_all()
            print('✅ v3.2员工状态字段已检查')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ v3.2字段迁移跳过: {e}')
        
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            db.create_all()
            
            def add_index(table, idx_name, columns):
                try:
                    indexes = insp.get_indexes(table)
                    if not any(i.get('name') == idx_name for i in indexes):
                        db.session.execute(db.text(f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({columns})'))
                except: pass
            
            add_index('operation_logs', 'ix_oplog_target_type', 'target_type')
            add_index('operation_logs', 'ix_oplog_action', 'action')
            add_index('operation_logs', 'ix_oplog_user', 'user')
            add_index('operation_logs', 'ix_oplog_created_at', 'created_at')
            add_index('operation_logs', 'ix_oplog_type_action_time', 'target_type, action, created_at')
            
            add_index('work_records', 'ix_work_records_customer_name', 'customer_name')
            add_index('work_records', 'ix_work_records_work_date', 'work_date')
            add_index('work_records', 'ix_work_records_status', 'status')
            
            add_index('payment_records', 'ix_payment_records_payment_date', 'payment_date')
            
            add_index('staffs', 'ix_staffs_status', 'status')
            
            db.session.commit()
            print('✅ v3.3数据库索引优化已完成')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ v3.3索引优化跳过: {e}')
        
        # v3.4 维修设备表字段补充 + 待办表日期可空
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            def add_col(table, col, ddl):
                if col not in [c['name'] for c in insp.get_columns(table)]:
                    db.session.execute(db.text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
            
            add_col('repair_equipments', 'material_id', 'material_id INTEGER')
            
            # 待办表 reminder_date 改为可空（SQLite 需要重建表）
            cols = insp.get_columns('pending_works')
            reminder_col = next((c for c in cols if c['name'] == 'reminder_date'), None)
            if reminder_col and not reminder_col.get('nullable', True):
                col_names = [c['name'] for c in cols]
                db.session.execute(db.text(f'''
                    CREATE TABLE pending_works_new (
                        id INTEGER PRIMARY KEY,
                        title VARCHAR(200) DEFAULT '',
                        customer_name VARCHAR(100) NOT NULL,
                        contact_name VARCHAR(100) DEFAULT '',
                        work_address VARCHAR(200) NOT NULL,
                        staff_name VARCHAR(100) NOT NULL,
                        work_content TEXT NOT NULL,
                        reminder_date DATETIME,
                        created_at DATETIME,
                        status VARCHAR(20) DEFAULT 'pending',
                        todo_type VARCHAR(30) DEFAULT '客户报修',
                        contact_phone VARCHAR(20) DEFAULT '',
                        priority VARCHAR(20) DEFAULT 'normal',
                        related_record_type VARCHAR(20) DEFAULT '',
                        related_record_id INTEGER
                    )
                '''))
                col_str = ', '.join(col_names)
                db.session.execute(db.text(f'''
                    INSERT INTO pending_works_new ({col_str})
                    SELECT {col_str} FROM pending_works
                '''))
                db.session.execute(db.text('DROP TABLE pending_works'))
                db.session.execute(db.text('ALTER TABLE pending_works_new RENAME TO pending_works'))
            
            db.session.commit()
            db.create_all()
            print('✅ v3.4维修设备表字段已检查')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ v3.4维修设备字段迁移跳过: {e}')
        
        # v3.5 财务模块字段扩展
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            def add_col(table, col, ddl):
                if col not in [c['name'] for c in insp.get_columns(table)]:
                    db.session.execute(db.text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
            
            # Expense 表扩展字段
            add_col('expenses', 'category_id', 'category_id INTEGER')
            add_col('expenses', 'record_id', 'record_id INTEGER')
            add_col('expenses', 'project_id', 'project_id INTEGER')
            add_col('expenses', 'project_name', 'project_name VARCHAR(200) DEFAULT ""')
            add_col('expenses', 'customer_id', 'customer_id INTEGER')
            add_col('expenses', 'customer_name', 'customer_name VARCHAR(100) DEFAULT ""')
            add_col('expenses', 'handler', 'handler VARCHAR(100) DEFAULT ""')
            add_col('expenses', 'is_invoiced', 'is_invoiced BOOLEAN DEFAULT 0')
            
            # PaymentRecord 表扩展字段
            add_col('payment_records', 'project_id', 'project_id INTEGER')
            add_col('payment_records', 'project_name', 'project_name VARCHAR(200) DEFAULT ""')
            add_col('payment_records', 'customer_id', 'customer_id INTEGER')
            add_col('payment_records', 'received_by', 'received_by VARCHAR(100) DEFAULT ""')
            add_col('payment_records', 'is_invoiced', 'is_invoiced BOOLEAN DEFAULT 0')
            
            # SalaryRecord 表扩展字段
            add_col('salary_records', 'staff_id', 'staff_id INTEGER')
            
            # 创建索引
            def add_index(table, idx_name, columns):
                try:
                    indexes = insp.get_indexes(table)
                    if not any(i.get('name') == idx_name for i in indexes):
                        db.session.execute(db.text(f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({columns})'))
                except: pass
            
            add_index('expenses', 'ix_expenses_category_id', 'category_id')
            add_index('expenses', 'ix_expenses_record_id', 'record_id')
            add_index('expenses', 'ix_expenses_project_id', 'project_id')
            add_index('expenses', 'ix_expenses_customer_id', 'customer_id')
            add_index('payment_records', 'ix_payment_records_project_id', 'project_id')
            add_index('payment_records', 'ix_payment_records_customer_id', 'customer_id')
            add_index('salary_records', 'ix_salary_records_staff_id', 'staff_id')
            
            db.session.commit()
            db.create_all()
            print('✅ v3.5财务模块字段已检查')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ v3.5财务字段迁移跳过: {e}')
        
        # v3.6 客户开票信息字段
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            def add_col(table, col, ddl):
                if col not in [c['name'] for c in insp.get_columns(table)]:
                    db.session.execute(db.text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
            
            add_col('customers', 'invoice_title', 'invoice_title VARCHAR(200) DEFAULT ""')
            add_col('customers', 'tax_number', 'tax_number VARCHAR(50) DEFAULT ""')
            add_col('customers', 'bank_name', 'bank_name VARCHAR(100) DEFAULT ""')
            add_col('customers', 'bank_account', 'bank_account VARCHAR(50) DEFAULT ""')
            add_col('customers', 'invoice_address', 'invoice_address VARCHAR(200) DEFAULT ""')
            add_col('customers', 'invoice_phone', 'invoice_phone VARCHAR(20) DEFAULT ""')
            
            db.session.commit()
            db.create_all()
            print('✅ v3.6客户开票信息字段已检查')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ v3.6客户开票字段迁移跳过: {e}')
        
        # v3.7 员工证件照片 + 客户设备保修/维保字段
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            def add_col(table, col, ddl):
                if col not in [c['name'] for c in insp.get_columns(table)]:
                    db.session.execute(db.text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
            
            add_col('staffs', 'id_card_front_photo', "id_card_front_photo VARCHAR(200) DEFAULT ''")
            add_col('staffs', 'id_card_back_photo', "id_card_back_photo VARCHAR(200) DEFAULT ''")
            add_col('staffs', 'certificate_photos', 'certificate_photos TEXT DEFAULT ""')
            
            add_col('customer_equipments', 'warranty_start', 'warranty_start DATE')
            add_col('customer_equipments', 'warranty_end', 'warranty_end DATE')
            add_col('customer_equipments', 'next_maintenance', 'next_maintenance DATE')
            add_col('customer_equipments', 'maintenance_cycle', 'maintenance_cycle INTEGER DEFAULT 90')
            
            db.session.commit()
            db.create_all()
            print('✅ v3.7员工证件照片和客户设备字段已检查')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ v3.7字段迁移跳过: {e}')
        
        # v3.8 模板字段修复 + is_invoiced字段三状态支持
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            
            def add_col(table, col, ddl):
                if col not in [c['name'] for c in insp.get_columns(table)]:
                    db.session.execute(db.text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
            
            add_col('work_templates', 'fee_items', 'fee_items TEXT DEFAULT ""')
            
            # 修改expenses表的is_invoiced字段从BOOLEAN改为VARCHAR(20)（SQLite需要重建表）
            try:
                exp_cols = insp.get_columns('expenses')
                exp_invoiced_col = next((c for c in exp_cols if c['name'] == 'is_invoiced'), None)
                if exp_invoiced_col:
                    col_type = str(exp_invoiced_col.get('type', '')).upper()
                    if 'BOOLEAN' in col_type or 'BOOL' in col_type or 'INTEGER' in col_type:
                        print('✅ 检测到expenses.is_invoiced为旧的BOOLEAN类型，正在转换...')
                        col_names = [c['name'] for c in exp_cols]
                        db.session.execute(db.text('''
                            CREATE TABLE expenses_new (
                                id INTEGER PRIMARY KEY,
                                expense_type VARCHAR(20) DEFAULT 'other',
                                category_id INTEGER,
                                category VARCHAR(50) DEFAULT '',
                                title VARCHAR(200) DEFAULT '',
                                amount FLOAT DEFAULT 0.0,
                                expense_date DATE,
                                related_type VARCHAR(30) DEFAULT '',
                                related_id INTEGER,
                                related_no VARCHAR(100) DEFAULT '',
                                record_id INTEGER,
                                project_id INTEGER,
                                project_name VARCHAR(200) DEFAULT '',
                                customer_id INTEGER,
                                customer_name VARCHAR(100) DEFAULT '',
                                supplier VARCHAR(100) DEFAULT '',
                                handler VARCHAR(100) DEFAULT '',
                                payment_method VARCHAR(20) DEFAULT 'cash',
                                is_invoiced VARCHAR(20) DEFAULT 'uninvoiced',
                                remark TEXT DEFAULT '',
                                created_by VARCHAR(100) DEFAULT '',
                                created_at DATETIME,
                                updated_at DATETIME
                            )
                        '''))
                        col_str = ', '.join(col_names)
                        db.session.execute(db.text(f'''
                            INSERT INTO expenses_new ({col_str})
                            SELECT {col_str} FROM expenses
                        '''))
                        db.session.execute(db.text("UPDATE expenses_new SET is_invoiced = 'invoiced' WHERE is_invoiced = '1' OR is_invoiced = 'True' OR is_invoiced = 1"))
                        db.session.execute(db.text("UPDATE expenses_new SET is_invoiced = 'uninvoiced' WHERE is_invoiced = '0' OR is_invoiced = 'False' OR is_invoiced = 0 OR is_invoiced IS NULL OR is_invoiced = ''"))
                        db.session.execute(db.text('DROP TABLE expenses'))
                        db.session.execute(db.text('ALTER TABLE expenses_new RENAME TO expenses'))
                        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS ix_expenses_category_id ON expenses (category_id)'))
                        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS ix_expenses_record_id ON expenses (record_id)'))
                        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS ix_expenses_project_id ON expenses (project_id)'))
                        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS ix_expenses_customer_id ON expenses (customer_id)'))
            except Exception as e:
                print(f'⚠️ expenses.is_invoiced字段转换跳过: {e}')
            
            # 修改payment_records表的is_invoiced字段
            try:
                pay_cols = insp.get_columns('payment_records')
                pay_invoiced_col = next((c for c in pay_cols if c['name'] == 'is_invoiced'), None)
                if pay_invoiced_col:
                    col_type = str(pay_invoiced_col.get('type', '')).upper()
                    if 'BOOLEAN' in col_type or 'BOOL' in col_type or 'INTEGER' in col_type:
                        print('✅ 检测到payment_records.is_invoiced为旧的BOOLEAN类型，正在转换...')
                        col_names = [c['name'] for c in pay_cols]
                        db.session.execute(db.text('''
                            CREATE TABLE payment_records_new (
                                id INTEGER PRIMARY KEY,
                                record_id INTEGER,
                                project_id INTEGER,
                                project_name VARCHAR(200) DEFAULT '',
                                customer_id INTEGER,
                                customer_name VARCHAR(100) DEFAULT '',
                                amount FLOAT DEFAULT 0.0,
                                payment_date DATE,
                                payment_method VARCHAR(20) DEFAULT 'cash',
                                received_by VARCHAR(100) DEFAULT '',
                                is_invoiced VARCHAR(20) DEFAULT 'uninvoiced',
                                remark VARCHAR(500) DEFAULT '',
                                created_by VARCHAR(100) DEFAULT '',
                                created_at DATETIME
                            )
                        '''))
                        col_str = ', '.join(col_names)
                        db.session.execute(db.text(f'''
                            INSERT INTO payment_records_new ({col_str})
                            SELECT {col_str} FROM payment_records
                        '''))
                        db.session.execute(db.text("UPDATE payment_records_new SET is_invoiced = 'invoiced' WHERE is_invoiced = '1' OR is_invoiced = 'True' OR is_invoiced = 1"))
                        db.session.execute(db.text("UPDATE payment_records_new SET is_invoiced = 'uninvoiced' WHERE is_invoiced = '0' OR is_invoiced = 'False' OR is_invoiced = 0 OR is_invoiced IS NULL OR is_invoiced = ''"))
                        db.session.execute(db.text('DROP TABLE payment_records'))
                        db.session.execute(db.text('ALTER TABLE payment_records_new RENAME TO payment_records'))
                        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS ix_payment_records_record_id ON payment_records (record_id)'))
                        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS ix_payment_records_project_id ON payment_records (project_id)'))
                        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS ix_payment_records_customer_id ON payment_records (customer_id)'))
                        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS ix_payment_records_payment_date ON payment_records (payment_date)'))
            except Exception as e:
                print(f'⚠️ payment_records.is_invoiced字段转换跳过: {e}')
            
            db.session.commit()
            db.create_all()
            print('✅ v3.8模板字段和is_invoiced字段已检查')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ v3.8字段迁移跳过: {e}')
        
        # v3.9 材料库存日志表字段补充
        try:
            from sqlalchemy import inspect
            insp = inspect(db.engine)
            def add_col(table, col, ddl):
                if col not in [c['name'] for c in insp.get_columns(table)]:
                    db.session.execute(db.text(f'ALTER TABLE {table} ADD COLUMN {ddl}'))
            
            add_col('material_stock_logs', 'material_name', "material_name VARCHAR(100) DEFAULT ''")
            add_col('material_stock_logs', 'stock_before', 'stock_before FLOAT DEFAULT 0.0')
            
            db.session.commit()
            db.create_all()
            print('✅ v3.9材料库存日志字段已检查')
        except Exception as e:
            db.session.rollback()
            print(f'⚠️ v3.9字段迁移跳过: {e}')
        
        # 创建默认管理员账号
        from .models import WorkerUser
        admin = WorkerUser.query.filter_by(username='admin').first()
        if not admin:
            admin = WorkerUser(
                username='admin',
                staff_name='管理员',
                role='admin',
                staff_id=None
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("✅ 默认管理员已创建，请登录后及时修改密码")
        
        # 为已有记录生成工单号
        try:
            from .models import WorkRecord
            empty = WorkRecord.query.filter(
                db.or_(WorkRecord.order_no == None, WorkRecord.order_no == '')
            ).count()
            if empty > 0:
                from collections import defaultdict
                date_counter = defaultdict(int)
                for r in WorkRecord.query.order_by(WorkRecord.work_date, WorkRecord.id).all():
                    date_key = r.work_date.strftime("%Y%m%d")
                    kind = 'RY-WX' if getattr(r, 'record_type', '') == 'repair' else 'RY-SG'
                    counter_key = f'{kind}-{date_key}'
                    date_counter[counter_key] += 1
                    if not r.order_no:
                        r.order_no = f'{kind}-{date_key}-{date_counter[counter_key]:03d}'
                db.session.commit()
                print(f"✅ 已为 {empty} 条记录生成工单号")
        except Exception as e:
            print(f"⚠️ 工单号生成跳过: {e}")
        
        print("✅ 数据库初始化完成")
        print("✅ 已注册的路由:")
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static':
                print(f"   {rule.endpoint}: {rule}")
    
    # ===== 如果是有前端文件的环境，注册静态路由 =====
    frontend_dir = os.environ.get("FRONTEND_DIR", "")
    if frontend_dir and os.path.isdir(frontend_dir):
        from .static_handler import setup_static_routes
        setup_static_routes(app)
    
    return app
