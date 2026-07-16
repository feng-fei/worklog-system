from flask import request, jsonify, current_app, Blueprint, send_from_directory, g
from . import db
from .models import WorkRecord, PendingWork, Staff, Customer, WorkerUser, SystemSetting, SalaryRecord, OperationLog, PaymentRecord, WorkTemplate, Project, Material, MaterialStockLog, CustomerEquipment, MaintenancePlan, Notification, Expense, ExpenseCategory, RepairEquipment
from .auth import login_required, admin_required, create_token, get_login_user_name
from datetime import datetime, timedelta
from sqlalchemy import func, or_
import json
import os
import uuid
import re

api_bp = Blueprint('api', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_filename(original_name):
    """生成安全的文件名"""
    ext = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else 'jpg'
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    short_id = str(uuid.uuid4())[:8]
    return f'{ts}_{short_id}.{ext}'


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
        staffs = Staff.query.all()
        return jsonify([s.to_dict() for s in staffs])
    except Exception as e:
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
            hire_date=data.get('hire_date', ''),
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
        if 'daily_wage' in data: staff.daily_wage = float(data['daily_wage'])
        if 'monthly_salary' in data: staff.monthly_salary = float(data['monthly_salary'])
        if 'project' in data: staff.project = data['project']
        if 'position' in data: staff.position = data['position']
        if 'id_card' in data: staff.id_card = data['id_card']
        if 'hire_date' in data: staff.hire_date = data['hire_date']
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
        db.session.delete(staff)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/staffs/<int:staff_id>/id_photo', methods=['POST'])
@admin_required
def upload_id_photo(staff_id):
    try:
        staff = Staff.query.get_or_404(staff_id)
        file = request.files.get('id_photo')
        if not file or not allowed_file(file.filename):
            return jsonify({'error': '请上传有效的图片文件'}), 400
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
        if not file or not allowed_file(file.filename):
            return jsonify({'error': '请上传有效的图片文件'}), 400
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
    """施工/维修保存后，根据临时工明细同步工资记录。"""
    SalaryRecord.query.filter_by(business_record_id=record.id).delete()
    try:
        details = json.loads(record.temp_staff_details or '[]')
    except Exception:
        details = []
    for item in details:
        name = (item.get('name') or '').strip()
        if not name:
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
            status='unsettled'
        )
        db.session.add(salary)

def _sync_equipment_details(record, equipment_details_json):
    """工单保存后，同步设备明细、物料库存、客户设备档案"""
    try:
        equipments = json.loads(equipment_details_json or '[]')
    except Exception:
        equipments = []
    
    if not equipments:
        RepairEquipment.query.filter_by(work_record_id=record.id).delete()
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
    
    record.material_fee = equipment_fee_total
    record.total_fee = (record.labor_fee or 0) + equipment_fee_total + (record.transport_fee or 0) + (record.other_fee or 0)
    if record.tax_type == 'tax':
        record.tax_amount = round(record.total_fee * (record.tax_rate or 0), 2)
        record.total_fee += record.tax_amount

def _adjust_material_stock(eq, old_qty, new_qty, record):
    """根据设备明细调整物料库存"""
    try:
        material_id = getattr(eq, 'material_id', None)
        if not material_id:
            mat = Material.query.filter(
                db.or_(
                    Material.name == eq.device_name,
                    Material.model == eq.device_model
                )
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
        if stock_after < 0:
            stock_after = 0
        
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
        repair_method = eq.repair_method or ''
        if '新增' not in repair_method and action != 'delete':
            return
        
        customer_name = record.customer_name
        if not customer_name:
            return
        
        if action == 'delete':
            CustomerEquipment.query.filter_by(
                customer_name=customer_name,
                equipment_type=eq.device_name or '',
                brand=eq.device_brand or '',
                model=eq.device_model or ''
            ).delete(synchronize_session=False)
            return
        
        existing = CustomerEquipment.query.filter_by(
            customer_name=customer_name,
            equipment_type=eq.device_name or '',
            brand=eq.device_brand or '',
            model=eq.device_model or ''
        ).first()
        
        if existing:
            existing.quantity = (existing.quantity or 0) + (eq.quantity or 0)
            existing.location = eq.location or existing.location
            if eq.remark:
                existing.remark = (existing.remark or '') + f'\n工单{record.order_no or ""}: {eq.remark}'
        else:
            from datetime import date as date_type
            work_date = record.work_date.date() if hasattr(record.work_date, 'date') else record.work_date
            ce = CustomerEquipment(
                customer_name=customer_name,
                equipment_type=eq.device_name or '',
                system_type=eq.system_type or '',
                brand=eq.device_brand or '',
                model=eq.device_model or '',
                quantity=eq.quantity or 1,
                install_date=work_date,
                location=eq.location or record.work_address or '',
                contact_name=record.contact_name or '',
                contact_phone=record.customer_phone or '',
                status='normal',
                remark=f'来自工单{record.order_no or ""}\n{eq.remark or ""}'
            )
            db.session.add(ce)
    except Exception as e:
        print(f'[客户设备档案] 同步失败: {e}', flush=True)

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

        # 权限过滤: 员工只能看自己参与的工作记录
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
            query = query.filter(WorkRecord.customer_name.like(f'%{customer_name}%'))
        if staff_name:
            query = query.filter(
                db.or_(
                    WorkRecord.staff_name == staff_name,
                    WorkRecord.staff_names.like(f'%{staff_name}%')
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
        return jsonify({'error': str(e)}), 500

@api_bp.route('/records', methods=['POST'])
@login_required
def create_record():
    try:
        customer_name = request.form.get('customer_name')
        if not customer_name:
            return jsonify({'error': '客户名称不能为空'}), 400

        photo_paths = []
        files = request.files.getlist('photos')
        upload_folder = current_app.config['UPLOAD_FOLDER']
        for file in files:
            if file and allowed_file(file.filename):
                filename = safe_filename(file.filename)
                filepath = os.path.join(upload_folder, filename)
                file.save(filepath)
                # 生成缩略图 + 水印图 + 保留原图
                try:
                    from PIL import Image, ImageDraw, ImageFont
                    img = Image.open(filepath)
                    # 保留原图
                    orig_name = filename.rsplit('.', 1)[0] + '_orig.' + filename.rsplit('.', 1)[1]
                    img.save(os.path.join(upload_folder, orig_name))
                    # 水印：时间戳 + 工单号（先放占位，create 后更新）
                    ts = datetime.now().strftime('%Y-%m-%d %H:%M')
                    draw = ImageDraw.Draw(img)
                    # 简化水印用文字（右下角）
                    wm_text = f'{ts}'
                    # 用默认字体打水印
                    try:
                        img_w, img_h = img.size
                        draw.rectangle([img_w-220, img_h-35, img_w-5, img_h-5], fill=(0,0,0,128))
                        draw.text((img_w-210, img_h-28), wm_text, fill=(255,255,255))
                    except: pass
                    img.save(filepath, quality=85)
                    # 缩略图
                    img.thumbnail((800, 800), Image.LANCZOS)
                    thumb_name = filename.rsplit('.', 1)[0] + '_thumb.' + filename.rsplit('.', 1)[1]
                    img.save(os.path.join(upload_folder, thumb_name), quality=70, optimize=True)
                except Exception as e:
                    print(f'No thumbnail: {e}')
                photo_paths.append(f'/uploads/{filename}')

        work_date_str = request.form.get('work_date')
        work_date = datetime.strptime(work_date_str, '%Y-%m-%d') if work_date_str else datetime.now()

        record_type = request.form.get('record_type', 'construction')

        def get_float(key):
            v = request.form.get(key, '0')
            try:
                return float(v) if v else 0.0
            except:
                return 0.0

        labor = get_float('labor_fee')
        material = get_float('material_fee')
        transport = get_float('transport_fee')
        other = get_float('other_fee')

        repair_result = request.form.get('repair_result', 'completed') if record_type == 'repair' else 'completed'
        incomplete_reason_type = request.form.get('incomplete_reason_type', '') if repair_result == 'pending' else ''
        incomplete_reason = request.form.get('incomplete_reason', '') if repair_result == 'pending' else ''
        if record_type == 'repair' and repair_result == 'pending' and not incomplete_reason.strip():
            return jsonify({'error': '未维修完成时必须填写原因说明'}), 400

        record = WorkRecord(
            customer_name=customer_name,
            contact_name=request.form.get('contact_name', ''),
            customer_phone=request.form.get('customer_phone', ''),
            work_address=request.form.get('work_address', ''),
            staff_name=request.form.get('staff_name', ''),
            staff_names=request.form.get('staff_names', ''),
            temp_staff_details=request.form.get('temp_staff_details', ''),
            status=request.form.get('status', 'pending' if record_type == 'construction' else 'dispatched'),
            record_type=record_type,
            work_content=request.form.get('work_content', ''),
            fault_description=request.form.get('fault_description', ''),
            fault_diagnosis=request.form.get('fault_diagnosis', ''),
            repair_process=request.form.get('repair_process', ''),
            repair_result=repair_result,
            incomplete_reason_type=incomplete_reason_type,
            incomplete_reason=incomplete_reason,
            work_date=work_date,
            start_time=request.form.get('start_time', ''),
            end_time=request.form.get('end_time', ''),
            work_hours=float(request.form.get('work_hours', 0) or 0),
            labor_fee=labor,
            material_fee=material,
            transport_fee=transport,
            other_fee=other,
            total_fee=labor + material + transport + other,
            payment_status=request.form.get('payment_status', 'unpaid'),
            paid_amount=get_float('paid_amount'),
            work_subtype=request.form.get('work_subtype', ''),
            priority=request.form.get('priority', 'normal'),
            tax_type=request.form.get('tax_type', 'no'),
            tax_rate=float(request.form.get('tax_rate', 0.03) or 0.03),
            tax_amount=0,
            remark=request.form.get('remark', ''),
            work_photos=','.join(photo_paths) if photo_paths else None,
            is_completed=True,
            created_by=get_login_user_name()
        )
        # 计算税费
        if record.tax_type == 'tax':
            record.tax_amount = round((labor + material + transport + other) * record.tax_rate, 2)
            record.total_fee += record.tax_amount
        # 生成施工/维修编号
        record.order_no = _generate_record_no(record_type, work_date)
        db.session.add(record)
        db.session.flush()
        _sync_salary_records_for_work(record)
        _sync_equipment_details(record, request.form.get('equipment_details', '[]'))
        db.session.commit()

        # 维修未完成自动转待办
        if record_type == 'repair' and repair_result == 'pending':
            pending = PendingWork(
                title=f'二次上门：{customer_name} - {request.form.get("work_subtype", "维修")}',
                customer_name=customer_name,
                contact_name=request.form.get('contact_name', ''),
                contact_phone=request.form.get('customer_phone', ''),
                work_address=request.form.get('work_address', ''),
                staff_name=request.form.get('staff_name', ''),
                todo_type='未完成维修',
                priority=request.form.get('priority', 'normal'),
                work_content=f'故障描述: {request.form.get("fault_description", "")}\n维修过程: {request.form.get("repair_process", "")}\n未完成原因: {incomplete_reason_type or "未分类"} - {incomplete_reason}',
                reminder_date=work_date,
                related_record_type='repair',
                related_record_id=record.id
            )
            db.session.add(pending)
            db.session.commit()

        return jsonify(record.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/records/<int:record_id>', methods=['GET'])
@login_required
def get_record(record_id):
    try:
        record = WorkRecord.query.get_or_404(record_id)
        return jsonify(record.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/records/<int:record_id>', methods=['PUT'])
@login_required
def update_record(record_id):
    try:
        record = WorkRecord.query.get_or_404(record_id)
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
        if get_val('temp_staff_details') is not None: record.temp_staff_details = get_val('temp_staff_details') or ''
        if get_val('record_type'): record.record_type = get_val('record_type')
        if get_val('status') is not None: record.status = get_val('status') or record.status
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

        # recalculate total
        if get_val('tax_type'): record.tax_type = get_val('tax_type')
        if get_val('tax_rate'): record.tax_rate = float(get_val('tax_rate'))
        record.total_fee = record.labor_fee + record.material_fee + record.transport_fee + record.other_fee
        if record.tax_type == 'tax':
            record.tax_amount = round(record.total_fee * record.tax_rate, 2)
            record.total_fee += record.tax_amount

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
                    if file and allowed_file(file.filename):
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
        db.session.commit()
        return jsonify(record.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/records/<int:record_id>', methods=['DELETE'])
@login_required
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
                if os.path.exists(photo_path):
                    os.remove(photo_path)
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
        status = request.args.get('status', 'pending')
        todo_type = request.args.get('todo_type')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        query = PendingWork.query.filter_by(status=status)
        if todo_type:
            query = query.filter(PendingWork.todo_type == todo_type)
        pagination = query.order_by(PendingWork.reminder_date.asc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/pending', methods=['POST'])
@login_required
def create_pending_work():
    try:
        data = request.get_json()
        if not data or not data.get('customer_name'):
            return jsonify({'error': '客户名称不能为空'}), 400
        reminder_date = datetime.strptime(data.get('reminder_date'), '%Y-%m-%d')
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
        snapshot_before = pending.to_dict()
        data = request.get_json() or {}
        for k in ['title', 'customer_name', 'contact_name', 'contact_phone', 'work_address', 'staff_name', 'work_content', 'todo_type', 'priority', 'related_record_type', 'related_record_id']:
            if k in data:
                setattr(pending, k, data[k])
        if 'reminder_date' in data:
            pending.reminder_date = datetime.strptime(data['reminder_date'], '%Y-%m-%d')
        if 'status' in data:
            pending.status = data['status']
        snapshot_after = pending.to_dict()
        title = pending.customer_name + ' - ' + (pending.title or '')
        _log_operation('pending_work', pending.id, 'update', snapshot_before, snapshot_after, title)
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
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 30, type=int)
        
        # 自动清理：每天第一次访问时清理一次
        _auto_cleanup_oplogs()
        
        query = OperationLog.query
        if target_type:
            query = query.filter(OperationLog.target_type == target_type)
        if action:
            query = query.filter(OperationLog.action == action)
        if keyword:
            query = query.filter(OperationLog.target_title.like(f'%{keyword}%'))
        
        pagination = query.order_by(OperationLog.created_at.desc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'logs': [log.to_dict() for log in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _auto_cleanup_oplogs():
    """每天自动清理一次过期操作日志"""
    try:
        from .models import SystemSetting
        today_str = datetime.now().strftime('%Y-%m-%d')
        last_clean = SystemSetting.query.filter_by(key='oplog_last_cleanup').first()
        if last_clean and last_clean.value == today_str:
            return  # 今天已经清理过了
        
        from datetime import timedelta
        setting = SystemSetting.query.filter_by(key='oplog_retention_days').first()
        days = int(setting.value) if setting and setting.value.isdigit() else 90
        cutoff = datetime.now() - timedelta(days=days)
        count = OperationLog.query.filter(OperationLog.created_at < cutoff).delete()
        
        # 记录今天清理过
        if last_clean:
            last_clean.value = today_str
        else:
            db.session.add(SystemSetting(key='oplog_last_cleanup', value=today_str))
        
        db.session.commit()
        if count > 0:
            print(f"[操作日志] 自动清理 {count} 条过期日志", flush=True)
    except Exception as e:
        print(f"[操作日志] 自动清理失败: {e}", flush=True)


@api_bp.route('/operation-logs/<int:log_id>', methods=['GET'])
@login_required
@admin_required
def get_operation_log(log_id):
    try:
        log = OperationLog.query.get_or_404(log_id)
        return jsonify(log.to_dict())
    except Exception as e:
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
        return jsonify({'error': str(e)}), 500

@api_bp.route('/salaries', methods=['POST'])
@login_required
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
            settlement_date=data.get('settlement_date', ''),
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
def settle_salary(salary_id):
    try:
        salary = SalaryRecord.query.get_or_404(salary_id)
        data = request.get_json() or {}
        salary.status = 'settled'
        salary.paid_amount = salary.payable_amount
        salary.settlement_date = data.get('settlement_date') or datetime.now().strftime('%Y-%m-%d')
        salary.payment_method = data.get('payment_method', salary.payment_method or '')
        db.session.commit()
        return jsonify(salary.to_dict())
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
        return jsonify({'categories': [c.to_dict() for c in categories]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expense-categories', methods=['POST'])
@login_required
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

@api_bp.route('/expense-categories/<int:cat_id>', methods=['DELETE'])
@login_required
def delete_expense_category(cat_id):
    try:
        cat = ExpenseCategory.query.get_or_404(cat_id)
        if cat.is_system:
            return jsonify({'error': '系统分类不能删除'}), 400
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
                    Expense.title.like(f'%{keyword}%'),
                    Expense.remark.like(f'%{keyword}%'),
                    Expense.supplier.like(f'%{keyword}%')
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
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses/<int:expense_id>', methods=['GET'])
@login_required
def get_expense(expense_id):
    try:
        expense = Expense.query.get_or_404(expense_id)
        return jsonify(expense.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses', methods=['POST'])
@login_required
def add_expense():
    try:
        data = request.get_json() or {}
        user_name = get_login_user_name()
        
        expense = Expense(
            expense_type=data.get('expense_type', 'other'),
            category=data.get('category', ''),
            title=data.get('title', ''),
            amount=float(data.get('amount', 0) or 0),
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
            query = query.filter(WorkRecord.customer_name.like(f'%{customer_name}%'))
        if staff_name:
            query = query.filter(
                db.or_(
                    WorkRecord.staff_name == staff_name,
                    WorkRecord.staff_names.like(f'%{staff_name}%')
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
        return jsonify({'error': str(e)}), 500


# ===================== PDF 导出 =====================

def _generate_pdf(records):
    """生成工作记录 PDF，每页带企业名称，嵌入照片（4宫格），返回 bytes"""
    from fpdf import FPDF
    import os
    
    font_path = os.path.join('/app/fonts', 'SourceHanSansSC-Regular.otf')
    font_ok = os.path.exists(font_path)
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
    
    # 首次导入在 add_page 前
    if font_ok:
        pdf.add_font('CJK', '', font_path, uni=True)
    
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
        return jsonify({'error': str(e)}), 500


@api_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    """获取上传的照片"""
    folder = current_app.config['UPLOAD_FOLDER']
    if not os.path.isabs(folder):
        folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', folder)
    return send_from_directory(os.path.abspath(folder), filename)


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
        backups = sorted([f for f in os.listdir(backup_dir) if f.endswith('.db')], reverse=True)
        for old in backups[20:]:
            os.remove(os.path.join(backup_dir, old))
        size = os.path.getsize(backup_path)
        return jsonify({'message': '备份成功', 'name': backup_name, 'size': size})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
        return jsonify({'error': str(e)}), 500


# ===================== 编辑日志 =====================

@api_bp.route('/records/<int:record_id>/edits', methods=['GET'])
@login_required
def get_record_edits(record_id):
    from .models import RecordEditLog
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
        
        def apply_permission(query):
            if user_role == 'worker':
                return query.filter(
                    db.or_(
                        WorkRecord.staff_names.like(f'%{user_staff}%'),
                        WorkRecord.staff_name == user_staff,
                        WorkRecord.created_by == user_staff
                    )
                )
            return query
        
        # 今日工单
        today_q = apply_permission(WorkRecord.query.filter(WorkRecord.work_date >= today, WorkRecord.work_date < tomorrow))
        today_count = today_q.count()
        today_total = db.session.query(func.sum(WorkRecord.total_fee)).filter(
            WorkRecord.work_date >= today, WorkRecord.work_date < tomorrow
        ).scalar() or 0
        if user_role != 'admin':
            today_q = today_q
        today_records = today_q.order_by(WorkRecord.work_date.desc()).limit(10).all()
        
        # 待办数量
        pending_count = PendingWork.query.filter_by(status='pending').count()
        unpaid_amount = db.session.query(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)).filter(WorkRecord.payment_status.in_(['unpaid','partial','monthly'])).scalar() or 0
        unpaid_salary = db.session.query(func.sum(SalaryRecord.payable_amount - SalaryRecord.paid_amount)).filter_by(status='unsettled').scalar() or 0
        today_construction_count = today_q.filter(WorkRecord.record_type == 'construction').count()
        today_repair_count = today_q.filter(WorkRecord.record_type == 'repair').count()
        
        # 本月统计
        month_start = today.replace(day=1)
        month_q = apply_permission(WorkRecord.query.filter(WorkRecord.work_date >= month_start))
        month_count = month_q.count()
        month_total = month_q.with_entities(func.sum(WorkRecord.total_fee)).scalar() or 0
        
        # 超期待办
        overdue_pending = PendingWork.query.filter(
            PendingWork.status == 'pending',
            PendingWork.reminder_date < today
        ).count()

        # 待办事项列表（按紧急程度取前5条：超时 > 今天 > 未来）
        urgency_order = db.case(
            (PendingWork.reminder_date < today, 0),
            (PendingWork.reminder_date == today.replace(hour=0, minute=0, second=0, microsecond=0), 1),
            else_=2
        )
        top_pending = PendingWork.query.filter_by(status='pending').order_by(urgency_order, PendingWork.reminder_date.asc()).limit(5).all()
        
        # 全部记录总数
        total_count = apply_permission(WorkRecord.query).count()
        
        # 本月收入（收款）
        month_payment = db.session.query(func.sum(PaymentRecord.amount)).filter(
            PaymentRecord.payment_date >= month_start,
            PaymentRecord.payment_date < (today + timedelta(days=1))
        ).scalar() or 0
        
        # 本月支出
        month_expense = db.session.query(func.sum(Expense.amount)).filter(
            Expense.expense_date >= month_start,
            Expense.expense_date < (today + timedelta(days=1))
        ).scalar() or 0
        
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
        recent_payments = PaymentRecord.query.order_by(PaymentRecord.created_at.desc()).limit(5).all()
        
        # 最近支出记录
        recent_expenses = Expense.query.order_by(Expense.created_at.desc()).limit(5).all()
        
        # 活跃客户（近30天工单最多的前5个）
        try:
            from datetime import timedelta as td
            thirty_days_ago = today - td(days=30)
            top_customers = db.session.query(
                WorkRecord.customer_name,
                func.count(WorkRecord.id).label('cnt'),
                func.sum(WorkRecord.total_fee).label('amt')
            ).filter(
                WorkRecord.work_date >= thirty_days_ago,
                WorkRecord.customer_name != ''
            ).group_by(WorkRecord.customer_name).order_by(func.count(WorkRecord.id).desc()).limit(5).all()
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
            'urgent_pending': [{'id':p.id,'title':p.title,'customer_name':p.customer_name,'work_content':p.work_content,'staff_name':p.staff_name,'reminder_date':p.reminder_date.isoformat(),'work_address':p.work_address,'status':p.status} for p in top_pending],
            'recent_payments': [p.to_dict() for p in recent_payments],
            'recent_expenses': [e.to_dict() for e in recent_expenses],
            'top_customers': [{'customer_name': c[0], 'count': c[1], 'amount': float(c[2] or 0)} for c in top_customers if c[0]]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===================== 日历 =====================

@api_bp.route('/calendar', methods=['GET'])
@login_required
def get_calendar_data():
    try:
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        if not year or not month:
            return jsonify([])
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        
        query = WorkRecord.query.filter(
            WorkRecord.work_date >= start_date,
            WorkRecord.work_date < end_date
        )
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
        records = query.all()
        calendar_data = {}
        for record in records:
            date_key = record.work_date.strftime('%Y-%m-%d')
            if date_key not in calendar_data:
                calendar_data[date_key] = []
            calendar_data[date_key].append({
                'id': record.id,
                'customer_name': record.customer_name,
                'work_content': record.work_content[:50] if record.work_content else ''
            })
        return jsonify(calendar_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
            query = query.filter(PaymentRecord.customer_name.like(f'%{customer_name}%'))
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
        return jsonify({'error': str(e)}), 500


@api_bp.route('/payments/stats', methods=['GET'])
@login_required
def get_payment_stats():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

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

        total_received = db.session.query(func.sum(PaymentRecord.amount)).filter(*base_filter).scalar() or 0

        receivable_query = WorkRecord.query.filter(
            WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly'])
        )
        total_receivable = db.session.query(
            func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)
        ).filter(WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly'])).scalar() or 0

        customer_receivable = db.session.query(
            WorkRecord.customer_name,
            func.sum(WorkRecord.total_fee - WorkRecord.paid_amount).label('amount')
        ).filter(WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly'])).group_by(
            WorkRecord.customer_name
        ).order_by(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount).desc()).limit(10).all()

        return jsonify({
            'total_received': float(total_received),
            'total_receivable': float(total_receivable),
            'customer_receivable': [{'customer_name': r[0], 'amount': float(r[1] or 0)} for r in customer_receivable]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/payments', methods=['POST'])
@login_required
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

        db.session.commit()
        return jsonify(payment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/payments/<int:payment_id>', methods=['PUT'])
@login_required
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
        payments = PaymentRecord.query.filter_by(record_id=record_id).order_by(PaymentRecord.payment_date.desc()).all()
        total = sum(p.amount or 0 for p in payments)
        return jsonify({
            'payments': [p.to_dict() for p in payments],
            'total_amount': float(total)
        })
    except Exception as e:
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
            query = query.filter(WorkTemplate.name.like(f'%{keyword}%'))
        templates = query.order_by(WorkTemplate.updated_at.desc()).all()
        return jsonify([t.to_dict() for t in templates])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/templates/<int:template_id>', methods=['GET'])
@login_required
def get_template(template_id):
    try:
        template = WorkTemplate.query.get_or_404(template_id)
        return jsonify(template.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/templates', methods=['POST'])
@login_required
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

        query = Project.query
        if status:
            query = query.filter(Project.status == status)
        if customer_name:
            query = query.filter(Project.customer_name.like(f'%{customer_name}%'))
        if project_type:
            query = query.filter(Project.project_type == project_type)
        if keyword:
            query = query.filter(or_(
                Project.name.like(f'%{keyword}%'),
                Project.project_no.like(f'%{keyword}%'),
                Project.contract_no.like(f'%{keyword}%')
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
        return jsonify({'error': str(e)}), 500


@api_bp.route('/projects/<int:project_id>', methods=['GET'])
@login_required
def get_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        records = WorkRecord.query.filter_by(customer_name=project.customer_name).order_by(WorkRecord.work_date.desc()).limit(20).all()
        return jsonify({
            'project': project.to_dict(),
            'records': [r.to_dict() for r in records]
        })
    except Exception as e:
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
            status=data.get('status', 'pending'),
            manager=data.get('manager', ''),
            description=data.get('description', ''),
            remark=data.get('remark', ''),
            created_by=get_login_user_name()
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
                      'contact_name', 'contact_phone', 'status', 'manager', 'description', 'remark']:
            if field in data:
                setattr(project, field, data[field])
        for field in ['contract_amount', 'budget_amount', 'actual_amount']:
            if field in data:
                setattr(project, field, float(data[field] or 0))
        if 'start_date' in data:
            project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data['start_date'] else None
        if 'end_date' in data:
            project.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data['end_date'] else None
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
        db.session.delete(project)
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
                Material.name.like(f'%{keyword}%'),
                Material.material_no.like(f'%{keyword}%'),
                Material.brand.like(f'%{keyword}%'),
                Material.model.like(f'%{keyword}%')
            ))
        if low_stock_only:
            query = query.filter(Material.stock <= Material.min_stock, Material.min_stock > 0)

        pagination = query.order_by(Material.updated_at.desc()).paginate(page=page, per_page=per_page)
        categories = db.session.query(Material.category).distinct().all()
        return jsonify({
            'records': [m.to_dict() for m in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'categories': [c[0] for c in categories if c[0]]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/materials/<int:material_id>', methods=['GET'])
@login_required
def get_material(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        logs = MaterialStockLog.query.filter_by(material_id=material_id).order_by(MaterialStockLog.created_at.desc()).limit(20).all()
        return jsonify({
            'material': material.to_dict(),
            'stock_logs': [l.to_dict() for l in logs]
        })
    except Exception as e:
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
def get_stock_logs():
    try:
        material_id = request.args.get('material_id', type=int)
        log_type = request.args.get('log_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

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
        return jsonify({
            'records': [l.to_dict() for l in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
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
            query = query.filter(CustomerEquipment.customer_name.like(f'%{customer_name}%'))
        if equipment_type:
            query = query.filter(CustomerEquipment.equipment_type == equipment_type)
        if system_type:
            query = query.filter(CustomerEquipment.system_type == system_type)
        if status:
            query = query.filter(CustomerEquipment.status == status)
        if keyword:
            query = query.filter(or_(
                CustomerEquipment.brand.like(f'%{keyword}%'),
                CustomerEquipment.model.like(f'%{keyword}%'),
                CustomerEquipment.serial_no.like(f'%{keyword}%')
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
        return jsonify({'error': str(e)}), 500


@api_bp.route('/customer-equipments/<int:equip_id>', methods=['GET'])
@login_required
def get_customer_equipment(equip_id):
    try:
        equip = CustomerEquipment.query.get_or_404(equip_id)
        return jsonify(equip.to_dict())
    except Exception as e:
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
            query = query.filter(MaintenancePlan.customer_name.like(f'%{customer_name}%'))

        pagination = query.order_by(MaintenancePlan.next_date.asc().nullslast()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/maintenance-plans/<int:plan_id>', methods=['GET'])
@login_required
def get_maintenance_plan(plan_id):
    try:
        plan = MaintenancePlan.query.get_or_404(plan_id)
        return jsonify(plan.to_dict())
    except Exception as e:
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

        base_filter = [WorkRecord.work_date >= start, WorkRecord.work_date < end]

        total_income = db.session.query(func.sum(WorkRecord.total_fee)).filter(*base_filter).scalar() or 0
        total_labor = db.session.query(func.sum(WorkRecord.labor_fee)).filter(*base_filter).scalar() or 0
        total_material = db.session.query(func.sum(WorkRecord.material_fee)).filter(*base_filter).scalar() or 0
        total_transport = db.session.query(func.sum(WorkRecord.transport_fee)).filter(*base_filter).scalar() or 0
        total_other = db.session.query(func.sum(WorkRecord.other_fee)).filter(*base_filter).scalar() or 0
        total_tax = db.session.query(func.sum(WorkRecord.tax_amount)).filter(*base_filter).scalar() or 0

        total_salary = db.session.query(func.sum(SalaryRecord.payable_amount)).filter(
            SalaryRecord.work_date >= start, SalaryRecord.work_date < end
        ).scalar() or 0

        gross_profit = total_income - total_material - total_tax
        net_profit = total_income - total_material - total_salary - total_transport - total_other - total_tax

        return jsonify({
            'total_income': float(total_income),
            'total_labor_cost': float(total_labor),
            'total_material_cost': float(total_material),
            'total_transport_cost': float(total_transport),
            'total_other_cost': float(total_other),
            'total_tax': float(total_tax),
            'total_salary': float(total_salary),
            'gross_profit': float(gross_profit),
            'net_profit': float(net_profit),
            'gross_margin': round((gross_profit / total_income * 100), 2) if total_income > 0 else 0,
            'net_margin': round((net_profit / total_income * 100), 2) if total_income > 0 else 0,
            'date_range': {'start': start.date().isoformat(), 'end': (end - timedelta(days=1)).date().isoformat()}
        })
    except Exception as e:
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
        db.session.commit()
        return notification
    except Exception as e:
        db.session.rollback()
        print(f'创建通知失败: {e}')
        return None


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
        return jsonify({'error': str(e)}), 500
