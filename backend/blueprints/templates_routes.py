from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import templates_bp
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


@templates_bp.route('/templates', methods=['GET'])
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



@templates_bp.route('/templates/<int:template_id>', methods=['GET'])
@login_required
def get_template(template_id):
    try:
        template = WorkTemplate.query.get_or_404(template_id)
        return jsonify(template.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@templates_bp.route('/templates', methods=['POST'])
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



@templates_bp.route('/templates/<int:template_id>', methods=['PUT'])
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



@templates_bp.route('/templates/<int:template_id>', methods=['DELETE'])
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



@templates_bp.route('/templates/<int:template_id>/apply', methods=['POST'])
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


