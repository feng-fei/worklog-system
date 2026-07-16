from flask import g
from . import db
from .models import (
    WorkRecord, PendingWork, Staff, Customer, WorkerUser, SystemSetting,
    SalaryRecord, OperationLog, PaymentRecord, WorkTemplate, Project,
    Material, MaterialStockLog, CustomerEquipment, MaintenancePlan,
    Notification, Expense, ExpenseCategory, RepairEquipment,
    ProjectExpense, ProjectSalary, ProjectWorkRecord
)
from .auth import get_login_user_name
from datetime import datetime, timedelta, date
from sqlalchemy import func, or_
import json
import os
import uuid


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_MIMETYPES = {'image/png', 'image/jpeg', 'image/gif', 'image/webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024


def escape_like_keyword(keyword):
    """转义LIKE查询中的特殊字符，防止LIKE注入
    转义 % _ \ 为 \% \_ \\
    """
    if not keyword:
        return keyword
    return keyword.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')


def parse_date(date_str):
    """安全解析日期字符串，支持 YYYY-MM-DD 格式，失败返回 None"""
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


def paginate_query(query, page, per_page, to_dict_method='to_dict'):
    """通用分页工具函数"""
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    items = []
    for item in pagination.items:
        if hasattr(item, to_dict_method):
            items.append(getattr(item, to_dict_method)())
        else:
            items.append(item)
    return {
        'items': items,
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }


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


def safe_filename(original_name):
    ext = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else 'jpg'
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    short_id = str(uuid.uuid4())[:8]
    return f'{ts}_{short_id}.{ext}'


def _get_worker_name():
    return g.current_user.get('staff_name', '') or get_login_user_name()


def _is_admin():
    return g.current_user.get('role') == 'admin'


def _apply_record_permission(query):
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


def _can_access_record(record):
    if _is_admin():
        return True
    user_name = _get_worker_name()
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
    if _is_admin():
        return True
    if payment.record_id:
        record = WorkRecord.query.get(payment.record_id)
        if record:
            return _can_access_record(record)
    user_name = _get_worker_name()
    if payment.created_by == user_name:
        return True
    return False


def _record_type_label(record_type):
    return '维修' if record_type == 'repair' else '施工'


def _record_prefix(record_type):
    return 'RY-WX' if record_type == 'repair' else 'RY-SG'


def _generate_record_no(record_type, work_date):
    kind = _record_prefix(record_type)
    date_str = work_date.strftime('%Y%m%d')
    prefix = f'{kind}-{date_str}-'
    last = WorkRecord.query.filter(WorkRecord.order_no.like(f'{prefix}%')).order_by(
        WorkRecord.order_no.desc()).first()
    if last and last.order_no:
        try:
            num = int(last.order_no.split('-')[-1]) + 1
        except:
            num = 1
    else:
        num = 1
    return f'{prefix}{num:03d}'


def _generate_salary_no(work_date):
    date_str = work_date.strftime('%Y%m%d')
    prefix = f'GZ-{date_str}-'
    last = SalaryRecord.query.filter(SalaryRecord.salary_no.like(f'{prefix}%')).order_by(
        SalaryRecord.salary_no.desc()).first()
    if last and last.salary_no:
        try:
            num = int(last.salary_no.split('-')[-1]) + 1
        except:
            num = 1
    else:
        num = 1
    return f'{prefix}{num:03d}'


def _sync_staff_name_from_staff_names(record):
    staff_names_str = record.staff_names or ''
    if not staff_names_str.strip():
        if not record.staff_name:
            record.staff_name = ''
        return
    names = [n.strip() for n in staff_names_str.split(',') if n.strip()]
    if names:
        record.staff_name = names[0]


def _validate_status_transition(record_type, old_status, new_status):
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
    if new_status in admin_bypass and _is_admin():
        return True

    return False


def _recalculate_fee_from_fee_items(record, include_equipment=True):
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
    try:
        details = equipment_details_json or '[]'
        if isinstance(details, str):
            details = json.loads(details) if details else []

        equipments = []
        material_adjustments = []

        for d in details or []:
            qty = int(d.get('quantity', 0) or 0)
            price = float(d.get('unit_price', 0) or 0)
            subtotal = round(qty * price, 2)
            equipments.append({
                'device_name': d.get('device_name', ''),
                'device_brand': d.get('device_brand', ''),
                'device_model': d.get('device_model', ''),
                'serial_no': d.get('serial_no', ''),
                'system_type': d.get('system_type', ''),
                'fault_description': d.get('fault_description', ''),
                'solution': d.get('solution', ''),
                'quantity': qty,
                'unit_price': price,
                'subtotal': subtotal,
                'material_id': d.get('material_id'),
                'warranty_months': d.get('warranty_months'),
            })
            if d.get('material_id') and d.get('material_id') != '':
                try:
                    mid = int(d['material_id'])
                    old_qty = 0
                    existing = RepairEquipment.query.filter_by(
                        work_record_id=record.id, material_id=mid
                    ).first()
                    if existing:
                        old_qty = existing.quantity or 0
                    material_adjustments.append((mid, old_qty, qty))
                except:
                    pass

        if not equipments:
            RepairEquipment.query.filter_by(work_record_id=record.id).delete()
            record.equipment_fee_total = 0
            _recalculate_fee_from_fee_items(record, include_equipment=False)
            subtotal = (record.labor_fee or 0) + (record.material_fee or 0) + (record.transport_fee or 0) + (record.other_fee or 0)
            if record.tax_type == 'tax':
                record.tax_amount = round(subtotal * float(record.tax_rate or 0.03), 2)
                record.total_fee = round(subtotal + record.tax_amount, 2)
            else:
                record.tax_amount = 0
                record.total_fee = round(subtotal, 2)
            return

        old_equipments = RepairEquipment.query.filter_by(work_record_id=record.id).all()
        old_map = {e.id: e for e in old_equipments}

        used_ids = set()
        equipment_fee_total = 0
        eq_list = []

        for idx, d in enumerate(equipments):
            qty = int(d.get('quantity', 0) or 0)
            price = float(d.get('unit_price', 0) or 0)
            subtotal = round(qty * price, 2)
            equipment_fee_total += subtotal

            material_id = d.get('material_id')
            try:
                material_id = int(material_id) if material_id else None
            except:
                material_id = None

            if idx < len(old_equipments):
                eq = old_equipments[idx]
            else:
                eq = RepairEquipment(work_record_id=record.id)
                db.session.add(eq)

            eq.device_name = d.get('device_name', '')
            eq.device_brand = d.get('device_brand', '')
            eq.device_model = d.get('device_model', '')
            eq.serial_no = d.get('serial_no', '')
            eq.system_type = d.get('system_type', '')
            eq.fault_description = d.get('fault_description', '')
            eq.solution = d.get('solution', '')
            eq.quantity = qty
            eq.unit_price = price
            eq.subtotal = subtotal
            eq.material_id = material_id
            eq.warranty_months = d.get('warranty_months')
            eq.sort_order = idx
            eq_list.append(eq)
            used_ids.add(eq.id if eq.id else -1)

        for old in old_equipments:
            if old.id not in used_ids:
                _adjust_material_stock(old, old.quantity or 0, 0, record)
                db.session.delete(old)

        for mid, old_qty, new_qty in material_adjustments:
            eq = RepairEquipment.query.filter_by(
                work_record_id=record.id, material_id=mid
            ).first()
            if eq:
                _adjust_material_stock(eq, old_qty, new_qty, record)

        for eq in eq_list:
            _sync_to_customer_equipment(eq, record, 'update')

        record.equipment_fee_total = equipment_fee_total
        _recalculate_fee_from_fee_items(record, include_equipment=False)
        subtotal = (record.labor_fee or 0) + (record.material_fee or 0) + equipment_fee_total + (record.transport_fee or 0) + (record.other_fee or 0)
        if record.tax_type == 'tax':
            record.tax_amount = round(subtotal * float(record.tax_rate or 0.03), 2)
            record.total_fee = round(subtotal + record.tax_amount, 2)
        else:
            record.tax_amount = 0
            record.total_fee = round(subtotal, 2)
    except Exception as e:
        print(f'同步设备明细失败: {e}')
        raise


def _adjust_material_stock(eq, old_qty, new_qty, record):
    try:
        if not eq.material_id:
            return
        material = Material.query.get(eq.material_id)
        if not material:
            return
        diff = new_qty - old_qty
        current_stock = material.stock or 0
        material.stock = max(0, current_stock - diff)
        log_type = 'out' if diff > 0 else 'in'
        change_qty = abs(diff)
        if change_qty > 0:
            log = MaterialStockLog(
                material_id=material.id,
                material_name=material.name,
                log_type=log_type,
                quantity=change_qty,
                unit_price=material.unit_price or 0,
                stock_after=material.stock,
                related_type='work_record',
                related_id=record.id,
                remark=f'工单{record.order_no or ""} {_record_type_label(record.record_type)}设备明细变更',
                operator=get_login_user_name()
            )
            db.session.add(log)
        if material.stock <= (material.min_stock or 0) and material.min_stock > 0 and diff > 0:
            _notify_admins(
                '⚠️ 库存预警',
                f'{material.name}（{material.model or ""}）库存已低至 {material.stock}，请及时补货',
                'warning', 'material', material.id
            )
    except Exception as e:
        print(f'调整物料库存失败: {e}')


def _sync_to_customer_equipment(eq, record, action):
    try:
        if not eq.device_name:
            return
        repair_method = eq.solution or ''
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
            existing.serial_no = existing.serial_no or eq.serial_no or ''
            existing.last_maintenance = record.work_date
            if eq.warranty_months and eq.warranty_months > 0:
                from dateutil.relativedelta import relativedelta
                existing.warranty_end = record.work_date + relativedelta(months=int(eq.warranty_months))
        else:
            ce = CustomerEquipment(
                customer_name=customer_name,
                equipment_type=eq.device_name or '',
                brand=eq.device_brand or '',
                model=eq.device_model or '',
                serial_no=eq.serial_no or '',
                quantity=eq.quantity or 1,
                install_date=record.work_date,
                last_maintenance=record.work_date,
                status='normal'
            )
            if eq.warranty_months and eq.warranty_months > 0:
                from dateutil.relativedelta import relativedelta
                ce.warranty_end = record.work_date + relativedelta(months=int(eq.warranty_months))
            db.session.add(ce)
    except Exception as e:
        print(f'同步客户设备失败: {e}')


def _record_payload_from_pending(pending, record_type):
    return {
        'customer_name': pending.customer_name or '',
        'work_address': pending.work_address or '',
        'contact_name': pending.contact_name or '',
        'contact_phone': pending.contact_phone or '',
        'staff_name': pending.staff_name or '',
        'staff_names': (pending.staff_name or '') and (pending.staff_name + ',')[:-1] or '',
        'description': pending.description or '',
        'record_type': record_type,
        'priority': pending.priority or 'normal',
        'work_content': pending.description or '',
        'order_source': '待办指派',
        'remark': f'来源待办：{pending.title}'
    }


def _ensure_indexes():
    try:
        with db.engine.connect() as conn:
            indexes = [
                ('ix_work_records_work_date', 'work_records', 'work_date'),
                ('ix_work_records_customer_name', 'work_records', 'customer_name'),
                ('ix_work_records_status', 'work_records', 'status'),
                ('ix_work_records_payment_status', 'work_records', 'payment_status'),
                ('ix_work_records_record_type', 'work_records', 'record_type'),
                ('ix_work_records_created_by', 'work_records', 'created_by'),
                ('ix_work_records_staff_name', 'work_records', 'staff_name'),
                ('ix_payment_records_payment_date', 'payment_records', 'payment_date'),
                ('ix_payment_records_record_id', 'payment_records', 'record_id'),
                ('ix_salary_records_work_date', 'salary_records', 'work_date'),
                ('ix_salary_records_staff_name', 'salary_records', 'staff_name'),
                ('ix_salary_records_status', 'salary_records', 'status'),
                ('ix_pending_works_status', 'pending_works', 'status'),
                ('ix_pending_works_staff_name', 'pending_works', 'staff_name'),
                ('ix_expenses_expense_date', 'expenses', 'expense_date'),
                ('ix_expenses_expense_type', 'expenses', 'expense_type'),
                ('ix_operation_logs_created_at', 'operation_logs', 'created_at'),
                ('ix_operation_logs_target_type', 'operation_logs', 'target_type'),
                ('ix_material_stock_logs_material_id', 'material_stock_logs', 'material_id'),
                ('ix_material_stock_logs_created_at', 'material_stock_logs', 'created_at'),
                ('ix_customer_equipments_customer_name', 'customer_equipments', 'customer_name'),
                ('ix_repair_equipments_work_record_id', 'repair_equipments', 'work_record_id'),
                ('ix_project_salaries_project_id', 'project_salaries', 'project_id'),
                ('ix_project_expenses_project_id', 'project_expenses', 'project_id'),
            ]
            for name, table, col in indexes:
                conn.execute(db.text(f'CREATE INDEX IF NOT EXISTS {name} ON {table} ({col})'))
            conn.commit()
    except Exception as e:
        print(f'索引创建跳过: {e}')


def _log_operation(target_type, target_id, action, snapshot_before=None, snapshot_after=None, target_title=''):
    try:
        log = OperationLog(
            target_type=target_type,
            target_id=target_id,
            action=action,
            operator=get_login_user_name(),
            target_title=target_title or '',
            snapshot_before=json.dumps(snapshot_before, ensure_ascii=False) if snapshot_before else '',
            snapshot_after=json.dumps(snapshot_after, ensure_ascii=False) if snapshot_after else '',
        )
        db.session.add(log)
    except Exception as e:
        print(f'记录操作日志失败: {e}')


_FIELD_LABELS = {
    'work_record': {
        'customer_name': '客户名称',
        'work_address': '施工地址',
        'work_date': '施工日期',
        'contact_name': '联系人',
        'contact_phone': '联系电话',
        'staff_name': '负责人',
        'staff_names': '参与人员',
        'record_type': '工单类型',
        'work_subtype': '工程类型',
        'service_category': '服务类别',
        'work_content': '施工内容',
        'description': '工作描述',
        'labor_fee': '人工费',
        'material_fee': '材料费',
        'equipment_fee_total': '设备费',
        'transport_fee': '交通费',
        'other_fee': '其他费用',
        'tax_type': '计税方式',
        'tax_rate': '税率',
        'tax_amount': '税额',
        'total_fee': '总计',
        'payment_status': '收款状态',
        'paid_amount': '已收金额',
        'status': '工单状态',
        'priority': '优先级',
        'remark': '备注',
    },
    'customer': {
        'name': '客户名称',
        'short_name': '简称',
        'full_name': '全称',
        'contact_name': '联系人',
        'contact_phone': '联系电话',
        'address': '地址',
        'credit_code': '统一社会信用代码',
    },
    'staff': {
        'name': '姓名',
        'position': '职位',
        'phone': '电话',
        'id_card': '身份证号',
        'daily_salary': '日工资',
    },
    'material': {
        'name': '物料名称',
        'material_no': '物料编号',
        'category': '分类',
        'brand': '品牌',
        'model': '型号规格',
        'unit': '单位',
        'stock': '库存数量',
        'min_stock': '最低库存',
        'unit_price': '单价',
        'supplier': '供应商',
    },
}


def _get_field_labels(target_type):
    return _FIELD_LABELS.get(target_type, {})


def _auto_cleanup_oplogs():
    try:
        setting = SystemSetting.query.filter_by(key='oplog_retention_days').first()
        days = int(setting.value) if setting and setting.value else 90
        if days <= 0:
            return
        cutoff = datetime.now() - timedelta(days=days)
        deleted = OperationLog.query.filter(OperationLog.created_at < cutoff).delete(synchronize_session=False)
        if deleted > 0:
            print(f'自动清理 {deleted} 条过期操作日志')
    except Exception as e:
        print(f'自动清理操作日志失败: {e}')


def _init_default_expense_categories():
    try:
        default_cats = [
            ('office', '办公用品', 'expense'),
            ('transport', '交通出行', 'expense'),
            ('meal', '餐饮招待', 'expense'),
            ('purchase', '物料采购', 'purchase'),
            ('maintenance', '设备维护', 'expense'),
            ('rent', '房租水电', 'expense'),
            ('other', '其他', 'expense'),
        ]
        for code, name, cat_type in default_cats:
            existing = ExpenseCategory.query.filter_by(code=code).first()
            if not existing:
                cat = ExpenseCategory(code=code, name=name, category_type=cat_type, sort_order=0)
                db.session.add(cat)
    except Exception as e:
        print(f'初始化支出分类失败: {e}')


def _recalculate_project_totals(project_id):
    try:
        project = Project.query.get(project_id)
        if not project:
            return
        salary_total = db.session.query(func.coalesce(func.sum(ProjectSalary.payable_amount), 0)).filter(
            ProjectSalary.project_id == project_id,
            ProjectSalary.settlement_status == 'settled'
        ).scalar() or 0
        expense_total = db.session.query(func.coalesce(func.sum(ProjectExpense.amount), 0)).filter(
            ProjectExpense.project_id == project_id
        ).scalar() or 0
        project.actual_amount = round(float(salary_total) + float(expense_total), 2)
    except Exception as e:
        print(f'重算项目汇总失败: {e}')


def _auto_generate_inspection_todos():
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
                description=plan.content or '',
                related_record_type='maintenance_plan',
                related_record_id=plan.id,
            )
            db.session.add(pending)
            count += 1
            if plan.cycle_months and plan.cycle_months > 0:
                from dateutil.relativedelta import relativedelta
                plan.next_date = today + relativedelta(months=plan.cycle_months)
            elif plan.cycle_days and plan.cycle_days > 0:
                plan.next_date = today + timedelta(days=plan.cycle_days)
            else:
                plan.status = 'completed'
        return count
    except Exception as e:
        print(f'自动巡检生成失败: {e}')
        return 0


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
    try:
        admins = WorkerUser.query.filter_by(role='admin', enabled=True).all()
        for admin in admins:
            _create_notification(admin.username, title, content, notify_type, related_type, related_id)
    except Exception as e:
        print(f'通知管理员失败: {e}')


def _sync_salary_records_for_work(record):
    try:
        staff_names_str = record.staff_names or ''
        if not staff_names_str.strip():
            return
        names = [n.strip() for n in staff_names_str.split(',') if n.strip()]
        if not names:
            return
        work_date = record.work_date
        for name in names:
            existing = SalaryRecord.query.filter_by(
                staff_name=name,
                work_date=work_date,
                work_record_id=record.id
            ).first()
            if existing:
                continue
            staff = Staff.query.filter_by(name=name).first()
            daily_salary = float(staff.daily_salary or 0) if staff else 0
            salary = SalaryRecord(
                salary_no=_generate_salary_no(work_date),
                staff_name=name,
                work_date=work_date,
                work_record_id=record.id,
                customer_name=record.customer_name,
                work_type=_record_type_label(record.record_type),
                daily_salary=daily_salary,
                days=1,
                subsidy=0,
                deduction=0,
                payable_amount=daily_salary,
                paid_amount=0,
                status='unsettled',
                remark=f'自动生成：{record.order_no or ""}'
            )
            db.session.add(salary)
    except Exception as e:
        print(f'同步工资记录失败: {e}')


def _apply_pending_permission(query):
    if _is_admin():
        return query
    user_name = _get_worker_name()
    if not user_name:
        return query.filter(False)
    return query.filter(
        or_(
            PendingWork.staff_name.like(f'%{user_name}%'),
            PendingWork.created_by == user_name
        )
    )


def _apply_salary_permission(query):
    if _is_admin():
        return query
    user_name = _get_worker_name()
    if not user_name:
        return query.filter(False)
    return query.filter(SalaryRecord.staff_name == user_name)


def _apply_project_permission(query):
    if _is_admin():
        return query
    user_name = _get_worker_name()
    if not user_name:
        return query.filter(False)
    return query.filter(
        or_(
            Project.manager.like(f'%{user_name}%'),
            Project.created_by == user_name,
            Project.staff_names.like(f'%{user_name}%')
        )
    )


def _generate_project_no():
    date_str = datetime.now().strftime('%Y%m')
    count = Project.query.filter(
        func.strftime('%Y%m', Project.created_at) == date_str
    ).count()
    return f'RY-XM-{date_str}-{count + 1:03d}'


def _generate_project_work_record_no(work_date):
    date_str = work_date.strftime('%Y%m%d')
    count = ProjectWorkRecord.query.filter(
        func.strftime('%Y%m%d', ProjectWorkRecord.work_date) == date_str
    ).count()
    return f'XMGC{date_str}{count + 1:03d}'


def _generate_project_salary_no(project_id):
    date_str = datetime.now().strftime('%Y%m')
    count = ProjectSalary.query.filter(
        func.strftime('%Y%m', ProjectSalary.created_at) == date_str,
        ProjectSalary.project_id == project_id
    ).count()
    return f'RY-GZ-{project_id}-{date_str}-{count + 1:03d}'


def _generate_material_no():
    count = Material.query.count()
    return f'RY-WL-{count + 1:05d}'


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


def _generate_pdf(records):
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

    if font_ok:
        pdf.add_font('CJK', '', font_path, uni=True)

    for idx, r in enumerate(records):
        if idx > 0:
            pdf.add_page()

        set_font('', 18)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 10, company_name, new_x='LMARGIN', new_y='NEXT', align='L')
        pdf.set_draw_color(99, 102, 241)
        pdf.set_line_width(0.6)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(3)

        set_font('', 14)
        pdf.set_text_color(79, 70, 229)
        pdf.cell(0, 8, '工 作 日 志', new_x='LMARGIN', new_y='NEXT', align='C')
        pdf.ln(2)

        set_font('', 8)
        pdf.set_text_color(148, 163, 184)
        pdf.cell(0, 5, f'工单: {r.order_no or "#"+str(r.id)}  |  {r.work_date.strftime("%Y-%m-%d")}',
                 new_x='LMARGIN', new_y='NEXT', align='R')
        pdf.ln(3)

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

        if r.remark:
            pdf.set_xy(14, current_y)
            pdf.set_text_color(107, 114, 128)
            pdf.cell(0, 5, f'备注: {r.remark}', new_x='LMARGIN', new_y='NEXT')
            current_y = pdf.get_y() + 1

        if r.work_photos:
            photo_files = [os.path.basename(p.strip().strip("/")) for p in r.work_photos.split(',') if p.strip()]
            valid_photos = []
            for pf in photo_files:
                fpath = os.path.join(upload_dir, pf)
                if os.path.exists(fpath):
                    valid_photos.append(fpath)
            if valid_photos:
                valid_photos = valid_photos[:4]
                photo_y = current_y + 3
                if photo_y > 160:
                    pdf.add_page()
                    photo_y = 30
                grid_w = 85
                grid_gap = 5
                start_x = 14
                img_count = len(valid_photos)
                rows = (img_count + 1) // 2
                for pi, fpath in enumerate(valid_photos):
                    col = pi % 2
                    row = pi // 2
                    x = start_x + col * (grid_w + grid_gap)
                    y = photo_y + row * 68
                    if y + 68 > 280:
                        pdf.add_page()
                        y = 30 + row * 68
                        photo_y = 30
                    pdf.image(fpath, x=x, y=y, w=grid_w)

    return bytes(pdf.output())
