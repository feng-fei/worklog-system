from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import projects_bp
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


@projects_bp.route('/projects', methods=['GET'])
@login_required
def get_projects():
    try:
        status = request.args.get('status')
        customer_name = request.args.get('customer_name')
        project_type = request.args.get('project_type')
        keyword = request.args.get('keyword', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '') or get_login_user_name()

        query = Project.query
        if user_role != 'admin' and user_name:
            query = query.filter(or_(Project.manager.like(f'%{user_name}%'), Project.created_by == user_name))
        if status:
            query = query.filter(Project.status == status)
        if customer_name:
            query = query.filter(Project.customer_name.like(f'%{customer_name}%'))
        if project_type:
            query = query.filter(Project.project_type == project_type)
        if keyword:
            query = query.filter(or_(
                Project.name.like(f'%{keyword}%'),
                Project.project_no.like(f'%{keyword}%'),
                Project.contract_no.like(f'%{keyword}%')
            ))

        pagination = query.order_by(Project.created_at.desc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>', methods=['GET'])
@login_required
def get_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '') or get_login_user_name()
        if user_role != 'admin' and user_name:
            if user_name not in (project.manager or '') and project.created_by != user_name:
                return jsonify({'error': '无权访问此项目'}), 403
        work_records = ProjectWorkRecord.query.filter_by(project_id=project_id).order_by(ProjectWorkRecord.work_date.desc(), ProjectWorkRecord.id.desc()).all()
        
        expense_total = db.session.query(func.coalesce(func.sum(ProjectExpense.amount), 0)).filter_by(project_id=project_id).scalar()
        expense_by_type = db.session.query(
            ProjectExpense.expense_type,
            func.coalesce(func.sum(ProjectExpense.amount), 0)
        ).filter_by(project_id=project_id).group_by(ProjectExpense.expense_type).all()
        expense_stats = {
            'total': expense_total or 0,
            'by_type': {t: float(a or 0) for t, a in expense_by_type}
        }
        
        salary_total = db.session.query(func.coalesce(func.sum(ProjectSalary.payable_amount), 0)).filter_by(project_id=project_id).scalar()
        salary_paid = db.session.query(func.coalesce(func.sum(ProjectSalary.paid_amount), 0)).filter_by(project_id=project_id).scalar()
        salary_unpaid = (salary_total or 0) - (salary_paid or 0)
        salary_stats = {
            'total': salary_total or 0,
            'paid': salary_paid or 0,
            'unpaid': salary_unpaid
        }
        
        record_income = db.session.query(func.coalesce(func.sum(ProjectWorkRecord.total_fee), 0)).filter_by(project_id=project_id).scalar()
        record_count = ProjectWorkRecord.query.filter_by(project_id=project_id).count()
        gross_profit = (project.contract_amount or 0) + (record_income or 0) + (project.receipt_amount or 0) - (expense_total or 0) - (salary_total or 0)
        finance_overview = {
            'contract_amount': project.contract_amount or 0,
            'record_income': record_income or 0,
            'record_count': record_count or 0,
            'receipt_amount': project.receipt_amount or 0,
            'expense_total': expense_total or 0,
            'salary_total': salary_total or 0,
            'gross_profit': gross_profit
        }
        
        return jsonify({
            'project': project.to_dict(),
            'work_records': [r.to_dict() for r in work_records],
            'expense_stats': expense_stats,
            'salary_stats': salary_stats,
            'finance_overview': finance_overview
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects', methods=['POST'])
@login_required
@admin_required
def create_project():
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': '项目名称不能为空'}), 400

        project = Project(
            project_no=_generate_project_no(),
            name=name,
            customer_name=data.get('customer_name', ''),
            contract_no=data.get('contract_no', ''),
            project_type=data.get('project_type', ''),
            project_address=data.get('project_address', ''),
            contact_name=data.get('contact_name', ''),
            contact_phone=data.get('contact_phone', ''),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            contract_amount=float(data.get('contract_amount') or 0),
            budget_amount=float(data.get('budget_amount') or 0),
            actual_amount=float(data.get('actual_amount') or 0),
            tax_type=data.get('tax_type', 'no'),
            tax_rate=float(data.get('tax_rate') or 3) / 100,
            tax_amount=float(data.get('tax_amount') or 0),
            status=data.get('status', 'pending'),
            manager=data.get('manager', ''),
            description=data.get('description', ''),
            remark=data.get('remark', ''),
            created_by=get_login_user_name(),
            billing_type=data.get('billing_type', 'lump_sum'),
            project_stage=data.get('project_stage', 'preparation'),
            construction_phase=data.get('construction_phase', ''),
            actual_start_date=datetime.strptime(data['actual_start_date'], '%Y-%m-%d').date() if data.get('actual_start_date') else None,
            actual_end_date=datetime.strptime(data['actual_end_date'], '%Y-%m-%d').date() if data.get('actual_end_date') else None,
            staff_names=data.get('staff_names', ''),
            receipt_amount=float(data.get('receipt_amount') or 0),
            warranty_amount=float(data.get('warranty_amount') or 0)
        )
        db.session.add(project)
        db.session.commit()
        return jsonify(project.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>', methods=['PUT'])
@login_required
@admin_required
def update_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        data = request.get_json() or {}
        for field in ['name', 'customer_name', 'contract_no', 'project_type', 'project_address',
                      'contact_name', 'contact_phone', 'status', 'manager', 'description', 'remark', 'tax_type',
                      'billing_type', 'project_stage', 'construction_phase', 'staff_names']:
            if field in data:
                setattr(project, field, data[field])
        for field in ['contract_amount', 'budget_amount', 'actual_amount', 'tax_amount',
                      'receipt_amount', 'warranty_amount']:
            if field in data:
                setattr(project, field, float(data[field] or 0))
        if 'tax_rate' in data:
            project.tax_rate = float(data['tax_rate'] or 0) / 100
        if 'start_date' in data:
            project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data['start_date'] else None
        if 'end_date' in data:
            project.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data['end_date'] else None
        if 'actual_start_date' in data:
            project.actual_start_date = datetime.strptime(data['actual_start_date'], '%Y-%m-%d').date() if data['actual_start_date'] else None
        if 'actual_end_date' in data:
            project.actual_end_date = datetime.strptime(data['actual_end_date'], '%Y-%m-%d').date() if data['actual_end_date'] else None
        db.session.commit()
        return jsonify(project.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        ProjectWorkRecord.query.filter_by(project_id=project_id).delete()
        ProjectExpense.query.filter_by(project_id=project_id).delete()
        ProjectSalary.query.filter_by(project_id=project_id).delete()
        WorkRecord.query.filter_by(project_id=project_id).update({'project_id': None})
        db.session.delete(project)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/stage', methods=['PUT'])
@login_required
@admin_required
def update_project_stage(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        data = request.get_json() or {}
        if 'project_stage' in data:
            project.project_stage = data['project_stage']
        if 'construction_phase' in data:
            project.construction_phase = data.get('construction_phase', '')
        db.session.commit()
        return jsonify(project.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def _generate_project_work_record_no(work_date):
    date_str = work_date.strftime('%Y%m%d')
    count = ProjectWorkRecord.query.filter(
        func.strftime('%Y%m%d', ProjectWorkRecord.work_date) == date_str
    ).count()
    return f'XMGC{date_str}{count + 1:03d}'



@projects_bp.route('/projects/<int:project_id>/records', methods=['GET'])
@login_required
def get_project_records(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '') or get_login_user_name()
        if user_role != 'admin' and user_name:
            if user_name not in (project.manager or '') and project.created_by != user_name:
                return jsonify({'error': '无权访问此项目'}), 403
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = ProjectWorkRecord.query.filter_by(project_id=project_id)
        
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(ProjectWorkRecord.work_date >= start)
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(ProjectWorkRecord.work_date <= end)
        
        query = query.order_by(ProjectWorkRecord.work_date.desc(), ProjectWorkRecord.id.desc())
        pagination = query.paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [r.to_dict() for r in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/records', methods=['POST'])
@login_required
@admin_required
def create_project_record(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        
        is_multipart = request.content_type and 'multipart/form-data' in request.content_type
        
        def get_val(key):
            if is_multipart:
                return request.form.get(key)
            data = request.get_json() or {}
            return data.get(key)
        
        work_date_str = get_val('work_date')
        if work_date_str:
            work_date = datetime.strptime(work_date_str, '%Y-%m-%d').date()
        else:
            work_date = datetime.now().date()
        
        staff_names_raw = get_val('staff_names')
        if staff_names_raw:
            if isinstance(staff_names_raw, list):
                staff_names = ','.join(staff_names_raw)
            else:
                staff_names = staff_names_raw
        else:
            staff_names = ''
        
        staff_hours_raw = get_val('staff_hours')
        staff_hours = ''
        if staff_hours_raw:
            if isinstance(staff_hours_raw, str):
                try:
                    import json
                    json.loads(staff_hours_raw)
                    staff_hours = staff_hours_raw
                except Exception:
                    staff_hours = ''
            elif isinstance(staff_hours_raw, list):
                import json
                staff_hours = json.dumps(staff_hours_raw, ensure_ascii=False)
        
        photo_paths = []
        if is_multipart:
            files = request.files.getlist('photos')
            upload_folder = current_app.config['UPLOAD_FOLDER']
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
                    except Exception as e:
                        print(f'No thumbnail: {e}')
                    photo_paths.append(f'/uploads/{filename}')
        
        if not photo_paths:
            photos_raw = get_val('photos')
            if photos_raw:
                if isinstance(photos_raw, list):
                    photo_paths = photos_raw
                else:
                    photo_paths = [p.strip() for p in photos_raw.split(',') if p.strip()]
        
        photos = ','.join(photo_paths) if photo_paths else ''
        
        work_content = get_val('work_content')
        if not work_content or not str(work_content).strip():
            return jsonify({'error': '施工/工作内容不能为空'}), 400
        
        record = ProjectWorkRecord(
            project_id=project_id,
            record_no=_generate_project_work_record_no(work_date),
            work_date=work_date,
            work_type=get_val('work_type') or '',
            work_content=work_content,
            customer_name=get_val('customer_name') or project.customer_name,
            work_address=get_val('work_address') or project.project_address,
            staff_names=staff_names,
            staff_hours=staff_hours,
            work_hours=float(get_val('work_hours') or 0),
            material_fee=float(get_val('material_fee') or 0),
            labor_fee=float(get_val('labor_fee') or 0),
            other_fee=float(get_val('other_fee') or 0),
            total_fee=float(get_val('total_fee') or 0),
            photos=photos,
            remark=get_val('remark') or '',
            status=get_val('status') or 'completed',
            created_by=get_login_user_name(),
            billing_type=get_val('billing_type') or project.billing_type or 'lump_sum'
        )
        db.session.add(record)
        db.session.commit()
        return jsonify(record.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/records/<int:record_id>', methods=['PUT'])
@login_required
@admin_required
def update_project_record(project_id, record_id):
    try:
        record = ProjectWorkRecord.query.filter_by(id=record_id, project_id=project_id).first_or_404()
        
        is_multipart = request.content_type and 'multipart/form-data' in request.content_type
        
        def get_val(key):
            if is_multipart:
                return request.form.get(key)
            data = request.get_json() or {}
            return data.get(key)
        
        for field in ['work_type', 'work_content', 'customer_name', 'work_address', 'remark', 'status', 'billing_type']:
            val = get_val(field)
            if val is not None:
                setattr(record, field, val)
        
        for field in ['work_hours', 'material_fee', 'labor_fee', 'other_fee', 'total_fee']:
            val = get_val(field)
            if val is not None:
                setattr(record, field, float(val or 0))
        
        if get_val('work_date') is not None:
            work_date_str = get_val('work_date')
            record.work_date = datetime.strptime(work_date_str, '%Y-%m-%d').date() if work_date_str else None
        
        if get_val('staff_names') is not None:
            staff_names_raw = get_val('staff_names')
            if isinstance(staff_names_raw, list):
                record.staff_names = ','.join(staff_names_raw)
            else:
                record.staff_names = staff_names_raw or ''
        
        if get_val('staff_hours') is not None:
            staff_hours_raw = get_val('staff_hours')
            if staff_hours_raw:
                if isinstance(staff_hours_raw, str):
                    try:
                        import json
                        json.loads(staff_hours_raw)
                        record.staff_hours = staff_hours_raw
                    except Exception:
                        record.staff_hours = ''
                elif isinstance(staff_hours_raw, list):
                    import json
                    record.staff_hours = json.dumps(staff_hours_raw, ensure_ascii=False)
            else:
                record.staff_hours = ''
        
        if is_multipart:
            keep_photos_raw = get_val('keep_photos')
            keep_photos = []
            if keep_photos_raw:
                try:
                    import json
                    keep_photos = json.loads(keep_photos_raw) if isinstance(keep_photos_raw, str) else keep_photos_raw
                except Exception:
                    keep_photos = []
            
            files = request.files.getlist('photos')
            has_new_files = files and any(f.filename for f in files)
            
            if has_new_files or keep_photos_raw is not None:
                upload_folder = current_app.config['UPLOAD_FOLDER']
                if record.photos:
                    for old_photo in record.photos.split(','):
                        old_basename = os.path.basename(old_photo)
                        if old_basename not in keep_photos:
                            old_path = os.path.join(upload_folder, old_basename)
                            if os.path.exists(old_path):
                                os.remove(old_path)
                
                photo_paths = [f'/uploads/{p}' for p in keep_photos]
                
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
                        except Exception as e:
                            print(f'No thumbnail: {e}')
                        photo_paths.append(f'/uploads/{filename}')
                
                record.photos = ','.join(photo_paths) if photo_paths else ''
        else:
            if get_val('photos') is not None:
                photos_raw = get_val('photos')
                if isinstance(photos_raw, list):
                    record.photos = ','.join(photos_raw)
                else:
                    record.photos = photos_raw or ''
        
        db.session.commit()
        return jsonify(record.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/records/<int:record_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_project_record(project_id, record_id):
    try:
        record = ProjectWorkRecord.query.filter_by(id=record_id, project_id=project_id).first_or_404()
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if record.photos:
            for photo in record.photos.split(','):
                photo_path = os.path.join(upload_folder, os.path.basename(photo))
                if os.path.exists(photo_path):
                    os.remove(photo_path)
                thumb_name = 'thumb_' + os.path.basename(photo)
                thumb_path = os.path.join(upload_folder, thumb_name)
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)
        db.session.delete(record)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def _generate_project_salary_no(project_id):
    date_str = datetime.now().strftime('%Y%m')
    count = ProjectSalary.query.filter(
        func.strftime('%Y%m', ProjectSalary.created_at) == date_str,
        ProjectSalary.project_id == project_id
    ).count()
    return f'RY-GZ-{project_id}-{date_str}-{count + 1:03d}'



@projects_bp.route('/projects/<int:project_id>/expenses', methods=['GET'])
@login_required
def get_project_expenses(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '') or get_login_user_name()
        if user_role != 'admin' and user_name:
            if user_name not in (project.manager or '') and project.created_by != user_name:
                return jsonify({'error': '无权访问此项目'}), 403
        expense_type = request.args.get('expense_type')
        keyword = request.args.get('keyword', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = ProjectExpense.query.filter_by(project_id=project_id)
        if expense_type:
            query = query.filter(ProjectExpense.expense_type == expense_type)
        if keyword:
            query = query.filter(or_(
                ProjectExpense.title.like(f'%{keyword}%'),
                ProjectExpense.category.like(f'%{keyword}%'),
                ProjectExpense.supplier.like(f'%{keyword}%')
            ))
        
        pagination = query.order_by(ProjectExpense.expense_date.desc(), ProjectExpense.id.desc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [e.to_dict() for e in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/expenses', methods=['POST'])
@login_required
@admin_required
def create_project_expense(project_id):
    try:
        Project.query.get_or_404(project_id)
        data = request.get_json() or {}
        title = (data.get('title') or '').strip()
        if not title:
            return jsonify({'error': '费用标题不能为空'}), 400
        
        amount = float(data.get('amount') or 0)
        if amount <= 0:
            return jsonify({'error': '支出金额必须大于0'}), 400
        
        expense = ProjectExpense(
            project_id=project_id,
            expense_type=data.get('expense_type', 'other'),
            category=data.get('category', ''),
            title=title,
            amount=amount,
            expense_date=datetime.strptime(data['expense_date'], '%Y-%m-%d').date() if data.get('expense_date') else datetime.now().date(),
            supplier=data.get('supplier', ''),
            payment_method=data.get('payment_method', 'cash'),
            receipt_photos=','.join(data.get('receipt_photos', [])),
            remark=data.get('remark', ''),
            created_by=get_login_user_name()
        )
        db.session.add(expense)
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify(expense.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/expenses/<int:expense_id>', methods=['PUT'])
@login_required
@admin_required
def update_project_expense(project_id, expense_id):
    try:
        expense = ProjectExpense.query.filter_by(id=expense_id, project_id=project_id).first_or_404()
        data = request.get_json() or {}
        for field in ['expense_type', 'category', 'title', 'supplier', 'payment_method', 'remark']:
            if field in data:
                setattr(expense, field, data[field])
        if 'amount' in data:
            expense.amount = float(data['amount'] or 0)
        if 'expense_date' in data:
            expense.expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date() if data['expense_date'] else None
        if 'receipt_photos' in data:
            expense.receipt_photos = ','.join(data.get('receipt_photos', []))
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify(expense.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_project_expense(project_id, expense_id):
    try:
        expense = ProjectExpense.query.filter_by(id=expense_id, project_id=project_id).first_or_404()
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if expense.receipt_photos:
            for photo in expense.receipt_photos.split(','):
                photo_path = os.path.join(upload_folder, os.path.basename(photo))
                if os.path.exists(photo_path):
                    os.remove(photo_path)
        db.session.delete(expense)
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/salaries', methods=['GET'])
@login_required
def get_project_salaries(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        user_role = g.current_user.get('role')
        user_name = g.current_user.get('staff_name', '') or get_login_user_name()
        if user_role != 'admin' and user_name:
            if user_name not in (project.manager or '') and project.created_by != user_name:
                return jsonify({'error': '无权访问此项目'}), 403
        staff_name = request.args.get('staff_name')
        status = request.args.get('status')
        keyword = request.args.get('keyword', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = ProjectSalary.query.filter_by(project_id=project_id)
        if staff_name:
            query = query.filter(ProjectSalary.staff_name == staff_name)
        if status:
            query = query.filter(ProjectSalary.status == status)
        if keyword:
            query = query.filter(or_(
                ProjectSalary.staff_name.like(f'%{keyword}%'),
                ProjectSalary.work_content.like(f'%{keyword}%'),
                ProjectSalary.salary_no.like(f'%{keyword}%')
            ))
        
        pagination = query.order_by(ProjectSalary.work_date.desc(), ProjectSalary.id.desc()).paginate(page=page, per_page=per_page)
        return jsonify({
            'records': [s.to_dict() for s in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/salaries', methods=['POST'])
@login_required
@admin_required
def create_project_salary(project_id):
    try:
        Project.query.get_or_404(project_id)
        data = request.get_json() or {}
        staff_name = (data.get('staff_name') or '').strip()
        if not staff_name:
            return jsonify({'error': '人员姓名不能为空'}), 400
        
        salary = ProjectSalary(
            project_id=project_id,
            salary_no=_generate_project_salary_no(project_id),
            staff_name=staff_name,
            staff_type=data.get('staff_type', 'temp'),
            work_date=datetime.strptime(data['work_date'], '%Y-%m-%d').date() if data.get('work_date') else datetime.now().date(),
            work_record_id=data.get('work_record_id'),
            work_content=data.get('work_content', ''),
            salary_type=data.get('salary_type', 'hourly'),
            hourly_rate=float(data.get('hourly_rate') or 0),
            work_hours=float(data.get('work_hours') or 0),
            daily_wage=float(data.get('daily_wage') or 0),
            work_days=float(data.get('work_days') or 0),
            piece_price=float(data.get('piece_price') or 0),
            piece_quantity=float(data.get('piece_quantity') or 0),
            base_amount=float(data.get('base_amount') or 0),
            subsidy=float(data.get('subsidy') or 0),
            deduction=float(data.get('deduction') or 0),
            payable_amount=float(data.get('payable_amount') or 0),
            paid_amount=float(data.get('paid_amount') or 0),
            status=data.get('status', 'unsettled'),
            payment_method=data.get('payment_method', ''),
            remark=data.get('remark', ''),
            created_by=get_login_user_name()
        )
        db.session.add(salary)
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify(salary.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/salaries/<int:salary_id>', methods=['PUT'])
@login_required
@admin_required
def update_project_salary(project_id, salary_id):
    try:
        salary = ProjectSalary.query.filter_by(id=salary_id, project_id=project_id).first_or_404()
        data = request.get_json() or {}
        for field in ['staff_name', 'staff_type', 'work_content', 'salary_type',
                      'status', 'payment_method', 'remark']:
            if field in data:
                setattr(salary, field, data[field])
        for field in ['hourly_rate', 'work_hours', 'daily_wage', 'work_days',
                      'piece_price', 'piece_quantity', 'base_amount', 'subsidy',
                      'deduction', 'payable_amount', 'paid_amount']:
            if field in data:
                setattr(salary, field, float(data[field] or 0))
        if 'work_date' in data:
            salary.work_date = datetime.strptime(data['work_date'], '%Y-%m-%d').date() if data['work_date'] else None
        if 'work_record_id' in data:
            salary.work_record_id = data.get('work_record_id')
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify(salary.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@projects_bp.route('/projects/<int:project_id>/salaries/<int:salary_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_project_salary(project_id, salary_id):
    try:
        salary = ProjectSalary.query.filter_by(id=salary_id, project_id=project_id).first_or_404()
        db.session.delete(salary)
        _recalculate_project_totals(project_id)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ===================== 物料库存管理 =====================

def _generate_material_no():
    count = Material.query.count()
    return f'RY-WL-{count + 1:05d}'



