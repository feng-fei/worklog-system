from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import records_bp
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


@records_bp.route('/records', methods=['GET'])
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


@records_bp.route('/records', methods=['POST'])
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
            if allowed_file(file):
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
        eq_fee = get_float('equipment_fee_total')
        transport = get_float('transport_fee')
        other = get_float('other_fee')
        
        fee_items_raw = request.form.get('fee_items', '[]')
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
            equipment_fee_total=eq_fee,
            transport_fee=transport,
            other_fee=other,
            total_fee=labor + material + eq_fee + transport + other,
            payment_status=request.form.get('payment_status', 'unpaid'),
            paid_amount=get_float('paid_amount'),
            work_subtype=request.form.get('work_subtype', ''),
            priority=request.form.get('priority', 'normal'),
            tax_type=request.form.get('tax_type', 'no'),
            tax_rate=float(request.form.get('tax_rate', 0.03) or 0.03),
            tax_amount=0,
            fee_items=json.dumps(fee_items, ensure_ascii=False) if fee_items else '',
            remark=request.form.get('remark', ''),
            work_photos=','.join(photo_paths) if photo_paths else None,
            is_completed=True,
            created_by=get_login_user_name(),
            involved_systems=request.form.get('involved_systems', ''),
            service_category=request.form.get('service_category', ''),
            warranty_status=request.form.get('warranty_status', 'none'),
            warranty_days=int(request.form.get('warranty_days', 0) or 0),
            accept_time=request.form.get('accept_time', ''),
            customer_feedback=request.form.get('customer_feedback', ''),
            satisfaction=request.form.get('satisfaction', '')
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

        result = record.to_dict()
        warnings = getattr(g, '_stock_warnings', None)
        if warnings:
            result['warnings'] = warnings
        return jsonify(result), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@records_bp.route('/records/<int:record_id>', methods=['GET'])
@login_required
def get_record(record_id):
    try:
        record = WorkRecord.query.get_or_404(record_id)
        if not _can_access_record(record):
            return jsonify({'error': '无权访问该工单'}), 403
        return jsonify(record.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@records_bp.route('/records/<int:record_id>', methods=['PUT'])
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
        status_labels = {'pending':'待处理','dispatched':'已派单','in_progress':'处理中','callback':'待回访','settlement':'待结算','completed':'已完成','unable':'无法维修','cancelled':'已取消','rework':'返工'}
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


@records_bp.route('/records/<int:record_id>', methods=['DELETE'])
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


@records_bp.route('/export/records', methods=['GET'])
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



@records_bp.route('/export/pdf/<int:record_id>', methods=['GET'])
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



@records_bp.route('/export/pdf', methods=['GET'])
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



@records_bp.route('/records/<int:record_id>/edits', methods=['GET'])
@login_required
def get_record_edits(record_id):
    from .models import RecordEditLog
    logs = RecordEditLog.query.filter_by(record_id=record_id).order_by(RecordEditLog.edited_at.desc()).all()
    return jsonify([l.to_dict() for l in logs])


# ===================== 仪表盘 =====================


@records_bp.route('/calendar', methods=['GET'])
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


@records_bp.route('/records/<int:record_id>/payments', methods=['GET'])
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


@records_bp.route('/records/batch', methods=['POST'])
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



