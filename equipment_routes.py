#!/usr/bin/env python3
"""设备明细 API 路由"""
from flask import Blueprint, request, jsonify
from app import db
from app.models import WorkRecord, RepairEquipment
from app.auth import login_required

equipment_bp = Blueprint('equipment', __name__)

@equipment_bp.route('/records/<int:record_id>/equipments', methods=['GET'])
@login_required
def get_equipments(record_id):
    """获取工单的设备明细"""
    equipments = RepairEquipment.query.filter_by(work_record_id=record_id).all()
    return jsonify([e.to_dict() for e in equipments])

@equipment_bp.route('/records/<int:record_id>/equipments', methods=['POST'])
@login_required
def add_equipment(record_id):
    """添加设备明细"""
    data = request.json
    
    # 验证工单存在
    record = WorkRecord.query.get(record_id)
    if not record:
        return jsonify({'error': '工单不存在'}), 404
    
    # 创建新设备
    equipment = RepairEquipment(
        work_record_id=record_id,
        system_type=data.get('system_type', ''),
        device_name=data.get('device_name', ''),
        device_model=data.get('device_model', ''),
        device_brand=data.get('device_brand', ''),
        quantity=data.get('quantity', 1),
        location=data.get('location', ''),
        fault_description=data.get('fault_description', ''),
        repair_method=data.get('repair_method', ''),
        repair_result=data.get('repair_result', ''),
        unit_price=data.get('unit_price', 0),
        subtotal=data.get('subtotal', 0),
        remark=data.get('remark', '')
    )
    
    db.session.add(equipment)
    
    # 更新工单的设备费合计
    equipments = RepairEquipment.query.filter_by(work_record_id=record_id).all()
    total = sum(e.subtotal for e in equipments) + (equipment.subtotal or 0)
    record.equipment_fee_total = total
    record.total_fee = total + (record.labor_fee or 0) + (record.debug_fee or 0) + (record.transport_fee or 0) + (record.other_fee or 0)
    
    db.session.commit()
    
    return jsonify(equipment.to_dict()), 201

@equipment_bp.route('/records/<int:record_id>/equipments/<int:equipment_id>', methods=['PUT'])
@login_required
def update_equipment(record_id, equipment_id):
    """更新设备明细"""
    equipment = RepairEquipment.query.filter_by(id=equipment_id, work_record_id=record_id).first()
    if not equipment:
        return jsonify({'error': '设备不存在'}), 404
    
    data = request.json
    
    # 更新字段
    for field in ['system_type', 'device_name', 'device_model', 'device_brand', 'quantity', 
                  'location', 'fault_description', 'repair_method', 'repair_result', 
                  'unit_price', 'subtotal', 'remark']:
        if field in data:
            setattr(equipment, field, data[field])
    
    # 重新计算设备费合计
    record = WorkRecord.query.get(record_id)
    equipments = RepairEquipment.query.filter_by(work_record_id=record_id).all()
    total = sum(e.subtotal for e in equipments)
    record.equipment_fee_total = total
    record.total_fee = total + (record.labor_fee or 0) + (record.debug_fee or 0) + (record.transport_fee or 0) + (record.other_fee or 0)
    
    db.session.commit()
    
    return jsonify(equipment.to_dict())

@equipment_bp.route('/records/<int:record_id>/equipments/<int:equipment_id>', methods=['DELETE'])
@login_required
def delete_equipment(record_id, equipment_id):
    """删除设备明细"""
    equipment = RepairEquipment.query.filter_by(id=equipment_id, work_record_id=record_id).first()
    if not equipment:
        return jsonify({'error': '设备不存在'}), 404
    
    db.session.delete(equipment)
    
    # 重新计算设备费合计
    record = WorkRecord.query.get(record_id)
    equipments = RepairEquipment.query.filter_by(work_record_id=record_id).all()
    total = sum(e.subtotal for e in equipments)
    record.equipment_fee_total = total
    record.total_fee = total + (record.labor_fee or 0) + (record.debug_fee or 0) + (record.transport_fee or 0) + (record.other_fee or 0)
    
    db.session.commit()
    
    return jsonify({'message': '删除成功'})
