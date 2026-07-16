from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import auth_bp
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


@auth_bp.route('/auth/debug', methods=['POST'])
def auth_debug():
    """调试: 打印收到的登录请求"""
    import sys
    data = request.get_json() or {}
    print(f'[DEBUG LOGIN] Body: {data}', flush=True)
    print(f'[DEBUG LOGIN] Content-Type: {request.content_type}', flush=True)
    print(f'[DEBUG LOGIN] Origin: {request.headers.get("Origin", "N/A")}', flush=True)
    print(f'[DEBUG LOGIN] Remote: {request.remote_addr}', flush=True)
    return jsonify({'received': data})


@auth_bp.route('/auth/login', methods=['POST'])
def auth_login():
    """登录"""
    try:
        data = request.get_json() or {}
        username = data.get('username', '').strip()
        password = data.get('password', '')
        if not username or not password:
            return jsonify({'error': '用户名和密码不能为空'}), 400
        user = WorkerUser.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': '用户名或密码错误'}), 401
        if not user.enabled:
            return jsonify({'error': '账号已被禁用'}), 403
        return jsonify({
            'token': create_token(user),
            'user': user.to_dict()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/auth/me', methods=['GET'])
@login_required
def auth_me():
    """获取当前登录用户信息"""
    from flask import g
    return jsonify({'user': g.current_user})


@auth_bp.route('/auth/change-password', methods=['POST'])
@login_required
def auth_change_password():
    """当前用户修改自己密码"""
    try:
        data = request.get_json() or {}
        old_pw = data.get('old_password', '')
        new_pw = data.get('new_password', '')
        if not old_pw or not new_pw:
            return jsonify({'error': '旧密码和新密码不能为空'}), 400
        if len(new_pw) < 4:
            return jsonify({'error': '新密码至少4位'}), 400
        user_id = g.current_user['user_id']
        user = WorkerUser.query.get(user_id)
        if not user or not user.check_password(old_pw):
            return jsonify({'error': '旧密码错误'}), 400
        user.set_password(new_pw)
        db.session.commit()
        return jsonify({'message': '密码修改成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/auth/users', methods=['GET'])
@admin_required
def list_users():
    """管理员: 列出所有用户"""
    try:
        users = WorkerUser.query.order_by(WorkerUser.created_at.desc()).all()
        return jsonify([u.to_dict() for u in users])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/auth/users', methods=['POST'])
@admin_required
def create_user():
    """管理员: 创建用户"""
    try:
        data = request.get_json() or {}
        username = data.get('username', '').strip()
        password = data.get('password', '')
        staff_name = data.get('staff_name', '').strip()
        role = data.get('role', 'worker')
        staff_id = data.get('staff_id')
        if not username or not password or not staff_name:
            return jsonify({'error': '用户名、密码、员工姓名不能为空'}), 400
        if len(password) < 4:
            return jsonify({'error': '密码至少4位'}), 400
        existing = WorkerUser.query.filter_by(username=username).first()
        if existing:
            return jsonify({'error': '用户名已存在'}), 400
        user = WorkerUser(
            username=username,
            staff_name=staff_name,
            role=role,
            staff_id=staff_id
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return jsonify(user.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/auth/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """管理员: 更新用户（改密码、启用/禁用、改角色）"""
    try:
        user = WorkerUser.query.get_or_404(user_id)
        data = request.get_json() or {}
        if 'password' in data and data['password']:
            if len(data['password']) < 4:
                return jsonify({'error': '密码至少4位'}), 400
            user.set_password(data['password'])
        if 'username' in data:
            user.username = data['username']
        if 'role' in data:
            user.role = data['role']
        if 'enabled' in data:
            user.enabled = bool(data['enabled'])
        if 'staff_name' in data:
            user.staff_name = data['staff_name']
        db.session.commit()
        return jsonify(user.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/auth/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """管理员: 删除用户"""
    try:
        user = WorkerUser.query.get_or_404(user_id)
        # 不允许删除最后一个管理员
        if user.role == 'admin':
            admin_count = WorkerUser.query.filter_by(role='admin', enabled=True).count()
            if admin_count <= 1:
                return jsonify({'error': '不能删除最后一个管理员'}), 400
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/auth/reset-password-by-admin/<int:user_id>', methods=['POST'])
@admin_required
def admin_reset_password(user_id):
    """管理员: 重设员工密码"""
    try:
        data = request.get_json() or {}
        new_pw = data.get('password', '')
        if len(new_pw) < 4:
            return jsonify({'error': '密码至少4位'}), 400
        user = WorkerUser.query.get_or_404(user_id)
        user.set_password(new_pw)
        db.session.commit()
        return jsonify({'message': '密码已重置'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===================== 客户管理 =====================


