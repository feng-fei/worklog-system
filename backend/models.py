from . import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

def _normalize_invoiced_status(val):
    if val is None:
        return 'uninvoiced'
    if isinstance(val, bool):
        return 'invoiced' if val else 'uninvoiced'
    if isinstance(val, int):
        return 'invoiced' if val else 'uninvoiced'
    if isinstance(val, str):
        v = val.strip().lower()
        if v in ('invoiced', 'yes', 'true', '1', '已开票'):
            return 'invoiced'
        if v in ('partial', '部分开票'):
            return 'partial'
    return 'uninvoiced'

def format_datetime_local(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.strftime('%Y-%m-%dT%H:%M:%S')

def format_date_local(d):
    if not d:
        return None
    if isinstance(d, str):
        return d
    return d.strftime('%Y-%m-%d')

class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    short_name = db.Column(db.String(100), default='')
    full_name = db.Column(db.String(200), default='')
    credit_code = db.Column(db.String(50), default='')
    contact_name = db.Column(db.String(100), default='')
    phone = db.Column(db.String(20), default='')
    address = db.Column(db.String(200), default='')
    remark = db.Column(db.Text, default='')
    invoice_title = db.Column(db.String(200), default='')
    tax_number = db.Column(db.String(50), default='')
    bank_name = db.Column(db.String(100), default='')
    bank_account = db.Column(db.String(50), default='')
    invoice_address = db.Column(db.String(200), default='')
    invoice_phone = db.Column(db.String(20), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    def to_dict(self):
        return {'id':self.id,'name':self.name,'short_name':self.short_name or self.name,'full_name':self.full_name or self.name,'credit_code':self.credit_code or '','contact_name':self.contact_name or '','phone':self.phone,'address':self.address,'remark':self.remark,'invoice_title':self.invoice_title or '','tax_number':self.tax_number or '','bank_name':self.bank_name or '','bank_account':self.bank_account or '','invoice_address':self.invoice_address or '','invoice_phone':self.invoice_phone or '','created_at':self.created_at.isoformat()}

class Staff(db.Model):
    __tablename__ = 'staffs'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    phone = db.Column(db.String(20))
    staff_type = db.Column(db.String(20), default='fixed')
    daily_wage = db.Column(db.Float, default=0.0)
    monthly_salary = db.Column(db.Float, default=0.0)
    project = db.Column(db.String(200), default='')
    position = db.Column(db.String(100), default='')
    id_card = db.Column(db.String(30), default='')
    id_photo = db.Column(db.String(200), default='')  # 兼容旧字段：身份证照片
    id_card_front_photo = db.Column(db.String(200), default='')  # 身份证正面照片
    id_card_back_photo = db.Column(db.String(200), default='')  # 身份证背面照片
    cert_photo = db.Column(db.String(200), default='')  # 兼容旧字段：职业证书照片（单张）
    certificate_photos = db.Column(db.Text, default='')  # 职业证书照片（多张，逗号分隔）
    hire_date = db.Column(db.String(20), default='')
    status = db.Column(db.String(20), default='active')  # active/inactive
    remark = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    def to_dict(self):
        hd = ''
        if self.hire_date:
            try:
                hd = self.hire_date.isoformat() if hasattr(self.hire_date, 'isoformat') else str(self.hire_date)[:10]
            except:
                hd = ''
        cert_list = []
        if self.certificate_photos:
            cert_list = [p.strip() for p in self.certificate_photos.split(',') if p.strip()]
        if self.cert_photo and self.cert_photo not in cert_list:
            cert_list.insert(0, self.cert_photo)
        id_front = self.id_card_front_photo or self.id_photo or ''
        id_back = self.id_card_back_photo or ''
        return {'id':self.id,'name':self.name,'phone':self.phone,'staff_type':self.staff_type,'daily_wage':self.daily_wage,'monthly_salary':self.monthly_salary,'project':self.project,'position':self.position,'id_card':self.id_card,'id_photo':self.id_photo,'id_card_front_photo':id_front,'id_card_back_photo':id_back,'cert_photo':self.cert_photo,'certificate_photos':cert_list,'hire_date':hd,'status':self.status or 'active','remark':self.remark,'created_at':format_datetime_local(self.created_at)}

class WorkRecord(db.Model):
    __tablename__ = 'work_records'
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False)
    contact_name = db.Column(db.String(100), default='')
    customer_phone = db.Column(db.String(20), default='')
    work_address = db.Column(db.String(200), nullable=False)
    # 多选员工（逗号分隔）
    staff_names = db.Column(db.String(500), default='')
    staff_name = db.Column(db.String(100), default='')  # 兼容旧数据
    # 临时工明细：JSON [{"name":"xxx","hours":8,"daily_wage":300},...]
    temp_staff_details = db.Column(db.Text, default='')
    record_type = db.Column(db.String(20), default='construction')
    work_content = db.Column(db.Text, default='')
    fault_description = db.Column(db.Text, default='')
    fault_diagnosis = db.Column(db.Text, default='')
    repair_process = db.Column(db.Text, default='')
    repair_result = db.Column(db.String(20), default='completed')
    incomplete_reason_type = db.Column(db.String(50), default='')
    incomplete_reason = db.Column(db.Text, default='')
    work_photos = db.Column(db.Text)
    work_date = db.Column(db.DateTime, nullable=False, default=datetime.now)
    start_time = db.Column(db.String(10), default='')
    end_time = db.Column(db.String(10), default='')
    work_hours = db.Column(db.Float, default=0.0)  # 工时（小时）
    labor_fee = db.Column(db.Float, default=0.0)
    material_fee = db.Column(db.Float, default=0.0)
    transport_fee = db.Column(db.Float, default=0.0)
    other_fee = db.Column(db.Float, default=0.0)
    total_fee = db.Column(db.Float, default=0.0)
    tax_type = db.Column(db.String(10), default='no')  # no/tax 不含税/含税
    tax_rate = db.Column(db.Float, default=0.03)  # 增值税率 3%
    tax_amount = db.Column(db.Float, default=0.0)
    remark = db.Column(db.Text, default='')
    is_completed = db.Column(db.Boolean, default=True)
    status = db.Column(db.String(20), default='pending')  # 施工: pending/in_progress/settlement/completed/rework/cancelled; 维修: pending/dispatched/in_progress/callback/settlement/completed/unable/cancelled
    payment_status = db.Column(db.String(20), default='unpaid')  # unpaid/partial/paid/monthly
    paid_amount = db.Column(db.Float, default=0.0)
    work_subtype = db.Column(db.String(50), default='')  # 施工类型/故障类型
    priority = db.Column(db.String(20), default='normal')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    created_by = db.Column(db.String(100), default='')  # 创建记录的登录用户名
    order_no = db.Column(db.String(50), default='')  # 工单号
    fee_items = db.Column(db.Text, default='')  # 费用明细JSON [{"type":"人工","desc":"","qty":1,"unit":"小时","price":0,"subtotal":0},...]
    debug_fee = db.Column(db.Float, default=0.0)  # 兼容旧数据
    equipment_fee_total = db.Column(db.Float, default=0.0)  # 兼容旧数据
    project_id = db.Column(db.Integer, nullable=True, index=True)
    involved_systems = db.Column(db.Text, default='')
    service_category = db.Column(db.String(50), default='')
    warranty_status = db.Column(db.String(20), default='none')
    warranty_days = db.Column(db.Integer, default=0)
    accept_time = db.Column(db.String(10), default='')
    customer_feedback = db.Column(db.Text, default='')
    satisfaction = db.Column(db.String(20), default='')

    def to_dict(self):
        import json
        from .utils import parse_list_field
        expense_items = [e.to_dict() for e in Expense.query.filter_by(record_id=self.id).all()]
        staff_names_list = parse_list_field(self.staff_names)
        if not staff_names_list and self.staff_name:
            staff_names_list = [self.staff_name]
        work_photos_list = parse_list_field(self.work_photos)
        return {
            'id': self.id,
            'order_no': self.order_no,
            'customer_name': self.customer_name,
            'contact_name': self.contact_name or '',
            'contact_person': self.contact_name or '',
            'customer_phone': self.customer_phone,
            'contact_phone': self.customer_phone,
            'work_address': self.work_address,
            'address': self.work_address,
            'staff_names': staff_names_list,
            'staff_name': self.staff_name,
            'temp_staff_details': json.loads(self.temp_staff_details) if self.temp_staff_details else [],
            'record_type': self.record_type,
            'work_content': self.work_content,
            'fault_description': self.fault_description,
            'fault_phenomenon': self.fault_description,
            'fault_diagnosis': self.fault_diagnosis,
            'fault_judgment': self.fault_diagnosis,
            'repair_process': self.repair_process,
            'process_result': self.repair_process,
            'repair_result': self.repair_result,
            'incomplete_reason_type': self.incomplete_reason_type or '',
            'incomplete_reason': self.incomplete_reason or '',
            'photos': work_photos_list,
            'work_photos': work_photos_list,
            'work_date': format_date_local(self.work_date),
            'appointment_date': format_date_local(self.work_date),
            'start_time': self.start_time,
            'end_time': self.end_time,
            'work_hours': self.work_hours or 0,
            'labor_fee': self.labor_fee or 0,
            'labour_fee': self.labor_fee or 0,
            'material_fee': self.material_fee or 0,
            'transport_fee': self.transport_fee or 0,
            'travel_fee': self.transport_fee or 0,
            'other_fee': self.other_fee or 0,
            'debug_fee': self.debug_fee or 0,
            'equipment_fee_total': self.equipment_fee_total or 0,
            'amount': self.total_fee or 0,
            'total_fee': self.total_fee or 0,
            'tax_type': self.tax_type,
            'tax_rate': self.tax_rate,
            'tax_amount': self.tax_amount or 0,
            'remark': self.remark or '',
            'is_completed': self.is_completed,
            'status': self.status,
            'payment_status': self.payment_status,
            'paid_amount': self.paid_amount or 0,
            'work_subtype': self.work_subtype or '',
            'priority': self.priority or 'normal',
            'project_id': self.project_id,
            'involved_systems': self.involved_systems or '',
            'service_category': self.service_category or '',
            'warranty_status': self.warranty_status or 'none',
            'warranty_days': self.warranty_days or 0,
            'accept_time': self.accept_time or '',
            'customer_feedback': self.customer_feedback or '',
            'satisfaction': self.satisfaction or '',
            'fee_items': json.loads(self.fee_items) if self.fee_items else [],
            'expense_items': expense_items,
            'created_by': self.created_by,
            'created_at': format_datetime_local(self.created_at),
            'updated_at': format_datetime_local(self.updated_at)
        }

class PendingWork(db.Model):
    __tablename__ = 'pending_works'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), default='')
    customer_name = db.Column(db.String(100), nullable=False)
    contact_name = db.Column(db.String(100), default='')
    work_address = db.Column(db.String(200), nullable=False)
    staff_name = db.Column(db.String(100), nullable=False)
    work_content = db.Column(db.Text, nullable=False)
    reminder_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(20), default='pending')
    todo_type = db.Column(db.String(30), default='客户报修')
    contact_phone = db.Column(db.String(20), default='')
    priority = db.Column(db.String(20), default='normal')
    related_record_type = db.Column(db.String(20), default='')
    related_record_id = db.Column(db.Integer)
    def to_dict(self):
        return {'id':self.id,'title':self.title,'customer_name':self.customer_name,'contact_name':self.contact_name or '','work_address':self.work_address,'staff_name':self.staff_name,'work_content':self.work_content,'reminder_date':self.reminder_date.isoformat() if self.reminder_date else None,'status':self.status,'todo_type':self.todo_type or '客户报修','contact_phone':self.contact_phone or '','priority':self.priority or 'normal','related_record_type':self.related_record_type or '','related_record_id':self.related_record_id}

class WorkerUser(db.Model):
    __tablename__ = 'worker_users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='worker')  # 'admin' or 'worker'
    staff_name = db.Column(db.String(100), nullable=False)  # 关联员工姓名
    staff_id = db.Column(db.Integer)  # 关联staffs表id
    enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {'id':self.id,'username':self.username,'role':self.role,'staff_name':self.staff_name,'staff_id':self.staff_id,'enabled':self.enabled,'created_at':self.created_at.isoformat()}


class RecordEditLog(db.Model):
    __tablename__ = 'record_edit_logs'
    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(db.Integer, nullable=False)
    user = db.Column(db.String(100), default='')
    changes = db.Column(db.Text, default='')
    edited_at = db.Column(db.DateTime, default=datetime.now)
    def to_dict(self):
        return {'id':self.id,'record_id':self.record_id,'user':self.user,'changes':self.changes,'edited_at':self.edited_at.isoformat()}


class OperationLog(db.Model):
    __tablename__ = 'operation_logs'
    id = db.Column(db.Integer, primary_key=True)
    target_type = db.Column(db.String(30), nullable=False)
    target_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(20), nullable=False)
    user = db.Column(db.String(100), default='')
    snapshot_before = db.Column(db.Text, default='')
    snapshot_after = db.Column(db.Text, default='')
    changes_summary = db.Column(db.Text, default='')
    target_title = db.Column(db.String(200), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'action': self.action,
            'user': self.user or '',
            'snapshot_before': json.loads(self.snapshot_before) if self.snapshot_before else None,
            'snapshot_after': json.loads(self.snapshot_after) if self.snapshot_after else None,
            'changes_summary': json.loads(self.changes_summary) if self.changes_summary else [],
            'target_title': self.target_title or '',
            'created_at': self.created_at.isoformat()
        }


class OperationLogArchive(db.Model):
    """操作日志归档表：归档超过保留期的日志，支持搜索"""
    __tablename__ = 'operation_log_archives'
    id = db.Column(db.Integer, primary_key=True)
    target_type = db.Column(db.String(30), nullable=False, index=True)
    target_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(20), nullable=False, index=True)
    user = db.Column(db.String(100), default='', index=True)
    snapshot_before = db.Column(db.Text, default='')
    snapshot_after = db.Column(db.Text, default='')
    changes_summary = db.Column(db.Text, default='')
    target_title = db.Column(db.String(200), default='')
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    archived_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'action': self.action,
            'user': self.user or '',
            'snapshot_before': json.loads(self.snapshot_before) if self.snapshot_before else None,
            'snapshot_after': json.loads(self.snapshot_after) if self.snapshot_after else None,
            'changes_summary': json.loads(self.changes_summary) if self.changes_summary else [],
            'target_title': self.target_title or '',
            'created_at': self.created_at.isoformat() if self.created_at else '',
            'archived': True
        }


class PaymentRecord(db.Model):
    __tablename__ = 'payment_records'
    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(db.Integer, nullable=True, index=True)
    project_id = db.Column(db.Integer, nullable=True, index=True)
    project_name = db.Column(db.String(200), default='')
    customer_id = db.Column(db.Integer, nullable=True, index=True)
    customer_name = db.Column(db.String(100), default='', index=True)
    amount = db.Column(db.Float, default=0.0)
    payment_date = db.Column(db.Date, default=datetime.now)
    payment_method = db.Column(db.String(20), default='cash')
    received_by = db.Column(db.String(100), default='')
    is_invoiced = db.Column(db.String(20), default='uninvoiced')
    remark = db.Column(db.String(500), default='')
    created_by = db.Column(db.String(100), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        order_no = ''
        status = 'received'
        if self.record_id:
            try:
                record = WorkRecord.query.get(self.record_id)
                if record:
                    order_no = record.order_no or ''
                    if record.payment_status == 'paid':
                        status = 'received'
                    elif record.payment_status in ['unpaid', 'partial', 'monthly']:
                        status = 'pending'
                    else:
                        status = 'received'
            except:
                pass
        invoiced_val = _normalize_invoiced_status(self.is_invoiced)
        return {
            'id': self.id,
            'record_id': self.record_id,
            'project_id': self.project_id,
            'project_name': self.project_name or '',
            'customer_id': self.customer_id,
            'customer_name': self.customer_name or '',
            'amount': self.amount or 0,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_method': self.payment_method or 'cash',
            'received_by': self.received_by or '',
            'handler': self.received_by or '',
            'is_invoiced': invoiced_val,
            'status': status,
            'order_no': order_no,
            'record_order_no': order_no,
            'remark': self.remark or '',
            'note': self.remark or '',
            'created_by': self.created_by or '',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SystemSetting(db.Model):
    __tablename__ = 'system_settings'
    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.String(500), default='')
    
    def to_dict(self):
        return {'key': self.key, 'value': self.value}


class SalaryRecord(db.Model):
    __tablename__ = 'salary_records'
    id = db.Column(db.Integer, primary_key=True)
    salary_no = db.Column(db.String(50), default='', unique=True)
    staff_id = db.Column(db.Integer, nullable=True, index=True)
    staff_name = db.Column(db.String(100), nullable=False)
    staff_type = db.Column(db.String(20), default='temp')
    work_date = db.Column(db.DateTime, nullable=False, default=datetime.now)
    business_type = db.Column(db.String(20), default='其他')
    business_no = db.Column(db.String(50), default='')
    business_record_id = db.Column(db.Integer)
    customer_name = db.Column(db.String(100), default='')
    work_content = db.Column(db.Text, default='')
    salary_type = db.Column(db.String(20), default='日薪')
    daily_wage = db.Column(db.Float, default=0.0)
    work_units = db.Column(db.Float, default=1.0)
    subsidy = db.Column(db.Float, default=0.0)
    deduction = db.Column(db.Float, default=0.0)
    payable_amount = db.Column(db.Float, default=0.0)
    paid_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='unsettled')
    settlement_date = db.Column(db.String(20), default='')
    payment_method = db.Column(db.String(20), default='')
    remark = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        sd = ''
        if self.settlement_date:
            try:
                sd = self.settlement_date.isoformat() if hasattr(self.settlement_date, 'isoformat') else str(self.settlement_date)[:10]
            except:
                sd = ''
        month_str = ''
        if self.work_date:
            try:
                month_str = self.work_date.strftime('%Y-%m') if hasattr(self.work_date, 'strftime') else str(self.work_date)[:7]
            except:
                month_str = ''
        status_map = {
            'unsettled': 'pending',
            'settled': 'settled',
            'pending': 'pending'
        }
        frontend_status = status_map.get(self.status or 'unsettled', 'pending')
        return {
            'id': self.id,
            'salary_no': self.salary_no,
            'staff_id': self.staff_id,
            'staff_name': self.staff_name,
            'name': self.staff_name,
            'staff_type': self.staff_type,
            'work_date': self.work_date.isoformat() if self.work_date else '',
            'month': month_str,
            'business_type': self.business_type,
            'business_no': self.business_no,
            'business_record_id': self.business_record_id,
            'customer_name': self.customer_name,
            'work_content': self.work_content,
            'salary_type': self.salary_type,
            'daily_wage': self.daily_wage or 0,
            'work_units': self.work_units or 0,
            'hours': (self.work_units or 0) * 8,
            'subsidy': self.subsidy or 0,
            'deduction': self.deduction or 0,
            'gross_salary': self.payable_amount or 0,
            'payable_amount': self.payable_amount or 0,
            'net_salary': (self.payable_amount or 0) - (self.deduction or 0),
            'paid_amount': self.paid_amount or 0,
            'record_count': 1,
            'status': frontend_status,
            'settlement_date': sd,
            'payment_method': self.payment_method or '',
            'note': self.remark or '',
            'remark': self.remark or '',
            'created_at': self.created_at.isoformat() if self.created_at else ''
        }


class WorkTemplate(db.Model):
    __tablename__ = 'work_templates'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    template_type = db.Column(db.String(20), default='construction')  # construction/repair
    category = db.Column(db.String(50), default='')  # 模板分类
    work_subtype = db.Column(db.String(50), default='')
    work_content = db.Column(db.Text, default='')
    fault_description = db.Column(db.Text, default='')
    fault_diagnosis = db.Column(db.Text, default='')
    repair_process = db.Column(db.Text, default='')
    repair_result = db.Column(db.String(20), default='completed')  # completed/unable/pending
    labor_fee = db.Column(db.Float, default=0.0)
    material_fee = db.Column(db.Float, default=0.0)
    transport_fee = db.Column(db.Float, default=0.0)
    other_fee = db.Column(db.Float, default=0.0)
    tax_type = db.Column(db.String(10), default='no')
    tax_rate = db.Column(db.Float, default=0.03)
    priority = db.Column(db.String(20), default='normal')
    staff_names = db.Column(db.String(500), default='')
    fee_items = db.Column(db.Text, default='')  # 费用明细JSON [{"type":"人工","desc":"","qty":1,"unit":"小时","price":0,"subtotal":0},...]
    remark = db.Column(db.Text, default='')
    is_public = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(100), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'name': self.name,
            'template_type': self.template_type or 'construction',
            'category': self.category or '',
            'work_subtype': self.work_subtype or '',
            'work_content': self.work_content or '',
            'fault_description': self.fault_description or '',
            'fault_diagnosis': self.fault_diagnosis or '',
            'repair_process': self.repair_process or '',
            'repair_result': self.repair_result or 'completed',
            'labor_fee': self.labor_fee or 0,
            'material_fee': self.material_fee or 0,
            'transport_fee': self.transport_fee or 0,
            'other_fee': self.other_fee or 0,
            'tax_type': self.tax_type or 'no',
            'tax_rate': (self.tax_rate or 0) * 100,
            'priority': self.priority or 'normal',
            'staff_names': self.staff_names.split(',') if self.staff_names else [],
            'fee_items': json.loads(self.fee_items) if self.fee_items else [],
            'remark': self.remark or '',
            'is_public': self.is_public,
            'created_by': self.created_by or '',
            'created_at': self.created_at.isoformat()
        }


class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    project_no = db.Column(db.String(50), default='', unique=True)
    name = db.Column(db.String(200), nullable=False)
    customer_name = db.Column(db.String(100), default='')
    contract_no = db.Column(db.String(100), default='')
    project_type = db.Column(db.String(50), default='')  # 弱电/智能化/安防等
    project_address = db.Column(db.String(200), default='')
    contact_name = db.Column(db.String(100), default='')
    contact_phone = db.Column(db.String(20), default='')
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    contract_amount = db.Column(db.Float, default=0.0)
    budget_amount = db.Column(db.Float, default=0.0)
    actual_amount = db.Column(db.Float, default=0.0)
    tax_type = db.Column(db.String(10), default='no')  # no/tax 不含税/含税
    tax_rate = db.Column(db.Float, default=0.03)  # 增值税率 3%
    tax_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='pending')  # pending/in_progress/completed/settled/cancelled
    manager = db.Column(db.String(100), default='')
    description = db.Column(db.Text, default='')
    remark = db.Column(db.Text, default='')
    created_by = db.Column(db.String(100), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    billing_type = db.Column(db.String(20), default='lump_sum')  # lump_sum/labor_only/hourly
    project_stage = db.Column(db.String(30), default='preparation')  # preparation/material_prep/in_progress/completed/acceptance/settled
    construction_phase = db.Column(db.String(30), default='')  # piping/wiring/equipment_install/equipment_debug/system_test
    actual_start_date = db.Column(db.Date)
    actual_end_date = db.Column(db.Date)
    staff_names = db.Column(db.String(500), default='')
    receipt_amount = db.Column(db.Float, default=0.0)
    warranty_amount = db.Column(db.Float, default=0.0)

    def to_dict(self):
        return {
            'id': self.id,
            'project_no': self.project_no or '',
            'name': self.name,
            'customer_name': self.customer_name or '',
            'contract_no': self.contract_no or '',
            'project_type': self.project_type or '',
            'project_address': self.project_address or '',
            'contact_name': self.contact_name or '',
            'contact_phone': self.contact_phone or '',
            'start_date': self.start_date.isoformat() if self.start_date else '',
            'end_date': self.end_date.isoformat() if self.end_date else '',
            'contract_amount': self.contract_amount or 0,
            'budget_amount': self.budget_amount or 0,
            'actual_amount': self.actual_amount or 0,
            'tax_type': self.tax_type or 'no',
            'tax_rate': (self.tax_rate or 0) * 100,
            'tax_amount': self.tax_amount or 0,
            'status': self.status or 'pending',
            'manager': self.manager or '',
            'description': self.description or '',
            'remark': self.remark or '',
            'created_by': self.created_by or '',
            'created_at': self.created_at.isoformat(),
            'billing_type': self.billing_type or 'lump_sum',
            'project_stage': self.project_stage or 'preparation',
            'construction_phase': self.construction_phase or '',
            'actual_start_date': self.actual_start_date.isoformat() if self.actual_start_date else '',
            'actual_end_date': self.actual_end_date.isoformat() if self.actual_end_date else '',
            'staff_names': self.staff_names or '',
            'receipt_amount': self.receipt_amount or 0,
            'warranty_amount': self.warranty_amount or 0
        }


class ProjectExpense(db.Model):
    __tablename__ = 'project_expenses'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, nullable=False, index=True)
    expense_type = db.Column(db.String(30), default='other')  # material/tool/equipment_rental/transport/meal/accommodation/entertainment/other
    category = db.Column(db.String(50), default='')
    title = db.Column(db.String(200), default='')
    amount = db.Column(db.Float, default=0.0)
    expense_date = db.Column(db.Date, index=True)
    supplier = db.Column(db.String(100), default='')
    payment_method = db.Column(db.String(20), default='cash')  # cash/bank/wechat/alipay/other
    receipt_photos = db.Column(db.Text, default='')
    remark = db.Column(db.Text, default='')
    created_by = db.Column(db.String(100), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'expense_type': self.expense_type or 'other',
            'category': self.category or '',
            'title': self.title or '',
            'amount': self.amount or 0,
            'expense_date': self.expense_date.isoformat() if self.expense_date else '',
            'supplier': self.supplier or '',
            'payment_method': self.payment_method or 'cash',
            'receipt_photos': self.receipt_photos.split(',') if self.receipt_photos else [],
            'remark': self.remark or '',
            'created_by': self.created_by or '',
            'created_at': self.created_at.isoformat() if self.created_at else '',
            'updated_at': self.updated_at.isoformat() if self.updated_at else ''
        }


class ProjectSalary(db.Model):
    __tablename__ = 'project_salaries'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, nullable=False, index=True)
    salary_no = db.Column(db.String(50), default='', unique=True)
    staff_name = db.Column(db.String(100), nullable=False)
    staff_type = db.Column(db.String(20), default='temp')  # fixed/temp
    work_date = db.Column(db.Date, index=True)
    work_record_id = db.Column(db.Integer)
    work_content = db.Column(db.Text, default='')
    salary_type = db.Column(db.String(20), default='hourly')  # hourly/daily/piece/advance/bonus
    hourly_rate = db.Column(db.Float, default=0.0)
    work_hours = db.Column(db.Float, default=0.0)
    daily_wage = db.Column(db.Float, default=0.0)
    work_days = db.Column(db.Float, default=0.0)
    piece_price = db.Column(db.Float, default=0.0)
    piece_quantity = db.Column(db.Float, default=0.0)
    base_amount = db.Column(db.Float, default=0.0)
    subsidy = db.Column(db.Float, default=0.0)
    deduction = db.Column(db.Float, default=0.0)
    payable_amount = db.Column(db.Float, default=0.0)
    paid_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='unsettled')  # unsettled/settled/advance
    payment_method = db.Column(db.String(20), default='')
    remark = db.Column(db.Text, default='')
    created_by = db.Column(db.String(100), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'salary_no': self.salary_no or '',
            'staff_name': self.staff_name,
            'staff_type': self.staff_type or 'temp',
            'work_date': self.work_date.isoformat() if self.work_date else '',
            'work_record_id': self.work_record_id,
            'work_content': self.work_content or '',
            'salary_type': self.salary_type or 'hourly',
            'hourly_rate': self.hourly_rate or 0,
            'work_hours': self.work_hours or 0,
            'daily_wage': self.daily_wage or 0,
            'work_days': self.work_days or 0,
            'piece_price': self.piece_price or 0,
            'piece_quantity': self.piece_quantity or 0,
            'base_amount': self.base_amount or 0,
            'subsidy': self.subsidy or 0,
            'deduction': self.deduction or 0,
            'payable_amount': self.payable_amount or 0,
            'paid_amount': self.paid_amount or 0,
            'status': self.status or 'unsettled',
            'payment_method': self.payment_method or '',
            'remark': self.remark or '',
            'created_by': self.created_by or '',
            'created_at': self.created_at.isoformat() if self.created_at else '',
            'updated_at': self.updated_at.isoformat() if self.updated_at else ''
        }


class ProjectWorkRecord(db.Model):
    __tablename__ = 'project_work_records'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, nullable=False, index=True)
    record_no = db.Column(db.String(50), unique=True, default='')
    work_date = db.Column(db.Date, index=True)
    work_type = db.Column(db.String(30), default='')
    work_content = db.Column(db.Text, default='')
    customer_name = db.Column(db.String(200), default='')
    work_address = db.Column(db.String(500), default='')
    staff_names = db.Column(db.String(500), default='')
    staff_hours = db.Column(db.Text, default='')
    work_hours = db.Column(db.Float, default=0.0)
    material_fee = db.Column(db.Float, default=0.0)
    labor_fee = db.Column(db.Float, default=0.0)
    other_fee = db.Column(db.Float, default=0.0)
    total_fee = db.Column(db.Float, default=0.0)
    photos = db.Column(db.Text, default='')
    remark = db.Column(db.Text, default='')
    status = db.Column(db.String(20), default='completed')
    created_by = db.Column(db.String(100), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    billing_type = db.Column(db.String(20), default='lump_sum')

    def to_dict(self):
        import json
        staff_hours_list = []
        if self.staff_hours:
            try:
                staff_hours_list = json.loads(self.staff_hours)
            except Exception:
                staff_hours_list = []
        if not staff_hours_list and self.staff_names:
            names = self.staff_names.split(',')
            count = len(names)
            per_hours = (self.work_hours or 0) / count if count > 0 else 0
            staff_hours_list = [{'name': name.strip(), 'hours': round(per_hours, 1)} for name in names if name.strip()]
        return {
            'id': self.id,
            'project_id': self.project_id,
            'record_no': self.record_no or '',
            'work_date': self.work_date.isoformat() if self.work_date else '',
            'work_type': self.work_type or '',
            'work_content': self.work_content or '',
            'customer_name': self.customer_name or '',
            'work_address': self.work_address or '',
            'staff_names': self.staff_names.split(',') if self.staff_names else [],
            'staff_hours': staff_hours_list,
            'work_hours': self.work_hours or 0,
            'material_fee': self.material_fee or 0,
            'labor_fee': self.labor_fee or 0,
            'other_fee': self.other_fee or 0,
            'total_fee': self.total_fee or 0,
            'photos': self.photos.split(',') if self.photos else [],
            'remark': self.remark or '',
            'status': self.status or 'completed',
            'created_by': self.created_by or '',
            'created_at': self.created_at.isoformat() if self.created_at else '',
            'updated_at': self.updated_at.isoformat() if self.updated_at else '',
            'billing_type': self.billing_type or 'lump_sum'
        }


class Material(db.Model):
    __tablename__ = 'materials'
    id = db.Column(db.Integer, primary_key=True)
    material_no = db.Column(db.String(50), default='', unique=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), default='')  # 分类：线缆/设备/配件等
    brand = db.Column(db.String(100), default='')
    model = db.Column(db.String(100), default='')
    spec = db.Column(db.String(100), default='')  # 规格
    unit = db.Column(db.String(20), default='个')  # 单位
    unit_price = db.Column(db.Float, default=0.0)
    stock = db.Column(db.Float, default=0.0)  # 库存数量
    min_stock = db.Column(db.Float, default=0.0)  # 最低库存预警
    max_stock = db.Column(db.Float, default=0.0)  # 最高库存
    location = db.Column(db.String(100), default='')  # 存放位置
    supplier = db.Column(db.String(200), default='')
    remark = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'material_no': self.material_no or '',
            'name': self.name,
            'category': self.category or '',
            'brand': self.brand or '',
            'model': self.model or '',
            'spec': self.spec or '',
            'unit': self.unit or '个',
            'unit_price': self.unit_price or 0,
            'stock': self.stock or 0,
            'min_stock': self.min_stock or 0,
            'max_stock': self.max_stock or 0,
            'location': self.location or '',
            'supplier': self.supplier or '',
            'remark': self.remark or '',
            'is_low_stock': (self.stock or 0) <= (self.min_stock or 0) and (self.min_stock or 0) > 0,
            'created_at': self.created_at.isoformat()
        }


class MaterialStockLog(db.Model):
    __tablename__ = 'material_stock_logs'
    id = db.Column(db.Integer, primary_key=True)
    material_id = db.Column(db.Integer, nullable=False, index=True)
    material_name = db.Column(db.String(200), default='')
    log_type = db.Column(db.String(20), default='in')  # in/out/adjust
    quantity = db.Column(db.Float, default=0.0)
    stock_before = db.Column(db.Float, default=0.0)
    stock_after = db.Column(db.Float, default=0.0)
    unit_price = db.Column(db.Float, default=0.0)
    total_price = db.Column(db.Float, default=0.0)
    related_type = db.Column(db.String(50), default='')  # 关联类型：工单/采购等
    related_id = db.Column(db.Integer)
    related_no = db.Column(db.String(50), default='')
    operator = db.Column(db.String(100), default='')
    remark = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        mat = Material.query.get(self.material_id) if self.material_id else None
        name = self.material_name or (mat.name if mat else '')
        return {
            'id': self.id,
            'material_id': self.material_id,
            'material_name': name,
            'log_type': self.log_type or 'in',
            'quantity': self.quantity or 0,
            'stock_before': self.stock_before or 0,
            'stock_after': self.stock_after or 0,
            'unit_price': self.unit_price or 0,
            'total_price': self.total_price or 0,
            'related_type': self.related_type or '',
            'related_id': self.related_id,
            'related_no': self.related_no or '',
            'operator': self.operator or '',
            'remark': self.remark or '',
            'created_at': self.created_at.isoformat()
        }


class CustomerEquipment(db.Model):
    __tablename__ = 'customer_equipments'
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False, index=True)
    equipment_type = db.Column(db.String(50), default='')  # 设备类型
    system_type = db.Column(db.String(50), default='')  # 系统类型
    brand = db.Column(db.String(100), default='')
    model = db.Column(db.String(100), default='')
    serial_no = db.Column(db.String(100), default='')  # 序列号
    quantity = db.Column(db.Integer, default=1)
    install_date = db.Column(db.Date)
    warranty_start = db.Column(db.Date)
    warranty_end = db.Column(db.Date)
    location = db.Column(db.String(200), default='')  # 安装位置
    contact_name = db.Column(db.String(100), default='')
    contact_phone = db.Column(db.String(20), default='')
    status = db.Column(db.String(20), default='normal')  # normal/faulty/scrapped
    last_maintenance = db.Column(db.Date)
    next_maintenance = db.Column(db.Date)
    maintenance_cycle = db.Column(db.Integer, default=0)  # 维护周期（天）
    remark = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        today = datetime.now().date()
        is_warranty = False
        if self.warranty_end:
            is_warranty = self.warranty_end >= today
        is_due_maintenance = False
        if self.next_maintenance:
            is_due_maintenance = self.next_maintenance <= today
        return {
            'id': self.id,
            'customer_name': self.customer_name,
            'equipment_type': self.equipment_type or '',
            'system_type': self.system_type or '',
            'brand': self.brand or '',
            'model': self.model or '',
            'serial_no': self.serial_no or '',
            'quantity': self.quantity or 1,
            'install_date': self.install_date.isoformat() if self.install_date else '',
            'warranty_start': self.warranty_start.isoformat() if self.warranty_start else '',
            'warranty_end': self.warranty_end.isoformat() if self.warranty_end else '',
            'location': self.location or '',
            'contact_name': self.contact_name or '',
            'contact_phone': self.contact_phone or '',
            'status': self.status or 'normal',
            'last_maintenance': self.last_maintenance.isoformat() if self.last_maintenance else '',
            'next_maintenance': self.next_maintenance.isoformat() if self.next_maintenance else '',
            'maintenance_cycle': self.maintenance_cycle or 0,
            'is_warranty': is_warranty,
            'is_due_maintenance': is_due_maintenance,
            'remark': self.remark or '',
            'created_at': self.created_at.isoformat()
        }


class MaintenancePlan(db.Model):
    __tablename__ = 'maintenance_plans'
    id = db.Column(db.Integer, primary_key=True)
    plan_name = db.Column(db.String(200), nullable=False)
    plan_type = db.Column(db.String(20), default='periodic')  # periodic/once
    customer_name = db.Column(db.String(100), default='')
    equipment_id = db.Column(db.Integer)
    system_type = db.Column(db.String(50), default='')
    cycle_type = db.Column(db.String(20), default='month')  # day/week/month/quarter/year
    cycle_value = db.Column(db.Integer, default=1)  # 周期值
    start_date = db.Column(db.Date, nullable=False, default=datetime.now)
    next_date = db.Column(db.Date, index=True)
    end_date = db.Column(db.Date)
    staff_name = db.Column(db.String(100), default='')
    work_content = db.Column(db.Text, default='')
    priority = db.Column(db.String(20), default='normal')
    status = db.Column(db.String(20), default='active')  # active/paused/completed
    last_generated = db.Column(db.Date)
    total_count = db.Column(db.Integer, default=0)  # 已生成次数
    created_by = db.Column(db.String(100), default='')
    remark = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'plan_name': self.plan_name,
            'plan_type': self.plan_type or 'periodic',
            'customer_name': self.customer_name or '',
            'equipment_id': self.equipment_id,
            'system_type': self.system_type or '',
            'cycle_type': self.cycle_type or 'month',
            'cycle_value': self.cycle_value or 1,
            'start_date': self.start_date.isoformat() if self.start_date else '',
            'next_date': self.next_date.isoformat() if self.next_date else '',
            'end_date': self.end_date.isoformat() if self.end_date else '',
            'staff_name': self.staff_name or '',
            'work_content': self.work_content or '',
            'priority': self.priority or 'normal',
            'status': self.status or 'active',
            'last_generated': self.last_generated.isoformat() if self.last_generated else '',
            'total_count': self.total_count or 0,
            'created_by': self.created_by or '',
            'remark': self.remark or '',
            'created_at': self.created_at.isoformat()
        }


class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(100), default='')
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, default='')
    notify_type = db.Column(db.String(30), default='info')
    related_type = db.Column(db.String(30), default='')
    related_id = db.Column(db.Integer)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    read_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'user_name': self.user_name or '',
            'title': self.title,
            'content': self.content or '',
            'notify_type': self.notify_type or 'info',
            'related_type': self.related_type or '',
            'related_id': self.related_id,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat(),
            'read_at': self.read_at.isoformat() if self.read_at else ''
        }


class Expense(db.Model):
    __tablename__ = 'expenses'
    id = db.Column(db.Integer, primary_key=True)
    expense_type = db.Column(db.String(20), default='other')
    category_id = db.Column(db.Integer, nullable=True, index=True)
    category = db.Column(db.String(50), default='')
    title = db.Column(db.String(200), default='')
    amount = db.Column(db.Float, default=0.0)
    expense_date = db.Column(db.Date, index=True)
    related_type = db.Column(db.String(30), default='')
    related_id = db.Column(db.Integer)
    related_no = db.Column(db.String(100), default='')
    record_id = db.Column(db.Integer, nullable=True, index=True)
    project_id = db.Column(db.Integer, nullable=True, index=True)
    project_name = db.Column(db.String(200), default='')
    customer_id = db.Column(db.Integer, nullable=True, index=True)
    customer_name = db.Column(db.String(100), default='')
    supplier = db.Column(db.String(100), default='')
    handler = db.Column(db.String(100), default='')
    staff_name = db.Column(db.String(100), default='')
    payment_method = db.Column(db.String(20), default='cash')
    is_invoiced = db.Column(db.String(20), default='uninvoiced')
    receipt_photos = db.Column(db.Text, default='')
    remark = db.Column(db.Text, default='')
    created_by = db.Column(db.String(100), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        import json as _json
        invoiced_val = _normalize_invoiced_status(self.is_invoiced)
        receipt_list = []
        if self.receipt_photos:
            try:
                if self.receipt_photos.startswith('['):
                    receipt_list = _json.loads(self.receipt_photos)
                else:
                    receipt_list = [p.strip() for p in self.receipt_photos.split(',') if p.strip()]
            except:
                receipt_list = []
        return {
            'id': self.id,
            'expense_type': self.expense_type or 'other',
            'category_id': self.category_id,
            'category': self.category or '',
            'category_name': self.category or '',
            'title': self.title or '',
            'amount': self.amount or 0.0,
            'expense_date': self.expense_date.isoformat() if self.expense_date else '',
            'related_type': self.related_type or '',
            'related_id': self.related_id,
            'related_no': self.related_no or '',
            'record_id': self.record_id,
            'project_id': self.project_id,
            'project_name': self.project_name or '',
            'customer_id': self.customer_id,
            'customer_name': self.customer_name or '',
            'supplier': self.supplier or '',
            'handler': self.handler or self.staff_name or '',
            'staff_name': self.staff_name or self.handler or '',
            'payment_method': self.payment_method or 'cash',
            'is_invoiced': invoiced_val,
            'receipt_photos': receipt_list,
            'remark': self.remark or '',
            'note': self.remark or '',
            'created_by': self.created_by or '',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ExpenseCategory(db.Model):
    __tablename__ = 'expense_categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    expense_type = db.Column(db.String(20), default='daily')  # purchase/daily/other
    sort_order = db.Column(db.Integer, default=0)
    is_system = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'expense_type': self.expense_type or 'daily',
            'sort_order': self.sort_order or 0,
            'is_system': self.is_system
        }


class RepairEquipment(db.Model):
    __tablename__ = 'repair_equipments'
    id = db.Column(db.Integer, primary_key=True)
    work_record_id = db.Column(db.Integer, db.ForeignKey('work_records.id'), nullable=False, index=True)
    system_type = db.Column(db.String(50), default='')
    device_name = db.Column(db.String(100), default='')
    device_model = db.Column(db.String(100), default='')
    device_brand = db.Column(db.String(50), default='')
    quantity = db.Column(db.Integer, default=1)
    location = db.Column(db.String(200), default='')
    fault_description = db.Column(db.Text, default='')
    repair_method = db.Column(db.String(50), default='')
    repair_result = db.Column(db.String(50), default='')
    unit_price = db.Column(db.Float, default=0.0)
    subtotal = db.Column(db.Float, default=0.0)
    remark = db.Column(db.Text, default='')
    material_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'work_record_id': self.work_record_id,
            'system_type': self.system_type or '',
            'device_name': self.device_name or '',
            'device_model': self.device_model or '',
            'device_brand': self.device_brand or '',
            'quantity': self.quantity or 1,
            'location': self.location or '',
            'fault_description': self.fault_description or '',
            'repair_method': self.repair_method or '',
            'repair_result': self.repair_result or '',
            'unit_price': self.unit_price or 0,
            'subtotal': self.subtotal or 0,
            'remark': self.remark or '',
            'material_id': self.material_id,
            'created_at': self.created_at.isoformat()
        }
