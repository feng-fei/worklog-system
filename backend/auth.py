"""权限认证模块: JWT token + 装饰器"""
import functools
import jwt
import os
from datetime import datetime, timedelta
from flask import request, jsonify, g, current_app

# JWT密钥
SECRET = os.environ.get('JWT_SECRET', 'worklog-jwt-secret-change-me')
TOKEN_EXPIRE_HOURS = int(os.environ.get('TOKEN_EXPIRE_HOURS', '24'))

def create_token(user):
    """为用户生成JWT token"""
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'staff_name': user.staff_name,
        'staff_id': user.staff_id,
        'exp': datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, SECRET, algorithm='HS256')

def decode_token(token):
    """解析JWT token, 返回payload或None"""
    try:
        return jwt.decode(token, SECRET, algorithms=['HS256'])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def login_required(f):
    """装饰器: 要求登录。登录后通过 g.current_user 可访问当前用户信息"""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        if not token:
            return jsonify({'error': '请先登录', 'code': 'AUTH_REQUIRED'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': '登录已过期，请重新登录', 'code': 'TOKEN_EXPIRED'}), 401
        
        g.current_user = payload
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    """装饰器: 要求管理员角色"""
    @functools.wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if g.current_user.get('role') != 'admin':
            return jsonify({'error': '需要管理员权限', 'code': 'FORBIDDEN'}), 403
        return f(*args, **kwargs)
    return decorated

def get_login_user_name():
    """获取当前登录用户的员工姓名，用于记录 created_by"""
    if hasattr(g, 'current_user'):
        return g.current_user.get('staff_name', '')
    return ''
