from flask import request, jsonify, current_app, Blueprint, send_from_directory, g
from werkzeug.exceptions import HTTPException
from . import db
from .models import WorkRecord, PendingWork, Staff, Customer, WorkerUser, SystemSetting, SalaryRecord, OperationLog, OperationLogArchive, PaymentRecord, WorkTemplate, Project, Material, MaterialStockLog, CustomerEquipment, MaintenancePlan, Notification, Expense, ExpenseCategory, RepairEquipment, ProjectExpense, ProjectSalary, ProjectWorkRecord
from .auth import login_required, admin_required, create_token, get_login_user_name
from datetime import datetime, timedelta, date
from sqlalchemy import func, or_
import json
import os
import uuid
import re

api_bp = Blueprint('api', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_MIMETYPES = {'image/png', 'image/jpeg', 'image/gif', 'image/webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024


def escape_like_keyword(keyword):
    """转义LIKE查询中的特殊字符，防止LIKE注入"""
    if not keyword:
        return keyword
    return keyword.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')


def parse_date(date_str):
    """安全解析日期字符串"""
    if not date_str:
        return None
    if isinstance(date_str, date):
        return date_str
    if isinstance(date_str, datetime):
        return date_str.date()
    try:
        return datetime.strptime(str(date_str)[:10], '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None

def allowed_file(file):
    if not file or not file.filename:
        return False
    if '.' not in file.filename:
        return False
    ext = file.filename.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False
    if file.mimetype and file.mimetype not in ALLOWED_MIMETYPES:
        return False
    try:
        pos = file.tell()
        file.seek(0, 2)
        size = file.tell()
        file.seek(pos)
        if size > MAX_FILE_SIZE:
            return False
    except:
        pass
    return True

def _can_access_record(record):
    """检查当前用户是否有权限访问工单（admin全部，worker只能看自己参与的）"""
    user_role = g.current_user.get('role', 'worker')
    if user_role == 'admin':
        return True
    user_name = g.current_user.get('staff_name', '')
    if not user_name:
        return False
    if record.created_by == user_name:
        return True
    if record.staff_name == user_name:
        return True
    if record.staff_names and user_name in record.staff_names.split(','):
        return True
    if record.project_id:
        project = Project.query.get(record.project_id)
        if project and (user_name in (project.manager or '') or project.created_by == user_name):
            return True
    return False

def _can_access_payment(payment):
    """检查当前用户是否有权限访问收款记录"""
    user_role = g.current_user.get('role', 'worker')
    if user_role == 'admin':
        return True
    if payment.record_id:
        record = WorkRecord.query.get(payment.record_id)
        if record:
            return _can_access_record(record)
    user_name = g.current_user.get('staff_name', '')
    if payment.created_by == user_name:
        return True
    return False


def _get_worker_name():
    """获取当前登录用户的staff_name，用于权限过滤"""
    return g.current_user.get('staff_name', '') or get_login_user_name()


def _is_admin():
    """当前用户是否是管理员"""
    return g.current_user.get('role') == 'admin'


def _apply_record_permission(query):
    """给工单(WorkRecord)查询应用worker权限过滤"""
    if _is_admin():
        return query
    user_name = _get_worker_name()
    if not user_name:
        return query.filter(False)
    return query.filter(
        or_(
            WorkRecord.staff_names.like(f'%{user_name}%'),
            WorkRecord.staff_name == user_name,
            WorkRecord.created_by == user_name
        )
    )


def safe_filename(original_name):
    """生成安全的文件名"""
    ext = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else 'jpg'
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    short_id = str(uuid.uuid4())[:8]
    return f'{ts}_{short_id}.{ext}'


def _ensure_indexes():
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        indexes_to_create = [
            ("CREATE INDEX IF NOT EXISTS idx_work_records_work_date ON work_records(work_date)"),
            ("CREATE INDEX IF NOT EXISTS idx_work_records_customer ON work_records(customer_name)"),
            ("CREATE INDEX IF NOT EXISTS idx_work_records_status ON work_records(status)"),
            ("CREATE INDEX IF NOT EXISTS idx_work_records_record_type ON work_records(record_type)"),
            ("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)"),
            ("CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)"),
            ("CREATE INDEX IF NOT EXISTS idx_payments_date ON payment_records(payment_date)"),
            ("CREATE INDEX IF NOT EXISTS idx_payments_customer ON payment_records(customer_name)"),
            ("CREATE INDEX IF NOT EXISTS idx_pending_customer ON pending_works(customer_name)"),
            ("CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_works(status)"),
            ("CREATE INDEX IF NOT EXISTS idx_pending_date ON pending_works(reminder_date)"),
            ("CREATE INDEX IF NOT EXISTS idx_project_work_project ON project_work_records(project_id)"),
            ("CREATE INDEX IF NOT EXISTS idx_project_work_date ON project_work_records(work_date)"),
            ("CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON project_expenses(project_id)"),
            ("CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON project_expenses(expense_date)"),
            ("CREATE INDEX IF NOT EXISTS idx_salaries_date ON salaries(work_date)"),
            ("CREATE INDEX IF NOT EXISTS idx_project_salaries_project ON project_salaries(project_id)"),
        ]
        with db.engine.connect() as conn:
            for sql in indexes_to_create:
                try:
                    conn.execute(text(sql))
                except Exception:
                    pass
            conn.commit()
    except Exception as e:
        print(f"Index creation warning: {e}")


def _log_operation(target_type, target_id, action, snapshot_before=None, snapshot_after=None, target_title=''):
    """记录操作日志"""
    try:
        changes_summary = []
        if snapshot_before and snapshot_after:
            field_labels = _get_field_labels(target_type)
            for key in set(list(snapshot_before.keys()) + list(snapshot_after.keys())):
                before_val = snapshot_before.get(key, '')
                after_val = snapshot_after.get(key, '')
                if str(before_val) != str(after_val):
                    label = field_labels.get(key, key)
                    changes_summary.append({
                        'field': key,
                        'label': label,
                        'before': str(before_val) if before_val is not None else '',
                        'after': str(after_val) if after_val is not None else ''
                    })
        
        log = OperationLog(
            target_type=target_type,
            target_id=target_id,
            action=action,
            user=get_login_user_name() or '',
            snapshot_before=json.dumps(snapshot_before, ensure_ascii=False) if snapshot_before else '',
            snapshot_after=json.dumps(snapshot_after, ensure_ascii=False) if snapshot_after else '',
            changes_summary=json.dumps(changes_summary, ensure_ascii=False),
            target_title=target_title
        )
        db.session.add(log)
        db.session.flush()
    except Exception as e:
        print(f"[操作日志] 记录失败: {e}", flush=True)


def _get_field_labels(target_type):
    """获取字段中文标签映射"""
    if target_type == 'work_record':
        return {
            'customer_name': '客户名称',
            'contact_name': '联系人',
            'customer_phone': '联系电话',
            'work_address': '工作地址',
            'staff_names': '负责员工',
            'record_type': '记录类型',
            'work_content': '工作内容',
            'fault_description': '故障描述',
            'fault_diagnosis': '故障诊断',
            'repair_process': '维修过程',
            'repair_result': '维修结果',
            'work_date': '工作日期',
            'start_time': '开始时间',
            'end_time': '结束时间',
            'labor_fee': '人工费',
            'material_fee': '材料费',
            'transport_fee': '交通费',
            'other_fee': '其他费用',
            'total_fee': '总费用',
            'tax_type': '税费类型',
            'tax_rate': '税率',
            'tax_amount': '税额',
            'remark': '备注',
            'status': '状态',
            'payment_status': '付款状态',
            'priority': '优先级',
            'work_subtype': '工单类型',
            'order_no': '工单号',
        }
    elif target_type == 'pending_work':
        return {
            'title': '标题',
            'customer_name': '客户名称',
            'contact_name': '联系人',
            'contact_phone': '联系电话',
            'work_address': '工作地址',
            'staff_name': '负责人',
            'work_content': '工作内容',
            'reminder_date': '提醒日期',
            'status': '状态',
            'todo_type': '待办类型',
            'priority': '优先级',
        }
    return {}

@api_bp.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'API is working!', 'status': 'ok'})


@api_bp.route('/health', methods=['GET'])
def health_check():
    try:
        db.session.execute(db.text('SELECT 1'))
        db_ok = True
    except Exception:
        db_ok = False
    
    return jsonify({
        'status': 'ok' if db_ok else 'degraded',
        'database': 'healthy' if db_ok else 'unhealthy',
        'timestamp': datetime.now().isoformat(),
        'version': '3.1.0'
    }), 200 if db_ok else 503

# ===================== 权限认证 =====================

@api_bp.route('/auth/debug', methods=['POST'])
def auth_debug():
    """调试: 打印收到的登录请求"""
    import sys
    data = request.get_json() or {}
    print(f'[DEBUG LOGIN] Body: {data}', flush=True)
    print(f'[DEBUG LOGIN] Content-Type: {request.content_type}', flush=True)
    print(f'[DEBUG LOGIN] Origin: {request.headers.get("Origin", "N/A")}', flush=True)
    print(f'[DEBUG LOGIN] Remote: {request.remote_addr}', flush=True)
    return jsonify({'received': data})

@api_bp.route('/auth/login', methods=['POST'])
def auth_login():
    """登录"""
    try:
        data = request.get_json() or {}
        username = data.get('username', '').strip()
        password = data.get('password', '')
        if not username or not password:
            return jsonify({'error': '用户名和密码不能为空'}), 400
        user = WorkerUser.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': '用户名或密码错误'}), 401
        if not user.enabled:
            return jsonify({'error': '账号已被禁用'}), 403
        return jsonify({
            'token': create_token(user),
            'user': user.to_dict()
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/me', methods=['GET'])
@login_required
def auth_me():
    """获取当前登录用户信息"""
    from flask import g
    return jsonify({'user': g.current_user})

@api_bp.route('/auth/change-password', methods=['POST'])
@login_required
def auth_change_password():
    """当前用户修改自己密码"""
    try:
        data = request.get_json() or {}
        old_pw = data.get('old_password', '')
        new_pw = data.get('new_password', '')
        if not old_pw or not new_pw:
            return jsonify({'error': '旧密码和新密码不能为空'}), 400
        if len(new_pw) < 4:
            return jsonify({'error': '新密码至少4位'}), 400
        user_id = g.current_user['user_id']
        user = WorkerUser.query.get(user_id)
        if not user or not user.check_password(old_pw):
            return jsonify({'error': '旧密码错误'}), 400
        user.set_password(new_pw)
        db.session.commit()
        return jsonify({'message': '密码修改成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/users', methods=['GET'])
@admin_required
def list_users():
    """管理员: 列出所有用户"""
    try:
        users = WorkerUser.query.order_by(WorkerUser.created_at.desc()).all()
        return jsonify([u.to_dict() for u in users])
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/users', methods=['POST'])
@admin_required
def create_user():
    """管理员: 创建用户"""
    try:
        data = request.get_json() or {}
        username = data.get('username', '').strip()
        password = data.get('password', '')
        staff_name = data.get('staff_name', '').strip()
        role = data.get('role', 'worker')
        staff_id = data.get('staff_id')
        if not username or not password or not staff_name:
            return jsonify({'error': '用户名、密码、员工姓名不能为空'}), 400
        if len(password) < 4:
            return jsonify({'error': '密码至少4位'}), 400
        existing = WorkerUser.query.filter_by(username=username).first()
        if existing:
            return jsonify({'error': '用户名已存在'}), 400
        user = WorkerUser(
            username=username,
            staff_name=staff_name,
            role=role,
            staff_id=staff_id
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return jsonify(user.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """管理员: 更新用户（改密码、启用/禁用、改角色）"""
    try:
        user = WorkerUser.query.get_or_404(user_id)
        data = request.get_json() or {}
        if 'password' in data and data['password']:
            if len(data['password']) < 4:
                return jsonify({'error': '密码至少4位'}), 400
            user.set_password(data['password'])
        if 'username' in data:
            user.username = data['username']
        if 'role' in data:
            user.role = data['role']
        if 'enabled' in data:
            user.enabled = bool(data['enabled'])
        if 'staff_name' in data:
            user.staff_name = data['staff_name']
        db.session.commit()
        return jsonify(user.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """管理员: 删除用户"""
    try:
        user = WorkerUser.query.get_or_404(user_id)
        # 不允许删除最后一个管理员
        if user.role == 'admin':
            admin_count = WorkerUser.query.filter_by(role='admin', enabled=True).count()
            if admin_count <= 1:
                return jsonify({'error': '不能删除最后一个管理员'}), 400
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/reset-password-by-admin/<int:user_id>', methods=['POST'])
@admin_required
def admin_reset_password(user_id):
    """管理员: 重设员工密码"""
    try:
        data = request.get_json() or {}
        new_pw = data.get('password', '')
        if len(new_pw) < 4:
            return jsonify({'error': '密码至少4位'}), 400
        user = WorkerUser.query.get_or_404(user_id)
        user.set_password(new_pw)
        db.session.commit()
        return jsonify({'message': '密码已重置'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===================== 客户管理 =====================

@api_bp.route('/customers', methods=['GET'])
@login_required
def get_customers():
    try:
        q = request.args.get('q', '')
        query = Customer.query
        if q:
            like = f'%{q}%'
            query = query.filter(or_(
                Customer.name.like(like),
                Customer.short_name.like(like),
                Customer.full_name.like(like),
                Customer.contact_name.like(like),
                Customer.credit_code.like(like)
            ))
        customers = query.order_by(Customer.name).all()
        return jsonify([c.to_dict() for c in customers])
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customers', methods=['POST'])
@admin_required
def create_customer():
    try:
        data = request.get_json() or {}
        short_name = (data.get('short_name') or data.get('name') or '').strip()
        full_name = (data.get('full_name') or data.get('name') or short_name).strip()
        display_name = short_name or full_name
        if not display_name:
            return jsonify({'error': '客户简称或全称不能为空'}), 400
        existing = Customer.query.filter_by(name=display_name).first()
        if existing:
            return jsonify({'error': '客户已存在'}), 400
        customer = Customer(
            name=display_name,
            short_name=short_name or display_name,
            full_name=full_name or display_name,
            credit_code=(data.get('credit_code') or '').strip(),
            contact_name=(data.get('contact_name') or '').strip(),
            phone=data.get('phone', ''),
            address=data.get('address', ''),
            remark=data.get('remark', '')
        )
        db.session.add(customer)
        db.session.commit()
        return jsonify(customer.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customers/<int:customer_id>', methods=['GET'])
@login_required
def get_customer(customer_id):
    try:
        customer = Customer.query.get_or_404(customer_id)
        records = WorkRecord.query.filter_by(customer_name=customer.name).order_by(WorkRecord.work_date.desc()).limit(20).all()
        return jsonify({
            'customer': customer.to_dict(),
            'records': [r.to_dict() for r in records]
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/customers/<int:customer_id>/overview', methods=['GET'])
@login_required
def get_customer_overview(customer_id):
    try:
        customer = Customer.query.get_or_404(customer_id)
        name = customer.name
        
        record_q = _apply_record_permission(WorkRecord.query.filter_by(customer_name=name))
        total_records = record_q.count()
        total_fee = record_q.with_entities(func.sum(WorkRecord.total_fee)).scalar() or 0
        total_paid = record_q.with_entities(func.sum(WorkRecord.paid_amount)).scalar() or 0
        unpaid = float(total_fee) - float(total_paid)
        
        completed = record_q.filter(WorkRecord.status == 'completed').count()
        construction_records = record_q.filter(WorkRecord.record_type == 'construction').count()
        repair_records = record_q.filter(WorkRecord.record_type == 'repair').count()
        
        recent_records = record_q.order_by(WorkRecord.work_date.desc()).limit(10).all()
        
        payment_q = PaymentRecord.query.filter_by(customer_name=name)
        total_payments = payment_q.count()
        total_payment_amount = payment_q.with_entities(func.sum(PaymentRecord.amount)).scalar() or 0
        
        proj_q = _apply_project_permission(Project.query.filter_by(customer_name=name))
        total_projects = proj_q.count()
        proj_receipt = proj_q.with_entities(func.sum(Project.receipt_amount)).scalar() or 0
        proj_amount = proj_q.with_entities(func.sum(Project.contract_amount)).scalar() or 0
        
        equip_count = CustomerEquipment.query.filter_by(customer_name=name).count()
        
        pending_count = PendingWork.query.filter_by(customer_name=name).filter(
            PendingWork.status == 'pending'
        ).count()
        
        recent_payments = PaymentRecord.query.filter_by(customer_name=name).order_by(
            PaymentRecord.payment_date.desc()
        ).limit(5).all()
        
        return jsonify({
            'customer': customer.to_dict(),
            'stats': {
                'total_records': total_records,
                'total_fee': float(total_fee),
                'total_paid': float(total_paid),
                'unpaid_amount': round(unpaid, 2),
                'completed_count': completed,
                'construction_count': construction_records,
                'repair_count': repair_records,
                'total_payments': total_payments,
                'total_payment_amount': float(total_payment_amount),
                'total_projects': total_projects,
                'project_contract_amount': float(proj_amount),
                'project_receipt_amount': float(proj_receipt),
                'equipment_count': equip_count,
                'pending_count': pending_count
            },
            'recent_records': [r.to_dict() for r in recent_records],
            'recent_payments': [p.to_dict() for p in recent_payments]
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customers/<int:customer_id>', methods=['PUT'])
@admin_required
def update_customer(customer_id):
    try:
        customer = Customer.query.get_or_404(customer_id)
        data = request.get_json() or {}
        if 'short_name' in data or 'full_name' in data or 'name' in data:
            short_name = (data.get('short_name') or data.get('name') or customer.short_name or customer.name).strip()
            full_name = (data.get('full_name') or customer.full_name or data.get('name') or short_name).strip()
            customer.short_name = short_name
            customer.full_name = full_name
            customer.name = short_name or full_name
        if 'credit_code' in data:
            customer.credit_code = data['credit_code']
        if 'contact_name' in data:
            customer.contact_name = data['contact_name']
        if 'phone' in data:
            customer.phone = data['phone']
        if 'address' in data:
            customer.address = data['address']
        if 'remark' in data:
            customer.remark = data['remark']
        db.session.commit()
        return jsonify(customer.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
@admin_required
def delete_customer(customer_id):
    try:
        customer = Customer.query.get_or_404(customer_id)
        record_count = WorkRecord.query.filter_by(customer_name=customer.name).count()
        pending_count = PendingWork.query.filter_by(customer_name=customer.name).count()
        project_count = Project.query.filter_by(customer_name=customer.name).count()
        if record_count > 0 or pending_count > 0 or project_count > 0:
            refs = []
            if record_count > 0: refs.append(f'{record_count}条工单')
            if pending_count > 0: refs.append(f'{pending_count}条待办')
            if project_count > 0: refs.append(f'{project_count}个项目')
            return jsonify({'error': f'该客户存在关联数据({", ".join(refs)})，无法删除'}), 400
        CustomerEquipment.query.filter_by(customer_name=customer.name).delete()
        db.session.delete(customer)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===================== 员工管理 =====================

@api_bp.route('/staffs', methods=['GET'])
@login_required
def get_staffs():
    try:
        status = request.args.get('status', '')
        keyword = request.args.get('keyword', '')
        query = Staff.query
        if status:
            query = query.filter(Staff.status == status)
        if keyword:
            kw = escape_like_keyword(keyword)
            query = query.filter(Staff.name.like(f'%{kw}%'))
        staffs = query.order_by(Staff.id.desc()).all()
        return jsonify([s.to_dict() for s in staffs])
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/staffs', methods=['POST'])
@admin_required
def create_staff():
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'error': '员工姓名不能为空'}), 400
        existing = Staff.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({'error': '员工已存在'}), 400
        staff = Staff(
            name=data.get('name'),
            phone=data.get('phone', ''),
            staff_type=data.get('staff_type', 'fixed'),
            daily_wage=float(data.get('daily_wage', 0)),
            monthly_salary=float(data.get('monthly_salary', 0)),
            project=data.get('project', ''),
            position=data.get('position', ''),
            id_card=data.get('id_card', ''),
            hire_date=parse_date(data.get('hire_date')),
            status=data.get('status', 'active'),
            remark=data.get('remark', '')
        )
        db.session.add(staff)
        db.session.commit()
        return jsonify(staff.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/staffs/<int:staff_id>', methods=['GET'])
@login_required
def get_staff(staff_id):
    try:
        staff = Staff.query.get_or_404(staff_id)
        return jsonify(staff.to_dict())
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/staffs/<int:staff_id>', methods=['PUT'])
@admin_required
def update_staff(staff_id):
    try:
        staff = Staff.query.get_or_404(staff_id)
        data = request.get_json() or {}
        if 'name' in data: staff.name = data['name']
        if 'phone' in data: staff.phone = data['phone']
        if 'staff_type' in data: staff.staff_type = data['staff_type']
        if 'daily_wage' in data: staff.daily_wage = float(data['daily_wage'] or 0)
        if 'monthly_salary' in data: staff.monthly_salary = float(data['monthly_salary'] or 0)
        if 'project' in data: staff.project = data['project']
        if 'position' in data: staff.position = data['position']
        if 'id_card' in data: staff.id_card = data['id_card']
        if 'hire_date' in data: staff.hire_date = parse_date(data['hire_date'])
        if 'status' in data: staff.status = data['status']
        if 'remark' in data: staff.remark = data['remark']
        db.session.commit()
        return jsonify(staff.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/staffs/<int:staff_id>', methods=['DELETE'])
@admin_required
def delete_staff(staff_id):
    try:
        staff = Staff.query.get_or_404(staff_id)
        record_count = WorkRecord.query.filter(WorkRecord.staff_names.like(f'%{staff.name}%')).count()
        salary_count = SalaryRecord.query.filter_by(staff_name=staff.name).count()
        pending_count = PendingWork.query.filter(PendingWork.staff_name.like(f'%{staff.name}%')).count()
        project_count = Project.query.filter(Project.manager.like(f'%{staff.name}%')).count()
        if record_count > 0 or salary_count > 0 or pending_count > 0 or project_count > 0:
            refs = []
            if record_count > 0: refs.append(f'{record_count}条工单')
            if salary_count > 0: refs.append(f'{salary_count}条工资记录')
            if pending_count > 0: refs.append(f'{pending_count}条待办')
            if project_count > 0: refs.append(f'{project_count}个负责项目')
            return jsonify({'error': f'该员工存在关联数据({", ".join(refs)})，无法删除'}), 400
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if staff.id_photo:
            old_path = os.path.join(upload_folder, os.path.basename(staff.id_photo))
            if os.path.exists(old_path): os.remove(old_path)
        if staff.cert_photo:
            old_path = os.path.join(upload_folder, os.path.basename(staff.cert_photo))
            if os.path.exists(old_path): os.remove(old_path)
        user = WorkerUser.query.filter_by(staff_name=staff.name).first()
        if user:
            db.session.delete(user)
        db.session.delete(staff)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/staffs/<int:staff_id>/toggle-enabled', methods=['POST'])
@admin_required
def toggle_staff_enabled(staff_id):
    try:
        staff = Staff.query.get_or_404(staff_id)
        user = WorkerUser.query.filter_by(staff_name=staff.name).first()
        if user:
            user.enabled = not user.enabled
            staff.status = 'active' if user.enabled else 'inactive'
        else:
            staff.status = 'inactive' if staff.status == 'active' else 'active'
        db.session.commit()
        return jsonify({'message': '状态已更新', 'enabled': user.enabled if user else (staff.status == 'active')})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/staffs/<int:staff_id>/reset-password', methods=['POST'])
@admin_required
def reset_staff_password(staff_id):
    try:
        staff = Staff.query.get_or_404(staff_id)
        data = request.get_json() or {}
        new_password = data.get('new_password') or data.get('password') or '123456'
        user = WorkerUser.query.filter_by(staff_name=staff.name).first()
        if not user:
            return jsonify({'error': '该员工没有登录账号'}), 400
        user.set_password(new_password)
        db.session.commit()
        return jsonify({'message': '密码重置成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/staffs/<int:staff_id>/id_photo', methods=['POST'])
@admin_required
def upload_id_photo(staff_id):
    try:
        staff = Staff.query.get_or_404(staff_id)
        file = request.files.get('id_photo')
        if not allowed_file(file):
            return jsonify({'error': '请上传有效的图片文件（png/jpg/jpeg/gif/webp，单张不超过10MB）'}), 400
        upload_folder = current_app.config['UPLOAD_FOLDER']
        filename = safe_filename(file.filename)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        if staff.id_photo:
            old_path = os.path.join(upload_folder, os.path.basename(staff.id_photo))
            if os.path.exists(old_path): os.remove(old_path)
        staff.id_photo = f'/uploads/{filename}'
        db.session.commit()
        return jsonify({'id_photo': staff.id_photo})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/staffs/<int:staff_id>/cert_photo', methods=['POST'])
@admin_required
def upload_cert_photo(staff_id):
    try:
        staff = Staff.query.get_or_404(staff_id)
        file = request.files.get('cert_photo')
        if not allowed_file(file):
            return jsonify({'error': '请上传有效的图片文件（png/jpg/jpeg/gif/webp，单张不超过10MB）'}), 400
        upload_folder = current_app.config['UPLOAD_FOLDER']
        filename = safe_filename(file.filename)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        if staff.cert_photo:
            old_path = os.path.join(upload_folder, os.path.basename(staff.cert_photo))
            if os.path.exists(old_path): os.remove(old_path)
        staff.cert_photo = f'/uploads/{filename}'
        db.session.commit()
        return jsonify({'cert_photo': staff.cert_photo})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



# ===================== 业务辅助 =====================
def _record_type_label(record_type):
    return '维修工单' if record_type == 'repair' else '施工记录'

def _record_prefix(record_type):
    return 'RY-WX' if record_type == 'repair' else 'RY-SG'

def _generate_record_no(record_type, work_date):
    date_str = work_date.strftime("%Y%m%d")
    prefix = _record_prefix(record_type)
    day_count = WorkRecord.query.filter(
        WorkRecord.record_type == record_type,
        db.func.date(WorkRecord.work_date) == work_date.date()
    ).count()
    return f'{prefix}-{date_str}-{day_count + 1:03d}'

def _generate_salary_no(work_date):
    date_str = work_date.strftime("%Y%m%d")
    day_count = SalaryRecord.query.filter(db.func.date(SalaryRecord.work_date) == work_date.date()).count()
    return f'RY-GZ-{date_str}-{day_count + 1:03d}'

def _sync_salary_records_for_work(record):
    """施工/维修保存后，根据临时工明细同步工资记录。已结算的记录保留不动。"""
    try:
        details = json.loads(record.temp_staff_details or '[]')
    except Exception:
        details = []
    existing_unsettled = SalaryRecord.query.filter_by(
        business_record_id=record.id, status='unsettled'
    ).all()
    for s in existing_unsettled:
        db.session.delete(s)
    settled_names = {s.staff_name for s in SalaryRecord.query.filter_by(
        business_record_id=record.id, status='settled'
    ).all()}
    for item in details:
        name = (item.get('name') or '').strip()
        if not name:
            continue
        if name in settled_names:
            continue
        daily_wage = float(item.get('daily_wage') or 0)
        hours = float(item.get('hours') or 0)
        if daily_wage <= 0 or hours <= 0:
            continue
        units = round(hours / 8, 2)
        payable = round(daily_wage * units, 2)
        salary = SalaryRecord(
            salary_no=_generate_salary_no(record.work_date),
            staff_name=name,
            staff_type='temp',
            work_date=record.work_date,
            business_type=_record_type_label(record.record_type),
            business_no=record.order_no or '',
            business_record_id=record.id,
            customer_name=record.customer_name,
            work_content=record.work_content or record.fault_description or '',
            salary_type='日薪',
            daily_wage=daily_wage,
            work_units=units,
            payable_amount=payable,
            paid_amount=0,
            status='unsettled'
        )
        db.session.add(salary)

def _sync_staff_name_from_staff_names(record):
    """从staff_names（逗号分隔多选）自动推导staff_name（第一个人），保持向后兼容"""
    staff_names_str = record.staff_names or ''
    if not staff_names_str.strip():
        if not record.staff_name:
            record.staff_name = ''
        return
    names = [n.strip() for n in staff_names_str.split(',') if n.strip()]
    if names:
        record.staff_name = names[0]


def _validate_status_transition(record_type, old_status, new_status):
    """校验工单状态流转是否合法，允许的状态跳跃返回True，否则返回False"""
    if old_status == new_status:
        return True

    construction_flow = {
        'pending': {'in_progress', 'cancelled'},
        'in_progress': {'settlement', 'cancelled', 'pending'},
        'settlement': {'completed', 'in_progress', 'cancelled'},
        'completed': {'rework'},
        'rework': {'in_progress', 'settlement'},
        'cancelled': set(),
    }

    repair_flow = {
        'pending': {'dispatched', 'cancelled', 'in_progress'},
        'dispatched': {'in_progress', 'pending', 'cancelled'},
        'in_progress': {'callback', 'settlement', 'pending', 'unable', 'cancelled', 'completed'},
        'callback': {'settlement', 'in_progress', 'cancelled'},
        'settlement': {'completed', 'in_progress', 'cancelled'},
        'completed': {'rework'},
        'rework': {'in_progress', 'dispatched'},
        'unable': set(),
        'cancelled': set(),
    }

    flow = repair_flow if record_type == 'repair' else construction_flow
    allowed = flow.get(old_status, set())

    if new_status in allowed:
        return True

    admin_bypass = {'cancelled', 'pending'}
    if new_status in admin_bypass and g.current_user.get('role') == 'admin':
        return True

    return False


def _recalculate_fee_from_fee_items(record, include_equipment=True):
    """从fee_items重新计算所有扁平费用字段，确保fee_items是唯一权威数据源
    include_equipment=False时不重算equipment_fee_total（由设备明细同步函数负责）"""
    try:
        fee_items_raw = record.fee_items or ''
        if not fee_items_raw:
            return False
        fee_items = json.loads(fee_items_raw) if isinstance(fee_items_raw, str) else fee_items_raw
        if not fee_items:
            return False

        labor = sum(float(item.get('subtotal', 0) or 0) for item in fee_items if item.get('type') == '人工')
        material = sum(float(item.get('subtotal', 0) or 0) for item in fee_items if item.get('type') == '材料')
        transport = sum(float(item.get('subtotal', 0) or 0) for item in fee_items if item.get('type') == '交通')
        other = sum(float(item.get('subtotal', 0) or 0) for item in fee_items if item.get('type') not in ['人工', '材料', '设备', '交通'])

        record.labor_fee = round(labor, 2)
        record.material_fee = round(material, 2)
        record.transport_fee = round(transport, 2)
        record.other_fee = round(other, 2)
        if include_equipment:
            eq_fee = sum(float(item.get('subtotal', 0) or 0) for item in fee_items if item.get('type') == '设备')
            record.equipment_fee_total = round(eq_fee, 2)
        return True
    except Exception as e:
        print(f'从fee_items重算费用失败: {e}')
        return False


def _sync_equipment_details(record, equipment_details_json):
    """工单保存后，同步设备明细、物料库存、客户设备档案"""
    try:
        equipments = json.loads(equipment_details_json or '[]')
    except Exception:
        equipments = []
    
    if not equipments:
        RepairEquipment.query.filter_by(work_record_id=record.id).delete()
        record.equipment_fee_total = 0
        _recalculate_fee_from_fee_items(record, include_equipment=False)
        subtotal = (record.labor_fee or 0) + (record.material_fee or 0) + (record.transport_fee or 0) + (record.other_fee or 0)
        if record.tax_type == 'tax':
            record.tax_amount = round(subtotal * (record.tax_rate or 0), 2)
            record.total_fee = round(subtotal + record.tax_amount, 2)
        else:
            record.tax_amount = 0
            record.total_fee = round(subtotal, 2)
        return
    
    existing_eqs = RepairEquipment.query.filter_by(work_record_id=record.id).all()
    existing_map = {eq.id: eq for eq in existing_eqs}
    incoming_ids = set()
    
    equipment_fee_total = 0
    
    for idx, item in enumerate(equipments):
        eq_id = item.get('id')
        qty = int(item.get('quantity') or 1)
        unit_price = float(item.get('unit_price') or 0)
        subtotal = float(item.get('subtotal') or (qty * unit_price))
        equipment_fee_total += subtotal
        
        if eq_id and eq_id in existing_map:
            eq = existing_map[eq_id]
            old_qty = eq.quantity
            eq.system_type = item.get('system_type', '') or ''
            eq.device_name = item.get('device_name', '') or ''
            eq.device_model = item.get('device_model', '') or ''
            eq.device_brand = item.get('device_brand', '') or ''
            eq.quantity = qty
            eq.location = item.get('location', '') or ''
            eq.fault_description = item.get('fault_description', '') or ''
            eq.repair_method = item.get('repair_method', '') or ''
            eq.repair_result = item.get('repair_result', '') or ''
            eq.unit_price = unit_price
            eq.subtotal = subtotal
            eq.remark = item.get('remark', '') or ''
            incoming_ids.add(eq_id)
            _adjust_material_stock(eq, old_qty, qty, record)
            _sync_to_customer_equipment(eq, record, 'update')
        else:
            eq = RepairEquipment(
                work_record_id=record.id,
                system_type=item.get('system_type', '') or '',
                device_name=item.get('device_name', '') or '',
                device_model=item.get('device_model', '') or '',
                device_brand=item.get('device_brand', '') or '',
                quantity=qty,
                location=item.get('location', '') or '',
                fault_description=item.get('fault_description', '') or '',
                repair_method=item.get('repair_method', '') or '',
                repair_result=item.get('repair_result', '') or '',
                unit_price=unit_price,
                subtotal=subtotal,
                remark=item.get('remark', '') or ''
            )
            db.session.add(eq)
            db.session.flush()
            incoming_ids.add(eq.id)
            _adjust_material_stock(eq, 0, qty, record)
            _sync_to_customer_equipment(eq, record, 'create')
    
    for eq_id, eq in existing_map.items():
        if eq_id not in incoming_ids:
            _adjust_material_stock(eq, eq.quantity, 0, record)
            _sync_to_customer_equipment(eq, record, 'delete')
            db.session.delete(eq)
    
    record.equipment_fee_total = equipment_fee_total
    _recalculate_fee_from_fee_items(record, include_equipment=False)
    subtotal = (record.labor_fee or 0) + (record.material_fee or 0) + equipment_fee_total + (record.transport_fee or 0) + (record.other_fee or 0)
    if record.tax_type == 'tax':
        record.tax_amount = round(subtotal * (record.tax_rate or 0), 2)
        record.total_fee = round(subtotal + record.tax_amount, 2)
    else:
        record.tax_amount = 0
        record.total_fee = round(subtotal, 2)

def _adjust_material_stock(eq, old_qty, new_qty, record):
    """根据设备明细调整物料库存"""
    try:
        material_id = getattr(eq, 'material_id', None)
        if not material_id:
            mat = None
            if eq.device_name and eq.device_model:
                mat = Material.query.filter(
                    Material.name == eq.device_name,
                    Material.model == eq.device_model
                ).first()
            if not mat and eq.device_name:
                mat = Material.query.filter(
                    Material.name == eq.device_name
                ).first()
            if not mat:
                return
            material_id = mat.id
            eq.material_id = material_id
        
        mat = Material.query.get(material_id)
        if not mat:
            return
        
        qty_diff = new_qty - old_qty
        if qty_diff == 0:
            return
        
        stock_before = mat.stock or 0
        stock_after = stock_before - qty_diff
        warnings_list = getattr(g, '_stock_warnings', None)
        if qty_diff > 0 and stock_after < 0:
            short_qty = abs(stock_after)
            stock_after = 0
            if warnings_list is None:
                warnings_list = []
                g._stock_warnings = warnings_list
            warnings_list.append(f'物料「{mat.name}」库存不足，需{qty_diff}个，当前库存{stock_before}个，缺{short_qty}个')
        if mat.min_stock and stock_after <= mat.min_stock:
            try:
                from datetime import date
                today_str = date.today().isoformat()
                already_notified = getattr(g, '_low_stock_notified', set())
                mat_key = f'low_stock_{mat.id}_{today_str}'
                if mat_key not in already_notified:
                    already_notified.add(mat_key)
                    g._low_stock_notified = already_notified
                    _notify_admins(f'📦 低库存预警: {mat.name}',
                        f'物料「{mat.name}」当前库存{stock_after}个，已低于预警阈值{mat.min_stock}个，请及时补货',
                        'warning', 'material', mat.id)
            except Exception:
                pass
        
        log_type = 'out' if qty_diff > 0 else 'in'
        log_qty = abs(qty_diff)
        
        log = MaterialStockLog(
            material_id=material_id,
            log_type=log_type,
            quantity=log_qty,
            stock_before=stock_before,
            stock_after=stock_after,
            unit_price=mat.unit_price or 0,
            total_price=log_qty * (mat.unit_price or 0),
            related_type='work_record',
            related_id=record.id,
            related_no=record.order_no or '',
            operator=get_login_user_name() or '',
            remark=f'工单{record.order_no or ""} {eq.device_name or ""}'
        )
        db.session.add(log)
        mat.stock = stock_after
    except Exception as e:
        print(f'[物料库存] 调整失败: {e}', flush=True)

def _sync_to_customer_equipment(eq, record, action):
    """设备明细同步到客户设备档案"""
    try:
        customer_name = record.customer_name
        if not customer_name:
            return
        
        device_name = eq.device_name or ''
        device_brand = eq.device_brand or ''
        device_model = eq.device_model or ''
        
        if action == 'delete':
            CustomerEquipment.query.filter_by(
                customer_name=customer_name,
                equipment_type=device_name,
                brand=device_brand,
                model=device_model
            ).delete(synchronize_session=False)
            return
        
        if not device_name and not device_model:
            return
        
        existing = CustomerEquipment.query.filter_by(
            customer_name=customer_name,
            equipment_type=device_name,
            brand=device_brand,
            model=device_model
        ).first()
        
        work_date = record.work_date.date() if hasattr(record.work_date, 'date') else record.work_date
        
        if existing:
            existing.quantity = (existing.quantity or 0) + (eq.quantity or 0)
            existing.location = eq.location or existing.location
            if eq.remark:
                existing.remark = (existing.remark or '') + f'\n工单{record.order_no or ""}: {eq.remark}'
            ce = existing
        else:
            from datetime import timedelta
            warranty_start = work_date + timedelta(days=1)
            warranty_end = warranty_start + timedelta(days=365)
            next_maintenance = work_date + timedelta(days=90)
            maintenance_cycle = 90
            
            ce = CustomerEquipment(
                customer_name=customer_name,
                equipment_type=device_name,
                system_type=eq.system_type or '',
                brand=device_brand,
                model=device_model,
                quantity=eq.quantity or 1,
                install_date=work_date,
                warranty_start=warranty_start,
                warranty_end=warranty_end,
                location=eq.location or record.work_address or '',
                contact_name=record.contact_name or '',
                contact_phone=record.customer_phone or '',
                status='normal',
                next_maintenance=next_maintenance,
                maintenance_cycle=maintenance_cycle,
                remark=f'来自工单{record.order_no or ""}\n{eq.remark or ""}'
            )
            db.session.add(ce)
            db.session.flush()
            
            _create_maintenance_for_equipment(ce, record)
    except Exception as e:
        print(f'[客户设备档案] 同步失败: {e}', flush=True)

def _create_maintenance_for_equipment(ce, record):
    """为新设备创建维保计划和首个待办提醒"""
    try:
        from datetime import timedelta
        plan_name = f'{ce.equipment_type or "设备"}定期维护 - {ce.customer_name}'
        work_date = ce.install_date or datetime.now().date()
        start_date = work_date
        next_date = work_date + timedelta(days=90)
        
        staff_names_str = record.staff_names or record.staff_name or ''
        first_staff = staff_names_str.split(',')[0].strip() if staff_names_str else ''
        
        plan = MaintenancePlan(
            plan_name=plan_name,
            plan_type='periodic',
            customer_name=ce.customer_name,
            equipment_id=ce.id,
            system_type=ce.system_type or '',
            cycle_type='month',
            cycle_value=3,
            start_date=start_date,
            next_date=next_date,
            staff_name=first_staff,
            work_content=f'{ce.equipment_type or "设备"}（{ce.brand} {ce.model}）定期维护检查',
            priority='normal',
            status='active',
            created_by=getattr(record, 'created_by', '') or get_login_user_name(),
            remark=f'自动创建：设备{ce.equipment_type or ""}安装后每3个月定期维护'
        )
        db.session.add(plan)
        db.session.flush()
        
        pending = PendingWork(
            title=f'维保提醒：{plan_name}',
            customer_name=ce.customer_name,
            contact_name=ce.contact_name or '',
            contact_phone=ce.contact_phone or '',
            work_address=ce.location or record.work_address or '',
            staff_name=first_staff,
            todo_type='维保提醒',
            priority='normal',
            work_content=f'{ce.equipment_type or "设备"}（{ce.brand} {ce.model}）已安装3个月，需要进行定期维护检查。\n安装日期：{ce.install_date}\n下次维护：{next_date}',
            reminder_date=datetime.combine(next_date, datetime.min.time()),
            related_record_type='maintenance',
            related_record_id=plan.id
        )
        db.session.add(pending)
    except Exception as e:
        print(f'[维保计划] 自动创建失败: {e}', flush=True)

def _record_payload_from_pending(pending, record_type):
    return {
        'customer_name': pending.customer_name,
        'contact_name': pending.contact_name or '',
        'customer_phone': pending.contact_phone or '',
        'work_address': pending.work_address or '',
        'staff_name': pending.staff_name or '',
        'staff_names': pending.staff_name or '',
        'record_type': record_type,
        'work_content': pending.work_content if record_type == 'construction' else '',
        'fault_description': pending.work_content if record_type == 'repair' else '',
        'work_date': datetime.now(),
        'status': 'pending' if record_type == 'construction' else 'dispatched',
        'priority': pending.priority or 'normal',
        'is_completed': False,
        'created_by': get_login_user_name()
    }

# ===================== 工作记录 =====================

@api_bp.route('/records', methods=['GET'])
@login_required
def get_records():
    try:
        customer_name = request.args.get('customer_name')
        staff_name = request.args.get('staff_name')
        date = request.args.get('date')
        record_type = request.args.get('record_type')
        payment_status = request.args.get('payment_status')
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = WorkRecord.query
        query = _apply_record_permission(query)

        if record_type:
            query = query.filter(WorkRecord.record_type == record_type)
        if payment_status:
            query = query.filter(WorkRecord.payment_status == payment_status)
        if status:
            # 前端关联工单传 status=unpaid，实际含义是"未结清"
            if status == 'unpaid':
                query = query.filter(WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly']))
            else:
                query = query.filter(WorkRecord.status == status)
        if customer_name:
            query = query.filter(WorkRecord.customer_name.like(f'%{escape_like_keyword(customer_name)}%'))
        if staff_name:
            query = query.filter(
                db.or_(
                    WorkRecord.staff_name == staff_name,
                    WorkRecord.staff_names.like(f'%{escape_like_keyword(staff_name)}%')
                )
            )
        if date:
            try:
                target_date = datetime.strptime(date, '%Y-%m-%d')
                query = query.filter(func.date(WorkRecord.work_date) == target_date.date())
            except:
                pass
        if start_date and end_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                end = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(WorkRecord.work_date >= start, WorkRecord.work_date < end)
            except:
                pass

        pagination = query.order_by(WorkRecord.work_date.desc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [r.to_dict() for r in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/records', methods=['POST'])
@login_required
def create_record():
    try:
        if request.is_json:
            data = request.get_json() or {}
            def get_val(key, default=''):
                return data.get(key, default)
        else:
            data = request.form
            def get_val(key, default=''):
                return data.get(key, default)

        customer_name = (get_val('customer_name') or '').strip()
        
        work_date_str = get_val('work_date')
        work_date = datetime.strptime(work_date_str, '%Y-%m-%d') if work_date_str else datetime.now()

        record_type = get_val('record_type', 'construction')

        project_id = get_val('project_id', None)
        try:
            project_id = int(project_id) if project_id else None
        except:
            project_id = None

        is_project_construction = record_type == 'project_construction' or (project_id and record_type == 'construction')
        
        if not is_project_construction and not customer_name:
            return jsonify({'error': '客户名称不能为空'}), 400
        
        if is_project_construction and not customer_name and project_id:
            project = Project.query.get(project_id)
            if project:
                customer_name = project.customer_name or ''

        photo_paths = []
        if not request.is_json:
            files = request.files.getlist('photos')
            upload_folder = current_app.config['UPLOAD_FOLDER']
            for file in files:
                if allowed_file(file):
                    filename = safe_filename(file.filename)
                    filepath = os.path.join(upload_folder, filename)
                    file.save(filepath)
                    try:
                        from PIL import Image, ImageDraw, ImageFont
                        img = Image.open(filepath)
                        orig_name = filename.rsplit('.', 1)[0] + '_orig.' + filename.rsplit('.', 1)[1]
                        img.save(os.path.join(upload_folder, orig_name))
                        ts = datetime.now().strftime('%Y-%m-%d %H:%M')
                        draw = ImageDraw.Draw(img)
                        wm_text = f'{ts}'
                        try:
                            img_w, img_h = img.size
                            draw.rectangle([img_w-220, img_h-35, img_w-5, img_h-5], fill=(0,0,0,128))
                            draw.text((img_w-210, img_h-28), wm_text, fill=(255,255,255))
                        except: pass
                        img.save(filepath, quality=85)
                        img.thumbnail((800, 800), Image.LANCZOS)
                        thumb_name = filename.rsplit('.', 1)[0] + '_thumb.' + filename.rsplit('.', 1)[1]
                        img.save(os.path.join(upload_folder, thumb_name), quality=70, optimize=True)
                    except Exception as e:
                        print(f'No thumbnail: {e}')
                    photo_paths.append(f'/uploads/{filename}')
        else:
            work_photos_val = get_val('work_photos', '')
            if work_photos_val:
                if isinstance(work_photos_val, list):
                    photo_paths = [p.get('url') if isinstance(p, dict) else p for p in work_photos_val]
                elif isinstance(work_photos_val, str):
                    photo_paths = [p.strip() for p in work_photos_val.split(',') if p.strip()]

        def get_float(key):
            v = get_val(key, '0')
            try:
                return float(v) if v else 0.0
            except:
                return 0.0

        labor = get_float('labor_fee')
        material = get_float('material_fee')
        eq_fee = get_float('equipment_fee_total')
        transport = get_float('transport_fee')
        other = get_float('other_fee')
        
        fee_items_raw = get_val('fee_items', '[]')
        try:
            fee_items = json.loads(fee_items_raw) if fee_items_raw else []
        except:
            fee_items = []
        
        if fee_items:
            labor = sum(item.get('subtotal', 0) for item in fee_items if item.get('type') == '人工')
            material = sum(item.get('subtotal', 0) for item in fee_items if item.get('type') == '材料')
            eq_fee = sum(item.get('subtotal', 0) for item in fee_items if item.get('type') == '设备')
            transport = sum(item.get('subtotal', 0) for item in fee_items if item.get('type') == '交通')
            other = sum(item.get('subtotal', 0) for item in fee_items if item.get('type') not in ['人工', '材料', '设备', '交通'])

        repair_result = get_val('repair_result', 'completed') if record_type == 'repair' else 'completed'
        incomplete_reason_type = get_val('incomplete_reason_type', '') if repair_result == 'pending' else ''
        incomplete_reason = get_val('incomplete_reason', '') if repair_result == 'pending' else ''
        if record_type == 'repair' and repair_result == 'pending' and not incomplete_reason.strip():
            return jsonify({'error': '未维修完成时必须填写原因说明'}), 400

        record = WorkRecord(
            customer_name=customer_name,
            contact_name=get_val('contact_name', ''),
            customer_phone=get_val('customer_phone', ''),
            work_address=get_val('work_address', ''),
            staff_name=get_val('staff_name', ''),
            staff_names=get_val('staff_names', ''),
            temp_staff_details=get_val('temp_staff_details', ''),
            status=get_val('status', 'pending' if record_type == 'construction' else 'dispatched'),
            record_type=record_type,
            work_content=get_val('work_content', ''),
            fault_description=get_val('fault_description', ''),
            fault_diagnosis=get_val('fault_diagnosis', ''),
            repair_process=get_val('repair_process', ''),
            repair_result=repair_result,
            incomplete_reason_type=incomplete_reason_type,
            incomplete_reason=incomplete_reason,
            work_date=work_date,
            start_time=get_val('start_time', ''),
            end_time=get_val('end_time', ''),
            work_hours=float(get_val('work_hours', 0) or 0),
            labor_fee=labor,
            material_fee=material,
            equipment_fee_total=eq_fee,
            transport_fee=transport,
            other_fee=other,
            total_fee=labor + material + eq_fee + transport + other,
            payment_status=get_val('payment_status', 'unpaid'),
            paid_amount=get_float('paid_amount'),
            work_subtype=get_val('work_subtype', ''),
            priority=get_val('priority', 'normal'),
            tax_type=get_val('tax_type', 'no'),
            tax_rate=float(get_val('tax_rate', 0.03) or 0.03),
            tax_amount=0,
            fee_items=json.dumps(fee_items, ensure_ascii=False) if fee_items else '',
            remark=get_val('remark', ''),
            work_photos=','.join(photo_paths) if photo_paths else None,
            is_completed=True,
            created_by=get_login_user_name(),
            involved_systems=get_val('involved_systems', ''),
            service_category=get_val('service_category', ''),
            warranty_status=get_val('warranty_status', 'none'),
            warranty_days=int(get_val('warranty_days', 0) or 0),
            accept_time=get_val('accept_time', ''),
            customer_feedback=get_val('customer_feedback', ''),
            satisfaction=get_val('satisfaction', ''),
            project_id=project_id
        )
        # 计算税费（在_sync_equipment_details之前先算一次，后面_sync会重算覆盖为最终值）
        _sync_staff_name_from_staff_names(record)
        if record.tax_type == 'tax':
            record.tax_amount = round((labor + material + eq_fee + transport + other) * record.tax_rate, 2)
            record.total_fee += record.tax_amount
        # 生成施工/维修编号
        record.order_no = _generate_record_no(record_type, work_date)
        db.session.add(record)
        db.session.flush()
        _sync_salary_records_for_work(record)
        _sync_equipment_details(record, get_val('equipment_details', '[]'))
        db.session.commit()

        # 维修未完成自动转待办
        if record_type == 'repair' and repair_result == 'pending':
            pending = PendingWork(
                title=f'二次上门：{customer_name} - {get_val("work_subtype", "维修")}',
                customer_name=customer_name,
                contact_name=get_val('contact_name', ''),
                contact_phone=get_val('customer_phone', ''),
                work_address=get_val('work_address', ''),
                staff_name=get_val('staff_name', ''),
                todo_type='未完成维修',
                priority=get_val('priority', 'normal'),
                work_content=f'故障描述: {get_val("fault_description", "")}\n维修过程: {get_val("repair_process", "")}\n未完成原因: {incomplete_reason_type or "未分类"} - {incomplete_reason}',
                reminder_date=work_date,
                related_record_type='repair',
                related_record_id=record.id
            )
            db.session.add(pending)
            db.session.commit()

        result = record.to_dict()
        warnings = getattr(g, '_stock_warnings', None)
        if warnings:
            result['warnings'] = warnings
        return jsonify(result), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/records/<int:record_id>', methods=['GET'])
@login_required
def get_record(record_id):
    try:
        record = WorkRecord.query.get_or_404(record_id)
        if not _can_access_record(record):
            return jsonify({'error': '无权访问该工单'}), 403
        return jsonify(record.to_dict())
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/records/<int:record_id>', methods=['PUT'])
@login_required
def update_record(record_id):
    try:
        record = WorkRecord.query.get_or_404(record_id)
        if not _can_access_record(record):
            return jsonify({'error': '无权修改该工单'}), 403
        snapshot_before = record.to_dict()

        def get_val(key):
            if request.content_type and 'multipart/form-data' in request.content_type:
                return request.form.get(key)
            data = request.get_json() or {}
            return data.get(key)

        if get_val('customer_name'): record.customer_name = get_val('customer_name')
        if get_val('contact_name') is not None: record.contact_name = get_val('contact_name') or ''
        if get_val('customer_phone') is not None: record.customer_phone = get_val('customer_phone') or ''
        if get_val('work_address'): record.work_address = get_val('work_address')
        if get_val('staff_name'): record.staff_name = get_val('staff_name')
        if get_val('staff_names') is not None: record.staff_names = get_val('staff_names') or ''
        _sync_staff_name_from_staff_names(record)
        if get_val('temp_staff_details') is not None: record.temp_staff_details = get_val('temp_staff_details') or ''
        if get_val('record_type'): record.record_type = get_val('record_type')
        new_status = get_val('status')
        if new_status is not None and new_status != record.status:
            if not _validate_status_transition(record.record_type, record.status, new_status):
                return jsonify({'error': f'不允许从"{record.status}"直接跳转到"{new_status}"，请按流程逐步操作'}), 400
            record.status = new_status
        if get_val('payment_status') is not None: record.payment_status = get_val('payment_status') or 'unpaid'
        if get_val('work_subtype') is not None: record.work_subtype = get_val('work_subtype') or ''
        if get_val('priority') is not None: record.priority = get_val('priority') or 'normal'
        if get_val('work_content') is not None: record.work_content = get_val('work_content') or ''
        if get_val('fault_description') is not None: record.fault_description = get_val('fault_description') or ''
        if get_val('fault_diagnosis') is not None: record.fault_diagnosis = get_val('fault_diagnosis') or ''
        if get_val('repair_process') is not None: record.repair_process = get_val('repair_process') or ''
        if get_val('repair_result') is not None: record.repair_result = get_val('repair_result')
        if get_val('incomplete_reason_type') is not None: record.incomplete_reason_type = get_val('incomplete_reason_type') or ''
        if get_val('incomplete_reason') is not None: record.incomplete_reason = get_val('incomplete_reason') or ''
        if record.record_type == 'repair' and record.repair_result == 'pending' and not (record.incomplete_reason or '').strip():
            return jsonify({'error': '未维修完成时必须填写原因说明'}), 400
        if get_val('work_date'): record.work_date = datetime.strptime(get_val('work_date'), '%Y-%m-%d')
        if get_val('start_time') is not None: record.start_time = get_val('start_time') or ''
        if get_val('end_time') is not None: record.end_time = get_val('end_time') or ''
        if get_val('work_hours') is not None: record.work_hours = float(get_val('work_hours') or 0)
        if get_val('remark') is not None: record.remark = get_val('remark') or ''
        if get_val('involved_systems') is not None: record.involved_systems = get_val('involved_systems') or ''
        if get_val('service_category') is not None: record.service_category = get_val('service_category') or ''
        if get_val('warranty_status') is not None: record.warranty_status = get_val('warranty_status') or 'none'
        if get_val('warranty_days') is not None:
            try:
                record.warranty_days = int(get_val('warranty_days') or 0)
            except:
                record.warranty_days = 0
        if get_val('accept_time') is not None: record.accept_time = get_val('accept_time') or ''
        if get_val('customer_feedback') is not None: record.customer_feedback = get_val('customer_feedback') or ''
        if get_val('satisfaction') is not None: record.satisfaction = get_val('satisfaction') or ''

        def get_float_val(key):
            v = get_val(key)
            if v is not None:
                try:
                    return float(v) if v else 0.0
                except:
                    return 0.0
            return None

        labor = get_float_val('labor_fee')
        if labor is not None: record.labor_fee = labor
        material = get_float_val('material_fee')
        if material is not None: record.material_fee = material
        transport = get_float_val('transport_fee')
        if transport is not None: record.transport_fee = transport
        other = get_float_val('other_fee')
        if other is not None: record.other_fee = other
        paid = get_float_val('paid_amount')
        if paid is not None: record.paid_amount = paid
        
        fee_items_val = get_val('fee_items')
        if fee_items_val is not None:
            try:
                fee_items = json.loads(fee_items_val) if isinstance(fee_items_val, str) else fee_items_val
                record.fee_items = json.dumps(fee_items, ensure_ascii=False) if fee_items else ''
            except:
                pass

        _recalculate_fee_from_fee_items(record)

        # recalculate total（_sync_equipment_details 会在下面用设备明细的权威值覆盖equipment_fee_total和total_fee）
        if get_val('tax_type'): record.tax_type = get_val('tax_type')
        if get_val('tax_rate'): record.tax_rate = float(get_val('tax_rate'))
        eq_fee_existing = record.equipment_fee_total or 0
        subtotal_pre = (record.labor_fee or 0) + (record.material_fee or 0) + eq_fee_existing + (record.transport_fee or 0) + (record.other_fee or 0)
        if record.tax_type == 'tax':
            record.tax_amount = round(subtotal_pre * record.tax_rate, 2)
            record.total_fee = round(subtotal_pre + record.tax_amount, 2)
        else:
            record.tax_amount = 0
            record.total_fee = round(subtotal_pre, 2)

        # 照片处理（配合前端 keep_photos + 新增照片）
        keep_photos_raw = get_val('keep_photos')
        if keep_photos_raw is not None and not (request.content_type and 'multipart/form-data' in request.content_type):
            # JSON 请求：只处理保留/删除照片
            try:
                keep_photos = json.loads(keep_photos_raw) if isinstance(keep_photos_raw, str) else keep_photos_raw
            except:
                keep_photos = []
            upload_folder = current_app.config['UPLOAD_FOLDER']
            if record.work_photos:
                for old_photo in record.work_photos.split(','):
                    old_basename = os.path.basename(old_photo)
                    if old_basename not in keep_photos:
                        old_path = os.path.join(upload_folder, old_basename)
                        if os.path.exists(old_path):
                            os.remove(old_path)
                record.work_photos = ','.join(f'/uploads/{p}' for p in keep_photos) if keep_photos else None

        if request.content_type and 'multipart/form-data' in request.content_type:
            keep_photos_raw = get_val('keep_photos')
            keep_photos = []
            if keep_photos_raw:
                try:
                    keep_photos = json.loads(keep_photos_raw) if isinstance(keep_photos_raw, str) else keep_photos_raw
                except:
                    keep_photos = []
            files = request.files.getlist('photos')
            has_new_files = files and any(f.filename for f in files)
            if has_new_files or keep_photos_raw is not None:
                upload_folder = current_app.config['UPLOAD_FOLDER']
                # 删除不再保留的旧照片
                if record.work_photos:
                    for old_photo in record.work_photos.split(','):
                        old_basename = os.path.basename(old_photo)
                        if old_basename not in keep_photos:
                            old_path = os.path.join(upload_folder, old_basename)
                            if os.path.exists(old_path):
                                os.remove(old_path)
                # 保留的照片 paths
                photo_paths = [f'/uploads/{p}' for p in keep_photos]
                # 添加新照片
                for file in files:
                    if allowed_file(file):
                        filename = safe_filename(file.filename)
                        filepath = os.path.join(upload_folder, filename)
                        file.save(filepath)
                        try:
                            from PIL import Image, ImageDraw
                            img = Image.open(filepath)
                            orig_name = filename.rsplit('.', 1)[0] + '_orig.' + filename.rsplit('.', 1)[1]
                            img.save(os.path.join(upload_folder, orig_name))
                            ts = datetime.now().strftime('%Y-%m-%d %H:%M')
                            draw = ImageDraw.Draw(img)
                            img_w, img_h = img.size
                            draw.rectangle([img_w-220, img_h-35, img_w-5, img_h-5], fill=(0,0,0,128))
                            draw.text((img_w-210, img_h-28), ts, fill=(255,255,255))
                            img.save(filepath, quality=85)
                            img.thumbnail((800, 800), Image.LANCZOS)
                            thumb_name = filename.rsplit('.', 1)[0] + '_thumb.' + filename.rsplit('.', 1)[1]
                            img.save(os.path.join(upload_folder, thumb_name), quality=70, optimize=True)
                        except: pass
                        photo_paths.append(f'/uploads/{filename}')
                record.work_photos = ','.join(photo_paths) if photo_paths else None

        record.updated_at = datetime.now()
        _sync_salary_records_for_work(record)
        _sync_equipment_details(record, get_val('equipment_details') or '[]')
        snapshot_after = record.to_dict()
        title = record.customer_name + ' - ' + (record.order_no or '')
        _log_operation('work_record', record.id, 'update', snapshot_before, snapshot_after, title)

        old_status = snapshot_before.get('status', '')
        new_status = record.status
        status_labels = {'pending':'待办工单','dispatched':'已派单','in_progress':'进行中','callback':'待回访','settlement':'待结算','completed':'已完成','unable':'无法维修','cancelled':'已取消','rework':'返工'}
        if old_status != new_status:
            notify_users = set()
            if record.created_by:
                notify_users.add(record.created_by)
            if record.staff_names:
                for s in record.staff_names.split(','):
                    s = s.strip()
                    if s: notify_users.add(s)
            if record.staff_name and record.staff_name not in notify_users:
                notify_users.add(record.staff_name)
            operator = get_login_user_name()
            for staff_name in notify_users:
                if staff_name == operator:
                    continue
                user = WorkerUser.query.filter_by(staff_name=staff_name, enabled=True).first()
                if user:
                    _create_notification(user.username,
                        f'工单状态变更: {status_labels.get(new_status, new_status)}',
                        f'{record.customer_name}的工单{record.order_no or ""}状态变更为「{status_labels.get(new_status, new_status)}」',
                        'info' if new_status != 'completed' else 'success',
                        'work_record', record.id)

        db.session.commit()
        result = record.to_dict()
        warnings = getattr(g, '_stock_warnings', None)
        if warnings:
            result['warnings'] = warnings
        return jsonify(result)
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/records/<int:record_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_record(record_id):
    try:
        record = WorkRecord.query.get_or_404(record_id)
        snapshot_before = record.to_dict()
        title = record.customer_name + ' - ' + (record.order_no or '')
        _log_operation('work_record', record.id, 'delete', snapshot_before, None, title)
        if record.work_photos:
            upload_folder = current_app.config['UPLOAD_FOLDER']
            for photo in record.work_photos.split(','):
                photo_path = os.path.join(upload_folder, os.path.basename(photo))
                thumb_path = os.path.join(upload_folder, os.path.basename(photo).rsplit('.', 1)[0] + '_thumb.' + photo.rsplit('.', 1)[1]) if '.' in os.path.basename(photo) else None
                if os.path.exists(photo_path):
                    os.remove(photo_path)
                if thumb_path and os.path.exists(thumb_path):
                    os.remove(thumb_path)
        eqs = RepairEquipment.query.filter_by(work_record_id=record.id).all()
        for eq in eqs:
            _adjust_material_stock(eq, eq.quantity, 0, record)
        RepairEquipment.query.filter_by(work_record_id=record.id).delete()
        SalaryRecord.query.filter_by(business_record_id=record.id).delete()
        PaymentRecord.query.filter_by(record_id=record.id).update({'record_id': None})
        PendingWork.query.filter_by(related_record_type='work_record', related_record_id=record.id).update({'related_record_id': None})
        db.session.delete(record)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===================== 待办事项 =====================

@api_bp.route('/pending', methods=['GET'])
@login_required
def get_pending_works():
    try:
        auto_count = _auto_generate_inspection_todos()
        if auto_count > 0:
            db.session.commit()
        status = request.args.get('status', 'pending')
        todo_type = request.args.get('todo_type')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        query = PendingWork.query.filter_by(status=status)
        if todo_type:
            query = query.filter(PendingWork.todo_type == todo_type)
        if g.current_user.get('role') != 'admin' and g.current_user.get('staff_name'):
            query = query.filter(PendingWork.staff_name.like(f'%{g.current_user.get("staff_name")}%'))
        pagination = query.order_by(PendingWork.reminder_date.asc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/pending', methods=['POST'])
@login_required
def create_pending_work():
    try:
        data = request.get_json()
        if not data or not data.get('customer_name'):
            return jsonify({'error': '客户名称不能为空'}), 400
        reminder_date_str = data.get('reminder_date') or data.get('due_date')
        reminder_date = None
        if reminder_date_str:
            reminder_date = datetime.strptime(reminder_date_str, '%Y-%m-%d').date()
        pending = PendingWork(
            title=data.get('title', ''),
            customer_name=data.get('customer_name'),
            contact_name=data.get('contact_name', ''),
            contact_phone=data.get('contact_phone', ''),
            work_address=data.get('work_address', ''),
            staff_name=data.get('staff_name', ''),
            todo_type=data.get('todo_type', '客户报修'),
            priority=data.get('priority', 'normal'),
            work_content=data.get('work_content', ''),
            reminder_date=reminder_date,
            status=data.get('status', 'pending')
        )
        db.session.add(pending)
        db.session.flush()
        if pending.staff_name:
            staff_list = [s.strip() for s in pending.staff_name.split(',') if s.strip()]
            for staff in staff_list:
                staff_user = WorkerUser.query.filter_by(staff_name=staff, enabled=True).first()
                if staff_user:
                    date_str = pending.reminder_date.strftime('%m-%d') if pending.reminder_date else '未设置'
                    _create_notification(staff_user.username,
                        f'新待办: {pending.title or pending.customer_name}',
                        f'{pending.customer_name}有新的{pending.todo_type}待办，日期{date_str}',
                        'info', 'pending_work', pending.id)
        else:
            date_str = pending.reminder_date.strftime('%m-%d') if pending.reminder_date else '未设置'
            _notify_admins(f'新待办: {pending.title or pending.customer_name}',
                f'{pending.customer_name}创建了新的{pending.todo_type}待办，请及时指派，日期{date_str}',
                'info', 'pending_work', pending.id)
        db.session.commit()
        return jsonify(pending.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/pending/<int:pending_id>', methods=['PUT'])
@login_required
def update_pending(pending_id):
    try:
        pending = PendingWork.query.get_or_404(pending_id)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '')
        if user_role != 'admin' and user_name and user_name not in (pending.staff_name or ''):
            return jsonify({'error': '仅管理员或负责人可修改待办'}), 403
        snapshot_before = pending.to_dict()
        data = request.get_json() or {}
        admin_fields = ['title', 'customer_name', 'contact_name', 'contact_phone', 'work_address', 'staff_name', 'work_content', 'todo_type', 'priority', 'related_record_type', 'related_record_id']
        worker_fields = ['status', 'work_content']
        allowed_fields = admin_fields if user_role == 'admin' else worker_fields
        for k in allowed_fields:
            if k in data:
                setattr(pending, k, data[k])
        if 'reminder_date' in data and user_role == 'admin':
            pending.reminder_date = datetime.strptime(data['reminder_date'], '%Y-%m-%d')
        if 'status' in data and 'status' in allowed_fields:
            pending.status = data['status']
        snapshot_after = pending.to_dict()
        title = pending.customer_name + ' - ' + (pending.title or '')
        _log_operation('pending_work', pending.id, 'update', snapshot_before, snapshot_after, title)

        old_staff = snapshot_before.get('staff_name', '') or ''
        new_staff = pending.staff_name or ''
        if user_role == 'admin' and 'staff_name' in data and old_staff != new_staff:
            staff_list = [s.strip() for s in new_staff.split(',') if s.strip()]
            old_staff_list = set(s.strip() for s in old_staff.split(',') if s.strip())
            for staff in staff_list:
                if staff not in old_staff_list:
                    staff_user = WorkerUser.query.filter_by(staff_name=staff, enabled=True).first()
                    if staff_user:
                        _create_notification(staff_user.username,
                            f'待办指派: {pending.title or pending.customer_name}',
                            f'您被指派了新的{pending.todo_type}待办：{pending.customer_name}',
                            'info', 'pending_work', pending.id)

        if snapshot_before.get('status') != pending.status and pending.status == 'completed':
            _notify_admins(f'待办已完成: {pending.title or pending.customer_name}',
                f'{get_login_user_name() or "有人"}完成了{pending.customer_name}的待办',
                'success', 'pending_work', pending.id)
            if pending.todo_type == '巡检维护' and pending.related_record_type == 'maintenance' and pending.related_record_id:
                try:
                    plan = MaintenancePlan.query.get(pending.related_record_id)
                    if plan and plan.equipment_id:
                        equip = CustomerEquipment.query.get(plan.equipment_id)
                        if equip:
                            equip.last_maintenance = date.today()
                            if equip.maintenance_cycle and equip.maintenance_cycle > 0:
                                equip.next_maintenance = date.today() + timedelta(days=int(equip.maintenance_cycle))
                except Exception as e:
                    print(f'回写设备维护时间失败: {e}')

        db.session.commit()
        return jsonify(pending.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/pending/<int:pending_id>/complete', methods=['POST'])
@login_required
def complete_pending(pending_id):
    try:
        pending = PendingWork.query.get_or_404(pending_id)
        record_type = request.args.get('record_type', 'construction')
        payload = _record_payload_from_pending(pending, record_type)
        record = WorkRecord(**payload)
        record.order_no = _generate_record_no(record_type, record.work_date)
        pending.status = 'transferred'
        pending.related_record_type = record_type
        db.session.add(record)
        db.session.flush()
        pending.related_record_id = record.id
        db.session.commit()
        return jsonify({'message': '已转为' + _record_type_label(record_type), 'record': record.to_dict(), 'pending': pending.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/pending/<int:pending_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_pending(pending_id):
    try:
        pending = PendingWork.query.get_or_404(pending_id)
        snapshot_before = pending.to_dict()
        title = pending.customer_name + ' - ' + (pending.title or '')
        _log_operation('pending_work', pending.id, 'delete', snapshot_before, None, title)
        db.session.delete(pending)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



# ===================== 操作日志 =====================

@api_bp.route('/operation-logs', methods=['GET'])
@login_required
@admin_required
def get_operation_logs():
    try:
        target_type = request.args.get('target_type', '')
        action = request.args.get('action', '')
        keyword = request.args.get('keyword', '')
        user = request.args.get('user', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        include_archive = request.args.get('include_archive', 'false') == 'true'
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 30, type=int)
        
        _auto_cleanup_oplogs()
        
        queries = []
        query = OperationLog.query
        if target_type:
            query = query.filter(OperationLog.target_type == target_type)
        if action:
            query = query.filter(OperationLog.action == action)
        if user:
            query = query.filter(OperationLog.user.like(f'%{escape_like_keyword(user)}%'))
        if keyword:
            kw = escape_like_keyword(keyword)
            query = query.filter(OperationLog.target_title.like(f'%{kw}%'))
        if start_date:
            try:
                sd = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(OperationLog.created_at >= sd)
            except: pass
        if end_date:
            try:
                from datetime import timedelta
                ed = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(OperationLog.created_at < ed)
            except: pass
        queries.append(query)
        
        if include_archive:
            aq = OperationLogArchive.query
            if target_type:
                aq = aq.filter(OperationLogArchive.target_type == target_type)
            if action:
                aq = aq.filter(OperationLogArchive.action == action)
            if user:
                aq = aq.filter(OperationLogArchive.user.like(f'%{escape_like_keyword(user)}%'))
            if keyword:
                kw = escape_like_keyword(keyword)
                aq = aq.filter(OperationLogArchive.target_title.like(f'%{kw}%'))
            if start_date:
                try:
                    sd = datetime.strptime(start_date, '%Y-%m-%d')
                    aq = aq.filter(OperationLogArchive.created_at >= sd)
                except: pass
            if end_date:
                try:
                    ed = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                    aq = aq.filter(OperationLogArchive.created_at < ed)
                except: pass
            queries.append(aq)
        
        all_items = []
        for q in queries:
            all_items.extend(q.order_by(OperationLog.created_at.desc()).limit(per_page * page).all())
        
        all_items.sort(key=lambda x: x.created_at, reverse=True)
        
        total = sum(q.count() for q in queries)
        start = (page - 1) * per_page
        end = start + per_page
        page_items = all_items[start:end]
        
        return jsonify({
            'logs': [log.to_dict() for log in page_items],
            'total': min(total, per_page * page),
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


def _auto_cleanup_oplogs():
    """每天自动归档一次过期操作日志（移到归档表，而非删除）"""
    try:
        from .models import SystemSetting
        today_str = datetime.now().strftime('%Y-%m-%d')
        last_clean = SystemSetting.query.filter_by(key='oplog_last_cleanup').first()
        if last_clean and last_clean.value == today_str:
            return
        
        from datetime import timedelta
        setting = SystemSetting.query.filter_by(key='oplog_retention_days').first()
        days = int(setting.value) if setting and setting.value.isdigit() else 90
        cutoff = datetime.now() - timedelta(days=days)
        
        old_logs = OperationLog.query.filter(OperationLog.created_at < cutoff).limit(500).all()
        count = 0
        for log in old_logs:
            archive = OperationLogArchive(
                target_type=log.target_type,
                target_id=log.target_id,
                action=log.action,
                user=log.user,
                snapshot_before=log.snapshot_before,
                snapshot_after=log.snapshot_after,
                changes_summary=log.changes_summary,
                target_title=log.target_title,
                created_at=log.created_at
            )
            db.session.add(archive)
            db.session.delete(log)
            count += 1
        
        archive_setting = SystemSetting.query.filter_by(key='oplog_archive_days').first()
        if not archive_setting:
            archive_setting = SystemSetting(key='oplog_archive_days', value='365')
            db.session.add(archive_setting)
        archive_days = int(archive_setting.value) if archive_setting.value.isdigit() else 365
        archive_cutoff = datetime.now() - timedelta(days=archive_days)
        archive_deleted = OperationLogArchive.query.filter(
            OperationLogArchive.created_at < archive_cutoff
        ).delete(synchronize_session=False)
        
        if last_clean:
            last_clean.value = today_str
        else:
            db.session.add(SystemSetting(key='oplog_last_cleanup', value=today_str))
        
        db.session.commit()
        if count > 0 or archive_deleted > 0:
            print(f"[操作日志] 归档 {count} 条，清理归档 {archive_deleted} 条", flush=True)
    except Exception as e:
        db.session.rollback()
        print(f"[操作日志] 自动归档失败: {e}", flush=True)


@api_bp.route('/operation-logs/<int:log_id>', methods=['GET'])
@login_required
@admin_required
def get_operation_log(log_id):
    try:
        log = OperationLog.query.get_or_404(log_id)
        return jsonify(log.to_dict())
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/operation-logs/<int:log_id>/restore', methods=['POST'])
@login_required
@admin_required
def restore_from_log(log_id):
    try:
        log = OperationLog.query.get_or_404(log_id)
        snapshot = log.snapshot_before
        if not snapshot:
            return jsonify({'error': '无可用快照数据'}), 400
        
        import json
        data = json.loads(snapshot)
        
        if log.target_type == 'work_record':
            existing = WorkRecord.query.get(log.target_id)
            if existing:
                existing.customer_name = data.get('customer_name', existing.customer_name)
                existing.contact_name = data.get('contact_name', '')
                existing.customer_phone = data.get('customer_phone', '')
                existing.work_address = data.get('work_address', existing.work_address)
                existing.staff_names = ','.join(data.get('staff_names', [])) if data.get('staff_names') else ''
                existing.staff_name = data.get('staff_name', '')
                existing.temp_staff_details = json.dumps(data.get('temp_staff_details', []), ensure_ascii=False) if data.get('temp_staff_details') else ''
                existing.record_type = data.get('record_type', 'construction')
                existing.work_content = data.get('work_content', '')
                existing.fault_description = data.get('fault_description', '')
                existing.fault_diagnosis = data.get('fault_diagnosis', '')
                existing.repair_process = data.get('repair_process', '')
                existing.repair_result = data.get('repair_result', 'completed')
                existing.incomplete_reason_type = data.get('incomplete_reason_type', '')
                existing.incomplete_reason = data.get('incomplete_reason', '')
                existing.work_photos = ','.join(data.get('work_photos', [])) if data.get('work_photos') else None
                if data.get('work_date'):
                    existing.work_date = datetime.fromisoformat(data['work_date'])
                existing.start_time = data.get('start_time', '')
                existing.end_time = data.get('end_time', '')
                existing.work_hours = data.get('work_hours', 0) or 0
                existing.labor_fee = data.get('labor_fee', 0) or 0
                existing.material_fee = data.get('material_fee', 0) or 0
                existing.transport_fee = data.get('transport_fee', 0) or 0
                existing.other_fee = data.get('other_fee', 0) or 0
                existing.total_fee = data.get('total_fee', 0) or 0
                existing.tax_type = data.get('tax_type', 'no')
                existing.tax_rate = (data.get('tax_rate', 0) or 0) / 100.0
                existing.tax_amount = data.get('tax_amount', 0) or 0
                existing.remark = data.get('remark', '')
                existing.is_completed = data.get('is_completed', True)
                existing.status = data.get('status', 'pending')
                existing.payment_status = data.get('payment_status', 'unpaid')
                existing.paid_amount = data.get('paid_amount', 0) or 0
                existing.work_subtype = data.get('work_subtype', '')
                existing.priority = data.get('priority', 'normal')
                existing.order_no = data.get('order_no', '')
                existing.updated_at = datetime.now()
                _sync_salary_records_for_work(existing)
                msg = '工单已恢复'
            else:
                record = WorkRecord(
                    customer_name=data.get('customer_name', ''),
                    contact_name=data.get('contact_name', ''),
                    customer_phone=data.get('customer_phone', ''),
                    work_address=data.get('work_address', ''),
                    staff_names=','.join(data.get('staff_names', [])) if data.get('staff_names') else '',
                    staff_name=data.get('staff_name', ''),
                    temp_staff_details=json.dumps(data.get('temp_staff_details', []), ensure_ascii=False) if data.get('temp_staff_details') else '',
                    record_type=data.get('record_type', 'construction'),
                    work_content=data.get('work_content', ''),
                    fault_description=data.get('fault_description', ''),
                    fault_diagnosis=data.get('fault_diagnosis', ''),
                    repair_process=data.get('repair_process', ''),
                    repair_result=data.get('repair_result', 'completed'),
                    incomplete_reason_type=data.get('incomplete_reason_type', ''),
                    incomplete_reason=data.get('incomplete_reason', ''),
                    work_photos=','.join(data.get('work_photos', [])) if data.get('work_photos') else None,
                    work_date=datetime.fromisoformat(data['work_date']) if data.get('work_date') else datetime.now(),
                    start_time=data.get('start_time', ''),
                    end_time=data.get('end_time', ''),
                    labor_fee=data.get('labor_fee', 0) or 0,
                    material_fee=data.get('material_fee', 0) or 0,
                    transport_fee=data.get('transport_fee', 0) or 0,
                    other_fee=data.get('other_fee', 0) or 0,
                    total_fee=data.get('total_fee', 0) or 0,
                    tax_type=data.get('tax_type', 'no'),
                    tax_rate=(data.get('tax_rate', 0) or 0) / 100.0,
                    tax_amount=data.get('tax_amount', 0) or 0,
                    remark=data.get('remark', ''),
                    is_completed=data.get('is_completed', True),
                    status=data.get('status', 'pending'),
                    payment_status=data.get('payment_status', 'unpaid'),
                    paid_amount=data.get('paid_amount', 0) or 0,
                    work_subtype=data.get('work_subtype', ''),
                    priority=data.get('priority', 'normal'),
                    order_no=data.get('order_no', ''),
                )
                db.session.add(record)
                db.session.flush()
                _sync_salary_records_for_work(record)
                msg = '工单已重新创建'
        
        elif log.target_type == 'pending_work':
            existing = PendingWork.query.get(log.target_id)
            if existing:
                existing.title = data.get('title', '')
                existing.customer_name = data.get('customer_name', existing.customer_name)
                existing.contact_name = data.get('contact_name', '')
                existing.work_address = data.get('work_address', existing.work_address)
                existing.staff_name = data.get('staff_name', existing.staff_name)
                existing.work_content = data.get('work_content', '')
                if data.get('reminder_date'):
                    existing.reminder_date = datetime.fromisoformat(data['reminder_date'])
                existing.status = data.get('status', 'pending')
                existing.todo_type = data.get('todo_type', '客户报修')
                existing.contact_phone = data.get('contact_phone', '')
                existing.priority = data.get('priority', 'normal')
                existing.related_record_type = data.get('related_record_type', '')
                existing.related_record_id = data.get('related_record_id')
                msg = '待办已恢复'
            else:
                pending = PendingWork(
                    title=data.get('title', ''),
                    customer_name=data.get('customer_name', ''),
                    contact_name=data.get('contact_name', ''),
                    work_address=data.get('work_address', ''),
                    staff_name=data.get('staff_name', ''),
                    work_content=data.get('work_content', ''),
                    reminder_date=datetime.fromisoformat(data['reminder_date']) if data.get('reminder_date') else datetime.now(),
                    status=data.get('status', 'pending'),
                    todo_type=data.get('todo_type', '客户报修'),
                    contact_phone=data.get('contact_phone', ''),
                    priority=data.get('priority', 'normal'),
                    related_record_type=data.get('related_record_type', ''),
                    related_record_id=data.get('related_record_id'),
                )
                db.session.add(pending)
                msg = '待办已重新创建'
        
        else:
            return jsonify({'error': '不支持的恢复类型'}), 400
        
        db.session.commit()
        return jsonify({'message': msg})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/operation-logs/cleanup', methods=['POST'])
@login_required
@admin_required
def cleanup_operation_logs():
    """清理过期操作日志"""
    try:
        from .models import SystemSetting
        setting = SystemSetting.query.filter_by(key='oplog_retention_days').first()
        days = int(setting.value) if setting and setting.value.isdigit() else 90
        
        from datetime import timedelta
        cutoff = datetime.now() - timedelta(days=days)
        count = OperationLog.query.filter(OperationLog.created_at < cutoff).delete()
        db.session.commit()
        return jsonify({'message': f'已清理 {count} 条过期日志', 'deleted': count, 'retention_days': days})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/operation-logs/stats', methods=['GET'])
@login_required
@admin_required
def get_oplog_stats():
    """获取操作日志统计信息"""
    try:
        from .models import SystemSetting
        setting = SystemSetting.query.filter_by(key='oplog_retention_days').first()
        days = int(setting.value) if setting and setting.value.isdigit() else 90
        
        total = OperationLog.query.count()
        from datetime import timedelta
        cutoff = datetime.now() - timedelta(days=days)
        expired = OperationLog.query.filter(OperationLog.created_at < cutoff).count()
        
        latest = OperationLog.query.order_by(OperationLog.created_at.desc()).first()
        latest_date = latest.created_at.isoformat() if latest else None
        
        return jsonify({
            'total': total,
            'expired': expired,
            'retention_days': days,
            'latest_date': latest_date
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


# ===================== 工资记录 =====================
@api_bp.route('/salaries', methods=['GET'])
@login_required
def get_salaries():
    try:
        staff_name = request.args.get('staff_name')
        month = request.args.get('month')
        status = request.args.get('status')
        query = SalaryRecord.query
        if g.current_user.get('role') != 'admin':
            query = query.filter(SalaryRecord.staff_name == g.current_user.get('staff_name', ''))
        if staff_name:
            query = query.filter(SalaryRecord.staff_name == staff_name)
        if status:
            query = query.filter(SalaryRecord.status == status)
        if month:
            start = datetime.strptime(month + '-01', '%Y-%m-%d')
            end = datetime(start.year + (1 if start.month == 12 else 0), 1 if start.month == 12 else start.month + 1, 1)
            query = query.filter(SalaryRecord.work_date >= start, SalaryRecord.work_date < end)
        records = query.order_by(SalaryRecord.work_date.desc(), SalaryRecord.id.desc()).limit(500).all()
        total_payable = sum(x.payable_amount or 0 for x in records)
        total_paid = sum(x.paid_amount or 0 for x in records)
        return jsonify({'records': [x.to_dict() for x in records], 'summary': {'payable': total_payable, 'paid': total_paid, 'unpaid': total_payable - total_paid}})
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/salaries', methods=['POST'])
@login_required
@admin_required
def create_salary():
    try:
        data = request.get_json() or {}
        staff_name = data.get('staff_name', '').strip()
        if not staff_name:
            return jsonify({'error': '员工不能为空'}), 400
        work_date = datetime.strptime(data.get('work_date') or datetime.now().strftime('%Y-%m-%d'), '%Y-%m-%d')
        daily_wage = float(data.get('daily_wage') or 0)
        work_units = float(data.get('work_units') or 1)
        subsidy = float(data.get('subsidy') or 0)
        deduction = float(data.get('deduction') or 0)
        payable = round(daily_wage * work_units + subsidy - deduction, 2)
        staff = Staff.query.filter_by(name=staff_name).first()
        salary = SalaryRecord(
            salary_no=_generate_salary_no(work_date),
            staff_name=staff_name,
            staff_type=staff.staff_type if staff else data.get('staff_type', 'temp'),
            work_date=work_date,
            business_type=data.get('business_type', '其他'),
            business_no=data.get('business_no', ''),
            customer_name=data.get('customer_name', ''),
            work_content=data.get('work_content', ''),
            salary_type=data.get('salary_type', '日薪'),
            daily_wage=daily_wage,
            work_units=work_units,
            subsidy=subsidy,
            deduction=deduction,
            payable_amount=payable,
            paid_amount=float(data.get('paid_amount') or 0),
            status=data.get('status', 'unsettled'),
            settlement_date=parse_date(data.get('settlement_date')),
            payment_method=data.get('payment_method', ''),
            remark=data.get('remark', '')
        )
        db.session.add(salary)
        db.session.commit()
        return jsonify(salary.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/salaries/<int:salary_id>/settle', methods=['POST'])
@login_required
@admin_required
def settle_salary(salary_id):
    try:
        salary = SalaryRecord.query.get_or_404(salary_id)
        data = request.get_json() or {}
        salary.status = 'settled'
        salary.paid_amount = salary.payable_amount
        salary.settlement_date = parse_date(data.get('settlement_date')) or date.today()
        salary.payment_method = data.get('payment_method', salary.payment_method or '')
        db.session.commit()
        return jsonify(salary.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/salaries/<int:salary_id>', methods=['PUT'])
@login_required
def update_salary(salary_id):
    try:
        if g.current_user.get('role') != 'admin':
            return jsonify({'error': '仅管理员可编辑工资记录'}), 403
        salary = SalaryRecord.query.get_or_404(salary_id)
        data = request.get_json() or {}
        if 'staff_name' in data:
            salary.staff_name = data['staff_name']
        if 'staff_type' in data:
            salary.staff_type = data['staff_type']
        if 'work_date' in data and data['work_date']:
            salary.work_date = datetime.strptime(data['work_date'], '%Y-%m-%d')
        if 'daily_wage' in data:
            salary.daily_wage = float(data['daily_wage'] or 0)
        if 'work_units' in data:
            salary.work_units = float(data['work_units'] or 0)
        if 'subsidy' in data:
            salary.subsidy = float(data['subsidy'] or 0)
        if 'deduction' in data:
            salary.deduction = float(data['deduction'] or 0)
        if 'paid_amount' in data:
            salary.paid_amount = float(data['paid_amount'] or 0)
        if 'payment_method' in data:
            salary.payment_method = data['payment_method'] or ''
        if 'business_type' in data:
            salary.business_type = data['business_type'] or ''
        if 'business_no' in data:
            salary.business_no = data['business_no'] or ''
        if 'customer_name' in data:
            salary.customer_name = data['customer_name'] or ''
        if 'work_content' in data:
            salary.work_content = data['work_content'] or ''
        if 'remark' in data:
            salary.remark = data['remark'] or ''
        salary.payable_amount = round((salary.daily_wage or 0) * (salary.work_units or 0) + (salary.subsidy or 0) - (salary.deduction or 0), 2)
        if salary.paid_amount >= salary.payable_amount and salary.payable_amount > 0:
            salary.status = 'settled'
            salary.settlement_date = date.today()
        else:
            salary.status = 'unsettled'
        db.session.commit()
        return jsonify(salary.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/salaries/<int:salary_id>', methods=['DELETE'])
@login_required
def delete_salary(salary_id):
    try:
        if g.current_user.get('role') != 'admin':
            return jsonify({'error': '仅管理员可删除工资记录'}), 403
        salary = SalaryRecord.query.get_or_404(salary_id)
        db.session.delete(salary)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===================== 支出管理 =====================

def _init_default_expense_categories():
    """初始化默认支出分类"""
    default_cats = [
        ('物料采购', 'purchase', 1, True),
        ('房租', 'daily', 2, False),
        ('水电', 'daily', 3, False),
        ('办公用品', 'daily', 4, False),
        ('差旅交通', 'daily', 5, False),
        ('餐饮', 'daily', 6, False),
        ('设备维护', 'daily', 7, False),
        ('其他', 'other', 99, False),
    ]
    for name, exp_type, sort_order, is_system in default_cats:
        existing = ExpenseCategory.query.filter_by(name=name).first()
        if not existing:
            cat = ExpenseCategory(
                name=name,
                expense_type=exp_type,
                sort_order=sort_order,
                is_system=is_system
            )
            db.session.add(cat)
    try:
        db.session.commit()
    except:
        db.session.rollback()

@api_bp.route('/expense-categories', methods=['GET'])
@login_required
def get_expense_categories():
    try:
        _init_default_expense_categories()
        categories = ExpenseCategory.query.order_by(ExpenseCategory.sort_order, ExpenseCategory.id).all()
        cat_list = [c.to_dict() for c in categories]
        return jsonify({
            'records': cat_list,
            'categories': cat_list,
            'total': len(cat_list)
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expense-categories', methods=['POST'])
@login_required
@admin_required
def add_expense_category():
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'error': '分类名称不能为空'}), 400
        existing = ExpenseCategory.query.filter_by(name=name).first()
        if existing:
            return jsonify({'error': '分类已存在'}), 400
        cat = ExpenseCategory(
            name=name,
            expense_type=data.get('expense_type', 'daily'),
            sort_order=data.get('sort_order', 0)
        )
        db.session.add(cat)
        db.session.commit()
        return jsonify(cat.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expense-categories/<int:cat_id>', methods=['PUT'])
@login_required
@admin_required
def update_expense_category(cat_id):
    try:
        cat = ExpenseCategory.query.get_or_404(cat_id)
        data = request.get_json() or {}
        if 'name' in data:
            new_name = data['name'].strip()
            if not new_name:
                return jsonify({'error': '分类名称不能为空'}), 400
            if cat.is_system:
                old_expenses = Expense.query.filter_by(category=cat.name).all()
                old_proj_expenses = ProjectExpense.query.filter_by(category=cat.name).all()
                for e in old_expenses:
                    e.category = new_name
                for e in old_proj_expenses:
                    e.category = new_name
            cat.name = new_name
        for field in ['expense_type', 'sort_order']:
            if field in data:
                setattr(cat, field, data[field])
        db.session.commit()
        return jsonify(cat.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expense-categories/<int:cat_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_expense_category(cat_id):
    try:
        cat = ExpenseCategory.query.get_or_404(cat_id)
        if cat.is_system:
            return jsonify({'error': '系统分类不能删除'}), 400
        expense_count = Expense.query.filter_by(category=cat.name).count()
        project_expense_count = ProjectExpense.query.filter_by(category=cat.name).count()
        if expense_count > 0 or project_expense_count > 0:
            return jsonify({'error': f'该分类下有{expense_count + project_expense_count}条支出记录，无法删除'}), 400
        db.session.delete(cat)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses', methods=['GET'])
@login_required
def get_expenses():
    try:
        _init_default_expense_categories()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        expense_type = request.args.get('expense_type', '')
        category = request.args.get('category', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        keyword = request.args.get('keyword', '')

        query = Expense.query
        
        if g.current_user.get('role') != 'admin':
            query = query.filter(Expense.id == -1)
        
        if expense_type:
            query = query.filter(Expense.expense_type == expense_type)
        if category:
            query = query.filter(Expense.category == category)
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        if keyword:
            query = query.filter(
                db.or_(
                    Expense.title.like(f'%{escape_like_keyword(keyword)}%'),
                    Expense.remark.like(f'%{escape_like_keyword(keyword)}%'),
                    Expense.supplier.like(f'%{escape_like_keyword(keyword)}%')
                )
            )
        
        total = query.count()
        expenses = query.order_by(Expense.expense_date.desc(), Expense.id.desc()) \
                      .offset((page - 1) * per_page).limit(per_page).all()
        
        # 统计汇总
        total_amount = query.with_entities(func.sum(Expense.amount)).scalar() or 0
        
        return jsonify({
            'items': [e.to_dict() for e in expenses],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_amount': total_amount
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses/<int:expense_id>', methods=['GET'])
@login_required
def get_expense(expense_id):
    try:
        if g.current_user.get('role') != 'admin':
            return jsonify({'error': '无权查看支出详情'}), 403
        expense = Expense.query.get_or_404(expense_id)
        return jsonify(expense.to_dict())
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses', methods=['POST'])
@login_required
@admin_required
def add_expense():
    try:
        data = request.get_json() or {}
        user_name = get_login_user_name()
        
        amount = float(data.get('amount') or 0)
        if amount <= 0:
            return jsonify({'error': '支出金额必须大于0'}), 400
        
        expense = Expense(
            expense_type=data.get('expense_type', 'other'),
            category=data.get('category', ''),
            title=data.get('title', ''),
            amount=amount,
            expense_date=datetime.strptime(data.get('expense_date') or datetime.now().strftime('%Y-%m-%d'), '%Y-%m-%d').date(),
            related_type=data.get('related_type', ''),
            related_id=data.get('related_id'),
            related_no=data.get('related_no', ''),
            supplier=data.get('supplier', ''),
            payment_method=data.get('payment_method', 'cash'),
            remark=data.get('remark', ''),
            created_by=user_name
        )
        db.session.add(expense)
        db.session.commit()
        return jsonify(expense.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses/<int:expense_id>', methods=['PUT'])
@login_required
@admin_required
def update_expense(expense_id):
    try:
        expense = Expense.query.get_or_404(expense_id)
        data = request.get_json() or {}
        
        expense.expense_type = data.get('expense_type', expense.expense_type)
        expense.category = data.get('category', expense.category)
        expense.title = data.get('title', expense.title)
        expense.amount = float(data.get('amount', expense.amount) or 0)
        if data.get('expense_date'):
            expense.expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
        expense.supplier = data.get('supplier', expense.supplier)
        expense.payment_method = data.get('payment_method', expense.payment_method)
        expense.remark = data.get('remark', expense.remark)
        
        db.session.commit()
        return jsonify(expense.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_expense(expense_id):
    try:
        expense = Expense.query.get_or_404(expense_id)
        db.session.delete(expense)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses/stats', methods=['GET'])
@login_required
def get_expense_stats():
    try:
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        query = Expense.query
        if g.current_user.get('role') != 'admin':
            query = query.filter(Expense.id == -1)
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        
        total = query.with_entities(func.sum(Expense.amount)).scalar() or 0
        
        # 按分类统计
        by_category = db.session.query(
            Expense.category,
            func.sum(Expense.amount).label('amount')
        ).filter(
            Expense.id.in_([e.id for e in query.all()]) if start_date or end_date else True
        ).group_by(Expense.category).all()
        
        # 按类型统计
        by_type = db.session.query(
            Expense.expense_type,
            func.sum(Expense.amount).label('amount')
        ).filter(
            Expense.id.in_([e.id for e in query.all()]) if start_date or end_date else True
        ).group_by(Expense.expense_type).all()
        
        return jsonify({
            'total': total,
            'by_category': [{'category': c, 'amount': a or 0} for c, a in by_category],
            'by_type': [{'type': t, 'amount': a or 0} for t, a in by_type]
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

# ===================== 统计 =====================

@api_bp.route('/statistics', methods=['GET'])
@login_required
def get_statistics():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.now() - timedelta(days=30)
        end = datetime.strptime(end_date, '%Y-%m-%d') if end_date else datetime.now()
        end = end + timedelta(days=1)

        # 基础过滤
        base_filter = [WorkRecord.work_date >= start, WorkRecord.work_date < end]
        user_role = g.current_user.get('role', 'worker')
        user_staff_name = g.current_user.get('staff_name', '')
        if user_role == 'worker':
            base_filter.append(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff_name}%'),
                    WorkRecord.staff_name == user_staff_name,
                    WorkRecord.created_by == user_staff_name
                )
            )

        total_works = WorkRecord.query.filter(*base_filter).count()
        construction_count = WorkRecord.query.filter(*base_filter, WorkRecord.record_type == 'construction').count()
        repair_count = WorkRecord.query.filter(*base_filter, WorkRecord.record_type == 'repair').count()

        pending_count = PendingWork.query.filter_by(status='pending').count()
        paid_amount = db.session.query(func.sum(WorkRecord.paid_amount)).filter(*base_filter).scalar() or 0
        unpaid_amount = db.session.query(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)).filter(*base_filter, WorkRecord.payment_status.in_(['unpaid','partial','monthly'])).scalar() or 0
        unpaid_salary = db.session.query(func.sum(SalaryRecord.payable_amount - SalaryRecord.paid_amount)).filter_by(status='unsettled').scalar() or 0

        staff_stats = db.session.query(
            WorkRecord.staff_name,
            func.count(WorkRecord.id).label('count')
        ).filter(*base_filter).group_by(WorkRecord.staff_name).all()

        # 工时统计
        labor_summary = db.session.query(
            WorkRecord.staff_name,
            func.count(WorkRecord.id).label('work_count'),
            func.sum(WorkRecord.labor_fee).label('total_labor'),
            func.sum(WorkRecord.material_fee).label('total_material'),
            func.sum(WorkRecord.transport_fee).label('total_transport'),
            func.sum(WorkRecord.other_fee).label('total_other'),
            func.sum(WorkRecord.total_fee).label('total_fee')
        ).filter(*base_filter).group_by(WorkRecord.staff_name).all()

        # 总体汇总
        totals = db.session.query(
            func.sum(WorkRecord.labor_fee),
            func.sum(WorkRecord.material_fee),
            func.sum(WorkRecord.transport_fee),
            func.sum(WorkRecord.other_fee),
            func.sum(WorkRecord.total_fee)
        ).filter(*base_filter).first()

        return jsonify({
            'total_works': total_works,
            'construction_count': construction_count,
            'repair_count': repair_count,
            'pending_count': pending_count,
            'paid_amount': float(paid_amount),
            'unpaid_amount': float(unpaid_amount),
            'unpaid_salary': float(unpaid_salary),
            'staff_stats': [{'name': s[0], 'count': s[1]} for s in staff_stats if s[0]],
            'fee_summary': [{
                'staff_name': s[0],
                'work_count': s[1],
                'labor_fee': float(s[2] or 0),
                'material_fee': float(s[3] or 0),
                'transport_fee': float(s[4] or 0),
                'other_fee': float(s[5] or 0),
                'total_fee': float(s[6] or 0)
            } for s in labor_summary if s[0]],
            'totals': {
                'labor_fee': float(totals[0] or 0),
                'material_fee': float(totals[1] or 0),
                'transport_fee': float(totals[2] or 0),
                'other_fee': float(totals[3] or 0),
                'total_fee': float(totals[4] or 0)
            },
            'date_range': {'start': start.date().isoformat(), 'end': (end - timedelta(days=1)).date().isoformat()}
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500

# ===================== 导出 =====================

@api_bp.route('/export/records', methods=['GET'])
@login_required
def export_records():
    """导出工作记录为 CSV"""
    try:
        import csv, io

        customer_name = request.args.get('customer_name')
        staff_name = request.args.get('staff_name')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = WorkRecord.query

        # 权限过滤
        user_role = g.current_user.get('role', 'worker')
        user_staff_name = g.current_user.get('staff_name', '')
        if user_role == 'worker':
            query = query.filter(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff_name}%'),
                    WorkRecord.staff_name == user_staff_name,
                    WorkRecord.created_by == user_staff_name
                )
            )

        if customer_name:
            query = query.filter(WorkRecord.customer_name.like(f'%{escape_like_keyword(customer_name)}%'))
        if staff_name:
            query = query.filter(
                db.or_(
                    WorkRecord.staff_name == staff_name,
                    WorkRecord.staff_names.like(f'%{escape_like_keyword(staff_name)}%')
                )
            )
        if start_date and end_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                end = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(WorkRecord.work_date >= start, WorkRecord.work_date < end)
            except:
                pass

        records = query.order_by(WorkRecord.work_date.desc()).all()

        output = io.StringIO()
        writer = csv.writer(output)
        
        # 表头信息
        company_name = os.environ.get('COMPANY_NAME', '珠海市瑞翼智能科技有限公司')
        writer.writerow([f'{company_name} - 工作日志'])
        if start_date or end_date:
            writer.writerow([f'日期范围: {start_date or ""} ~ {end_date or ""}'])
        writer.writerow([])  # 空行
        
        writer.writerow(['工单号','ID','日期','类型','客户','电话','地址','施工内容/故障描述','故障诊断','维修过程','维修结果',
                         '工作人员','开始时间','结束时间','人工费','材料费','交通费','其他费','税费','总费用','备注','照片'])

        for r in records:
            rtype = '施工' if r.record_type == 'construction' else '维修'
            content = r.work_content or (r.fault_description or '')
            writer.writerow([
                r.order_no or '', r.id, r.work_date.strftime('%Y-%m-%d'), rtype,
                r.customer_name, r.customer_phone, r.work_address,
                content, r.fault_diagnosis, r.repair_process,
                '已完成' if r.repair_result=='completed' else '待维修' if r.repair_result=='pending' else '',
                r.staff_name, r.start_time or '', r.end_time or '',
                r.labor_fee or 0, r.material_fee or 0, r.transport_fee or 0, r.other_fee or 0, r.tax_amount or 0, r.total_fee or 0,
                r.remark or '', r.work_photos or ''
            ])

        csv_data = output.getvalue()
        output.close()

        from flask import Response
        import urllib.parse
        filename = urllib.parse.quote(f'工作记录_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv')
        return Response(
            csv_data.encode('utf-8-sig'),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


# ===================== PDF 导出 =====================

def _generate_pdf(records):
    """生成工作记录 PDF，每页带企业名称，嵌入照片（4宫格），返回 bytes"""
    from fpdf import FPDF
    import os
    
    font_candidates = [
        ('/app/fonts/SourceHanSansSC-Regular.otf', None),
        ('/usr/share/fonts/wqy-zenhei/wqy-zenhei.ttc', 0),
    ]
    font_path = None
    font_index = None
    for fp, fi in font_candidates:
        if os.path.exists(fp):
            font_path = fp
            font_index = fi
            break
    font_ok = font_path is not None
    upload_dir = '/app/uploads'
    company_name = os.environ.get('COMPANY_NAME', '珠海市瑞翼智能科技有限公司')
    
    class WorkLogPDF(FPDF):
        def footer(self):
            self.set_y(-15)
            if font_ok:
                self.set_font('CJK', '', 7)
            else:
                self.set_font('Helvetica', '', 7)
            self.set_text_color(148, 163, 184)
            self.cell(0, 5, f'导出时间: {datetime.now().strftime("%Y-%m-%d %H:%M")}  |  第 {{nb}} 页',
                     new_x='LMARGIN', new_y='NEXT', align='C')
    
    pdf = WorkLogPDF(orientation='P', unit='mm', format='A4')
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    
    def set_font(style='', size=10):
        if font_ok:
            pdf.set_font('CJK', style, size)
        else:
            pdf.set_font('Helvetica', style, size)
    
    if font_ok:
        try:
            if font_path.endswith('.ttc'):
                from fontTools.ttLib import TTFont
                ttf = TTFont(font_path, fontNumber=font_index or 0)
                import tempfile
                tmp_font = tempfile.NamedTemporaryFile(suffix='.ttf', delete=False)
                ttf.save(tmp_font.name)
                tmp_font.close()
                pdf.add_font('CJK', '', tmp_font.name)
            else:
                pdf.add_font('CJK', '', font_path)
        except Exception as e:
            print(f'PDF字体加载失败: {e}')
            font_ok = False
    
    for idx, r in enumerate(records):
        if idx > 0:
            pdf.add_page()
        
        # ── 页眉 ──
        set_font('', 18)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 10, company_name, new_x='LMARGIN', new_y='NEXT', align='L')
        pdf.set_draw_color(99, 102, 241)
        pdf.set_line_width(0.6)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(3)
        
        # ── 标题 ──
        set_font('', 14)
        pdf.set_text_color(79, 70, 229)
        pdf.cell(0, 8, '工 作 日 志', new_x='LMARGIN', new_y='NEXT', align='C')
        pdf.ln(2)
        
        # ── 记录编号和日期 ──
        set_font('', 8)
        pdf.set_text_color(148, 163, 184)
        pdf.cell(0, 5, f'工单: {r.order_no or "#"+str(r.id)}  |  {r.work_date.strftime("%Y-%m-%d")}',
                 new_x='LMARGIN', new_y='NEXT', align='R')
        pdf.ln(3)
        
        # ── 基本信息（两栏） ──
        set_font('', 10)
        pdf.set_text_color(30, 41, 59)
        y0 = pdf.get_y()
        col1_x = 14
        col2_x = 105
        row_h = 6
        rtype = '施工' if r.record_type == 'construction' else '维修'
        
        pdf.set_xy(col1_x, y0)
        pdf.cell(80, row_h, f'客户: {r.customer_name or ""}')
        pdf.set_xy(col2_x, y0)
        pdf.cell(80, row_h, f'类型: {rtype}')
        
        pdf.set_xy(col1_x, y0 + row_h)
        pdf.cell(80, row_h, f'地址: {r.work_address or ""}')
        pdf.set_xy(col2_x, y0 + row_h)
        pdf.cell(80, row_h, f'工作人员: {r.staff_name or ""}')
        
        time_str = ''
        if r.start_time:
            time_str += f'开始: {r.start_time}'
        if r.end_time:
            time_str += f'  结束: {r.end_time}'
        pdf.set_xy(col1_x, y0 + row_h * 2)
        pdf.cell(80, row_h, time_str if time_str else '')
        
        current_y = y0 + row_h * 3 + 2
        
        # ── 详情 ──
        if r.record_type == 'construction' and r.work_content:
            pdf.set_xy(14, current_y)
            set_font('', 9)
            pdf.multi_cell(182, 5, f'施工内容: {r.work_content}')
            current_y = pdf.get_y() + 2
        elif r.record_type == 'repair':
            pdf.set_xy(14, current_y)
            set_font('', 9)
            for label, val in [('故障现象', r.fault_description), ('故障诊断', r.fault_diagnosis),
                               ('维修过程', r.repair_process)]:
                if val:
                    pdf.multi_cell(182, 5, f'{label}: {val}')
                    pdf.ln(0.5)
            if r.repair_result:
                result = '已维修完成' if r.repair_result == 'completed' else '未维修完成（已转待办）'
                pdf.cell(0, 5, f'维修结果: {result}', new_x='LMARGIN', new_y='NEXT')
                if r.repair_result == 'pending':
                    reason = f'{r.incomplete_reason_type or "未分类"} - {r.incomplete_reason or "未填写"}'
                    pdf.multi_cell(182, 5, f'未完成原因: {reason}')
            current_y = pdf.get_y() + 2
        
        # ── 费用 ──
        pdf.set_xy(14, current_y)
        set_font('', 9)
        pdf.set_text_color(107, 114, 128)
        fees_parts = []
        for label, val in [('人工', r.labor_fee), ('材料', r.material_fee),
                           ('交通', r.transport_fee), ('其他', r.other_fee), ('税费', r.tax_amount)]:
            if val and val > 0:
                fees_parts.append(f'{label} ¥{val:.0f}')
        if fees_parts:
            pdf.cell(0, 6, '  |  '.join(fees_parts) + f'  合计: ¥{r.total_fee or 0:.0f}',
                     new_x='LMARGIN', new_y='NEXT')
            current_y = pdf.get_y() + 1
        else:
            current_y = pdf.get_y() + 1
        
        # ── 备注 ──
        if r.remark:
            pdf.set_xy(14, current_y)
            pdf.set_text_color(107, 114, 128)
            pdf.cell(0, 5, f'备注: {r.remark}', new_x='LMARGIN', new_y='NEXT')
            current_y = pdf.get_y() + 1
        
        # ── 照片（4宫格 2x2） ──
        if r.work_photos:
            photo_files = [os.path.basename(p.strip().strip("/")) for p in r.work_photos.split(',') if p.strip()]
            valid_photos = []
            for pf in photo_files:
                fpath = os.path.join(upload_dir, pf)
                if os.path.exists(fpath):
                    valid_photos.append(fpath)
            if valid_photos:
                # 不超过4张
                valid_photos = valid_photos[:4]
                photo_y = current_y + 3
                # 检查是否有足够空间（半页 = ~130mm）
                if photo_y > 160:
                    pdf.add_page()
                    photo_y = 30
                # 2x2 网格：宽85mm，高按比例，间距5mm
                grid_w = 85  # 每张宽度
                grid_gap = 5
                start_x = 14
                img_count = len(valid_photos)
                rows = (img_count + 1) // 2
                for pi, fpath in enumerate(valid_photos):
                    col = pi % 2
                    row = pi // 2
                    x = start_x + col * (grid_w + grid_gap)
                    y = photo_y + row * 68  # 每行预留68mm高
                    # 如果超出页面范围则跳页
                    if y + 68 > 280:
                        pdf.add_page()
                        y = 30 + row * 68
                        photo_y = 30
                    pdf.image(fpath, x=x, y=y, w=grid_w)
    
    return bytes(pdf.output())


@api_bp.route('/export/pdf/<int:record_id>', methods=['GET'])
@login_required
def export_pdf_single(record_id):
    """导出单条记录为 PDF"""
    try:
        record = WorkRecord.query.get_or_404(record_id)
        user_role = g.current_user.get('role', 'worker')
        user_staff = g.current_user.get('staff_name', '')
        if user_role == 'worker':
            if record.staff_name != user_staff and user_staff not in (record.staff_names or '') and record.created_by != user_staff:
                return jsonify({'error': '无权限'}), 403
        
        pdf_bytes = _generate_pdf([record])
        
        import urllib.parse
        filename = urllib.parse.quote(f'工作记录_{record.id}.pdf')
        from flask import Response, send_file, send_file
        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/export/pdf', methods=['GET'])
@login_required
def export_pdf_range():
    """导出指定时间范围的工作记录为 PDF"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        if not start_date or not end_date:
            return jsonify({'error': '请提供 start_date 和 end_date'}), 400
        
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        
        query = WorkRecord.query.filter(WorkRecord.work_date >= start, WorkRecord.work_date < end)
        
        # 权限过滤
        user_role = g.current_user.get('role', 'worker')
        user_staff = g.current_user.get('staff_name', '')
        if user_role == 'worker':
            query = query.filter(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff}%'),
                    WorkRecord.staff_name == user_staff,
                    WorkRecord.created_by == user_staff
                )
            )
        
        records = query.order_by(WorkRecord.work_date).all()
        if not records:
            return jsonify({'error': '该时间段没有记录'}), 404
        
        pdf_bytes = _generate_pdf(records)
        
        import urllib.parse
        filename = urllib.parse.quote(f'工作记录_{start_date}_{end_date}.pdf')
        from flask import Response, send_file, send_file
        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    """获取上传的照片"""
    folder = current_app.config['UPLOAD_FOLDER']
    if not os.path.isabs(folder):
        folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', folder)
    return send_from_directory(os.path.abspath(folder), filename)


@api_bp.route('/upload', methods=['POST'])
@login_required
def upload_file():
    """通用文件上传"""
    try:
        file = request.files.get('file')
        if not file or not file.filename:
            return jsonify({'error': '请选择文件'}), 400
        if not allowed_file(file):
            return jsonify({'error': '文件类型不支持'}), 400
        upload_folder = current_app.config['UPLOAD_FOLDER']
        filename = safe_filename(file.filename)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        return jsonify({'url': f'/uploads/{filename}', 'filename': filename})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===================== 系统设置 =====================

@api_bp.route('/settings', methods=['GET'])
@admin_required
def get_settings():
    """获取所有系统设置"""
    try:
        from .models import SystemSetting
        settings = SystemSetting.query.all()
        return jsonify({s.key: s.value for s in settings})
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/settings', methods=['POST'])
@admin_required
def update_settings():
    """更新系统设置"""
    try:
        from .models import SystemSetting
        data = request.get_json() or {}
        for key, value in data.items():
            s = SystemSetting.query.filter_by(key=key).first()
            if s:
                s.value = str(value)
            else:
                db.session.add(SystemSetting(key=key, value=str(value)))
        db.session.commit()
        return jsonify({'message': '设置已保存'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ===================== 数据备份恢复 =====================

@api_bp.route('/backup/create', methods=['POST'])
@admin_required
def create_backup():
    """创建数据库备份"""
    try:
        import shutil, os
        db_path = '/app/data/worklog.db'
        backup_dir = '/app/data/backups'
        os.makedirs(backup_dir, exist_ok=True)
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'worklog_backup_{ts}.db'
        backup_path = os.path.join(backup_dir, backup_name)
        shutil.copy2(db_path, backup_path)
        _cleanup_old_backups(backup_dir)
        size = os.path.getsize(backup_path)
        return jsonify({'message': '备份成功', 'name': backup_name, 'size': size})
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


def _cleanup_old_backups(backup_dir):
    """清理超过保留天数的备份（默认7天）"""
    import os
    try:
        setting = SystemSetting.query.filter_by(key='backup_retention_days').first()
        days = int(setting.value) if setting and setting.value else 7
        if days <= 0:
            return
        cutoff = datetime.now() - timedelta(days=days)
        for f in os.listdir(backup_dir):
            if f.endswith('.db'):
                fp = os.path.join(backup_dir, f)
                mtime = datetime.fromtimestamp(os.path.getmtime(fp))
                if mtime < cutoff:
                    try:
                        os.remove(fp)
                    except:
                        pass
    except Exception as e:
        print(f'清理旧备份失败: {e}')


def _auto_daily_backup():
    """轻量级每日自动备份：在请求中触发，每天最多一次"""
    import shutil, os
    try:
        last_run_key = 'last_backup_run'
        today_str = date.today().isoformat()
        last_run = SystemSetting.query.filter_by(key=last_run_key).first()
        if last_run and last_run.value == today_str:
            return
        if not last_run:
            last_run = SystemSetting(key=last_run_key, value=today_str)
            db.session.add(last_run)
        else:
            last_run.value = today_str
        
        db_path = '/app/data/worklog.db'
        backup_dir = '/app/data/backups'
        os.makedirs(backup_dir, exist_ok=True)
        ts = datetime.now().strftime('%Y%m%d_030000')
        backup_name = f'worklog_backup_{ts}.db'
        backup_path = os.path.join(backup_dir, backup_name)
        if not os.path.exists(backup_path):
            shutil.copy2(db_path, backup_path)
            _cleanup_old_backups(backup_dir)
            print(f'✅ 自动备份完成: {backup_name}')
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f'自动备份失败: {e}')


@api_bp.route('/backup/list', methods=['GET'])
@admin_required
def list_backups():
    """列出所有备份"""
    try:
        import os
        backup_dir = '/app/data/backups'
        os.makedirs(backup_dir, exist_ok=True)
        backups = []
        for f in sorted(os.listdir(backup_dir), reverse=True):
            if f.endswith('.db'):
                fp = os.path.join(backup_dir, f)
                backups.append({'name': f, 'size': os.path.getsize(fp), 'time': datetime.fromtimestamp(os.path.getmtime(fp)).strftime('%Y-%m-%d %H:%M')})
        return jsonify(backups)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/backup/download/<filename>', methods=['GET'])
@admin_required
def download_backup(filename):
    """下载备份文件"""
    try:
        import os
        from flask import send_file
        backup_dir = '/app/data/backups'
        fp = os.path.join(backup_dir, filename)
        if not os.path.exists(fp):
            return jsonify({'error': '备份文件不存在'}), 404
        return send_file(fp, as_attachment=True, download_name=filename)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/backup/restore', methods=['POST'])
@admin_required
def restore_backup():
    """从备份文件恢复数据库"""
    try:
        import os, shutil
        data = request.get_json() or {}
        filename = data.get('name')
        if not filename:
            return jsonify({'error': '请指定备份文件'}), 400
        backup_dir = '/app/data/backups'
        src = os.path.join(backup_dir, filename)
        if not os.path.exists(src):
            return jsonify({'error': '备份文件不存在'}), 404
        db_path = '/app/data/worklog.db'
        os.makedirs(backup_dir, exist_ok=True)
        shutil.copy2(db_path, os.path.join(backup_dir, '_pre_restore.db'))
        shutil.copy2(src, db_path)
        return jsonify({'message': '数据库已恢复，请重启容器生效', 'restored_from': filename, 'hint': 'docker restart worklog-backend'})
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/backup/<filename>', methods=['DELETE'])
@admin_required
def delete_backup_file(filename):
    """删除指定备份文件"""
    try:
        import os
        backup_dir = '/app/data/backups'
        filepath = os.path.join(backup_dir, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': '备份文件不存在'}), 404
        if '..' in filename or '/' in filename:
            return jsonify({'error': '无效的文件名'}), 400
        os.remove(filepath)
        return jsonify({'message': '备份文件已删除'})
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


# ===================== 编辑日志 =====================

@api_bp.route('/records/<int:record_id>/edits', methods=['GET'])
@login_required
def get_record_edits(record_id):
    from .models import RecordEditLog
    record = WorkRecord.query.get_or_404(record_id)
    if not _can_access_record(record):
        return jsonify({'error': '无权访问该工单'}), 403
    logs = RecordEditLog.query.filter_by(record_id=record_id).order_by(RecordEditLog.edited_at.desc()).all()
    return jsonify([l.to_dict() for l in logs])


# ===================== 仪表盘 =====================

@api_bp.route('/dashboard', methods=['GET'])
@login_required
def get_dashboard():
    """获取仪表盘数据"""
    try:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        user_role = g.current_user.get('role', 'worker')
        user_staff = g.current_user.get('staff_name', '')
        
        if user_role == 'admin':
            _auto_daily_backup()
            _auto_generate_inspection_todos()

        # 今日工单
        today_q = _apply_record_permission(WorkRecord.query.filter(WorkRecord.work_date >= today, WorkRecord.work_date < tomorrow))
        today_count = today_q.count()
        today_total_q = _apply_record_permission(db.session.query(func.sum(WorkRecord.total_fee)).filter(
            WorkRecord.work_date >= today, WorkRecord.work_date < tomorrow
        ))
        today_total = today_total_q.scalar() or 0
        today_records = today_q.order_by(WorkRecord.work_date.desc()).limit(10).all()
        
        # 待办数量
        pending_q = PendingWork.query.filter_by(status='pending')
        if user_role == 'worker' and user_staff:
            pending_q = pending_q.filter(PendingWork.staff_name.like(f'%{user_staff}%'))
        pending_count = pending_q.count()
        unpaid_q = _apply_record_permission(db.session.query(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)).filter(
            WorkRecord.payment_status.in_(['unpaid','partial','monthly'])
        ))
        unpaid_amount = unpaid_q.scalar() or 0
        salary_q = db.session.query(func.sum(SalaryRecord.payable_amount - SalaryRecord.paid_amount)).filter_by(status='unsettled')
        if user_role == 'worker' and user_staff:
            salary_q = salary_q.filter(SalaryRecord.staff_name == user_staff)
        unpaid_salary = salary_q.scalar() or 0

        # 项目未发工资
        proj_salary_q = db.session.query(func.sum(ProjectSalary.payable_amount - ProjectSalary.paid_amount)).filter(
            ProjectSalary.status == 'unsettled'
        )
        if user_role == 'worker' and user_staff:
            proj_salary_q = proj_salary_q.filter(ProjectSalary.staff_name == user_staff)
        unpaid_proj_salary = proj_salary_q.scalar() or 0
        unpaid_salary = float(unpaid_salary) + float(unpaid_proj_salary)
        today_construction_count = today_q.filter(WorkRecord.record_type == 'construction').count()
        today_repair_count = today_q.filter(WorkRecord.record_type == 'repair').count()
        
        # 本月统计
        month_start = today.replace(day=1)
        month_q = _apply_record_permission(WorkRecord.query.filter(WorkRecord.work_date >= month_start))
        month_count = month_q.count()
        month_total = month_q.with_entities(func.sum(WorkRecord.total_fee)).scalar() or 0
        
        # 超期待办
        overdue_q = PendingWork.query.filter(
            PendingWork.status == 'pending',
            PendingWork.reminder_date < today
        )
        if user_role == 'worker' and user_staff:
            overdue_q = overdue_q.filter(PendingWork.staff_name.like(f'%{user_staff}%'))
        overdue_pending = overdue_q.count()

        # 待办事项列表（按紧急程度取前5条：超时 > 今天 > 未来）
        urgency_order = db.case(
            (PendingWork.reminder_date < today, 0),
            (PendingWork.reminder_date == today.replace(hour=0, minute=0, second=0, microsecond=0), 1),
            else_=2
        )
        top_pending_q = PendingWork.query.filter_by(status='pending')
        if user_role == 'worker' and user_staff:
            top_pending_q = top_pending_q.filter(PendingWork.staff_name.like(f'%{user_staff}%'))
        top_pending = top_pending_q.order_by(urgency_order, PendingWork.reminder_date.asc()).limit(5).all()
        
        # 全部记录总数
        total_count = _apply_record_permission(WorkRecord.query).count()
        
        # 本月收入（收款 + 项目收款）
        payment_q = db.session.query(func.sum(PaymentRecord.amount)).filter(
            PaymentRecord.payment_date >= month_start,
            PaymentRecord.payment_date < (today + timedelta(days=1))
        )
        if user_role == 'worker':
            payment_q = payment_q.join(WorkRecord, PaymentRecord.record_id == WorkRecord.id).filter(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff}%'),
                    WorkRecord.staff_name == user_staff,
                    WorkRecord.created_by == user_staff
                )
            )
        month_payment = payment_q.scalar() or 0

        # 项目收款
        proj_receipt_q = db.session.query(func.sum(Project.receipt_amount)).filter(
            Project.created_at >= month_start,
            Project.created_at < (today + timedelta(days=1))
        )
        if user_role == 'worker' and user_staff:
            proj_receipt_q = _apply_project_permission(proj_receipt_q)
        month_project_receipt = proj_receipt_q.scalar() or 0
        month_payment = float(month_payment) + float(month_project_receipt)
        
        # 本月支出（普通支出 + 项目支出）
        if user_role == 'admin':
            month_expense = db.session.query(func.sum(Expense.amount)).filter(
                Expense.expense_date >= month_start,
                Expense.expense_date < (today + timedelta(days=1))
            ).scalar() or 0
            proj_expense = db.session.query(func.sum(ProjectExpense.amount)).filter(
                ProjectExpense.expense_date >= month_start,
                ProjectExpense.expense_date < (today + timedelta(days=1))
            ).scalar() or 0
            month_expense = float(month_expense) + float(proj_expense)
        else:
            month_expense = 0
        
        # 低库存预警
        low_stock_count = Material.query.filter(
            Material.min_stock > 0,
            Material.stock <= Material.min_stock
        ).count()
        
        # 待维护设备（到期维护）
        today_date = today.date()
        due_maintenance_count = CustomerEquipment.query.filter(
            CustomerEquipment.next_maintenance != None,
            CustomerEquipment.next_maintenance <= today_date,
            CustomerEquipment.status == 'normal'
        ).count()
        
        # 进行中项目
        active_project_count = Project.query.filter(Project.status == 'in_progress').count()
        
        # 客户总数
        customer_count = Customer.query.count()
        
        # 物料总数
        material_count = Material.query.count()
        
        # 最近收款记录
        recent_payments_q = PaymentRecord.query
        if user_role == 'worker' and user_staff:
            recent_payments_q = recent_payments_q.join(WorkRecord, PaymentRecord.record_id == WorkRecord.id).filter(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff}%'),
                    WorkRecord.staff_name == user_staff,
                    WorkRecord.created_by == user_staff
                )
            )
        recent_payments = recent_payments_q.order_by(PaymentRecord.created_at.desc()).limit(5).all()
        
        # 最近支出记录
        if user_role == 'admin':
            recent_expenses = Expense.query.order_by(Expense.created_at.desc()).limit(5).all()
        else:
            recent_expenses = []
        
        # 活跃客户（近30天工单最多的前5个）
        try:
            from datetime import timedelta as td
            thirty_days_ago = today - td(days=30)
            top_customers_q = db.session.query(
                WorkRecord.customer_name,
                func.count(WorkRecord.id).label('cnt'),
                func.sum(WorkRecord.total_fee).label('amt')
            ).filter(
                WorkRecord.work_date >= thirty_days_ago,
                WorkRecord.customer_name != ''
            )
            if user_role == 'worker' and user_staff:
                top_customers_q = top_customers_q.filter(
                    db.or_(
                        WorkRecord.staff_names.like(f'%{user_staff}%'),
                        WorkRecord.staff_name == user_staff,
                        WorkRecord.created_by == user_staff
                    )
                )
            top_customers = top_customers_q.group_by(WorkRecord.customer_name).order_by(func.count(WorkRecord.id).desc()).limit(5).all()
        except Exception as e:
            top_customers = []
        
        return jsonify({
            'today_count': today_count,
            'today_construction_count': today_construction_count,
            'today_repair_count': today_repair_count,
            'today_total': float(today_total),
            'pending_count': pending_count,
            'overdue_pending': overdue_pending,
            'unpaid_amount': float(unpaid_amount),
            'unpaid_salary': float(unpaid_salary),
            'month_count': month_count,
            'month_total': float(month_total),
            'month_payment': float(month_payment),
            'month_expense': float(month_expense),
            'month_profit': float(month_payment - month_expense),
            'total_count': total_count,
            'low_stock_count': low_stock_count,
            'due_maintenance_count': due_maintenance_count,
            'active_project_count': active_project_count,
            'customer_count': customer_count,
            'material_count': material_count,
            'today_records': [r.to_dict() for r in today_records],
            'urgent_pending': [{'id':p.id,'title':p.title,'customer_name':p.customer_name,'work_content':p.work_content,'staff_name':p.staff_name,'reminder_date':p.reminder_date.isoformat() if p.reminder_date else None,'work_address':p.work_address,'status':p.status} for p in top_pending],
            'recent_payments': [p.to_dict() for p in recent_payments],
            'recent_expenses': [e.to_dict() for e in recent_expenses],
            'top_customers': [{'customer_name': c[0], 'count': c[1], 'amount': float(c[2] or 0)} for c in top_customers if c[0]]
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        import traceback
        print(f'[DASHBOARD ERROR] {str(e)}', flush=True)
        print(traceback.format_exc(), flush=True)
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


# ===================== 日历 =====================

@api_bp.route('/calendar', methods=['GET'])
@api_bp.route('/records/calendar', methods=['GET'])
@login_required
def get_calendar_data():
    try:
        start_param = request.args.get('start')
        end_param = request.args.get('end')
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        
        start_date = None
        end_date = None
        
        if start_param and end_param:
            try:
                start_date = datetime.strptime(start_param, '%Y-%m-%d')
                end_date = datetime.strptime(end_param, '%Y-%m-%d') + timedelta(days=1)
            except:
                pass
        
        if not start_date and year and month:
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)
        
        if not start_date:
            today = datetime.now()
            start_date = datetime(today.year, today.month, 1)
            if today.month == 12:
                end_date = datetime(today.year + 1, 1, 1)
            else:
                end_date = datetime(today.year, today.month + 1, 1)
        
        query = WorkRecord.query.filter(
            WorkRecord.work_date >= start_date,
            WorkRecord.work_date < end_date
        )
        query = _apply_record_permission(query)
        records = query.all()
        
        records_list = []
        calendar_data = {}
        for record in records:
            r_dict = record.to_dict()
            records_list.append(r_dict)
            date_key = record.work_date.strftime('%Y-%m-%d')
            if date_key not in calendar_data:
                calendar_data[date_key] = []
            calendar_data[date_key].append({
                'id': record.id,
                'order_no': record.order_no or '',
                'customer_name': record.customer_name or '',
                'record_type': record.record_type or '',
                'work_content': (record.work_content or '')[:50],
                'status': record.status or '',
                'staff_names': record.staff_names or record.staff_name or ''
            })
        
        if start_param and end_param:
            return jsonify({
                'success': True,
                'records': records_list,
                'calendar': calendar_data
            })
        return jsonify(calendar_data)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'success': False, 'error': str(e)}), 500


# ===================== 收款/应收账款管理 =====================

@api_bp.route('/payments', methods=['GET'])
@login_required
def get_payments():
    try:
        record_id = request.args.get('record_id', type=int)
        customer_name = request.args.get('customer_name')
        payment_method = request.args.get('payment_method')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = PaymentRecord.query
        if record_id:
            query = query.filter(PaymentRecord.record_id == record_id)
        if customer_name:
            query = query.filter(PaymentRecord.customer_name.like(f'%{escape_like_keyword(customer_name)}%'))
        if payment_method:
            query = query.filter(PaymentRecord.payment_method == payment_method)
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(PaymentRecord.payment_date >= start.date())
            except: pass
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d')
                query = query.filter(PaymentRecord.payment_date <= end.date())
            except: pass
        if g.current_user.get('role') != 'admin' and g.current_user.get('staff_name'):
            _un = g.current_user.get('staff_name')
            query = query.join(WorkRecord, PaymentRecord.record_id == WorkRecord.id).filter(
                db.or_(
                    WorkRecord.staff_names.like(f'%{_un}%'),
                    WorkRecord.staff_name == _un,
                    WorkRecord.created_by == _un
                )
            )

        pagination = query.order_by(PaymentRecord.payment_date.desc(), PaymentRecord.id.desc()).paginate(page=page, per_page=per_page)
        total_amount = db.session.query(func.sum(PaymentRecord.amount)).filter(
            PaymentRecord.id.in_([p.id for p in pagination.items])
        ).scalar() or 0

        return jsonify({
            'records': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'total_amount': float(total_amount)
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/payments/stats', methods=['GET'])
@login_required
def get_payment_stats():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)

        base_filter = []
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                base_filter.append(PaymentRecord.payment_date >= start.date())
            except: pass
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d')
                base_filter.append(PaymentRecord.payment_date <= end.date())
            except: pass

        total_received_q = db.session.query(func.sum(PaymentRecord.amount)).filter(*base_filter)
        receivable_q = WorkRecord.query.filter(WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly']))
        total_receivable_q = db.session.query(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)).filter(
            WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly'])
        )
        customer_receivable_query = db.session.query(
            WorkRecord.customer_name,
            func.sum(WorkRecord.total_fee - WorkRecord.paid_amount).label('amount'),
            func.count(WorkRecord.id).label('record_count')
        ).filter(WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly'])).group_by(
            WorkRecord.customer_name
        ).order_by(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount).desc())

        if g.current_user.get('role') != 'admin' and g.current_user.get('staff_name'):
            _un = g.current_user.get('staff_name')
            staff_filter = db.or_(
                WorkRecord.staff_names.like(f'%{_un}%'),
                WorkRecord.staff_name == _un,
                WorkRecord.created_by == _un
            )
            total_received_q = total_received_q.join(WorkRecord, PaymentRecord.record_id == WorkRecord.id).filter(staff_filter)
            receivable_q = receivable_q.filter(staff_filter)
            total_receivable_q = total_receivable_q.filter(staff_filter)
            customer_receivable_query = customer_receivable_query.filter(staff_filter)

        total_received = total_received_q.scalar() or 0
        total_receivable = total_receivable_q.scalar() or 0
        
        pagination = customer_receivable_query.paginate(page=page, per_page=per_page)

        return jsonify({
            'total_received': float(total_received),
            'total_receivable': float(total_receivable),
            'customer_receivable': [{'customer_name': r[0], 'amount': float(r[1] or 0), 'record_count': int(r[2] or 0)} for r in pagination.items],
            'receivable_total': pagination.total,
            'receivable_page': page,
            'receivable_pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/payments', methods=['POST'])
@login_required
@admin_required
def create_payment():
    try:
        data = request.get_json() or {}
        record_id = data.get('record_id')
        customer_name = data.get('customer_name', '').strip()
        amount = float(data.get('amount') or 0)
        if amount <= 0:
            return jsonify({'error': '收款金额不能为空'}), 400
        if not record_id and not customer_name:
            return jsonify({'error': '请至少填写客户名称或关联工单ID'}), 400

        record = None
        if record_id:
            record = WorkRecord.query.get(record_id)
            if not record:
                return jsonify({'error': '工单不存在'}), 404
            customer_name = customer_name or record.customer_name

        payment_date_str = data.get('payment_date')
        payment_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date() if payment_date_str else datetime.now().date()

        payment = PaymentRecord(
            record_id=record_id if record_id else None,
            customer_name=customer_name,
            amount=amount,
            payment_date=payment_date,
            payment_method=data.get('payment_method', 'cash'),
            is_invoiced=bool(data.get('is_invoiced', False)),
            remark=data.get('remark', ''),
            created_by=get_login_user_name()
        )
        db.session.add(payment)
        db.session.flush()

        if record:
            new_paid = (record.paid_amount or 0) + amount
            record.paid_amount = new_paid
            if new_paid >= (record.total_fee or 0):
                record.payment_status = 'paid'
            elif new_paid > 0:
                record.payment_status = 'partial'
            else:
                record.payment_status = 'unpaid'

            _log_operation('work_record', record.id, 'update',
                {'paid_amount': record.paid_amount - amount, 'payment_status': 'before'},
                {'paid_amount': new_paid, 'payment_status': record.payment_status},
                record.customer_name + ' - ' + (record.order_no or ''))

        notify_content = f'{customer_name} 收款 ¥{amount:.2f}'
        if record:
            notify_content += f'（工单{record.order_no or ""}）'
        if record and record.payment_status == 'paid':
            _notify_admins('🎉 工单已结清', notify_content, 'success', 'work_record', record.id if record else None)
        else:
            _notify_admins('💰 新收款登记', notify_content, 'info', 'work_record', record.id if record else None)

        db.session.commit()
        return jsonify(payment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/payments/<int:payment_id>', methods=['PUT'])
@login_required
@admin_required
def update_payment(payment_id):
    try:
        payment = PaymentRecord.query.get_or_404(payment_id)
        data = request.get_json() or {}

        old_amount = payment.amount
        old_record_id = payment.record_id

        if 'amount' in data:
            payment.amount = float(data['amount'] or 0)
        if 'payment_date' in data and data['payment_date']:
            payment.payment_date = datetime.strptime(data['payment_date'], '%Y-%m-%d').date()
        if 'payment_method' in data:
            payment.payment_method = data['payment_method']
        if 'is_invoiced' in data:
            payment.is_invoiced = bool(data['is_invoiced'])
        if 'remark' in data:
            payment.remark = data['remark']

        if 'record_id' in data and data['record_id'] != old_record_id:
            new_record = WorkRecord.query.get(data['record_id'])
            if new_record:
                old_record = WorkRecord.query.get(old_record_id)
                if old_record:
                    old_record.paid_amount = max(0, (old_record.paid_amount or 0) - old_amount)
                    if old_record.paid_amount >= (old_record.total_fee or 0):
                        old_record.payment_status = 'paid'
                    elif old_record.paid_amount > 0:
                        old_record.payment_status = 'partial'
                    else:
                        old_record.payment_status = 'unpaid'

                payment.record_id = data['record_id']
                payment.customer_name = new_record.customer_name
                new_record.paid_amount = (new_record.paid_amount or 0) + payment.amount
                if new_record.paid_amount >= (new_record.total_fee or 0):
                    new_record.payment_status = 'paid'
                elif new_record.paid_amount > 0:
                    new_record.payment_status = 'partial'
                else:
                    new_record.payment_status = 'unpaid'
        elif 'amount' in data:
            record = WorkRecord.query.get(payment.record_id)
            if record:
                diff = payment.amount - old_amount
                new_paid = (record.paid_amount or 0) + diff
                record.paid_amount = max(0, new_paid)
                if record.paid_amount >= (record.total_fee or 0):
                    record.payment_status = 'paid'
                elif record.paid_amount > 0:
                    record.payment_status = 'partial'
                else:
                    record.payment_status = 'unpaid'

        db.session.commit()
        return jsonify(payment.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/payments/<int:payment_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_payment(payment_id):
    try:
        payment = PaymentRecord.query.get_or_404(payment_id)
        record = WorkRecord.query.get(payment.record_id)
        if record:
            record.paid_amount = max(0, (record.paid_amount or 0) - (payment.amount or 0))
            if record.paid_amount >= (record.total_fee or 0):
                record.payment_status = 'paid'
            elif record.paid_amount > 0:
                record.payment_status = 'partial'
            else:
                record.payment_status = 'unpaid'

        db.session.delete(payment)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/records/<int:record_id>/payments', methods=['GET'])
@login_required
def get_record_payments(record_id):
    try:
        record = WorkRecord.query.get_or_404(record_id)
        if not _can_access_record(record):
            return jsonify({'error': '无权访问该工单'}), 403
        payments = PaymentRecord.query.filter_by(record_id=record_id).order_by(PaymentRecord.payment_date.desc()).all()
        total = sum(p.amount or 0 for p in payments)
        return jsonify({
            'payments': [p.to_dict() for p in payments],
            'total_amount': float(total)
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


# ===================== 工单模板/快速开单 =====================

@api_bp.route('/templates', methods=['GET'])
@login_required
def get_templates():
    try:
        template_type = request.args.get('template_type')
        category = request.args.get('category')
        keyword = request.args.get('keyword', '')
        query = WorkTemplate.query
        if template_type:
            query = query.filter(WorkTemplate.template_type == template_type)
        if category:
            query = query.filter(WorkTemplate.category == category)
        if keyword:
            query = query.filter(WorkTemplate.name.like(f'%{escape_like_keyword(keyword)}%'))
        templates = query.order_by(WorkTemplate.updated_at.desc()).all()
        return jsonify([t.to_dict() for t in templates])
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/templates/<int:template_id>', methods=['GET'])
@login_required
def get_template(template_id):
    try:
        template = WorkTemplate.query.get_or_404(template_id)
        return jsonify(template.to_dict())
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/templates', methods=['POST'])
@login_required
@admin_required
def create_template():
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': '模板名称不能为空'}), 400

        staff_names = data.get('staff_names') or []
        if isinstance(staff_names, list):
            staff_names = ','.join(staff_names)

        template = WorkTemplate(
            name=name,
            template_type=data.get('template_type', 'construction'),
            category=data.get('category', ''),
            work_subtype=data.get('work_subtype', ''),
            work_content=data.get('work_content', ''),
            fault_description=data.get('fault_description', ''),
            fault_diagnosis=data.get('fault_diagnosis', ''),
            repair_process=data.get('repair_process', ''),
            repair_result=data.get('repair_result', 'completed'),
            labor_fee=float(data.get('labor_fee') or 0),
            material_fee=float(data.get('material_fee') or 0),
            transport_fee=float(data.get('transport_fee') or 0),
            other_fee=float(data.get('other_fee') or 0),
            tax_type=data.get('tax_type', 'no'),
            tax_rate=float(data.get('tax_rate') or 3) / 100,
            priority=data.get('priority', 'normal'),
            staff_names=staff_names,
            remark=data.get('remark', ''),
            is_public=bool(data.get('is_public', True)),
            created_by=get_login_user_name()
        )
        db.session.add(template)
        db.session.commit()
        return jsonify(template.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/templates/<int:template_id>', methods=['PUT'])
@login_required
@admin_required
def update_template(template_id):
    try:
        template = WorkTemplate.query.get_or_404(template_id)
        data = request.get_json() or {}
        if 'name' in data: template.name = data['name']
        if 'template_type' in data: template.template_type = data['template_type']
        if 'category' in data: template.category = data['category']
        if 'work_subtype' in data: template.work_subtype = data['work_subtype']
        if 'work_content' in data: template.work_content = data['work_content']
        if 'fault_description' in data: template.fault_description = data['fault_description']
        if 'fault_diagnosis' in data: template.fault_diagnosis = data['fault_diagnosis']
        if 'repair_process' in data: template.repair_process = data['repair_process']
        if 'repair_result' in data: template.repair_result = data['repair_result']
        if 'labor_fee' in data: template.labor_fee = float(data['labor_fee'] or 0)
        if 'material_fee' in data: template.material_fee = float(data['material_fee'] or 0)
        if 'transport_fee' in data: template.transport_fee = float(data['transport_fee'] or 0)
        if 'other_fee' in data: template.other_fee = float(data['other_fee'] or 0)
        if 'tax_type' in data: template.tax_type = data['tax_type']
        if 'tax_rate' in data: template.tax_rate = float(data['tax_rate'] or 0) / 100
        if 'priority' in data: template.priority = data['priority']
        if 'staff_names' in data:
            staff_names = data['staff_names'] or []
            if isinstance(staff_names, list):
                template.staff_names = ','.join(staff_names)
        if 'remark' in data: template.remark = data['remark']
        if 'is_public' in data: template.is_public = bool(data['is_public'])
        db.session.commit()
        return jsonify(template.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/templates/<int:template_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_template(template_id):
    try:
        template = WorkTemplate.query.get_or_404(template_id)
        db.session.delete(template)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/templates/<int:template_id>/apply', methods=['POST'])
@login_required
def apply_template(template_id):
    try:
        template = WorkTemplate.query.get_or_404(template_id)
        data = request.get_json() or {}
        customer_name = data.get('customer_name', '')
        work_date_str = data.get('work_date')
        work_date = datetime.strptime(work_date_str, '%Y-%m-%d') if work_date_str else datetime.now()

        record_type = template.template_type
        order_no = _generate_record_no(record_type, work_date)

        labor = template.labor_fee or 0
        material = template.material_fee or 0
        transport = template.transport_fee or 0
        other = template.other_fee or 0
        total = labor + material + transport + other
        tax_amount = 0
        if template.tax_type == 'tax':
            tax_amount = round(total * (template.tax_rate or 0.03), 2)
            total += tax_amount

        record = WorkRecord(
            order_no=order_no,
            customer_name=customer_name,
            work_address=data.get('work_address', ''),
            contact_name=data.get('contact_name', ''),
            customer_phone=data.get('customer_phone', ''),
            staff_names=template.staff_names,
            staff_name=template.staff_names.split(',')[0] if template.staff_names else '',
            record_type=record_type,
            work_content=template.work_content or '',
            fault_description=template.fault_description or '',
            fault_diagnosis=template.fault_diagnosis or '',
            repair_process=template.repair_process or '',
            repair_result=template.repair_result or 'completed',
            work_subtype=template.work_subtype or '',
            priority=template.priority or 'normal',
            work_date=work_date,
            labor_fee=labor,
            material_fee=material,
            transport_fee=transport,
            other_fee=other,
            tax_type=template.tax_type or 'no',
            tax_rate=template.tax_rate or 0.03,
            tax_amount=tax_amount,
            total_fee=total,
            remark=template.remark or '',
            status=data.get('status', 'pending' if record_type == 'construction' else 'dispatched'),
            is_completed=False,
            created_by=get_login_user_name()
        )
        db.session.add(record)
        db.session.flush()
        _sync_salary_records_for_work(record)
        db.session.commit()

        return jsonify(record.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ===================== 列表批量操作 =====================

@api_bp.route('/records/batch', methods=['POST'])
@login_required
@admin_required
def batch_operation_records():
    try:
        data = request.get_json() or {}
        ids = data.get('ids', [])
        action = data.get('action', '')
        if not ids or not action:
            return jsonify({'error': '请选择记录和操作类型'}), 400

        records = WorkRecord.query.filter(WorkRecord.id.in_(ids)).all()
        count = 0

        if action == 'delete':
            for record in records:
                snapshot_before = record.to_dict()
                title = record.customer_name + ' - ' + (record.order_no or '')
                _log_operation('work_record', record.id, 'delete', snapshot_before, None, title)
                if record.work_photos:
                    upload_folder = current_app.config['UPLOAD_FOLDER']
                    for photo in record.work_photos.split(','):
                        photo_path = os.path.join(upload_folder, os.path.basename(photo))
                        if os.path.exists(photo_path):
                            os.remove(photo_path)
                        thumb_name = 'thumb_' + os.path.basename(photo)
                        thumb_path = os.path.join(upload_folder, thumb_name)
                        if thumb_path and os.path.exists(thumb_path):
                            os.remove(thumb_path)
                eqs = RepairEquipment.query.filter_by(work_record_id=record.id).all()
                for eq in eqs:
                    _adjust_material_stock(eq, eq.quantity, 0, record)
                RepairEquipment.query.filter_by(work_record_id=record.id).delete()
                SalaryRecord.query.filter_by(business_record_id=record.id).delete()
                PaymentRecord.query.filter_by(record_id=record.id).update({'record_id': None})
                PendingWork.query.filter_by(related_record_type='work_record', related_record_id=record.id).update({'related_record_id': None})
                db.session.delete(record)
                count += 1
        elif action == 'update_status':
            new_status = data.get('status', '')
            if not new_status:
                return jsonify({'error': '请指定状态'}), 400
            for record in records:
                snapshot_before = record.to_dict()
                record.status = new_status
                snapshot_after = record.to_dict()
                title = record.customer_name + ' - ' + (record.order_no or '')
                _log_operation('work_record', record.id, 'update', snapshot_before, snapshot_after, title)
                count += 1
        elif action == 'update_payment_status':
            new_payment_status = data.get('payment_status', '')
            if not new_payment_status:
                return jsonify({'error': '请指定付款状态'}), 400
            for record in records:
                snapshot_before = record.to_dict()
                record.payment_status = new_payment_status
                snapshot_after = record.to_dict()
                title = record.customer_name + ' - ' + (record.order_no or '')
                _log_operation('work_record', record.id, 'update', snapshot_before, snapshot_after, title)
                count += 1
        elif action == 'update_priority':
            new_priority = data.get('priority', '')
            if not new_priority:
                return jsonify({'error': '请指定优先级'}), 400
            for record in records:
                snapshot_before = record.to_dict()
                record.priority = new_priority
                snapshot_after = record.to_dict()
                title = record.customer_name + ' - ' + (record.order_no or '')
                _log_operation('work_record', record.id, 'update', snapshot_before, snapshot_after, title)
                count += 1
        else:
            return jsonify({'error': '不支持的操作类型'}), 400

        db.session.commit()
        return jsonify({'message': f'成功处理 {count} 条记录', 'count': count})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/pending/batch', methods=['POST'])
@login_required
@admin_required
def batch_operation_pending():
    try:
        data = request.get_json() or {}
        ids = data.get('ids', [])
        action = data.get('action', '')
        if not ids or not action:
            return jsonify({'error': '请选择待办和操作类型'}), 400

        pendings = PendingWork.query.filter(PendingWork.id.in_(ids)).all()
        count = 0

        if action == 'delete':
            for p in pendings:
                snapshot_before = p.to_dict()
                title = p.customer_name + ' - ' + (p.title or '')
                _log_operation('pending_work', p.id, 'delete', snapshot_before, None, title)
                db.session.delete(p)
                count += 1
        elif action == 'update_status':
            new_status = data.get('status', '')
            if not new_status:
                return jsonify({'error': '请指定状态'}), 400
            for p in pendings:
                snapshot_before = p.to_dict()
                p.status = new_status
                snapshot_after = p.to_dict()
                title = p.customer_name + ' - ' + (p.title or '')
                _log_operation('pending_work', p.id, 'update', snapshot_before, snapshot_after, title)
                count += 1
        elif action == 'update_priority':
            new_priority = data.get('priority', '')
            if not new_priority:
                return jsonify({'error': '请指定优先级'}), 400
            for p in pendings:
                snapshot_before = p.to_dict()
                p.priority = new_priority
                snapshot_after = p.to_dict()
                title = p.customer_name + ' - ' + (p.title or '')
                _log_operation('pending_work', p.id, 'update', snapshot_before, snapshot_after, title)
                count += 1
        else:
            return jsonify({'error': '不支持的操作类型'}), 400

        db.session.commit()
        return jsonify({'message': f'成功处理 {count} 条待办', 'count': count})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ===================== 项目/合同管理 =====================

def _generate_project_no():
    date_str = datetime.now().strftime('%Y%m')
    count = Project.query.filter(
        func.strftime('%Y%m', Project.created_at) == date_str
    ).count()
    return f'RY-XM-{date_str}-{count + 1:03d}'


@api_bp.route('/projects', methods=['GET'])
@login_required
def get_projects():
    try:
        status = request.args.get('status')
        customer_name = request.args.get('customer_name')
        project_type = request.args.get('project_type')
        keyword = request.args.get('keyword', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '') or get_login_user_name()

        query = Project.query
        if user_role != 'admin' and user_name:
            query = query.filter(or_(Project.manager.like(f'%{user_name}%'), Project.created_by == user_name))
        if status:
            query = query.filter(Project.status == status)
        if customer_name:
            query = query.filter(Project.customer_name.like(f'%{escape_like_keyword(customer_name)}%'))
        if project_type:
            query = query.filter(Project.project_type == project_type)
        if keyword:
            query = query.filter(or_(
                Project.name.like(f'%{escape_like_keyword(keyword)}%'),
                Project.project_no.like(f'%{escape_like_keyword(keyword)}%'),
                Project.contract_no.like(f'%{escape_like_keyword(keyword)}%')
            ))

        pagination = query.order_by(Project.created_at.desc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>', methods=['GET'])
@login_required
def get_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '') or get_login_user_name()
        if user_role != 'admin' and user_name:
            if user_name not in (project.manager or '') and project.created_by != user_name:
                return jsonify({'error': '无权访问此项目'}), 403
        work_records = ProjectWorkRecord.query.filter_by(project_id=project_id).order_by(ProjectWorkRecord.work_date.desc(), ProjectWorkRecord.id.desc()).all()
        
        expense_total = db.session.query(func.coalesce(func.sum(ProjectExpense.amount), 0)).filter_by(project_id=project_id).scalar()
        expense_by_type = db.session.query(
            ProjectExpense.expense_type,
            func.coalesce(func.sum(ProjectExpense.amount), 0)
        ).filter_by(project_id=project_id).group_by(ProjectExpense.expense_type).all()
        expense_stats = {
            'total': expense_total or 0,
            'by_type': {t: float(a or 0) for t, a in expense_by_type}
        }
        
        salary_total = db.session.query(func.coalesce(func.sum(ProjectSalary.payable_amount), 0)).filter_by(project_id=project_id).scalar()
        salary_paid = db.session.query(func.coalesce(func.sum(ProjectSalary.paid_amount), 0)).filter_by(project_id=project_id).scalar()
        salary_unpaid = (salary_total or 0) - (salary_paid or 0)
        salary_stats = {
            'total': salary_total or 0,
            'paid': salary_paid or 0,
            'unpaid': salary_unpaid
        }
        
        record_income = db.session.query(func.coalesce(func.sum(ProjectWorkRecord.total_fee), 0)).filter_by(project_id=project_id).scalar()
        record_count = ProjectWorkRecord.query.filter_by(project_id=project_id).count()
        gross_profit = (project.contract_amount or 0) + (record_income or 0) + (project.receipt_amount or 0) - (expense_total or 0) - (salary_total or 0)
        finance_overview = {
            'contract_amount': project.contract_amount or 0,
            'record_income': record_income or 0,
            'record_count': record_count or 0,
            'receipt_amount': project.receipt_amount or 0,
            'expense_total': expense_total or 0,
            'salary_total': salary_total or 0,
            'gross_profit': gross_profit
        }
        
        return jsonify({
            'project': project.to_dict(),
            'work_records': [r.to_dict() for r in work_records],
            'expense_stats': expense_stats,
            'salary_stats': salary_stats,
            'finance_overview': finance_overview
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects', methods=['POST'])
@login_required
@admin_required
def create_project():
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': '项目名称不能为空'}), 400

        project = Project(
            project_no=_generate_project_no(),
            name=name,
            customer_name=data.get('customer_name', ''),
            contract_no=data.get('contract_no', ''),
            project_type=data.get('project_type', ''),
            project_address=data.get('project_address', ''),
            contact_name=data.get('contact_name', ''),
            contact_phone=data.get('contact_phone', ''),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            contract_amount=float(data.get('contract_amount') or 0),
            budget_amount=float(data.get('budget_amount') or 0),
            actual_amount=float(data.get('actual_amount') or 0),
            tax_type=data.get('tax_type', 'no'),
            tax_rate=float(data.get('tax_rate') or 3) / 100,
            tax_amount=float(data.get('tax_amount') or 0),
            status=data.get('status', 'pending'),
            manager=data.get('manager', ''),
            description=data.get('description', ''),
            remark=data.get('remark', ''),
            created_by=get_login_user_name(),
            billing_type=data.get('billing_type', 'lump_sum'),
            project_stage=data.get('project_stage', 'preparation'),
            construction_phase=data.get('construction_phase', ''),
            actual_start_date=datetime.strptime(data['actual_start_date'], '%Y-%m-%d').date() if data.get('actual_start_date') else None,
            actual_end_date=datetime.strptime(data['actual_end_date'], '%Y-%m-%d').date() if data.get('actual_end_date') else None,
            staff_names=data.get('staff_names', ''),
            receipt_amount=float(data.get('receipt_amount') or 0),
            warranty_amount=float(data.get('warranty_amount') or 0)
        )
        db.session.add(project)
        db.session.commit()
        return jsonify(project.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>', methods=['PUT'])
@login_required
@admin_required
def update_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        data = request.get_json() or {}
        for field in ['name', 'customer_name', 'contract_no', 'project_type', 'project_address',
                      'contact_name', 'contact_phone', 'status', 'manager', 'description', 'remark', 'tax_type',
                      'billing_type', 'project_stage', 'construction_phase', 'staff_names']:
            if field in data:
                setattr(project, field, data[field])
        for field in ['contract_amount', 'budget_amount', 'actual_amount', 'tax_amount',
                      'receipt_amount', 'warranty_amount']:
            if field in data:
                setattr(project, field, float(data[field] or 0))
        if 'tax_rate' in data:
            project.tax_rate = float(data['tax_rate'] or 0) / 100
        if 'start_date' in data:
            project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data['start_date'] else None
        if 'end_date' in data:
            project.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data['end_date'] else None
        if 'actual_start_date' in data:
            project.actual_start_date = datetime.strptime(data['actual_start_date'], '%Y-%m-%d').date() if data['actual_start_date'] else None
        if 'actual_end_date' in data:
            project.actual_end_date = datetime.strptime(data['actual_end_date'], '%Y-%m-%d').date() if data['actual_end_date'] else None
        db.session.commit()
        return jsonify(project.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        ProjectWorkRecord.query.filter_by(project_id=project_id).delete()
        ProjectExpense.query.filter_by(project_id=project_id).delete()
        ProjectSalary.query.filter_by(project_id=project_id).delete()
        WorkRecord.query.filter_by(project_id=project_id).update({'project_id': None})
        db.session.delete(project)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/stage', methods=['PUT'])
@login_required
@admin_required
def update_project_stage(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        data = request.get_json() or {}
        if 'project_stage' in data:
            project.project_stage = data['project_stage']
        if 'construction_phase' in data:
            project.construction_phase = data.get('construction_phase', '')
        db.session.commit()
        return jsonify(project.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def _generate_project_work_record_no(work_date):
    date_str = work_date.strftime('%Y%m%d')
    count = ProjectWorkRecord.query.filter(
        func.strftime('%Y%m%d', ProjectWorkRecord.work_date) == date_str
    ).count()
    return f'XMGC{date_str}{count + 1:03d}'


@api_bp.route('/projects/<int:project_id>/records', methods=['GET'])
@login_required
def get_project_records(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '') or get_login_user_name()
        if user_role != 'admin' and user_name:
            if user_name not in (project.manager or '') and project.created_by != user_name:
                return jsonify({'error': '无权访问此项目'}), 403
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = ProjectWorkRecord.query.filter_by(project_id=project_id)
        
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(ProjectWorkRecord.work_date >= start)
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(ProjectWorkRecord.work_date <= end)
        
        query = query.order_by(ProjectWorkRecord.work_date.desc(), ProjectWorkRecord.id.desc())
        pagination = query.paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [r.to_dict() for r in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/records', methods=['POST'])
@login_required
@admin_required
def create_project_record(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        
        is_multipart = request.content_type and 'multipart/form-data' in request.content_type
        
        def get_val(key):
            if is_multipart:
                return request.form.get(key)
            data = request.get_json() or {}
            return data.get(key)
        
        work_date_str = get_val('work_date')
        if work_date_str:
            work_date = datetime.strptime(work_date_str, '%Y-%m-%d').date()
        else:
            work_date = datetime.now().date()
        
        staff_names_raw = get_val('staff_names')
        if staff_names_raw:
            if isinstance(staff_names_raw, list):
                staff_names = ','.join(staff_names_raw)
            else:
                staff_names = staff_names_raw
        else:
            staff_names = ''
        
        staff_hours_raw = get_val('staff_hours')
        staff_hours = ''
        if staff_hours_raw:
            if isinstance(staff_hours_raw, str):
                try:
                    import json
                    json.loads(staff_hours_raw)
                    staff_hours = staff_hours_raw
                except Exception:
                    staff_hours = ''
            elif isinstance(staff_hours_raw, list):
                import json
                staff_hours = json.dumps(staff_hours_raw, ensure_ascii=False)
        
        photo_paths = []
        if is_multipart:
            files = request.files.getlist('photos')
            upload_folder = current_app.config['UPLOAD_FOLDER']
            for file in files:
                if allowed_file(file):
                    filename = safe_filename(file.filename)
                    filepath = os.path.join(upload_folder, filename)
                    file.save(filepath)
                    try:
                        from PIL import Image, ImageDraw
                        img = Image.open(filepath)
                        orig_name = filename.rsplit('.', 1)[0] + '_orig.' + filename.rsplit('.', 1)[1]
                        img.save(os.path.join(upload_folder, orig_name))
                        ts = datetime.now().strftime('%Y-%m-%d %H:%M')
                        draw = ImageDraw.Draw(img)
                        img_w, img_h = img.size
                        draw.rectangle([img_w-220, img_h-35, img_w-5, img_h-5], fill=(0,0,0,128))
                        draw.text((img_w-210, img_h-28), ts, fill=(255,255,255))
                        img.save(filepath, quality=85)
                        img.thumbnail((800, 800), Image.LANCZOS)
                        thumb_name = filename.rsplit('.', 1)[0] + '_thumb.' + filename.rsplit('.', 1)[1]
                        img.save(os.path.join(upload_folder, thumb_name), quality=70, optimize=True)
                    except Exception as e:
                        print(f'No thumbnail: {e}')
                    photo_paths.append(f'/uploads/{filename}')
        
        if not photo_paths:
            photos_raw = get_val('photos')
            if photos_raw:
                if isinstance(photos_raw, list):
                    photo_paths = photos_raw
                else:
                    photo_paths = [p.strip() for p in photos_raw.split(',') if p.strip()]
        
        photos = ','.join(photo_paths) if photo_paths else ''
        
        work_content = get_val('work_content')
        if not work_content or not str(work_content).strip():
            return jsonify({'error': '施工/工作内容不能为空'}), 400
        
        record = ProjectWorkRecord(
            project_id=project_id,
            record_no=_generate_project_work_record_no(work_date),
            work_date=work_date,
            work_type=get_val('work_type') or '',
            work_content=work_content,
            customer_name=get_val('customer_name') or project.customer_name,
            work_address=get_val('work_address') or project.project_address,
            staff_names=staff_names,
            staff_hours=staff_hours,
            work_hours=float(get_val('work_hours') or 0),
            material_fee=float(get_val('material_fee') or 0),
            labor_fee=float(get_val('labor_fee') or 0),
            other_fee=float(get_val('other_fee') or 0),
            total_fee=float(get_val('total_fee') or 0),
            photos=photos,
            remark=get_val('remark') or '',
            status=get_val('status') or 'completed',
            created_by=get_login_user_name(),
            billing_type=get_val('billing_type') or project.billing_type or 'lump_sum'
        )
        db.session.add(record)
        db.session.commit()
        return jsonify(record.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/records/<int:record_id>', methods=['PUT'])
@login_required
@admin_required
def update_project_record(project_id, record_id):
    try:
        record = ProjectWorkRecord.query.filter_by(id=record_id, project_id=project_id).first_or_404()
        
        is_multipart = request.content_type and 'multipart/form-data' in request.content_type
        
        def get_val(key):
            if is_multipart:
                return request.form.get(key)
            data = request.get_json() or {}
            return data.get(key)
        
        for field in ['work_type', 'work_content', 'customer_name', 'work_address', 'remark', 'status', 'billing_type']:
            val = get_val(field)
            if val is not None:
                setattr(record, field, val)
        
        for field in ['work_hours', 'material_fee', 'labor_fee', 'other_fee', 'total_fee']:
            val = get_val(field)
            if val is not None:
                setattr(record, field, float(val or 0))
        
        if get_val('work_date') is not None:
            work_date_str = get_val('work_date')
            record.work_date = datetime.strptime(work_date_str, '%Y-%m-%d').date() if work_date_str else None
        
        if get_val('staff_names') is not None:
            staff_names_raw = get_val('staff_names')
            if isinstance(staff_names_raw, list):
                record.staff_names = ','.join(staff_names_raw)
            else:
                record.staff_names = staff_names_raw or ''
        
        if get_val('staff_hours') is not None:
            staff_hours_raw = get_val('staff_hours')
            if staff_hours_raw:
                if isinstance(staff_hours_raw, str):
                    try:
                        import json
                        json.loads(staff_hours_raw)
                        record.staff_hours = staff_hours_raw
                    except Exception:
                        record.staff_hours = ''
                elif isinstance(staff_hours_raw, list):
                    import json
                    record.staff_hours = json.dumps(staff_hours_raw, ensure_ascii=False)
            else:
                record.staff_hours = ''
        
        if is_multipart:
            keep_photos_raw = get_val('keep_photos')
            keep_photos = []
            if keep_photos_raw:
                try:
                    import json
                    keep_photos = json.loads(keep_photos_raw) if isinstance(keep_photos_raw, str) else keep_photos_raw
                except Exception:
                    keep_photos = []
            
            files = request.files.getlist('photos')
            has_new_files = files and any(f.filename for f in files)
            
            if has_new_files or keep_photos_raw is not None:
                upload_folder = current_app.config['UPLOAD_FOLDER']
                if record.photos:
                    for old_photo in record.photos.split(','):
                        old_basename = os.path.basename(old_photo)
                        if old_basename not in keep_photos:
                            old_path = os.path.join(upload_folder, old_basename)
                            if os.path.exists(old_path):
                                os.remove(old_path)
                
                photo_paths = [f'/uploads/{p}' for p in keep_photos]
                
                for file in files:
                    if allowed_file(file):
                        filename = safe_filename(file.filename)
                        filepath = os.path.join(upload_folder, filename)
                        file.save(filepath)
                        try:
                            from PIL import Image, ImageDraw
                            img = Image.open(filepath)
                            orig_name = filename.rsplit('.', 1)[0] + '_orig.' + filename.rsplit('.', 1)[1]
                            img.save(os.path.join(upload_folder, orig_name))
                            ts = datetime.now().strftime('%Y-%m-%d %H:%M')
                            draw = ImageDraw.Draw(img)
                            img_w, img_h = img.size
                            draw.rectangle([img_w-220, img_h-35, img_w-5, img_h-5], fill=(0,0,0,128))
                            draw.text((img_w-210, img_h-28), ts, fill=(255,255,255))
                            img.save(filepath, quality=85)
                            img.thumbnail((800, 800), Image.LANCZOS)
                            thumb_name = filename.rsplit('.', 1)[0] + '_thumb.' + filename.rsplit('.', 1)[1]
                            img.save(os.path.join(upload_folder, thumb_name), quality=70, optimize=True)
                        except Exception as e:
                            print(f'No thumbnail: {e}')
                        photo_paths.append(f'/uploads/{filename}')
                
                record.photos = ','.join(photo_paths) if photo_paths else ''
        else:
            if get_val('photos') is not None:
                photos_raw = get_val('photos')
                if isinstance(photos_raw, list):
                    record.photos = ','.join(photos_raw)
                else:
                    record.photos = photos_raw or ''
        
        db.session.commit()
        return jsonify(record.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/records/<int:record_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_project_record(project_id, record_id):
    try:
        record = ProjectWorkRecord.query.filter_by(id=record_id, project_id=project_id).first_or_404()
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if record.photos:
            for photo in record.photos.split(','):
                photo_path = os.path.join(upload_folder, os.path.basename(photo))
                if os.path.exists(photo_path):
                    os.remove(photo_path)
                thumb_name = 'thumb_' + os.path.basename(photo)
                thumb_path = os.path.join(upload_folder, thumb_name)
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)
        db.session.delete(record)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def _generate_project_salary_no(project_id):
    date_str = datetime.now().strftime('%Y%m')
    count = ProjectSalary.query.filter(
        func.strftime('%Y%m', ProjectSalary.created_at) == date_str,
        ProjectSalary.project_id == project_id
    ).count()
    return f'RY-GZ-{project_id}-{date_str}-{count + 1:03d}'


@api_bp.route('/projects/<int:project_id>/expenses', methods=['GET'])
@login_required
def get_project_expenses(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '') or get_login_user_name()
        if user_role != 'admin' and user_name:
            if user_name not in (project.manager or '') and project.created_by != user_name:
                return jsonify({'error': '无权访问此项目'}), 403
        expense_type = request.args.get('expense_type')
        keyword = request.args.get('keyword', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = ProjectExpense.query.filter_by(project_id=project_id)
        if expense_type:
            query = query.filter(ProjectExpense.expense_type == expense_type)
        if keyword:
            query = query.filter(or_(
                ProjectExpense.title.like(f'%{escape_like_keyword(keyword)}%'),
                ProjectExpense.category.like(f'%{escape_like_keyword(keyword)}%'),
                ProjectExpense.supplier.like(f'%{escape_like_keyword(keyword)}%')
            ))
        
        pagination = query.order_by(ProjectExpense.expense_date.desc(), ProjectExpense.id.desc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [e.to_dict() for e in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/expenses', methods=['POST'])
@login_required
@admin_required
def create_project_expense(project_id):
    try:
        Project.query.get_or_404(project_id)
        data = request.get_json() or {}
        title = (data.get('title') or '').strip()
        if not title:
            return jsonify({'error': '费用标题不能为空'}), 400
        
        amount = float(data.get('amount') or 0)
        if amount <= 0:
            return jsonify({'error': '支出金额必须大于0'}), 400
        
        expense = ProjectExpense(
            project_id=project_id,
            expense_type=data.get('expense_type', 'other'),
            category=data.get('category', ''),
            title=title,
            amount=amount,
            expense_date=datetime.strptime(data['expense_date'], '%Y-%m-%d').date() if data.get('expense_date') else datetime.now().date(),
            supplier=data.get('supplier', ''),
            payment_method=data.get('payment_method', 'cash'),
            receipt_photos=','.join(data.get('receipt_photos', [])),
            remark=data.get('remark', ''),
            created_by=get_login_user_name()
        )
        db.session.add(expense)
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify(expense.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/expenses/<int:expense_id>', methods=['PUT'])
@login_required
@admin_required
def update_project_expense(project_id, expense_id):
    try:
        expense = ProjectExpense.query.filter_by(id=expense_id, project_id=project_id).first_or_404()
        data = request.get_json() or {}
        for field in ['expense_type', 'category', 'title', 'supplier', 'payment_method', 'remark']:
            if field in data:
                setattr(expense, field, data[field])
        if 'amount' in data:
            expense.amount = float(data['amount'] or 0)
        if 'expense_date' in data:
            expense.expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date() if data['expense_date'] else None
        if 'receipt_photos' in data:
            expense.receipt_photos = ','.join(data.get('receipt_photos', []))
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify(expense.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_project_expense(project_id, expense_id):
    try:
        expense = ProjectExpense.query.filter_by(id=expense_id, project_id=project_id).first_or_404()
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if expense.receipt_photos:
            for photo in expense.receipt_photos.split(','):
                photo_path = os.path.join(upload_folder, os.path.basename(photo))
                if os.path.exists(photo_path):
                    os.remove(photo_path)
        db.session.delete(expense)
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/salaries', methods=['GET'])
@login_required
def get_project_salaries(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '') or get_login_user_name()
        if user_role != 'admin' and user_name:
            if user_name not in (project.manager or '') and project.created_by != user_name:
                return jsonify({'error': '无权访问此项目'}), 403
        staff_name = request.args.get('staff_name')
        status = request.args.get('status')
        keyword = request.args.get('keyword', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = ProjectSalary.query.filter_by(project_id=project_id)
        if staff_name:
            query = query.filter(ProjectSalary.staff_name == staff_name)
        if status:
            query = query.filter(ProjectSalary.status == status)
        if keyword:
            query = query.filter(or_(
                ProjectSalary.staff_name.like(f'%{escape_like_keyword(keyword)}%'),
                ProjectSalary.work_content.like(f'%{escape_like_keyword(keyword)}%'),
                ProjectSalary.salary_no.like(f'%{escape_like_keyword(keyword)}%')
            ))
        
        pagination = query.order_by(ProjectSalary.work_date.desc(), ProjectSalary.id.desc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [s.to_dict() for s in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/salaries', methods=['POST'])
@login_required
@admin_required
def create_project_salary(project_id):
    try:
        Project.query.get_or_404(project_id)
        data = request.get_json() or {}
        staff_name = (data.get('staff_name') or '').strip()
        if not staff_name:
            return jsonify({'error': '人员姓名不能为空'}), 400
        
        salary = ProjectSalary(
            project_id=project_id,
            salary_no=_generate_project_salary_no(project_id),
            staff_name=staff_name,
            staff_type=data.get('staff_type', 'temp'),
            work_date=datetime.strptime(data['work_date'], '%Y-%m-%d').date() if data.get('work_date') else datetime.now().date(),
            work_record_id=data.get('work_record_id'),
            work_content=data.get('work_content', ''),
            salary_type=data.get('salary_type', 'hourly'),
            hourly_rate=float(data.get('hourly_rate') or 0),
            work_hours=float(data.get('work_hours') or 0),
            daily_wage=float(data.get('daily_wage') or 0),
            work_days=float(data.get('work_days') or 0),
            piece_price=float(data.get('piece_price') or 0),
            piece_quantity=float(data.get('piece_quantity') or 0),
            base_amount=float(data.get('base_amount') or 0),
            subsidy=float(data.get('subsidy') or 0),
            deduction=float(data.get('deduction') or 0),
            payable_amount=float(data.get('payable_amount') or 0),
            paid_amount=float(data.get('paid_amount') or 0),
            status=data.get('status', 'unsettled'),
            payment_method=data.get('payment_method', ''),
            remark=data.get('remark', ''),
            created_by=get_login_user_name()
        )
        db.session.add(salary)
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify(salary.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/salaries/<int:salary_id>', methods=['PUT'])
@login_required
@admin_required
def update_project_salary(project_id, salary_id):
    try:
        salary = ProjectSalary.query.filter_by(id=salary_id, project_id=project_id).first_or_404()
        data = request.get_json() or {}
        for field in ['staff_name', 'staff_type', 'work_content', 'salary_type',
                      'status', 'payment_method', 'remark']:
            if field in data:
                setattr(salary, field, data[field])
        for field in ['hourly_rate', 'work_hours', 'daily_wage', 'work_days',
                      'piece_price', 'piece_quantity', 'base_amount', 'subsidy',
                      'deduction', 'payable_amount', 'paid_amount']:
            if field in data:
                setattr(salary, field, float(data[field] or 0))
        if 'work_date' in data:
            salary.work_date = datetime.strptime(data['work_date'], '%Y-%m-%d').date() if data['work_date'] else None
        if 'work_record_id' in data:
            salary.work_record_id = data.get('work_record_id')
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify(salary.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>/salaries/<int:salary_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_project_salary(project_id, salary_id):
    try:
        salary = ProjectSalary.query.filter_by(id=salary_id, project_id=project_id).first_or_404()
        db.session.delete(salary)
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ===================== 物料库存管理 =====================

def _generate_material_no():
    count = Material.query.count()
    return f'RY-WL-{count + 1:05d}'


@api_bp.route('/materials', methods=['GET'])
@login_required
def get_materials():
    try:
        category = request.args.get('category')
        keyword = request.args.get('keyword', '')
        low_stock_only = request.args.get('low_stock_only', 'false') == 'true'
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Material.query
        if category:
            query = query.filter(Material.category == category)
        if keyword:
            query = query.filter(or_(
                Material.name.like(f'%{escape_like_keyword(keyword)}%'),
                Material.material_no.like(f'%{escape_like_keyword(keyword)}%'),
                Material.brand.like(f'%{escape_like_keyword(keyword)}%'),
                Material.model.like(f'%{escape_like_keyword(keyword)}%')
            ))
        if low_stock_only:
            query = query.filter(Material.stock <= Material.min_stock, Material.min_stock > 0)

        pagination = query.order_by(Material.updated_at.desc()).paginate(page=page, per_page=per_page)
        categories = db.session.query(Material.category).distinct().all()
        is_admin = g.current_user.get('role') == 'admin'
        records = []
        for m in pagination.items:
            d = m.to_dict()
            if not is_admin:
                d['unit_price'] = None
                d['supplier'] = ''
            records.append(d)
        return jsonify({
            'records': records,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'categories': [c[0] for c in categories if c[0]]
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/materials/<int:material_id>', methods=['GET'])
@login_required
def get_material(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        logs = MaterialStockLog.query.filter_by(material_id=material_id).order_by(MaterialStockLog.created_at.desc()).limit(20).all()
        is_admin = g.current_user.get('role') == 'admin'
        mat_dict = material.to_dict()
        log_list = []
        for l in logs:
            d = l.to_dict()
            d['material_name'] = material.name
            log_list.append(d)
        if not is_admin:
            mat_dict['unit_price'] = None
            mat_dict['supplier'] = ''
            log_list = []
        return jsonify({
            'material': mat_dict,
            'stock_logs': log_list
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/materials', methods=['POST'])
@login_required
@admin_required
def create_material():
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': '物料名称不能为空'}), 400

        material = Material(
            material_no=_generate_material_no(),
            name=name,
            category=data.get('category', ''),
            brand=data.get('brand', ''),
            model=data.get('model', ''),
            spec=data.get('spec', ''),
            unit=data.get('unit', '个'),
            unit_price=float(data.get('unit_price') or 0),
            stock=float(data.get('stock') or 0),
            min_stock=float(data.get('min_stock') or 0),
            max_stock=float(data.get('max_stock') or 0),
            location=data.get('location', ''),
            supplier=data.get('supplier', ''),
            remark=data.get('remark', '')
        )
        db.session.add(material)
        db.session.commit()
        return jsonify(material.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/materials/<int:material_id>', methods=['PUT'])
@login_required
@admin_required
def update_material(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        data = request.get_json() or {}
        for field in ['name', 'category', 'brand', 'model', 'spec', 'unit', 'location', 'supplier', 'remark']:
            if field in data:
                setattr(material, field, data[field])
        for field in ['unit_price', 'stock', 'min_stock', 'max_stock']:
            if field in data:
                setattr(material, field, float(data[field] or 0))
        db.session.commit()
        return jsonify(material.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/materials/<int:material_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_material(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        equip_count = RepairEquipment.query.filter_by(material_id=material_id).count()
        stock_log_count = MaterialStockLog.query.filter_by(material_id=material_id).count()
        if equip_count > 0 or stock_log_count > 0:
            refs = []
            if equip_count > 0: refs.append(f'{equip_count}条设备使用记录')
            if stock_log_count > 0: refs.append(f'{stock_log_count}条库存流水')
            return jsonify({'error': f'该物料存在关联数据({", ".join(refs)})，无法删除'}), 400
        db.session.delete(material)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/materials/<int:material_id>/stock', methods=['POST'])
@login_required
@admin_required
def update_material_stock(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        data = request.get_json() or {}
        log_type = data.get('log_type', 'in')
        quantity = float(data.get('quantity') or 0)
        if quantity <= 0:
            return jsonify({'error': '数量必须大于0'}), 400

        stock_before = material.stock or 0
        if log_type == 'in':
            stock_after = stock_before + quantity
        elif log_type == 'out':
            stock_after = stock_before - quantity
            if stock_after < 0:
                return jsonify({'error': '库存不足'}), 400
        elif log_type == 'adjust':
            stock_after = quantity
        else:
            return jsonify({'error': '不支持的操作类型'}), 400

        unit_price = float(data.get('unit_price') or material.unit_price or 0)
        total_price = round(unit_price * quantity, 2)

        log = MaterialStockLog(
            material_id=material_id,
            log_type=log_type,
            quantity=quantity,
            stock_before=stock_before,
            stock_after=stock_after,
            unit_price=unit_price,
            total_price=total_price,
            related_type=data.get('related_type', ''),
            related_id=data.get('related_id'),
            related_no=data.get('related_no', ''),
            operator=get_login_user_name(),
            remark=data.get('remark', '')
        )
        db.session.add(log)
        material.stock = stock_after
        if log_type == 'in' and unit_price > 0:
            material.unit_price = unit_price
        
        # 入库时自动生成支出记录
        auto_create_expense = data.get('auto_create_expense', False)
        if log_type == 'in' and auto_create_expense and total_price > 0:
            expense = Expense(
                expense_type='purchase',
                category='物料采购',
                title=f'采购：{material.name}',
                amount=total_price,
                expense_date=datetime.now().date(),
                related_type='stock_log',
                related_id=log.id,
                related_no=data.get('related_no', ''),
                supplier=data.get('supplier', ''),
                payment_method=data.get('payment_method', 'cash'),
                remark=f'入库数量：{quantity}，单价：{unit_price}' + (f'，{data.get("remark", "")}' if data.get('remark') else ''),
                created_by=get_login_user_name()
            )
            db.session.add(expense)
        
        db.session.commit()

        return jsonify({
            'material': material.to_dict(),
            'log': log.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/materials/stock-logs', methods=['GET'])
@login_required
@admin_required
def get_stock_logs():
    try:
        material_id = request.args.get('material_id', type=int)
        log_type = request.args.get('log_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int) or request.args.get('page_size', 20, type=int)

        query = MaterialStockLog.query
        if material_id:
            query = query.filter(MaterialStockLog.material_id == material_id)
        if log_type:
            query = query.filter(MaterialStockLog.log_type == log_type)
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(MaterialStockLog.created_at >= start)
            except: pass
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(MaterialStockLog.created_at < end)
            except: pass

        pagination = query.order_by(MaterialStockLog.created_at.desc()).paginate(page=page, per_page=per_page)
        material_map = {}
        materials = Material.query.filter(Material.id.in_([l.material_id for l in pagination.items])).all()
        for m in materials:
            material_map[m.id] = m.name
        records = []
        for l in pagination.items:
            d = l.to_dict()
            d['material_name'] = material_map.get(l.material_id, '')
            records.append(d)
        return jsonify({
            'records': records,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


# ===================== 客户设备档案 =====================

@api_bp.route('/customer-equipments', methods=['GET'])
@login_required
def get_customer_equipments():
    try:
        customer_name = request.args.get('customer_name')
        equipment_type = request.args.get('equipment_type')
        system_type = request.args.get('system_type')
        status = request.args.get('status')
        warranty_only = request.args.get('warranty_only', 'false') == 'true'
        due_maintenance_only = request.args.get('due_maintenance_only', 'false') == 'true'
        keyword = request.args.get('keyword', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = CustomerEquipment.query
        if customer_name:
            query = query.filter(CustomerEquipment.customer_name.like(f'%{escape_like_keyword(customer_name)}%'))
        if equipment_type:
            query = query.filter(CustomerEquipment.equipment_type == equipment_type)
        if system_type:
            query = query.filter(CustomerEquipment.system_type == system_type)
        if status:
            query = query.filter(CustomerEquipment.status == status)
        if keyword:
            query = query.filter(or_(
                CustomerEquipment.brand.like(f'%{escape_like_keyword(keyword)}%'),
                CustomerEquipment.model.like(f'%{escape_like_keyword(keyword)}%'),
                CustomerEquipment.serial_no.like(f'%{escape_like_keyword(keyword)}%')
            ))

        pagination = query.order_by(CustomerEquipment.created_at.desc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [e.to_dict() for e in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/customer-equipments/<int:equip_id>', methods=['GET'])
@login_required
def get_customer_equipment(equip_id):
    try:
        equip = CustomerEquipment.query.get_or_404(equip_id)
        return jsonify(equip.to_dict())
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/customer-equipments', methods=['POST'])
@login_required
@admin_required
def create_customer_equipment():
    try:
        data = request.get_json() or {}
        customer_name = (data.get('customer_name') or '').strip()
        if not customer_name:
            return jsonify({'error': '客户名称不能为空'}), 400

        equip = CustomerEquipment(
            customer_name=customer_name,
            equipment_type=data.get('equipment_type', ''),
            system_type=data.get('system_type', ''),
            brand=data.get('brand', ''),
            model=data.get('model', ''),
            serial_no=data.get('serial_no', ''),
            quantity=int(data.get('quantity') or 1),
            install_date=datetime.strptime(data['install_date'], '%Y-%m-%d').date() if data.get('install_date') else None,
            warranty_start=datetime.strptime(data['warranty_start'], '%Y-%m-%d').date() if data.get('warranty_start') else None,
            warranty_end=datetime.strptime(data['warranty_end'], '%Y-%m-%d').date() if data.get('warranty_end') else None,
            location=data.get('location', ''),
            contact_name=data.get('contact_name', ''),
            contact_phone=data.get('contact_phone', ''),
            status=data.get('status', 'normal'),
            maintenance_cycle=int(data.get('maintenance_cycle') or 0),
            last_maintenance=datetime.strptime(data['last_maintenance'], '%Y-%m-%d').date() if data.get('last_maintenance') else None,
            next_maintenance=datetime.strptime(data['next_maintenance'], '%Y-%m-%d').date() if data.get('next_maintenance') else None,
            remark=data.get('remark', '')
        )
        db.session.add(equip)
        db.session.commit()
        return jsonify(equip.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/customer-equipments/<int:equip_id>', methods=['PUT'])
@login_required
@admin_required
def update_customer_equipment(equip_id):
    try:
        equip = CustomerEquipment.query.get_or_404(equip_id)
        data = request.get_json() or {}
        for field in ['customer_name', 'equipment_type', 'system_type', 'brand', 'model',
                      'serial_no', 'location', 'contact_name', 'contact_phone', 'status', 'remark']:
            if field in data:
                setattr(equip, field, data[field])
        if 'quantity' in data:
            equip.quantity = int(data['quantity'] or 1)
        if 'maintenance_cycle' in data:
            equip.maintenance_cycle = int(data['maintenance_cycle'] or 0)
        for date_field in ['install_date', 'warranty_start', 'warranty_end', 'last_maintenance', 'next_maintenance']:
            if date_field in data:
                val = data[date_field]
                setattr(equip, date_field, datetime.strptime(val, '%Y-%m-%d').date() if val else None)
        db.session.commit()
        return jsonify(equip.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/customer-equipments/<int:equip_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_customer_equipment(equip_id):
    try:
        equip = CustomerEquipment.query.get_or_404(equip_id)
        plan_count = MaintenancePlan.query.filter_by(equipment_id=equip_id).count()
        if plan_count > 0:
            return jsonify({'error': f'该设备关联了{plan_count}条巡检计划，请先删除巡检计划'}), 400
        db.session.delete(equip)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ===================== 巡检/维护计划 =====================

def _calculate_next_date(start_date, cycle_type, cycle_value):
    if cycle_type == 'day':
        return start_date + timedelta(days=cycle_value)
    elif cycle_type == 'week':
        return start_date + timedelta(weeks=cycle_value)
    elif cycle_type == 'month':
        month = start_date.month - 1 + cycle_value
        year = start_date.year + month // 12
        month = month % 12 + 1
        day = min(start_date.day, [31,29 if year%4==0 and (year%100!=0 or year%400==0) else 28,31,30,31,30,31,31,30,31,30,31][month-1])
        return start_date.replace(year=year, month=month, day=day)
    elif cycle_type == 'quarter':
        return _calculate_next_date(start_date, 'month', cycle_value * 3)
    elif cycle_type == 'year':
        return _calculate_next_date(start_date, 'month', cycle_value * 12)
    return start_date


@api_bp.route('/maintenance-plans', methods=['GET'])
@login_required
def get_maintenance_plans():
    try:
        status = request.args.get('status')
        customer_name = request.args.get('customer_name')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = MaintenancePlan.query
        if status:
            query = query.filter(MaintenancePlan.status == status)
        if customer_name:
            query = query.filter(MaintenancePlan.customer_name.like(f'%{escape_like_keyword(customer_name)}%'))

        pagination = query.order_by(MaintenancePlan.next_date.asc().nullslast()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/maintenance-plans/<int:plan_id>', methods=['GET'])
@login_required
def get_maintenance_plan(plan_id):
    try:
        plan = MaintenancePlan.query.get_or_404(plan_id)
        return jsonify(plan.to_dict())
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/maintenance-plans', methods=['POST'])
@login_required
@admin_required
def create_maintenance_plan():
    try:
        data = request.get_json() or {}
        plan_name = (data.get('plan_name') or '').strip()
        if not plan_name:
            return jsonify({'error': '计划名称不能为空'}), 400

        start_date_str = data.get('start_date')
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else datetime.now().date()

        cycle_type = data.get('cycle_type', 'month')
        cycle_value = int(data.get('cycle_value') or 1)
        next_date = _calculate_next_date(start_date, cycle_type, cycle_value)

        plan = MaintenancePlan(
            plan_name=plan_name,
            plan_type=data.get('plan_type', 'periodic'),
            customer_name=data.get('customer_name', ''),
            equipment_id=data.get('equipment_id'),
            system_type=data.get('system_type', ''),
            cycle_type=cycle_type,
            cycle_value=cycle_value,
            start_date=start_date,
            next_date=next_date,
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            staff_name=data.get('staff_name', ''),
            work_content=data.get('work_content', ''),
            priority=data.get('priority', 'normal'),
            status=data.get('status', 'active'),
            created_by=get_login_user_name(),
            remark=data.get('remark', '')
        )
        db.session.add(plan)
        db.session.commit()
        return jsonify(plan.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/maintenance-plans/<int:plan_id>', methods=['PUT'])
@login_required
@admin_required
def update_maintenance_plan(plan_id):
    try:
        plan = MaintenancePlan.query.get_or_404(plan_id)
        data = request.get_json() or {}
        for field in ['plan_name', 'plan_type', 'customer_name', 'system_type', 'cycle_type',
                      'staff_name', 'work_content', 'priority', 'status', 'remark']:
            if field in data:
                setattr(plan, field, data[field])
        if 'equipment_id' in data:
            plan.equipment_id = data['equipment_id']
        if 'cycle_value' in data:
            plan.cycle_value = int(data['cycle_value'] or 1)
        if 'start_date' in data and data['start_date']:
            plan.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if 'end_date' in data:
            plan.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data['end_date'] else None
        if 'cycle_type' in data or 'cycle_value' in data or 'start_date' in data:
            plan.next_date = _calculate_next_date(plan.start_date, plan.cycle_type, plan.cycle_value)
        db.session.commit()
        return jsonify(plan.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/maintenance-plans/<int:plan_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_maintenance_plan(plan_id):
    try:
        plan = MaintenancePlan.query.get_or_404(plan_id)
        PendingWork.query.filter(
            PendingWork.todo_type == '巡检维护',
            PendingWork.work_content.like(f'%{plan.plan_name}%'),
            PendingWork.customer_name == plan.customer_name,
            PendingWork.status == 'pending'
        ).update({'related_record_id': None, 'related_record_type': None}, synchronize_session=False)
        db.session.delete(plan)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/maintenance-plans/generate-todos', methods=['POST'])
@login_required
@admin_required
def generate_maintenance_todos():
    try:
        today = datetime.now().date()
        plans = MaintenancePlan.query.filter(
            MaintenancePlan.status == 'active',
            MaintenancePlan.next_date <= today
        ).all()

        count = 0
        for plan in plans:
            if plan.end_date and plan.start_date > plan.end_date:
                plan.status = 'completed'
                continue

            pending = PendingWork(
                title=f'巡检维护：{plan.plan_name}',
                customer_name=plan.customer_name,
                work_address='',
                staff_name=plan.staff_name,
                todo_type='巡检维护',
                priority=plan.priority or 'normal',
                work_content=plan.work_content or '',
                reminder_date=datetime.combine(plan.next_date or today, datetime.min.time()),
                related_record_type='maintenance',
                related_record_id=plan.id
            )
            db.session.add(pending)

            plan.last_generated = plan.next_date
            plan.total_count = (plan.total_count or 0) + 1
            plan.next_date = _calculate_next_date(plan.next_date or today, plan.cycle_type, plan.cycle_value)

            if plan.end_date and plan.next_date > plan.end_date:
                plan.status = 'completed'

            count += 1

        db.session.commit()
        return jsonify({'message': f'已生成 {count} 条待办', 'count': count})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ===================== 增强统计报表 =====================

@api_bp.route('/statistics/advanced', methods=['GET'])
@login_required
def get_advanced_statistics():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        group_by = request.args.get('group_by', 'month')  # day/week/month/customer/staff/type

        start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.now() - timedelta(days=90)
        end = datetime.strptime(end_date, '%Y-%m-%d') if end_date else datetime.now()
        end = end + timedelta(days=1)

        base_filter = [WorkRecord.work_date >= start, WorkRecord.work_date < end]
        user_role = g.current_user.get('role', 'worker')
        user_staff_name = g.current_user.get('staff_name', '')
        if user_role == 'worker':
            base_filter.append(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff_name}%'),
                    WorkRecord.staff_name == user_staff_name,
                    WorkRecord.created_by == user_staff_name
                )
            )

        totals = db.session.query(
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee),
            func.sum(WorkRecord.labor_fee),
            func.sum(WorkRecord.material_fee),
            func.sum(WorkRecord.transport_fee),
            func.sum(WorkRecord.other_fee),
            func.sum(WorkRecord.tax_amount),
            func.sum(WorkRecord.paid_amount)
        ).filter(*base_filter).first()

        type_stats = db.session.query(
            WorkRecord.record_type,
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee)
        ).filter(*base_filter).group_by(WorkRecord.record_type).all()

        status_stats = db.session.query(
            WorkRecord.status,
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee)
        ).filter(*base_filter).group_by(WorkRecord.status).all()

        payment_stats = db.session.query(
            WorkRecord.payment_status,
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)
        ).filter(*base_filter).group_by(WorkRecord.payment_status).all()

        customer_stats = db.session.query(
            WorkRecord.customer_name,
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee)
        ).filter(*base_filter).group_by(WorkRecord.customer_name).order_by(func.sum(WorkRecord.total_fee).desc()).limit(10).all()

        staff_stats = db.session.query(
            WorkRecord.staff_name,
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee)
        ).filter(*base_filter).group_by(WorkRecord.staff_name).order_by(func.sum(WorkRecord.total_fee).desc()).limit(10).all()

        return jsonify({
            'totals': {
                'count': totals[0] or 0,
                'total_fee': float(totals[1] or 0),
                'labor_fee': float(totals[2] or 0),
                'material_fee': float(totals[3] or 0),
                'transport_fee': float(totals[4] or 0),
                'other_fee': float(totals[5] or 0),
                'tax_amount': float(totals[6] or 0),
                'paid_amount': float(totals[7] or 0),
                'unpaid_amount': float((totals[1] or 0) - (totals[7] or 0))
            },
            'by_type': [{'type': r[0], 'count': r[1], 'amount': float(r[2] or 0)} for r in type_stats],
            'by_status': [{'status': r[0], 'count': r[1], 'amount': float(r[2] or 0)} for r in status_stats],
            'by_payment': [{'payment_status': r[0], 'count': r[1], 'unpaid': float(r[2] or 0)} for r in payment_stats],
            'top_customers': [{'customer_name': r[0], 'count': r[1], 'amount': float(r[2] or 0)} for r in customer_stats if r[0]],
            'top_staff': [{'staff_name': r[0], 'count': r[1], 'amount': float(r[2] or 0)} for r in staff_stats if r[0]],
            'date_range': {'start': start.date().isoformat(), 'end': (end - timedelta(days=1)).date().isoformat()}
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/statistics/profit', methods=['GET'])
@login_required
@admin_required
def get_profit_statistics():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.now() - timedelta(days=90)
        end = datetime.strptime(end_date, '%Y-%m-%d') if end_date else datetime.now()
        end = end + timedelta(days=1)
        start_d = start.date()
        end_d = end.date()

        record_filter = [WorkRecord.work_date >= start, WorkRecord.work_date < end]
        payment_filter = [PaymentRecord.payment_date >= start_d, PaymentRecord.payment_date < end_d]
        salary_filter = [SalaryRecord.work_date >= start, SalaryRecord.work_date < end, SalaryRecord.status == 'settled']
        expense_filter = [Expense.expense_date >= start_d, Expense.expense_date < end_d]

        total_record_income = db.session.query(func.sum(WorkRecord.total_fee)).filter(*record_filter).scalar() or 0
        total_actual_payment = db.session.query(func.sum(PaymentRecord.amount)).filter(*payment_filter).scalar() or 0
        total_receivable = db.session.query(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)).filter(
            *record_filter, WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly'])
        ).scalar() or 0

        total_material_cost = db.session.query(func.sum(WorkRecord.material_fee)).filter(*record_filter).scalar() or 0
        total_transport_cost = db.session.query(func.sum(WorkRecord.transport_fee)).filter(*record_filter).scalar() or 0
        total_other_cost = db.session.query(func.sum(WorkRecord.other_fee)).filter(*record_filter).scalar() or 0
        total_tax = db.session.query(func.sum(WorkRecord.tax_amount)).filter(*record_filter).scalar() or 0

        total_salary = db.session.query(func.sum(SalaryRecord.payable_amount)).filter(*salary_filter).scalar() or 0

        total_expense = db.session.query(func.sum(Expense.amount)).filter(*expense_filter).scalar() or 0
        total_expense_purchase = db.session.query(func.sum(Expense.amount)).filter(
            *expense_filter, Expense.expense_type == 'purchase'
        ).scalar() or 0

        proj_salary_total = db.session.query(func.sum(ProjectSalary.payable_amount)).filter(
            ProjectSalary.status == 'settled',
            ProjectSalary.work_date >= start_d, ProjectSalary.work_date < end_d
        ).scalar() or 0
        proj_expense_total = db.session.query(func.sum(ProjectExpense.amount)).filter(
            ProjectExpense.expense_date >= start_d, ProjectExpense.expense_date < end_d
        ).scalar() or 0
        proj_income_total = db.session.query(func.sum(Project.receipt_amount)).filter(
            Project.created_at >= start, Project.created_at < end
        ).scalar() or 0

        total_income = float(total_actual_payment) + float(proj_income_total)
        total_labor_cost = float(total_salary) + float(proj_salary_total)
        total_material_all = float(total_material_cost) + float(total_expense_purchase)
        total_expense_other = float(total_expense) - float(total_expense_purchase) + float(total_transport_cost) + float(total_other_cost) + float(proj_expense_total)

        gross_profit = total_income - total_material_all - total_tax
        net_profit = total_income - total_material_all - total_labor_cost - total_expense_other - total_tax

        return jsonify({
            'total_income': round(total_income, 2),
            'total_actual_payment': round(float(total_actual_payment), 2),
            'total_record_amount': round(float(total_record_income), 2),
            'total_receivable': round(float(total_receivable), 2),
            'total_project_income': round(float(proj_income_total), 2),
            'total_labor_cost': round(total_labor_cost, 2),
            'total_material_cost': round(total_material_all, 2),
            'total_transport_cost': round(float(total_transport_cost), 2),
            'total_other_cost': round(float(total_other_cost), 2),
            'total_tax': round(float(total_tax), 2),
            'total_salary': round(total_labor_cost, 2),
            'total_expense': round(float(total_expense) + float(proj_expense_total), 2),
            'gross_profit': round(gross_profit, 2),
            'net_profit': round(net_profit, 2),
            'gross_margin': round((gross_profit / total_income * 100), 2) if total_income > 0 else 0,
            'net_margin': round((net_profit / total_income * 100), 2) if total_income > 0 else 0,
            'date_range': {'start': start_d.isoformat(), 'end': (end_d - timedelta(days=1)).isoformat()}
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


# ===================== 站内消息通知 =====================

def _create_notification(user_name, title, content, notify_type='info', related_type='', related_id=None):
    try:
        notification = Notification(
            user_name=user_name,
            title=title,
            content=content,
            notify_type=notify_type,
            related_type=related_type,
            related_id=related_id
        )
        db.session.add(notification)
        return notification
    except Exception as e:
        print(f'创建通知失败: {e}')
        return None

def _notify_admins(title, content, notify_type='warning', related_type='', related_id=None):
    """给所有管理员发送通知"""
    try:
        admins = WorkerUser.query.filter_by(role='admin', enabled=True).all()
        for admin in admins:
            _create_notification(admin.username, title, content, notify_type, related_type, related_id)
    except Exception as e:
        print(f'通知管理员失败: {e}')

def _recalculate_project_totals(project_id):
    """重算项目实际成本（actual_amount）：工资+支出"""
    try:
        project = Project.query.get(project_id)
        if not project:
            return
        salary_total = db.session.query(func.coalesce(func.sum(ProjectSalary.payable_amount), 0)).filter(
            ProjectSalary.project_id == project_id,
            ProjectSalary.status == 'settled'
        ).scalar() or 0
        expense_total = db.session.query(func.coalesce(func.sum(ProjectExpense.amount), 0)).filter(
            ProjectExpense.project_id == project_id
        ).scalar() or 0
        project.actual_amount = round(float(salary_total) + float(expense_total), 2)
    except Exception as e:
        print(f'重算项目汇总失败: {e}')

def _auto_generate_inspection_todos():
    """轻量级自动巡检：每24小时最多执行一次，在访问待办列表时触发"""
    try:
        last_run_key = 'last_auto_inspection_run'
        last_run = SystemSetting.query.filter_by(key=last_run_key).first()
        today_str = date.today().isoformat()
        if last_run and last_run.value == today_str:
            return 0
        if not last_run:
            last_run = SystemSetting(key=last_run_key, value=today_str)
            db.session.add(last_run)
        else:
            last_run.value = today_str
        today = date.today()
        plans = MaintenancePlan.query.filter(
            MaintenancePlan.status == 'active',
            MaintenancePlan.next_date <= today
        ).all()
        count = 0
        for plan in plans:
            if plan.end_date and plan.start_date and plan.start_date > plan.end_date:
                plan.status = 'completed'
                continue
            pending = PendingWork(
                title=f'巡检维护：{plan.plan_name}',
                customer_name=plan.customer_name or '',
                work_address='',
                staff_name=plan.staff_name or '',
                todo_type='巡检维护',
                priority=plan.priority or 'normal',
                work_content=plan.work_content or '',
                reminder_date=datetime.combine(plan.next_date or today, datetime.min.time()),
                related_record_type='maintenance',
                related_record_id=plan.id
            )
            db.session.add(pending)
            plan.last_generated = plan.next_date
            plan.total_count = (plan.total_count or 0) + 1
            plan.next_date = _calculate_next_date(plan.next_date or today, plan.cycle_type, plan.cycle_value)
            if plan.end_date and plan.next_date > plan.end_date:
                plan.status = 'completed'
            if plan.staff_name:
                for sn in [s.strip() for s in plan.staff_name.split(',') if s.strip()]:
                    su = WorkerUser.query.filter_by(staff_name=sn, enabled=True).first()
                    if su:
                        _create_notification(su.username, f'巡检任务: {plan.plan_name}',
                            f'{plan.customer_name}的巡检任务已生成，请在{today_str}完成', 'info', 'pending_work', None)
            count += 1
        if count > 0:
            _notify_admins('🔔 自动生成巡检待办', f'系统自动生成了{count}条到期巡检任务', 'info', 'pending_work', None)
        return count
    except Exception as e:
        print(f'自动巡检生成失败: {e}')
        return 0


@api_bp.route('/notifications', methods=['GET'])
@login_required
def get_notifications():
    try:
        user_name = get_login_user_name()
        is_read = request.args.get('is_read', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Notification.query.filter(
            db.or_(Notification.user_name == user_name, Notification.user_name == '')
        )

        if is_read == '0':
            query = query.filter_by(is_read=False)
        elif is_read == '1':
            query = query.filter_by(is_read=True)

        pagination = query.order_by(Notification.created_at.desc()).paginate(page=page, per_page=per_page)

        return jsonify({
            'records': [n.to_dict() for n in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/notifications/unread-count', methods=['GET'])
@login_required
def get_unread_count():
    try:
        user_name = get_login_user_name()
        count = Notification.query.filter(
            db.or_(Notification.user_name == user_name, Notification.user_name == ''),
            Notification.is_read == False
        ).count()
        return jsonify({'unread_count': count})
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


@api_bp.route('/notifications/<int:notify_id>/read', methods=['POST'])
@login_required
def mark_notification_read(notify_id):
    try:
        user_name = get_login_user_name()
        notification = Notification.query.get(notify_id)
        if not notification:
            return jsonify({'error': '通知不存在'}), 404

        if notification.user_name and notification.user_name != user_name:
            return jsonify({'error': '无权限操作'}), 403

        notification.is_read = True
        notification.read_at = datetime.now()
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/notifications/read-all', methods=['POST'])
@login_required
def mark_all_read():
    try:
        user_name = get_login_user_name()
        Notification.query.filter(
            db.or_(Notification.user_name == user_name, Notification.user_name == ''),
            Notification.is_read == False
        ).update({
            'is_read': True,
            'read_at': datetime.now()
        }, synchronize_session=False)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/notifications/<int:notify_id>', methods=['DELETE'])
@login_required
def delete_notification(notify_id):
    try:
        user_name = get_login_user_name()
        notification = Notification.query.get(notify_id)
        if not notification:
            return jsonify({'error': '通知不存在'}), 404

        if notification.user_name and notification.user_name != user_name:
            return jsonify({'error': '无权限操作'}), 403

        db.session.delete(notification)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/notifications/clear-read', methods=['POST'])
@login_required
def clear_read_notifications():
    try:
        user_name = get_login_user_name()
        Notification.query.filter(
            db.or_(Notification.user_name == user_name, Notification.user_name == ''),
            Notification.is_read == True
        ).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/notifications/create', methods=['POST'])
@login_required
@admin_required
def create_notification():
    try:
        data = request.get_json() or {}
        title = data.get('title', '')
        content = data.get('content', '')
        user_name = data.get('user_name', '')
        notify_type = data.get('notify_type', 'info')
        related_type = data.get('related_type', '')
        related_id = data.get('related_id')

        if not title:
            return jsonify({'error': '标题不能为空'}), 400

        if user_name:
            notification = _create_notification(user_name, title, content, notify_type, related_type, related_id)
        else:
            notification = _create_notification('', title, content, notify_type, related_type, related_id)

        if notification:
            return jsonify(notification.to_dict()), 201
        else:
            return jsonify({'error': '创建失败'}), 500
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        return jsonify({'error': str(e)}), 500


_indexes_initialized = False

@api_bp.before_app_request
def _init_indexes_on_first_request():
    global _indexes_initialized
    if not _indexes_initialized:
        _indexes_initialized = True
        try:
            _ensure_indexes()
        except Exception:
            pass
