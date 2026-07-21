from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import finance_bp
import os
import json
from datetime import datetime, date
from sqlalchemy import func, or_, and_


@finance_bp.route('/salaries', methods=['GET'])
@login_required
def get_salaries():
    try:
        staff_name = request.args.get('staff_name')
        staff_id = request.args.get('staff_id', type=int)
        month = request.args.get('month')
        status = request.args.get('status')
        keyword = request.args.get('keyword', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', request.args.get('page_size', 500), type=int)
        query = SalaryRecord.query
        if g.current_user.get('role') != 'admin':
            query = query.filter(SalaryRecord.staff_name == g.current_user.get('staff_name', ''))
        if staff_name:
            query = query.filter(SalaryRecord.staff_name == staff_name)
        if staff_id:
            staff = Staff.query.get(staff_id)
            if staff:
                query = query.filter(SalaryRecord.staff_name == staff.name)
        if status:
            status_map = {'pending': 'unsettled', 'settled': 'settled', 'unsettled': 'unsettled'}
            backend_status = status_map.get(status, status)
            query = query.filter(SalaryRecord.status == backend_status)
        if month:
            try:
                start = datetime.strptime(month + '-01', '%Y-%m-%d')
                if start.month == 12:
                    end = datetime(start.year + 1, 1, 1)
                else:
                    end = datetime(start.year, start.month + 1, 1)
                query = query.filter(SalaryRecord.work_date >= start, SalaryRecord.work_date < end)
            except:
                pass
        if keyword:
            query = query.filter(
                db.or_(
                    SalaryRecord.staff_name.like(f'%{keyword}%'),
                    SalaryRecord.remark.like(f'%{keyword}%'),
                    SalaryRecord.customer_name.like(f'%{keyword}%')
                )
            )
        pagination = query.order_by(SalaryRecord.work_date.desc(), SalaryRecord.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
        total_payable = sum(x.payable_amount or 0 for x in pagination.items)
        total_paid = sum(x.paid_amount or 0 for x in pagination.items)
        sal_list = [s.to_dict() for s in pagination.items]
        return jsonify({
            'records': sal_list,
            'list': sal_list,
            'items': sal_list,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'page_size': per_page,
            'pages': pagination.pages,
            'summary': {'payable': total_payable, 'paid': total_paid, 'unpaid': total_payable - total_paid}
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/salaries', methods=['POST'])
@login_required
@admin_required
def create_salary():
    try:
        data = request.get_json() or {}
        staff_name = data.get('staff_name', '').strip()
        staff_id = data.get('staff_id')
        if staff_id and not staff_name:
            staff = Staff.query.get(staff_id)
            if staff:
                staff_name = staff.name
        if not staff_name:
            return jsonify({'error': '员工不能为空'}), 400
        
        month_str = data.get('month', '')
        if month_str:
            try:
                work_date = datetime.strptime(month_str + '-01', '%Y-%m-%d')
            except:
                work_date = datetime.strptime(data.get('work_date') or datetime.now().strftime('%Y-%m-%d'), '%Y-%m-%d')
        else:
            work_date = datetime.strptime(data.get('work_date') or datetime.now().strftime('%Y-%m-%d'), '%Y-%m-%d')
        
        gross_salary = float(data.get('gross_salary') or data.get('payable_amount') or 0)
        deduction = float(data.get('deduction') or 0)
        net_salary = float(data.get('net_salary') or (gross_salary - deduction))
        
        daily_wage = float(data.get('daily_wage') or 0)
        work_units = float(data.get('work_units') or 1)
        subsidy = float(data.get('subsidy') or 0)
        if gross_salary > 0:
            payable = gross_salary
        else:
            payable = round(daily_wage * work_units + subsidy - deduction, 2)
        
        hours = float(data.get('hours') or 0)
        if hours > 0 and work_units <= 1:
            work_units = hours / 8
        
        status = data.get('status', 'pending')
        status_map = {'pending': 'unsettled', 'settled': 'settled', 'unsettled': 'unsettled'}
        backend_status = status_map.get(status, 'unsettled')
        
        staff = Staff.query.filter_by(name=staff_name).first()
        if not staff and staff_id:
            staff = Staff.query.get(staff_id)
        
        salary = SalaryRecord(
            salary_no=_generate_salary_no(work_date),
            staff_id=staff_id,
            staff_name=staff_name,
            staff_type=staff.staff_type if staff else data.get('staff_type', 'temp'),
            work_date=work_date,
            business_type=data.get('business_type', '其他'),
            business_no=data.get('business_no', ''),
            business_record_id=data.get('business_record_id') or data.get('record_id'),
            customer_name=data.get('customer_name', ''),
            work_content=data.get('work_content', ''),
            salary_type=data.get('salary_type', '月薪' if month_str else '日薪'),
            daily_wage=daily_wage,
            work_units=work_units,
            subsidy=subsidy,
            deduction=deduction,
            payable_amount=payable,
            paid_amount=float(data.get('paid_amount') or (payable if backend_status == 'settled' else 0)),
            status=backend_status,
            settlement_date=data.get('settlement_date', ''),
            payment_method=data.get('payment_method', ''),
            remark=data.get('remark', '') or data.get('note', '')
        )
        db.session.add(salary)
        db.session.commit()
        return jsonify(salary.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/salaries/<int:salary_id>/settle', methods=['POST'])
@login_required
@admin_required
def settle_salary(salary_id):
    try:
        salary = SalaryRecord.query.get_or_404(salary_id)
        data = request.get_json() or {}
        salary.status = 'settled'
        salary.paid_amount = salary.payable_amount
        salary.settlement_date = data.get('settlement_date') or datetime.now().strftime('%Y-%m-%d')
        salary.payment_method = data.get('payment_method', salary.payment_method or '')
        db.session.commit()
        return jsonify(salary.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/salaries/<int:salary_id>', methods=['GET'])
@login_required
def get_salary(salary_id):
    try:
        salary = SalaryRecord.query.get_or_404(salary_id)
        if g.current_user.get('role') != 'admin' and salary.staff_name != g.current_user.get('staff_name', ''):
            return jsonify({'error': '无权限查看'}), 403
        return jsonify(salary.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/salaries/<int:salary_id>', methods=['PUT'])
@login_required
def update_salary(salary_id):
    try:
        if g.current_user.get('role') != 'admin':
            return jsonify({'error': '仅管理员可编辑工资记录'}), 403
        salary = SalaryRecord.query.get_or_404(salary_id)
        data = request.get_json() or {}
        
        if 'staff_id' in data and data['staff_id']:
            salary.staff_id = data['staff_id']
            staff = Staff.query.get(data['staff_id'])
            if staff:
                salary.staff_name = staff.name
                salary.staff_type = staff.staff_type
        if 'staff_name' in data:
            salary.staff_name = data['staff_name']
        if 'staff_type' in data:
            salary.staff_type = data['staff_type']
        
        if 'month' in data and data['month']:
            try:
                salary.work_date = datetime.strptime(data['month'] + '-01', '%Y-%m-%d')
            except:
                pass
        elif 'work_date' in data and data['work_date']:
            salary.work_date = datetime.strptime(data['work_date'], '%Y-%m-%d')
        
        if 'daily_wage' in data:
            salary.daily_wage = float(data['daily_wage'] or 0)
        if 'work_units' in data:
            salary.work_units = float(data['work_units'] or 0)
        if 'hours' in data and float(data['hours'] or 0) > 0:
            salary.work_units = float(data['hours']) / 8
        if 'subsidy' in data:
            salary.subsidy = float(data['subsidy'] or 0)
        if 'deduction' in data:
            salary.deduction = float(data['deduction'] or 0)
        
        if 'gross_salary' in data or 'payable_amount' in data:
            salary.payable_amount = float(data.get('gross_salary') or data.get('payable_amount') or 0)
        else:
            salary.payable_amount = round((salary.daily_wage or 0) * (salary.work_units or 0) + (salary.subsidy or 0) - (salary.deduction or 0), 2)
        
        if 'paid_amount' in data:
            salary.paid_amount = float(data['paid_amount'] or 0)
        
        if 'status' in data:
            status_map = {'pending': 'unsettled', 'settled': 'settled', 'unsettled': 'unsettled'}
            salary.status = status_map.get(data['status'], salary.status or 'unsettled')
        
        if salary.paid_amount >= salary.payable_amount and salary.payable_amount > 0:
            salary.status = 'settled'
            salary.settlement_date = data.get('settlement_date') or datetime.now().strftime('%Y-%m-%d')
        
        if 'payment_method' in data:
            salary.payment_method = data['payment_method'] or ''
        if 'business_type' in data:
            salary.business_type = data['business_type'] or ''
        if 'business_no' in data:
            salary.business_no = data['business_no'] or ''
        if 'business_record_id' in data or 'record_id' in data:
            salary.business_record_id = data.get('business_record_id') or data.get('record_id')
        if 'customer_name' in data:
            salary.customer_name = data['customer_name'] or ''
        if 'work_content' in data:
            salary.work_content = data['work_content'] or ''
        if 'remark' in data or 'note' in data:
            salary.remark = data.get('remark') or data.get('note') or ''
        
        db.session.commit()
        return jsonify(salary.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/salaries/<int:salary_id>', methods=['DELETE'])
@login_required
def delete_salary(salary_id):
    try:
        if g.current_user.get('role') != 'admin':
            return jsonify({'error': '仅管理员可删除工资记录'}), 403
        salary = SalaryRecord.query.get_or_404(salary_id)
        db.session.delete(salary)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===================== 支出管理 =====================

def _init_default_expense_categories():
    """初始化默认支出分类"""
    default_cats = [
        ('物料采购', 'purchase', 1, True),
        ('房租', 'daily', 2, False),
        ('水电', 'daily', 3, False),
        ('办公用品', 'daily', 4, False),
        ('差旅交通', 'daily', 5, False),
        ('餐饮', 'daily', 6, False),
        ('设备维护', 'daily', 7, False),
        ('其他', 'other', 99, False),
    ]
    for name, exp_type, sort_order, is_system in default_cats:
        existing = ExpenseCategory.query.filter_by(name=name).first()
        if not existing:
            cat = ExpenseCategory(
                name=name,
                expense_type=exp_type,
                sort_order=sort_order,
                is_system=is_system
            )
            db.session.add(cat)
    try:
        db.session.commit()
    except:
        db.session.rollback()


@finance_bp.route('/expense-categories', methods=['GET'])
@login_required
def get_expense_categories():
    try:
        _init_default_expense_categories()
        categories = ExpenseCategory.query.order_by(ExpenseCategory.sort_order, ExpenseCategory.id).all()
        cat_list = [c.to_dict() for c in categories]
        return jsonify({
            'categories': cat_list,
            'list': cat_list,
            'records': cat_list,
            'items': cat_list
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/expense-categories', methods=['POST'])
@login_required
@admin_required
def add_expense_category():
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'error': '分类名称不能为空'}), 400
        existing = ExpenseCategory.query.filter_by(name=name).first()
        if existing:
            return jsonify({'error': '分类已存在'}), 400
        cat = ExpenseCategory(
            name=name,
            expense_type=data.get('expense_type', 'daily'),
            sort_order=data.get('sort_order', 0)
        )
        db.session.add(cat)
        db.session.commit()
        return jsonify(cat.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/expense-categories/<int:cat_id>', methods=['PUT'])
@login_required
@admin_required
def update_expense_category(cat_id):
    try:
        cat = ExpenseCategory.query.get_or_404(cat_id)
        data = request.get_json() or {}
        if 'name' in data:
            new_name = data['name'].strip()
            if not new_name:
                return jsonify({'error': '分类名称不能为空'}), 400
            if cat.is_system:
                old_expenses = Expense.query.filter_by(category=cat.name).all()
                old_proj_expenses = ProjectExpense.query.filter_by(category=cat.name).all()
                for e in old_expenses:
                    e.category = new_name
                for e in old_proj_expenses:
                    e.category = new_name
            cat.name = new_name
        for field in ['expense_type', 'sort_order']:
            if field in data:
                setattr(cat, field, data[field])
        db.session.commit()
        return jsonify(cat.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/expense-categories/<int:cat_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_expense_category(cat_id):
    try:
        cat = ExpenseCategory.query.get_or_404(cat_id)
        if cat.is_system:
            return jsonify({'error': '系统分类不能删除'}), 400
        expense_count = Expense.query.filter_by(category=cat.name).count()
        project_expense_count = ProjectExpense.query.filter_by(category=cat.name).count()
        if expense_count > 0 or project_expense_count > 0:
            return jsonify({'error': f'该分类下有{expense_count + project_expense_count}条支出记录，无法删除'}), 400
        db.session.delete(cat)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/expenses', methods=['GET'])
@login_required
def get_expenses():
    try:
        _init_default_expense_categories()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', request.args.get('page_size', 20)))
        expense_type = request.args.get('expense_type', '')
        category = request.args.get('category', '')
        category_id = request.args.get('category_id', type=int)
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        keyword = request.args.get('keyword', '')

        query = Expense.query
        
        if g.current_user.get('role') != 'admin':
            query = query.filter(Expense.id == -1)
        
        if expense_type:
            query = query.filter(Expense.expense_type == expense_type)
        if category:
            query = query.filter(Expense.category == category)
        if category_id:
            cat = ExpenseCategory.query.get(category_id)
            if cat:
                query = query.filter(Expense.category == cat.name)
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        if keyword:
            query = query.filter(
                db.or_(
                    Expense.title.like(f'%{keyword}%'),
                    Expense.remark.like(f'%{keyword}%'),
                    Expense.supplier.like(f'%{keyword}%'),
                    Expense.handler.like(f'%{keyword}%'),
                    Expense.customer_name.like(f'%{keyword}%'),
                    Expense.project_name.like(f'%{keyword}%')
                )
            )
        
        total = query.count()
        expenses = query.order_by(Expense.expense_date.desc(), Expense.id.desc()) \
                      .offset((page - 1) * per_page).limit(per_page).all()
        
        total_amount = query.with_entities(func.sum(Expense.amount)).scalar() or 0
        
        pages = (total + per_page - 1) // per_page if per_page > 0 else 0
        exp_list = [e.to_dict() for e in expenses]
        return jsonify({
            'records': exp_list,
            'list': exp_list,
            'items': exp_list,
            'total': total,
            'page': page,
            'per_page': per_page,
            'page_size': per_page,
            'pages': pages,
            'total_amount': total_amount
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/expenses/<int:expense_id>', methods=['GET'])
@login_required
def get_expense(expense_id):
    try:
        if g.current_user.get('role') != 'admin':
            return jsonify({'error': '无权查看支出详情'}), 403
        expense = Expense.query.get_or_404(expense_id)
        return jsonify(expense.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/expenses', methods=['POST'])
@login_required
@admin_required
def add_expense():
    try:
        data = request.get_json() or {}
        user_name = get_login_user_name()
        
        amount = float(data.get('amount') or 0)
        if amount <= 0:
            return jsonify({'error': '支出金额必须大于0'}), 400
        
        category_name = data.get('category', '')
        category_id = data.get('category_id')
        if category_id and not category_name:
            cat = ExpenseCategory.query.get(category_id)
            if cat:
                category_name = cat.name
        
        project_name = data.get('project_name', '')
        project_id = data.get('project_id')
        if project_id and not project_name:
            try:
                proj = Project.query.get(project_id)
                if proj:
                    project_name = proj.name
            except:
                pass
        
        customer_name = data.get('customer_name', '')
        customer_id = data.get('customer_id')
        if customer_id and not customer_name:
            try:
                cust = Customer.query.get(customer_id)
                if cust:
                    customer_name = cust.name
            except:
                pass
        
        handler = data.get('handler', '') or data.get('staff_name', '') or user_name
        
        expense = Expense(
            expense_type=data.get('expense_type', 'other'),
            category_id=category_id,
            category=category_name,
            title=data.get('title', ''),
            amount=amount,
            expense_date=datetime.strptime(data.get('expense_date') or datetime.now().strftime('%Y-%m-%d'), '%Y-%m-%d').date(),
            related_type=data.get('related_type', ''),
            related_id=data.get('related_id'),
            related_no=data.get('related_no', ''),
            record_id=data.get('record_id'),
            project_id=project_id,
            project_name=project_name,
            customer_id=customer_id,
            customer_name=customer_name,
            supplier=data.get('supplier', ''),
            handler=handler,
            payment_method=data.get('payment_method', 'cash'),
            is_invoiced=data.get('is_invoiced', 'uninvoiced') or 'uninvoiced',
            remark=data.get('remark', '') or data.get('note', ''),
            created_by=user_name
        )
        db.session.add(expense)
        db.session.commit()
        return jsonify(expense.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/expenses/<int:expense_id>', methods=['PUT'])
@login_required
@admin_required
def update_expense(expense_id):
    try:
        expense = Expense.query.get_or_404(expense_id)
        data = request.get_json() or {}
        
        if 'expense_type' in data:
            expense.expense_type = data['expense_type']
        if 'category_id' in data:
            expense.category_id = data['category_id']
            if data['category_id']:
                cat = ExpenseCategory.query.get(data['category_id'])
                if cat:
                    expense.category = cat.name
        if 'category' in data:
            expense.category = data['category']
        if 'title' in data:
            expense.title = data['title']
        if 'amount' in data:
            expense.amount = float(data['amount'] or 0)
        if 'expense_date' in data and data['expense_date']:
            expense.expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
        if 'record_id' in data:
            expense.record_id = data['record_id']
        if 'project_id' in data:
            expense.project_id = data['project_id']
            if data['project_id']:
                try:
                    proj = Project.query.get(data['project_id'])
                    if proj:
                        expense.project_name = proj.name
                except:
                    pass
        if 'project_name' in data:
            expense.project_name = data['project_name']
        if 'customer_id' in data:
            expense.customer_id = data['customer_id']
            if data['customer_id']:
                try:
                    cust = Customer.query.get(data['customer_id'])
                    if cust:
                        expense.customer_name = cust.name
                except:
                    pass
        if 'customer_name' in data:
            expense.customer_name = data['customer_name']
        if 'supplier' in data:
            expense.supplier = data['supplier']
        if 'handler' in data or 'staff_name' in data:
            expense.handler = data.get('handler', '') or data.get('staff_name', '')
        if 'payment_method' in data:
            expense.payment_method = data['payment_method']
        if 'is_invoiced' in data:
            val = data['is_invoiced']
            if isinstance(val, bool):
                expense.is_invoiced = 'invoiced' if val else 'uninvoiced'
            else:
                expense.is_invoiced = str(val) if val else 'uninvoiced'
        if 'remark' in data or 'note' in data:
            expense.remark = data.get('remark', '') or data.get('note', '')
        
        db.session.commit()
        return jsonify(expense.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_expense(expense_id):
    try:
        expense = Expense.query.get_or_404(expense_id)
        db.session.delete(expense)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/expenses/stats', methods=['GET'])
@login_required
def get_expense_stats():
    try:
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        query = Expense.query
        if g.current_user.get('role') != 'admin':
            query = query.filter(Expense.id == -1)
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        
        total = query.with_entities(func.sum(Expense.amount)).scalar() or 0
        
        # 按分类统计
        by_category = db.session.query(
            Expense.category,
            func.sum(Expense.amount).label('amount')
        ).filter(
            Expense.id.in_([e.id for e in query.all()]) if start_date or end_date else True
        ).group_by(Expense.category).all()
        
        # 按类型统计
        by_type = db.session.query(
            Expense.expense_type,
            func.sum(Expense.amount).label('amount')
        ).filter(
            Expense.id.in_([e.id for e in query.all()]) if start_date or end_date else True
        ).group_by(Expense.expense_type).all()
        
        return jsonify({
            'total': total,
            'by_category': [{'category': c, 'amount': a or 0} for c, a in by_category],
            'by_type': [{'type': t, 'amount': a or 0} for t, a in by_type]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===================== 统计 =====================


@finance_bp.route('/payments', methods=['GET'])
@login_required
def get_payments():
    try:
        record_id = request.args.get('record_id', type=int)
        project_id = request.args.get('project_id', type=int)
        customer_name = request.args.get('customer_name')
        payment_method = request.args.get('payment_method')
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        keyword = request.args.get('keyword', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', request.args.get('page_size', 20), type=int)

        query = PaymentRecord.query
        if record_id:
            query = query.filter(PaymentRecord.record_id == record_id)
        if project_id:
            query = query.filter(PaymentRecord.project_id == project_id)
        if customer_name:
            query = query.filter(PaymentRecord.customer_name.like(f'%{customer_name}%'))
        if payment_method:
            query = query.filter(PaymentRecord.payment_method == payment_method)
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(PaymentRecord.payment_date >= start.date())
            except: pass
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d')
                query = query.filter(PaymentRecord.payment_date <= end.date())
            except: pass
        if keyword:
            query = query.filter(
                db.or_(
                    PaymentRecord.customer_name.like(f'%{keyword}%'),
                    PaymentRecord.remark.like(f'%{keyword}%'),
                    PaymentRecord.received_by.like(f'%{keyword}%'),
                    PaymentRecord.project_name.like(f'%{keyword}%')
                )
            )
        if g.current_user.get('role') != 'admin' and g.current_user.get('staff_name'):
            _un = g.current_user.get('staff_name')
            query = query.join(WorkRecord, PaymentRecord.record_id == WorkRecord.id).filter(
                db.or_(
                    WorkRecord.staff_names.like(f'%{_un}%'),
                    WorkRecord.staff_name == _un,
                    WorkRecord.created_by == _un
                )
            )

        pagination = query.order_by(PaymentRecord.payment_date.desc(), PaymentRecord.id.desc()).paginate(page=page, per_page=per_page)
        total_amount = db.session.query(func.sum(PaymentRecord.amount)).filter(
            PaymentRecord.id.in_([p.id for p in pagination.items])
        ).scalar() or 0

        pay_list = [p.to_dict() for p in pagination.items]
        return jsonify({
            'records': pay_list,
            'list': pay_list,
            'items': pay_list,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'page_size': per_page,
            'pages': pagination.pages,
            'total_amount': float(total_amount)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/payments/<int:payment_id>', methods=['GET'])
@login_required
def get_payment(payment_id):
    try:
        payment = PaymentRecord.query.get_or_404(payment_id)
        return jsonify(payment.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@finance_bp.route('/payments/stats', methods=['GET'])
@login_required
def get_payment_stats():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)

        base_filter = []
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                base_filter.append(PaymentRecord.payment_date >= start.date())
            except: pass
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d')
                base_filter.append(PaymentRecord.payment_date <= end.date())
            except: pass

        total_received_q = db.session.query(func.sum(PaymentRecord.amount)).filter(*base_filter)
        receivable_q = WorkRecord.query.filter(WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly']))
        total_receivable_q = db.session.query(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)).filter(
            WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly'])
        )
        customer_receivable_query = db.session.query(
            WorkRecord.customer_name,
            func.sum(WorkRecord.total_fee - WorkRecord.paid_amount).label('amount'),
            func.count(WorkRecord.id).label('record_count')
        ).filter(WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly'])).group_by(
            WorkRecord.customer_name
        ).order_by(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount).desc())

        if g.current_user.get('role') != 'admin' and g.current_user.get('staff_name'):
            _un = g.current_user.get('staff_name')
            staff_filter = db.or_(
                WorkRecord.staff_names.like(f'%{_un}%'),
                WorkRecord.staff_name == _un,
                WorkRecord.created_by == _un
            )
            total_received_q = total_received_q.join(WorkRecord, PaymentRecord.record_id == WorkRecord.id).filter(staff_filter)
            receivable_q = receivable_q.filter(staff_filter)
            total_receivable_q = total_receivable_q.filter(staff_filter)
            customer_receivable_query = customer_receivable_query.filter(staff_filter)

        total_received = total_received_q.scalar() or 0
        total_receivable = total_receivable_q.scalar() or 0
        
        pagination = customer_receivable_query.paginate(page=page, per_page=per_page)

        return jsonify({
            'total_received': float(total_received),
            'total_receivable': float(total_receivable),
            'customer_receivable': [{'customer_name': r[0], 'amount': float(r[1] or 0), 'record_count': int(r[2] or 0)} for r in pagination.items],
            'receivable_total': pagination.total,
            'receivable_page': page,
            'receivable_pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@finance_bp.route('/payments', methods=['POST'])
@login_required
@admin_required
def create_payment():
    try:
        data = request.get_json() or {}
        record_id = data.get('record_id')
        project_id = data.get('project_id')
        customer_id = data.get('customer_id')
        customer_name = data.get('customer_name', '').strip()
        amount = float(data.get('amount') or 0)
        if amount <= 0:
            return jsonify({'error': '收款金额不能为空'}), 400
        if not record_id and not customer_name:
            return jsonify({'error': '请至少填写客户名称或关联工单ID'}), 400

        record = None
        project_name = data.get('project_name', '')
        if record_id:
            record = WorkRecord.query.get(record_id)
            if not record:
                return jsonify({'error': '工单不存在'}), 404
            customer_name = customer_name or record.customer_name
            if not project_id and hasattr(record, 'project_id'):
                project_id = record.project_id

        if project_id and not project_name:
            try:
                proj = Project.query.get(project_id)
                if proj:
                    project_name = proj.name
            except:
                pass
        
        if customer_id and not customer_name:
            try:
                cust = Customer.query.get(customer_id)
                if cust:
                    customer_name = cust.name
            except:
                pass

        payment_date_str = data.get('payment_date')
        payment_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date() if payment_date_str else datetime.now().date()

        payment_method_map = {
            '现金': 'cash', '微信': 'wechat', '支付宝': 'alipay', '银行转账': 'bank', '其他': 'other'
        }
        payment_method_val = data.get('payment_method', 'cash')
        payment_method = payment_method_map.get(payment_method_val, payment_method_val if payment_method_val in ['cash', 'wechat', 'alipay', 'bank', 'other'] else 'cash')

        payment = PaymentRecord(
            record_id=record_id if record_id else None,
            project_id=project_id,
            project_name=project_name,
            customer_id=customer_id,
            customer_name=customer_name,
            amount=amount,
            payment_date=payment_date,
            payment_method=payment_method,
            received_by=data.get('received_by', '') or data.get('handler', ''),
            is_invoiced=data.get('is_invoiced', 'uninvoiced') or 'uninvoiced',
            remark=data.get('remark', ''),
            created_by=get_login_user_name()
        )
        db.session.add(payment)
        db.session.flush()

        if record:
            new_paid = (record.paid_amount or 0) + amount
            record.paid_amount = new_paid
            if new_paid >= (record.total_fee or 0):
                record.payment_status = 'paid'
            elif new_paid > 0:
                record.payment_status = 'partial'
            else:
                record.payment_status = 'unpaid'

            _log_operation('work_record', record.id, 'update',
                {'paid_amount': record.paid_amount - amount, 'payment_status': 'before'},
                {'paid_amount': new_paid, 'payment_status': record.payment_status},
                record.customer_name + ' - ' + (record.order_no or ''))

        notify_content = f'{customer_name} 收款 ¥{amount:.2f}'
        if record:
            notify_content += f'（工单{record.order_no or ""}）'
        if record and record.payment_status == 'paid':
            _notify_admins('🎉 工单已结清', notify_content, 'success', 'work_record', record.id if record else None)
        else:
            _notify_admins('💰 新收款登记', notify_content, 'info', 'work_record', record.id if record else None)

        db.session.commit()
        return jsonify(payment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@finance_bp.route('/payments/<int:payment_id>', methods=['PUT'])
@login_required
@admin_required
def update_payment(payment_id):
    try:
        payment = PaymentRecord.query.get_or_404(payment_id)
        data = request.get_json() or {}

        old_amount = payment.amount
        old_record_id = payment.record_id

        if 'amount' in data:
            payment.amount = float(data['amount'] or 0)
        if 'payment_date' in data and data['payment_date']:
            payment.payment_date = datetime.strptime(data['payment_date'], '%Y-%m-%d').date()
        if 'payment_method' in data:
            pm = data['payment_method']
            payment_method_map = {
                '现金': 'cash', '微信': 'wechat', '支付宝': 'alipay', '银行转账': 'bank', '其他': 'other'
            }
            payment.payment_method = payment_method_map.get(pm, pm if pm in ['cash', 'wechat', 'alipay', 'bank', 'other'] else payment.payment_method)
        if 'received_by' in data or 'handler' in data:
            payment.received_by = data.get('received_by', '') or data.get('handler', '')
        if 'is_invoiced' in data:
            val = data['is_invoiced']
            if isinstance(val, bool):
                payment.is_invoiced = 'invoiced' if val else 'uninvoiced'
            else:
                payment.is_invoiced = str(val) if val else 'uninvoiced'
        if 'remark' in data:
            payment.remark = data['remark']
        if 'customer_name' in data:
            payment.customer_name = data['customer_name']
        if 'customer_id' in data:
            payment.customer_id = data['customer_id']
            if data['customer_id']:
                try:
                    cust = Customer.query.get(data['customer_id'])
                    if cust:
                        payment.customer_name = cust.name
                except:
                    pass
        if 'project_id' in data:
            payment.project_id = data['project_id']
            if data['project_id']:
                try:
                    proj = Project.query.get(data['project_id'])
                    if proj:
                        payment.project_name = proj.name
                except:
                    pass
        if 'project_name' in data:
            payment.project_name = data['project_name']

        if 'record_id' in data and data['record_id'] != old_record_id:
            new_record = WorkRecord.query.get(data['record_id']) if data['record_id'] else None
            if new_record or not data['record_id']:
                old_record = WorkRecord.query.get(old_record_id) if old_record_id else None
                if old_record:
                    old_record.paid_amount = max(0, (old_record.paid_amount or 0) - old_amount)
                    if old_record.paid_amount >= (old_record.total_fee or 0):
                        old_record.payment_status = 'paid'
                    elif old_record.paid_amount > 0:
                        old_record.payment_status = 'partial'
                    else:
                        old_record.payment_status = 'unpaid'

                payment.record_id = data['record_id'] if data['record_id'] else None
                if new_record:
                    if not payment.customer_name:
                        payment.customer_name = new_record.customer_name
                    new_record.paid_amount = (new_record.paid_amount or 0) + payment.amount
                    if new_record.paid_amount >= (new_record.total_fee or 0):
                        new_record.payment_status = 'paid'
                    elif new_record.paid_amount > 0:
                        new_record.payment_status = 'partial'
                    else:
                        new_record.payment_status = 'unpaid'
        elif 'amount' in data:
            record = WorkRecord.query.get(payment.record_id) if payment.record_id else None
            if record:
                diff = payment.amount - old_amount
                new_paid = (record.paid_amount or 0) + diff
                record.paid_amount = max(0, new_paid)
                if record.paid_amount >= (record.total_fee or 0):
                    record.payment_status = 'paid'
                elif record.paid_amount > 0:
                    record.payment_status = 'partial'
                else:
                    record.payment_status = 'unpaid'

        db.session.commit()
        return jsonify(payment.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@finance_bp.route('/payments/<int:payment_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_payment(payment_id):
    try:
        payment = PaymentRecord.query.get_or_404(payment_id)
        record = WorkRecord.query.get(payment.record_id)
        if record:
            record.paid_amount = max(0, (record.paid_amount or 0) - (payment.amount or 0))
            if record.paid_amount >= (record.total_fee or 0):
                record.payment_status = 'paid'
            elif record.paid_amount > 0:
                record.payment_status = 'partial'
            else:
                record.payment_status = 'unpaid'

        db.session.delete(payment)
        db.session.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



