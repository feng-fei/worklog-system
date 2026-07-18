from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import materials_bp
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


@materials_bp.route('/materials', methods=['GET'])
@login_required
def get_materials():
    try:
        category = request.args.get('category')
        keyword = request.args.get('keyword', '')
        low_stock_only = request.args.get('low_stock_only', 'false') == 'true'
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Material.query
        if category:
            query = query.filter(Material.category == category)
        if keyword:
            query = query.filter(or_(
                Material.name.like(f'%{keyword}%'),
                Material.material_no.like(f'%{keyword}%'),
                Material.brand.like(f'%{keyword}%'),
                Material.model.like(f'%{keyword}%')
            ))
        if low_stock_only:
            query = query.filter(Material.stock <= Material.min_stock, Material.min_stock > 0)

        pagination = query.order_by(Material.updated_at.desc()).paginate(page=page, per_page=per_page)
        categories = db.session.query(Material.category).distinct().all()
        is_admin = g.current_user.get('role') == 'admin'
        records = []
        for m in pagination.items:
            d = m.to_dict()
            if not is_admin:
                d['unit_price'] = None
                d['supplier'] = ''
            records.append(d)
        return jsonify({
            'records': records,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'categories': [c[0] for c in categories if c[0]]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@materials_bp.route('/materials/<int:material_id>', methods=['GET'])
@login_required
def get_material(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        logs = MaterialStockLog.query.filter_by(material_id=material_id).order_by(MaterialStockLog.created_at.desc()).limit(20).all()
        is_admin = g.current_user.get('role') == 'admin'
        mat_dict = material.to_dict()
        log_list = []
        for l in logs:
            d = l.to_dict()
            d['material_name'] = material.name
            log_list.append(d)
        if not is_admin:
            mat_dict['unit_price'] = None
            mat_dict['supplier'] = ''
            log_list = []
        return jsonify({
            'material': mat_dict,
            'stock_logs': log_list
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@materials_bp.route('/materials', methods=['POST'])
@login_required
@admin_required
def create_material():
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': '物料名称不能为空'}), 400

        material = Material(
            material_no=_generate_material_no(),
            name=name,
            category=data.get('category', ''),
            brand=data.get('brand', ''),
            model=data.get('model', ''),
            spec=data.get('spec', ''),
            unit=data.get('unit', '个'),
            unit_price=float(data.get('unit_price') or 0),
            stock=float(data.get('stock') or 0),
            min_stock=float(data.get('min_stock') or 0),
            max_stock=float(data.get('max_stock') or 0),
            location=data.get('location', ''),
            supplier=data.get('supplier', ''),
            remark=data.get('remark', '')
        )
        db.session.add(material)
        db.session.commit()
        return jsonify(material.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@materials_bp.route('/materials/<int:material_id>', methods=['PUT'])
@login_required
@admin_required
def update_material(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        data = request.get_json() or {}
        for field in ['name', 'category', 'brand', 'model', 'spec', 'unit', 'location', 'supplier', 'remark']:
            if field in data:
                setattr(material, field, data[field])
        for field in ['unit_price', 'stock', 'min_stock', 'max_stock']:
            if field in data:
                setattr(material, field, float(data[field] or 0))
        db.session.commit()
        return jsonify(material.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@materials_bp.route('/materials/<int:material_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_material(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        equip_count = RepairEquipment.query.filter_by(material_id=material_id).count()
        stock_log_count = MaterialStockLog.query.filter_by(material_id=material_id).count()
        if equip_count > 0 or stock_log_count > 0:
            refs = []
            if equip_count > 0: refs.append(f'{equip_count}条设备使用记录')
            if stock_log_count > 0: refs.append(f'{stock_log_count}条库存流水')
            return jsonify({'error': f'该物料存在关联数据({", ".join(refs)})，无法删除'}), 400
        db.session.delete(material)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@materials_bp.route('/materials/<int:material_id>/stock', methods=['POST'])
@login_required
@admin_required
def update_material_stock(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        data = request.get_json() or {}
        log_type = data.get('log_type', 'in')
        quantity = float(data.get('quantity') or 0)
        if quantity <= 0:
            return jsonify({'error': '数量必须大于0'}), 400

        stock_before = material.stock or 0
        if log_type == 'in':
            stock_after = stock_before + quantity
        elif log_type == 'out':
            stock_after = stock_before - quantity
            if stock_after < 0:
                return jsonify({'error': '库存不足'}), 400
        elif log_type == 'adjust':
            stock_after = quantity
        else:
            return jsonify({'error': '不支持的操作类型'}), 400

        unit_price = float(data.get('unit_price') or material.unit_price or 0)
        total_price = round(unit_price * quantity, 2)

        log = MaterialStockLog(
            material_id=material_id,
            material_name=material.name,
            log_type=log_type,
            quantity=quantity,
            stock_before=stock_before,
            stock_after=stock_after,
            unit_price=unit_price,
            total_price=total_price,
            related_type=data.get('related_type', ''),
            related_id=data.get('related_id'),
            related_no=data.get('related_no', ''),
            operator=get_login_user_name(),
            remark=data.get('remark', '')
        )
        db.session.add(log)
        material.stock = stock_after
        if log_type == 'in' and unit_price > 0:
            material.unit_price = unit_price
        
        # 入库时自动生成支出记录
        auto_create_expense = data.get('auto_create_expense', False)
        if log_type == 'in' and auto_create_expense and total_price > 0:
            expense = Expense(
                expense_type='purchase',
                category='物料采购',
                title=f'采购：{material.name}',
                amount=total_price,
                expense_date=datetime.now().date(),
                related_type='stock_log',
                related_id=log.id,
                related_no=data.get('related_no', ''),
                supplier=data.get('supplier', ''),
                payment_method=data.get('payment_method', 'cash'),
                remark=f'入库数量：{quantity}，单价：{unit_price}' + (f'，{data.get("remark", "")}' if data.get('remark') else ''),
                created_by=get_login_user_name()
            )
            db.session.add(expense)
        
        db.session.commit()

        return jsonify({
            'material': material.to_dict(),
            'log': log.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@materials_bp.route('/materials/stock-logs', methods=['GET'])
@materials_bp.route('/stock-logs', methods=['GET'])
@materials_bp.route('/material-logs', methods=['GET'])
@materials_bp.route('/material-stock-logs', methods=['GET'])
@login_required
def get_stock_logs():
    try:
        material_id = request.args.get('material_id', type=int)
        log_type = request.args.get('log_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int) or request.args.get('page_size', 20, type=int)

        query = MaterialStockLog.query
        if material_id:
            query = query.filter(MaterialStockLog.material_id == material_id)
        if log_type:
            query = query.filter(MaterialStockLog.log_type == log_type)
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(MaterialStockLog.created_at >= start)
            except: pass
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(MaterialStockLog.created_at < end)
            except: pass

        pagination = query.order_by(MaterialStockLog.created_at.desc()).paginate(page=page, per_page=per_page)
        material_map = {}
        materials = Material.query.filter(Material.id.in_([l.material_id for l in pagination.items])).all()
        for m in materials:
            material_map[m.id] = m.name
        records = []
        for l in pagination.items:
            d = l.to_dict()
            d['material_name'] = material_map.get(l.material_id, '')
            records.append(d)
        return jsonify({
            'records': records,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===================== 客户设备档案 =====================


