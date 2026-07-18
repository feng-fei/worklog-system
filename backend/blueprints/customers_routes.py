from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import customers_bp
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


@customers_bp.route('/customers', methods=['GET'])
@login_required
def get_customers():
    try:
        q = request.args.get('q', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', request.args.get('page_size', 100)))
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
        pagination = query.order_by(Customer.name).paginate(page=page, per_page=per_page, error_out=False)
        return jsonify({
            'records': [c.to_dict() for c in pagination.items],
            'customers': [c.to_dict() for c in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/customers', methods=['POST'])
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
            remark=data.get('remark', ''),
            invoice_title=data.get('invoice_title', ''),
            tax_number=data.get('tax_number', ''),
            bank_name=data.get('bank_name', ''),
            bank_account=data.get('bank_account', ''),
            invoice_address=data.get('invoice_address', ''),
            invoice_phone=data.get('invoice_phone', '')
        )
        db.session.add(customer)
        db.session.commit()
        return jsonify(customer.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/customers/<int:customer_id>', methods=['GET'])
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


@customers_bp.route('/customers/<int:customer_id>/overview', methods=['GET'])
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


@customers_bp.route('/customers/<int:customer_id>', methods=['PUT'])
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
        invoice_fields = ['invoice_title', 'tax_number', 'bank_name', 'bank_account', 'invoice_address', 'invoice_phone']
        for field in invoice_fields:
            if field in data:
                setattr(customer, field, data[field])
        db.session.commit()
        return jsonify(customer.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
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


@customers_bp.route('/customer-equipments', methods=['GET'])
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



@customers_bp.route('/customer-equipments/<int:equip_id>', methods=['GET'])
@login_required
def get_customer_equipment(equip_id):
    try:
        equip = CustomerEquipment.query.get_or_404(equip_id)
        return jsonify(equip.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@customers_bp.route('/customer-equipments', methods=['POST'])
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



@customers_bp.route('/customer-equipments/<int:equip_id>', methods=['PUT'])
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



@customers_bp.route('/customer-equipments/<int:equip_id>', methods=['DELETE'])
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



@customers_bp.route('/maintenance-plans', methods=['GET'])
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



@customers_bp.route('/maintenance-plans/<int:plan_id>', methods=['GET'])
@login_required
def get_maintenance_plan(plan_id):
    try:
        plan = MaintenancePlan.query.get_or_404(plan_id)
        return jsonify(plan.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@customers_bp.route('/maintenance-plans', methods=['POST'])
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



@customers_bp.route('/maintenance-plans/<int:plan_id>', methods=['PUT'])
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



@customers_bp.route('/maintenance-plans/<int:plan_id>', methods=['DELETE'])
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



@customers_bp.route('/maintenance-plans/generate-todos', methods=['POST'])
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


