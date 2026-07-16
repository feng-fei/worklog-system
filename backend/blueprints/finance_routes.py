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
        month = request.args.get('month')
        status = request.args.get('status')
        query = SalaryRecord.query
        if g.current_user.get('role') != 'admin':
            query = query.filter(SalaryRecord.staff_name == g.current_user.get('staff_name', ''))
        if staff_name:
            query = query.filter(SalaryRecord.staff_name == staff_name)
        if status:
            query = query.filter(SalaryRecord.status == status)
        if month:
            start = datetime.strptime(month + '-01', '%Y-%m-%d')
            end = datetime(start.year + (1 if start.month == 12 else 0), 1 if start.month == 12 else start.month + 1, 1)
            query = query.filter(SalaryRecord.work_date >= start, SalaryRecord.work_date < end)
        records = query.order_by(SalaryRecord.work_date.desc(), SalaryRecord.id.desc()).limit(500).all()
        total_payable = sum(x.payable_amount or 0 for x in records)
        total_paid = sum(x.paid_amount or 0 for x in records)
        return jsonify({'records': [x.to_dict() for x in records], 'summary': {'payable': total_payable, 'paid': total_paid, 'unpaid': total_payable - total_paid}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/salaries', methods=['POST'])
@login_required
@admin_required
def create_salary():
    try:
        data = request.get_json() or {}
        staff_name = data.get('staff_name', '').strip()
        if not staff_name:
            return jsonify({'error': '员工不能为空'}), 400
        work_date = datetime.strptime(data.get('work_date') or datetime.now().strftime('%Y-%m-%d'), '%Y-%m-%d')
        daily_wage = float(data.get('daily_wage') or 0)
        work_units = float(data.get('work_units') or 1)
        subsidy = float(data.get('subsidy') or 0)
        deduction = float(data.get('deduction') or 0)
        payable = round(daily_wage * work_units + subsidy - deduction, 2)
        staff = Staff.query.filter_by(name=staff_name).first()
        salary = SalaryRecord(
            salary_no=_generate_salary_no(work_date),
            staff_name=staff_name,
            staff_type=staff.staff_type if staff else data.get('staff_type', 'temp'),
            work_date=work_date,
            business_type=data.get('business_type', '其他'),
            business_no=data.get('business_no', ''),
            customer_name=data.get('customer_name', ''),
            work_content=data.get('work_content', ''),
            salary_type=data.get('salary_type', '日薪'),
            daily_wage=daily_wage,
            work_units=work_units,
            subsidy=subsidy,
            deduction=deduction,
            payable_amount=payable,
            paid_amount=float(data.get('paid_amount') or 0),
            status=data.get('status', 'unsettled'),
            settlement_date=data.get('settlement_date', ''),
            payment_method=data.get('payment_method', ''),
            remark=data.get('remark', '')
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


@finance_bp.route('/salaries/<int:salary_id>', methods=['PUT'])
@login_required
def update_salary(salary_id):
    try:
        if g.current_user.get('role') != 'admin':
            return jsonify({'error': '仅管理员可编辑工资记录'}), 403
        salary = SalaryRecord.query.get_or_404(salary_id)
        data = request.get_json() or {}
        if 'staff_name' in data:
            salary.staff_name = data['staff_name']
        if 'staff_type' in data:
            salary.staff_type = data['staff_type']
        if 'work_date' in data and data['work_date']:
            salary.work_date = datetime.strptime(data['work_date'], '%Y-%m-%d')
        if 'daily_wage' in data:
            salary.daily_wage = float(data['daily_wage'] or 0)
        if 'work_units' in data:
            salary.work_units = float(data['work_units'] or 0)
        if 'subsidy' in data:
            salary.subsidy = float(data['subsidy'] or 0)
        if 'deduction' in data:
            salary.deduction = float(data['deduction'] or 0)
        if 'paid_amount' in data:
            salary.paid_amount = float(data['paid_amount'] or 0)
        if 'payment_method' in data:
            salary.payment_method = data['payment_method'] or ''
        if 'business_type' in data:
            salary.business_type = data['business_type'] or ''
        if 'business_no' in data:
            salary.business_no = data['business_no'] or ''
        if 'customer_name' in data:
            salary.customer_name = data['customer_name'] or ''
        if 'work_content' in data:
            salary.work_content = data['work_content'] or ''
        if 'remark' in data:
            salary.remark = data['remark'] or ''
        salary.payable_amount = round((salary.daily_wage or 0) * (salary.work_units or 0) + (salary.subsidy or 0) - (salary.deduction or 0), 2)
        if salary.paid_amount >= salary.payable_amount and salary.payable_amount > 0:
            salary.status = 'settled'
            salary.settlement_date = datetime.now().strftime('%Y-%m-%d')
        else:
            salary.status = 'unsettled'
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
        return jsonify({'categories': [c.to_dict() for c in categories]})
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
        per_page = int(request.args.get('per_page', 20))
        expense_type = request.args.get('expense_type', '')
        category = request.args.get('category', '')
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
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        if keyword:
            query = query.filter(
                db.or_(
                    Expense.title.like(f'%{keyword}%'),
                    Expense.remark.like(f'%{keyword}%'),
                    Expense.supplier.like(f'%{keyword}%')
                )
            )
        
        total = query.count()
        expenses = query.order_by(Expense.expense_date.desc(), Expense.id.desc()) \
                      .offset((page - 1) * per_page).limit(per_page).all()
        
        # 统计汇总
        total_amount = query.with_entities(func.sum(Expense.amount)).scalar() or 0
        
        return jsonify({
            'items': [e.to_dict() for e in expenses],
            'total': total,
            'page': page,
            'per_page': per_page,
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
        
        expense = Expense(
            expense_type=data.get('expense_type', 'other'),
            category=data.get('category', ''),
            title=data.get('title', ''),
            amount=amount,
            expense_date=datetime.strptime(data.get('expense_date') or datetime.now().strftime('%Y-%m-%d'), '%Y-%m-%d').date(),
            related_type=data.get('related_type', ''),
            related_id=data.get('related_id'),
            related_no=data.get('related_no', ''),
            supplier=data.get('supplier', ''),
            payment_method=data.get('payment_method', 'cash'),
            remark=data.get('remark', ''),
            created_by=user_name
        )
        db.session.add(expense)
        db.session.commit()
        return jsonify(expense.to_dict())
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
        
        expense.expense_type = data.get('expense_type', expense.expense_type)
        expense.category = data.get('category', expense.category)
        expense.title = data.get('title', expense.title)
        expense.amount = float(data.get('amount', expense.amount) or 0)
        if data.get('expense_date'):
            expense.expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
        expense.supplier = data.get('supplier', expense.supplier)
        expense.payment_method = data.get('payment_method', expense.payment_method)
        expense.remark = data.get('remark', expense.remark)
        
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
        customer_name = request.args.get('customer_name')
        payment_method = request.args.get('payment_method')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = PaymentRecord.query
        if record_id:
            query = query.filter(PaymentRecord.record_id == record_id)
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

        return jsonify({
            'records': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'total_amount': float(total_amount)
        })
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
        customer_name = data.get('customer_name', '').strip()
        amount = float(data.get('amount') or 0)
        if amount <= 0:
            return jsonify({'error': '收款金额不能为空'}), 400
        if not record_id and not customer_name:
            return jsonify({'error': '请至少填写客户名称或关联工单ID'}), 400

        record = None
        if record_id:
            record = WorkRecord.query.get(record_id)
            if not record:
                return jsonify({'error': '工单不存在'}), 404
            customer_name = customer_name or record.customer_name

        payment_date_str = data.get('payment_date')
        payment_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date() if payment_date_str else datetime.now().date()

        payment = PaymentRecord(
            record_id=record_id if record_id else None,
            customer_name=customer_name,
            amount=amount,
            payment_date=payment_date,
            payment_method=data.get('payment_method', 'cash'),
            is_invoiced=bool(data.get('is_invoiced', False)),
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
            payment.payment_method = data['payment_method']
        if 'is_invoiced' in data:
            payment.is_invoiced = bool(data['is_invoiced'])
        if 'remark' in data:
            payment.remark = data['remark']

        if 'record_id' in data and data['record_id'] != old_record_id:
            new_record = WorkRecord.query.get(data['record_id'])
            if new_record:
                old_record = WorkRecord.query.get(old_record_id)
                if old_record:
                    old_record.paid_amount = max(0, (old_record.paid_amount or 0) - old_amount)
                    if old_record.paid_amount >= (old_record.total_fee or 0):
                        old_record.payment_status = 'paid'
                    elif old_record.paid_amount > 0:
                        old_record.payment_status = 'partial'
                    else:
                        old_record.payment_status = 'unpaid'

                payment.record_id = data['record_id']
                payment.customer_name = new_record.customer_name
                new_record.paid_amount = (new_record.paid_amount or 0) + payment.amount
                if new_record.paid_amount >= (new_record.total_fee or 0):
                    new_record.payment_status = 'paid'
                elif new_record.paid_amount > 0:
                    new_record.payment_status = 'partial'
                else:
                    new_record.payment_status = 'unpaid'
        elif 'amount' in data:
            record = WorkRecord.query.get(payment.record_id)
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



