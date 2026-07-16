from . import db

from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash



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

    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):

        return {'id':self.id,'name':self.name,'short_name':self.short_name or self.name,'full_name':self.full_name or self.name,'credit_code':self.credit_code or '','contact_name':self.contact_name or '','phone':self.phone,'address':self.address,'remark':self.remark,'created_at':self.created_at.isoformat()}


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

    id_photo = db.Column(db.String(200), default='')  # 身份证照片路径

    cert_photo = db.Column(db.String(200), default='')  # 职业证书照片

    hire_date = db.Column(db.String(10), default='')

    remark = db.Column(db.Text, default='')

    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):

        return {'id':self.id,'name':self.name,'phone':self.phone,'staff_type':self.staff_type,'daily_wage':self.daily_wage,'monthly_salary':self.monthly_salary,'project':self.project,'position':self.position,'id_card':self.id_card,'id_photo':self.id_photo,'cert_photo':self.cert_photo,'hire_date':self.hire_date,'remark':self.remark}



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
    
    # 新增字段（润色改进）
    device_brand = db.Column(db.String(50), default='')  # 设备品牌
    device_model = db.Column(db.String(100), default='')  # 设备型号
    device_sn = db.Column(db.String(100), default='')  # 设备序列号
    involved_systems = db.Column(db.Text, default='')  # 涉及系统/设备（系统级维修）
    arrival_time = db.Column(db.String(10), default='')  # 到达时间
    completion_time = db.Column(db.String(10), default='')  # 完工时间
    customer_feedback = db.Column(db.Text, default='')  # 客户意见
    satisfaction = db.Column(db.String(20), default='')  # 满意度：满意/比较满意/一般/不满意
    service_category = db.Column(db.String(30), default='')  # 服务类别：新装/维修/保养/巡检/移机
    warranty_status = db.Column(db.String(20), default='')  # 保修状态：在保/过保/无保
    warranty_days = db.Column(db.Integer, default=0)  # 保修天数
    
    # 弱电安防维修工单新字段
    fault_phenomenon = db.Column(db.Text, default='')  # 故障现象
    fault_cause = db.Column(db.Text, default='')  # 故障原因
    repair_solution = db.Column(db.Text, default='')  # 维修方案
    equipment_fee_total = db.Column(db.Float, default=0.0)  # 设备费合计（自动计算）
    debug_fee = db.Column(db.Float, default=0.0)  # 调试费
    survey_time = db.Column(db.String(10), default='')  # 勘查时间
    quote_time = db.Column(db.String(10), default='')  # 报价时间
    repair_start_time = db.Column(db.String(10), default='')  # 维修开始时间
    repair_end_time = db.Column(db.String(10), default='')  # 维修结束时间
    accept_time = db.Column(db.String(10), default='')  # 验收时间
    customer_signature = db.Column(db.Text, default='')  # 客户签名（base64图片）

    def to_dict(self):

        import json

        return {

            'id': self.id,

            'order_no': self.order_no,

            'customer_name': self.customer_name,

            'contact_name': self.contact_name or '',
            'customer_phone': self.customer_phone,

            'work_address': self.work_address,

            'staff_names': self.staff_names.split(',') if self.staff_names else ([''] if self.staff_name else []),

            'staff_name': self.staff_name,

            'temp_staff_details': json.loads(self.temp_staff_details) if self.temp_staff_details else [],

            'record_type': self.record_type,

            'work_content': self.work_content,

            'fault_description': self.fault_description,

            'fault_diagnosis': self.fault_diagnosis,

            'repair_process': self.repair_process,

            'repair_result': self.repair_result,

            'incomplete_reason_type': self.incomplete_reason_type or '',
            'incomplete_reason': self.incomplete_reason or '',
            'work_photos': self.work_photos.split(',') if self.work_photos else [],

            'work_date': self.work_date.isoformat(),

            'start_time': self.start_time,

            'end_time': self.end_time,

            'labor_fee': self.labor_fee,

            'material_fee': self.material_fee,

            'transport_fee': self.transport_fee,

            'other_fee': self.other_fee,

            'total_fee': self.total_fee,

            'tax_type': self.tax_type or 'no',

            'tax_rate': (self.tax_rate or 0) * 100,

            'tax_amount': self.tax_amount or 0,

            'remark': self.remark,

            'is_completed': self.is_completed,

            'status': self.status or 'pending',

            'payment_status': self.payment_status or 'unpaid',

            'paid_amount': self.paid_amount or 0,

            'work_subtype': self.work_subtype or '',

            'priority': self.priority or 'normal',

            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'device_brand': self.device_brand or '',
            'device_model': self.device_model or '',
            'device_sn': self.device_sn or '',
            'involved_systems': self.involved_systems or '',
            'arrival_time': self.arrival_time or '',
            'completion_time': self.completion_time or '',
            'customer_feedback': self.customer_feedback or '',
            'satisfaction': self.satisfaction or '',
            'service_category': self.service_category or '',
            'warranty_status': self.warranty_status or '',
            'warranty_days': self.warranty_days or 0,
            'fault_phenomenon': self.fault_phenomenon or '',
            'fault_cause': self.fault_cause or '',
            'repair_solution': self.repair_solution or '',
            'equipment_fee_total': self.equipment_fee_total or 0,
            'debug_fee': self.debug_fee or 0,
            'survey_time': self.survey_time or '',
            'quote_time': self.quote_time or '',
            'repair_start_time': self.repair_start_time or '',
            'repair_end_time': self.repair_end_time or '',
            'accept_time': self.accept_time or '',
            'customer_signature': self.customer_signature or ''
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

    reminder_date = db.Column(db.DateTime, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.now)

    status = db.Column(db.String(20), default='pending')

    todo_type = db.Column(db.String(30), default='客户报修')

    contact_phone = db.Column(db.String(20), default='')

    priority = db.Column(db.String(20), default='normal')

    related_record_type = db.Column(db.String(20), default='')

    related_record_id = db.Column(db.Integer)

    def to_dict(self):

        return {'id':self.id,'title':self.title,'customer_name':self.customer_name,'contact_name':self.contact_name or '','work_address':self.work_address,'staff_name':self.staff_name,'work_content':self.work_content,'reminder_date':self.reminder_date.isoformat(),'status':self.status,'todo_type':self.todo_type or '客户报修','contact_phone':self.contact_phone or '','priority':self.priority or 'normal','related_record_type':self.related_record_type or '','related_record_id':self.related_record_id}


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

    staff_name = db.Column(db.String(100), nullable=False)

    staff_type = db.Column(db.String(20), default='temp')

    work_date = db.Column(db.DateTime, nullable=False, default=datetime.now)

    business_type = db.Column(db.String(20), default='其他')  # 施工记录/维修工单/其他

    business_no = db.Column(db.String(50), default='')

    business_record_id = db.Column(db.Integer)

    customer_name = db.Column(db.String(100), default='')

    work_content = db.Column(db.Text, default='')

    salary_type = db.Column(db.String(20), default='日薪')

    daily_wage = db.Column(db.Float, default=0.0)

    work_units = db.Column(db.Float, default=1.0)  # 天数，8小时=1天

    subsidy = db.Column(db.Float, default=0.0)

    deduction = db.Column(db.Float, default=0.0)

    payable_amount = db.Column(db.Float, default=0.0)

    paid_amount = db.Column(db.Float, default=0.0)

    status = db.Column(db.String(20), default='unsettled')  # unsettled/settled

    settlement_date = db.Column(db.String(10), default='')

    payment_method = db.Column(db.String(20), default='')

    remark = db.Column(db.Text, default='')

    created_at = db.Column(db.DateTime, default=datetime.now)

    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)



    def to_dict(self):

        return {

            'id': self.id,

            'salary_no': self.salary_no,

            'staff_name': self.staff_name,

            'staff_type': self.staff_type,

            'work_date': self.work_date.isoformat(),

            'business_type': self.business_type,

            'business_no': self.business_no,

            'business_record_id': self.business_record_id,

            'customer_name': self.customer_name,

            'work_content': self.work_content,

            'salary_type': self.salary_type,

            'daily_wage': self.daily_wage or 0,

            'work_units': self.work_units or 0,

            'subsidy': self.subsidy or 0,

            'deduction': self.deduction or 0,

            'payable_amount': self.payable_amount or 0,

            'paid_amount': self.paid_amount or 0,

            'status': self.status or 'unsettled',

            'settlement_date': self.settlement_date or '',

            'payment_method': self.payment_method or '',

            'remark': self.remark or '',

            'created_at': self.created_at.isoformat()

        }


class RepairEquipment(db.Model):
    """维修工单设备明细表"""
    __tablename__ = 'repair_equipments'

    # 预设值
    SYSTEM_TYPES = [
        '视频监控', '门禁系统', '网络系统', '综合布线', 
        '低压强电', '广播系统', '停车系统', '楼宇对讲', 
        '巡更系统', '其他'
    ]
    
    REPAIR_METHODS = ['维修', '更换', '调试', '新增设备', '移机', '其他']
    
    REPAIR_RESULTS = [
        '缺少配件', '设备需更换', '客户现场条件不具备', 
        '需厂家/上级技术支持', '客户改期', '费用/报价待确认', '其他原因'
    ]

    id = db.Column(db.Integer, primary_key=True)
    work_record_id = db.Column(db.Integer, db.ForeignKey('work_records.id'), nullable=False)

    # 设备信息
    system_type = db.Column(db.String(50), default='')       # 系统类型
    device_name = db.Column(db.String(100), default='')      # 设备名称
    device_model = db.Column(db.String(100), default='')     # 设备型号
    device_brand = db.Column(db.String(50), default='')      # 设备品牌
    quantity = db.Column(db.Integer, default=1)              # 数量
    location = db.Column(db.String(200), default='')         # 安装位置

    # 故障信息
    fault_description = db.Column(db.Text, default='')       # 故障描述

    # 维修信息
    repair_method = db.Column(db.String(50), default='')     # 维修方式
    repair_result = db.Column(db.String(50), default='')     # 维修结果

    # 报价
    unit_price = db.Column(db.Float, default=0.0)            # 单价
    subtotal = db.Column(db.Float, default=0.0)              # 小计

    # 备注
    remark = db.Column(db.Text, default='')                  # 备注

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
            'created_at': self.created_at.isoformat()
        }


