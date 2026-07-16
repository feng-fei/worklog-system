from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import staffs_bp
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


@staffs_bp.route('/staffs', methods=['GET'])
@login_required
def get_staffs():
    try:
        staffs = Staff.query.all()
        return jsonify([s.to_dict() for s in staffs])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@staffs_bp.route('/staffs', methods=['POST'])
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
            daily_wage=float(data.get('daily_wage', 0) or 0),
            monthly_salary=float(data.get('monthly_salary', 0) or 0),
            project=data.get('project', ''),
            position=data.get('position', ''),
            id_card=data.get('id_card', ''),
            hire_date=data.get('hire_date', ''),
            status=data.get('status', 'active'),
            remark=data.get('remark', '')
        )
        db.session.add(staff)
        db.session.commit()
        return jsonify(staff.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@staffs_bp.route('/staffs/<int:staff_id>', methods=['GET'])
@login_required
def get_staff(staff_id):
    try:
        staff = Staff.query.get_or_404(staff_id)
        return jsonify(staff.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@staffs_bp.route('/staffs/<int:staff_id>', methods=['PUT'])
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
        if 'hire_date' in data: staff.hire_date = data['hire_date']
        if 'remark' in data: staff.remark = data['remark']
        if 'status' in data: staff.status = data['status']
        db.session.commit()
        return jsonify(staff.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@staffs_bp.route('/staffs/<int:staff_id>', methods=['DELETE'])
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


@staffs_bp.route('/staffs/<int:staff_id>/id_photo', methods=['POST'])
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


@staffs_bp.route('/staffs/<int:staff_id>/cert_photo', methods=['POST'])
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


@staffs_bp.route('/staffs/<int:staff_id>/toggle-enabled', methods=['POST'])
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


@staffs_bp.route('/staffs/<int:staff_id>/reset-password', methods=['POST'])
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


