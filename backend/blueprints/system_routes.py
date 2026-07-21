from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required, get_login_user_name
from ..utils import *
from . import system_bp
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


@system_bp.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'API is working!', 'status': 'ok'})


@system_bp.route('/health', methods=['GET'])
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


@system_bp.route('/operation-logs', methods=['GET'])
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
            'records': [log.to_dict() for log in pagination.items],
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
        from ..models import SystemSetting
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



@system_bp.route('/operation-logs/<int:log_id>', methods=['GET'])
@login_required
@admin_required
def get_operation_log(log_id):
    try:
        log = OperationLog.query.get_or_404(log_id)
        return jsonify(log.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@system_bp.route('/operation-logs/<int:log_id>/restore', methods=['POST'])
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
                staff_names_data = data.get('staff_names', [])
                if staff_names_data:
                    if isinstance(staff_names_data, list):
                        existing.staff_names = ','.join(staff_names_data)
                    else:
                        existing.staff_names = str(staff_names_data)
                existing.staff_name = data.get('staff_name', '')
                temp_staff_data = data.get('temp_staff_details', [])
                if temp_staff_data:
                    existing.temp_staff_details = json.dumps(temp_staff_data, ensure_ascii=False)
                else:
                    existing.temp_staff_details = ''
                existing.record_type = data.get('record_type', 'construction')
                existing.work_content = data.get('work_content', '')
                existing.fault_description = data.get('fault_description', '')
                existing.fault_diagnosis = data.get('fault_diagnosis', '')
                existing.repair_process = data.get('repair_process', '')
                existing.repair_result = data.get('repair_result', 'completed')
                existing.incomplete_reason_type = data.get('incomplete_reason_type', '')
                existing.incomplete_reason = data.get('incomplete_reason', '')
                photos_data = data.get('work_photos') or data.get('photos', [])
                if photos_data is not None:
                    from ..utils import parse_list_field, serialize_list_field
                    existing.work_photos = serialize_list_field(parse_list_field(photos_data)) or None
                if data.get('work_date'):
                    try:
                        existing.work_date = datetime.fromisoformat(data['work_date'].replace('Z', '+00:00'))
                    except:
                        try:
                            existing.work_date = datetime.strptime(data['work_date'][:10], '%Y-%m-%d')
                        except:
                            pass
                existing.start_time = data.get('start_time', '')
                existing.end_time = data.get('end_time', '')
                existing.work_hours = data.get('work_hours', 0) or 0
                existing.labor_fee = data.get('labor_fee', 0) or 0
                existing.material_fee = data.get('material_fee', 0) or 0
                existing.transport_fee = data.get('transport_fee', 0) or 0
                existing.other_fee = data.get('other_fee', 0) or 0
                existing.total_fee = data.get('total_fee', 0) or 0
                existing.tax_type = data.get('tax_type', 'no')
                existing.tax_rate = (data.get('tax_rate', 0) or 0) / 100.0 if data.get('tax_rate', 0) and data.get('tax_rate', 0) > 1 else (data.get('tax_rate', 0) or 0)
                existing.tax_amount = data.get('tax_amount', 0) or 0
                existing.remark = data.get('remark', '')
                existing.is_completed = data.get('is_completed', True)
                existing.status = data.get('status', 'pending')
                existing.payment_status = data.get('payment_status', 'unpaid')
                existing.paid_amount = data.get('paid_amount', 0) or 0
                existing.work_subtype = data.get('work_subtype', '')
                existing.priority = data.get('priority', 'normal')
                existing.order_no = data.get('order_no', '')
                fee_items_data = data.get('fee_items', [])
                if fee_items_data:
                    if isinstance(fee_items_data, list):
                        existing.fee_items = json.dumps(fee_items_data, ensure_ascii=False)
                    else:
                        existing.fee_items = str(fee_items_data)
                else:
                    existing.fee_items = ''
                existing.project_id = data.get('project_id')
                existing.involved_systems = data.get('involved_systems', '')
                existing.service_category = data.get('service_category', '')
                existing.warranty_status = data.get('warranty_status', 'none')
                existing.warranty_days = data.get('warranty_days', 0) or 0
                existing.accept_time = data.get('accept_time', '')
                existing.customer_feedback = data.get('customer_feedback', '')
                existing.satisfaction = data.get('satisfaction', '')
                existing.created_by = data.get('created_by', '')
                existing.updated_at = datetime.now()
                _sync_salary_records_for_work(existing)
                msg = '工单已恢复'
            else:
                staff_names_data = data.get('staff_names', [])
                from ..utils import parse_list_field, serialize_list_field
                staff_names_str = serialize_list_field(parse_list_field(staff_names_data))
                temp_staff_data = data.get('temp_staff_details', [])
                temp_staff_str = json.dumps(temp_staff_data, ensure_ascii=False) if temp_staff_data else ''
                photos_data = data.get('work_photos') or data.get('photos', [])
                photos_str = serialize_list_field(parse_list_field(photos_data)) or None
                fee_items_data = data.get('fee_items', [])
                fee_items_str = json.dumps(fee_items_data, ensure_ascii=False) if fee_items_data else ''
                tax_rate_val = data.get('tax_rate', 0.03) or 0.03
                if tax_rate_val > 1:
                    tax_rate_val = tax_rate_val / 100.0
                work_date_val = datetime.now()
                if data.get('work_date'):
                    try:
                        work_date_val = datetime.fromisoformat(data['work_date'].replace('Z', '+00:00'))
                    except:
                        try:
                            work_date_val = datetime.strptime(data['work_date'][:10], '%Y-%m-%d')
                        except:
                            pass
                record = WorkRecord(
                    customer_name=data.get('customer_name', ''),
                    contact_name=data.get('contact_name', ''),
                    customer_phone=data.get('customer_phone', ''),
                    work_address=data.get('work_address', ''),
                    staff_names=staff_names_str,
                    staff_name=data.get('staff_name', ''),
                    temp_staff_details=temp_staff_str,
                    record_type=data.get('record_type', 'construction'),
                    work_content=data.get('work_content', ''),
                    fault_description=data.get('fault_description', ''),
                    fault_diagnosis=data.get('fault_diagnosis', ''),
                    repair_process=data.get('repair_process', ''),
                    repair_result=data.get('repair_result', 'completed'),
                    incomplete_reason_type=data.get('incomplete_reason_type', ''),
                    incomplete_reason=data.get('incomplete_reason', ''),
                    work_photos=photos_str,
                    work_date=work_date_val,
                    start_time=data.get('start_time', ''),
                    end_time=data.get('end_time', ''),
                    labor_fee=data.get('labor_fee', 0) or 0,
                    material_fee=data.get('material_fee', 0) or 0,
                    transport_fee=data.get('transport_fee', 0) or 0,
                    other_fee=data.get('other_fee', 0) or 0,
                    total_fee=data.get('total_fee', 0) or 0,
                    tax_type=data.get('tax_type', 'no'),
                    tax_rate=tax_rate_val,
                    tax_amount=data.get('tax_amount', 0) or 0,
                    remark=data.get('remark', ''),
                    is_completed=data.get('is_completed', True),
                    status=data.get('status', 'pending'),
                    payment_status=data.get('payment_status', 'unpaid'),
                    paid_amount=data.get('paid_amount', 0) or 0,
                    work_subtype=data.get('work_subtype', ''),
                    priority=data.get('priority', 'normal'),
                    order_no=data.get('order_no', ''),
                    fee_items=fee_items_str,
                    project_id=data.get('project_id'),
                    involved_systems=data.get('involved_systems', ''),
                    service_category=data.get('service_category', ''),
                    warranty_status=data.get('warranty_status', 'none'),
                    warranty_days=data.get('warranty_days', 0) or 0,
                    accept_time=data.get('accept_time', ''),
                    customer_feedback=data.get('customer_feedback', ''),
                    satisfaction=data.get('satisfaction', ''),
                    created_by=data.get('created_by', ''),
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
        
        elif log.target_type == 'customer':
            existing = Customer.query.get(log.target_id)
            if existing:
                existing.name = data.get('name', existing.name)
                existing.short_name = data.get('short_name', '')
                existing.full_name = data.get('full_name', '')
                existing.credit_code = data.get('credit_code', '')
                existing.contact_name = data.get('contact_name', '')
                existing.phone = data.get('phone', '')
                existing.address = data.get('address', '')
                existing.remark = data.get('remark', '')
                existing.invoice_title = data.get('invoice_title', '')
                existing.tax_number = data.get('tax_number', '')
                existing.bank_name = data.get('bank_name', '')
                existing.bank_account = data.get('bank_account', '')
                existing.invoice_address = data.get('invoice_address', '')
                existing.invoice_phone = data.get('invoice_phone', '')
                msg = '客户已恢复'
            else:
                customer = Customer(
                    name=data.get('name', ''),
                    short_name=data.get('short_name', ''),
                    full_name=data.get('full_name', ''),
                    credit_code=data.get('credit_code', ''),
                    contact_name=data.get('contact_name', ''),
                    phone=data.get('phone', ''),
                    address=data.get('address', ''),
                    remark=data.get('remark', ''),
                    invoice_title=data.get('invoice_title', ''),
                    tax_number=data.get('tax_number', ''),
                    bank_name=data.get('bank_name', ''),
                    bank_account=data.get('bank_account', ''),
                    invoice_address=data.get('invoice_address', ''),
                    invoice_phone=data.get('invoice_phone', '')
                )
                db.session.add(customer)
                msg = '客户已重新创建'
        
        elif log.target_type == 'project':
            existing = Project.query.get(log.target_id)
            project_data = {}
            
            auto_fields = {'id', 'created_at', 'updated_at'}
            date_fields = {'start_date', 'end_date', 'actual_start_date', 'actual_end_date'}
            
            for column in Project.__table__.columns:
                key = column.name
                if key in auto_fields:
                    continue
                if key in date_fields:
                    if data.get(key):
                        try:
                            project_data[key] = datetime.fromisoformat(str(data[key]).replace('Z', '+00:00')).date()
                        except:
                            try:
                                project_data[key] = datetime.strptime(str(data[key])[:10], '%Y-%m-%d').date()
                            except:
                                pass
                else:
                    if key in data:
                        project_data[key] = data[key]
            
            if existing:
                for k, v in project_data.items():
                    setattr(existing, k, v)
                msg = '项目已恢复'
            else:
                project = Project(**project_data)
                db.session.add(project)
                msg = '项目已重新创建'
        
        else:
            return jsonify({'error': '不支持的恢复类型'}), 400
        
        db.session.commit()
        return jsonify({'message': msg})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@system_bp.route('/operation-logs/cleanup', methods=['POST'])
@login_required
@admin_required
def cleanup_operation_logs():
    """清理过期操作日志"""
    try:
        from ..models import SystemSetting
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



@system_bp.route('/operation-logs/stats', methods=['GET'])
@login_required
@admin_required
def get_oplog_stats():
    """获取操作日志统计信息"""
    try:
        from ..models import SystemSetting
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

@system_bp.route('/upload', methods=['POST'])
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


@system_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    """获取上传的照片"""
    folder = current_app.config['UPLOAD_FOLDER']
    if not os.path.isabs(folder):
        folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', folder)
    return send_from_directory(os.path.abspath(folder), filename)


# ===================== 系统设置 =====================


@system_bp.route('/settings', methods=['GET'])
@admin_required
def get_settings():
    """获取所有系统设置"""
    try:
        from ..models import SystemSetting
        settings = SystemSetting.query.all()
        return jsonify({s.key: s.value for s in settings})
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@system_bp.route('/settings', methods=['POST'])
@admin_required
def update_settings():
    """更新系统设置"""
    try:
        from ..models import SystemSetting
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


@system_bp.route('/backup/create', methods=['POST'])
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



@system_bp.route('/backup/list', methods=['GET'])
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
        return jsonify({
            'records': backups,
            'backups': backups,
            'total': len(backups)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@system_bp.route('/backup/download/<filename>', methods=['GET'])
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



@system_bp.route('/backup/restore', methods=['POST'])
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


@system_bp.route('/backup/<filename>', methods=['DELETE'])
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


@system_bp.route('/notifications', methods=['GET'])
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



@system_bp.route('/notifications/unread-count', methods=['GET'])
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



@system_bp.route('/notifications/<int:notify_id>/read', methods=['POST'])
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



@system_bp.route('/notifications/read-all', methods=['POST'])
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



@system_bp.route('/notifications/<int:notify_id>', methods=['DELETE'])
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



@system_bp.route('/notifications/clear-read', methods=['POST'])
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



@system_bp.route('/notifications/create', methods=['POST'])
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


_indexes_initialized = False
_scheduler_started = False
_scheduler_thread = None


def _get_backup_dir():
    backup_dir = '/app/data/backups'
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir


def _perform_backup():
    try:
        import shutil
        db_path = '/app/data/worklog.db'
        if not os.path.exists(db_path):
            return False, '数据库文件不存在'
        backup_dir = _get_backup_dir()
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'worklog_auto_{ts}.db'
        backup_path = os.path.join(backup_dir, backup_name)
        shutil.copy2(db_path, backup_path)
        
        setting = SystemSetting.query.filter_by(key='backup_keep_count').first()
        keep_count = int(setting.value) if setting and setting.value.isdigit() else 10
        backups = sorted([f for f in os.listdir(backup_dir) if f.endswith('.db')], reverse=True)
        for old in backups[keep_count:]:
            try:
                os.remove(os.path.join(backup_dir, old))
            except:
                pass
        print(f'[定时备份] 自动备份成功: {backup_name}', flush=True)
        return True, backup_name
    except Exception as e:
        print(f'[定时备份] 自动备份失败: {e}', flush=True)
        return False, str(e)


def _scheduler_loop():
    import time
    last_run_date = None
    while True:
        try:
            time.sleep(60)
            with current_app.app_context():
                enabled_setting = SystemSetting.query.filter_by(key='backup_enabled').first()
                if not enabled_setting or enabled_setting.value != '1':
                    continue
                
                freq_setting = SystemSetting.query.filter_by(key='backup_frequency').first()
                frequency = freq_setting.value if freq_setting else 'daily'
                
                time_setting = SystemSetting.query.filter_by(key='backup_time').first()
                backup_time = time_setting.value if time_setting else '02:00'
                
                try:
                    hour, minute = map(int, backup_time.split(':'))
                except:
                    hour, minute = 2, 0
                
                now = datetime.now()
                today_str = now.strftime('%Y-%m-%d')
                
                should_run = False
                if frequency == 'daily':
                    if last_run_date != today_str and now.hour == hour and now.minute >= minute:
                        should_run = True
                elif frequency == 'weekly':
                    weekday_setting = SystemSetting.query.filter_by(key='backup_weekday').first()
                    weekday = int(weekday_setting.value) if weekday_setting and weekday_setting.value.isdigit() else 0
                    if last_run_date != today_str and now.weekday() == weekday and now.hour == hour and now.minute >= minute:
                        should_run = True
                elif frequency == 'monthly':
                    day_setting = SystemSetting.query.filter_by(key='backup_day').first()
                    day = int(day_setting.value) if day_setting and day_setting.value.isdigit() else 1
                    if last_run_date != today_str and now.day == day and now.hour == hour and now.minute >= minute:
                        should_run = True
                
                if should_run:
                    _perform_backup()
                    last_run_date = today_str
        except Exception as e:
            print(f'[定时备份] 调度器错误: {e}', flush=True)


def _start_scheduler():
    global _scheduler_started, _scheduler_thread
    if _scheduler_started:
        return
    _scheduler_started = True
    import threading
    _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True)
    _scheduler_thread.start()
    print('[定时备份] 调度器已启动', flush=True)


@system_bp.before_app_request
def _init_indexes_on_first_request():
    global _indexes_initialized
    if not _indexes_initialized:
        _indexes_initialized = True
        try:
            _ensure_indexes()
        except Exception:
            pass
    _start_scheduler()


@system_bp.route('/backup/settings', methods=['GET'])
@admin_required
def get_backup_settings():
    try:
        settings = {}
        keys = ['backup_enabled', 'backup_frequency', 'backup_time', 'backup_keep_count', 'backup_weekday', 'backup_day']
        defaults = {
            'backup_enabled': '0',
            'backup_frequency': 'daily',
            'backup_time': '02:00',
            'backup_keep_count': '10',
            'backup_weekday': '0',
            'backup_day': '1',
        }
        for key in keys:
            s = SystemSetting.query.filter_by(key=key).first()
            settings[key] = s.value if s else defaults.get(key, '')
        return jsonify(settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@system_bp.route('/backup/settings', methods=['POST'])
@admin_required
def update_backup_settings():
    try:
        data = request.get_json() or {}
        keys = ['backup_enabled', 'backup_frequency', 'backup_time', 'backup_keep_count', 'backup_weekday', 'backup_day']
        for key in keys:
            if key in data:
                s = SystemSetting.query.filter_by(key=key).first()
                value = str(data[key])
                if s:
                    s.value = value
                else:
                    db.session.add(SystemSetting(key=key, value=value))
        db.session.commit()
        return jsonify({'message': '备份设置已保存'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@system_bp.route('/backup/run-now', methods=['POST'])
@admin_required
def run_backup_now():
    try:
        success, result = _perform_backup()
        if success:
            return jsonify({'message': '备份成功', 'filename': result})
        else:
            return jsonify({'error': result}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@system_bp.route('/settings/oplog-retention', methods=['POST'])
@admin_required
def set_oplog_retention():
    try:
        data = request.get_json() or {}
        days = data.get('days', 90)
        try:
            days = int(days)
        except:
            days = 90
        if days not in [90, 180, 365, 0]:
            return jsonify({'error': '保留天数只能是90/180/365天或永久(0)'}), 400
        s = SystemSetting.query.filter_by(key='oplog_retention_days').first()
        if s:
            s.value = str(days)
        else:
            db.session.add(SystemSetting(key='oplog_retention_days', value=str(days)))
        db.session.commit()
        return jsonify({'message': '日志保留设置已保存', 'days': days})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@system_bp.route('/settings/oplog-retention', methods=['GET'])
@admin_required
def get_oplog_retention():
    try:
        s = SystemSetting.query.filter_by(key='oplog_retention_days').first()
        days = int(s.value) if s and s.value.isdigit() else 90
        return jsonify({'days': days})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

