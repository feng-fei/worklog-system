from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import pending_bp
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


@pending_bp.route('/pending', methods=['GET'])
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
        return jsonify({'error': str(e)}), 500


@pending_bp.route('/pending', methods=['POST'])
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
        db.session.flush()
        if pending.staff_name:
            staff_list = [s.strip() for s in pending.staff_name.split(',') if s.strip()]
            for staff in staff_list:
                staff_user = WorkerUser.query.filter_by(staff_name=staff, enabled=True).first()
                if staff_user:
                    _create_notification(staff_user.username,
                        f'新待办: {pending.title or pending.customer_name}',
                        f'{pending.customer_name}有新的{pending.todo_type}待办，日期{pending.reminder_date.strftime("%m-%d")}',
                        'info', 'pending_work', pending.id)
        else:
            _notify_admins(f'新待办: {pending.title or pending.customer_name}',
                f'{pending.customer_name}创建了新的{pending.todo_type}待办，请及时指派',
                'info', 'pending_work', pending.id)
        db.session.commit()
        return jsonify(pending.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@pending_bp.route('/pending/<int:pending_id>', methods=['PUT'])
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


@pending_bp.route('/pending/<int:pending_id>/complete', methods=['POST'])
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


@pending_bp.route('/pending/<int:pending_id>', methods=['DELETE'])
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


@pending_bp.route('/pending/batch', methods=['POST'])
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



