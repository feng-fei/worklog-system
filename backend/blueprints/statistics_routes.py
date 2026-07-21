from flask import request, jsonify, g, send_from_directory, current_app
from ..models import *
from .. import db
from ..auth import login_required, admin_required
from ..utils import *
from . import statistics_bp
import os
import json
from datetime import datetime, date, timedelta
from sqlalchemy import func, or_, and_


@statistics_bp.route('/statistics', methods=['GET'])
@login_required
def get_statistics():
    try:
        range_type = request.args.get('range', 'month')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today.replace(day=1)
        if month_start.month == 12:
            month_end = datetime(month_start.year + 1, 1, 1)
        else:
            month_end = datetime(month_start.year, month_start.month + 1, 1)

        if range_type == 'week':
            start = today - timedelta(days=today.weekday())
            end = start + timedelta(days=7)
        elif range_type == 'month':
            start = month_start
            end = month_end
        elif range_type == 'year':
            start = today.replace(month=1, day=1)
            end = datetime(start.year + 1, 1, 1)
        else:
            start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.now() - timedelta(days=30)
            end = datetime.strptime(end_date, '%Y-%m-%d') if end_date else datetime.now()
            end = end + timedelta(days=1)

        user_role = g.current_user.get('role', 'worker')
        user_staff_name = g.current_user.get('staff_name', '')
        is_admin = user_role == 'admin'

        # 基础过滤 - 工单
        record_filter = [WorkRecord.work_date >= start, WorkRecord.work_date < end]
        if not is_admin:
            record_filter.append(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff_name}%'),
                    WorkRecord.staff_name == user_staff_name,
                    WorkRecord.created_by == user_staff_name
                )
            )

        # 本月过滤
        month_record_filter = [WorkRecord.work_date >= month_start, WorkRecord.work_date < month_end]
        if not is_admin:
            month_record_filter.append(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff_name}%'),
                    WorkRecord.staff_name == user_staff_name,
                    WorkRecord.created_by == user_staff_name
                )
            )

        # ==================== 工单统计 ====================
        total_records = WorkRecord.query.count() if is_admin else _apply_record_permission(WorkRecord.query).count()
        pending_records = WorkRecord.query.filter(WorkRecord.status.in_(['pending', 'dispatched'])).count() if is_admin else _apply_record_permission(WorkRecord.query.filter(WorkRecord.status.in_(['pending', 'dispatched']))).count()
        in_progress_records = WorkRecord.query.filter(WorkRecord.status.in_(['in_progress', 'callback', 'settlement'])).count() if is_admin else _apply_record_permission(WorkRecord.query.filter(WorkRecord.status.in_(['in_progress', 'callback', 'settlement']))).count()
        completed_records = WorkRecord.query.filter(WorkRecord.status == 'completed').count() if is_admin else _apply_record_permission(WorkRecord.query.filter(WorkRecord.status == 'completed')).count()
        
        month_new_records = WorkRecord.query.filter(*month_record_filter, WorkRecord.created_at >= month_start).count()
        month_completed_records = WorkRecord.query.filter(*month_record_filter, WorkRecord.status == 'completed').count()

        # 类型分布
        construction_count = WorkRecord.query.filter(*record_filter, WorkRecord.record_type == 'construction').count()
        repair_count = WorkRecord.query.filter(*record_filter, WorkRecord.record_type == 'repair').count()
        inspection_count = WorkRecord.query.filter(*record_filter, WorkRecord.record_type == 'inspection').count()
        total_works = WorkRecord.query.filter(*record_filter).count()

        # 上期对比
        period_days = (end - start).days
        last_start = start - timedelta(days=period_days)
        last_end = start
        last_record_filter = [WorkRecord.work_date >= last_start, WorkRecord.work_date < last_end]
        if not is_admin:
            last_record_filter.append(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff_name}%'),
                    WorkRecord.staff_name == user_staff_name,
                    WorkRecord.created_by == user_staff_name
                )
            )
        last_period_count = WorkRecord.query.filter(*last_record_filter).count()
        growth_rate = (total_works - last_period_count) / last_period_count if last_period_count > 0 else 0

        # ==================== 财务统计 ====================
        # 本月收款（实际到账）
        month_payments_filter = [PaymentRecord.payment_date >= month_start.date(), PaymentRecord.payment_date < month_end.date()]
        if not is_admin:
            month_payments_filter.append(
                db.or_(PaymentRecord.created_by == user_staff_name)
            )
        month_income = db.session.query(func.sum(PaymentRecord.amount)).filter(*month_payments_filter).scalar() or 0

        # 本月支出
        month_expense_date_filter = [Expense.expense_date >= month_start.date(), Expense.expense_date < month_end.date()]
        if is_admin:
            month_expense = db.session.query(func.sum(Expense.amount)).filter(*month_expense_date_filter).scalar() or 0
            month_project_expense = db.session.query(func.sum(ProjectExpense.amount)).filter(
                ProjectExpense.expense_date >= month_start.date(), ProjectExpense.expense_date < month_end.date()
            ).scalar() or 0
            month_salary_paid = db.session.query(func.sum(SalaryRecord.paid_amount)).filter(
                SalaryRecord.status == 'settled',
                SalaryRecord.settlement_date >= month_start.strftime('%Y-%m-%d'),
                SalaryRecord.settlement_date < month_end.strftime('%Y-%m-%d')
            ).scalar() or 0
            month_expense = float(month_expense) + float(month_project_expense) + float(month_salary_paid)
        else:
            month_expense = 0

        month_profit = float(month_income) - float(month_expense)

        # 待收款总额
        pending_payment_query = db.session.query(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)).filter(
            WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly'])
        )
        if not is_admin:
            pending_payment_query = _apply_record_permission(pending_payment_query)
        pending_receivable = pending_payment_query.scalar() or 0

        # ==================== 客户统计 ====================
        total_customers = Customer.query.count()
        month_new_customers = Customer.query.filter(Customer.created_at >= month_start).count()

        # ==================== 员工统计 ====================
        total_staffs = Staff.query.filter_by(status='active').count()

        # 本月工单完成排行
        staff_ranking_data = db.session.query(
            WorkRecord.staff_name,
            func.count(WorkRecord.id).label('record_count'),
            func.sum(WorkRecord.work_hours).label('work_hours'),
        ).filter(*month_record_filter, WorkRecord.staff_name != '', WorkRecord.status == 'completed').group_by(WorkRecord.staff_name).order_by(func.count(WorkRecord.id).desc()).limit(10).all()

        # 客户工单排行（全周期）
        customer_ranking_data = db.session.query(
            WorkRecord.customer_name,
            func.count(WorkRecord.id).label('record_count'),
            func.sum(WorkRecord.total_fee).label('total_amount'),
        ).filter(WorkRecord.customer_name != '').group_by(WorkRecord.customer_name).order_by(func.count(WorkRecord.id).desc()).limit(5).all()

        # 费用汇总
        totals = db.session.query(
            func.sum(WorkRecord.labor_fee),
            func.sum(WorkRecord.material_fee),
            func.sum(WorkRecord.transport_fee),
            func.sum(WorkRecord.other_fee),
            func.sum(WorkRecord.total_fee)
        ).filter(*record_filter).first()

        return jsonify({
            # 工单统计
            'total_records': total_records,
            'pending_records': pending_records,
            'in_progress_records': in_progress_records,
            'completed_records': completed_records,
            'month_new_records': month_new_records,
            'month_completed_records': month_completed_records,
            # 兼容旧字段
            'total_count': total_works,
            'total_works': total_works,
            'completed_count': completed_records,
            'pending_count': PendingWork.query.filter_by(status='pending').count() if is_admin else _apply_pending_permission(PendingWork.query.filter_by(status='pending')).count(),
            'completion_rate': completed_records / total_records if total_records > 0 else 0,
            'current_period': total_works,
            'last_period': last_period_count,
            'growth_rate': growth_rate,
            'construction_count': construction_count,
            'maintenance_count': repair_count,
            'inspection_count': inspection_count,
            'repair_count': repair_count,
            # 财务统计
            'month_income': float(month_income),
            'month_expense': float(month_expense),
            'month_profit': round(month_profit, 2),
            'pending_receivable': float(pending_receivable),
            'paid_amount': float(totals[4] or 0) if totals else 0,
            'unpaid_amount': float(pending_receivable),
            'unpaid_salary': 0,
            # 客户统计
            'total_customers': total_customers,
            'month_new_customers': month_new_customers,
            # 员工统计
            'total_staffs': total_staffs,
            'staff_ranking': [{'staff_name': s[0], 'record_count': s[1], 'work_hours': float(s[2] or 0)} for s in staff_ranking_data],
            'customer_ranking': [{'customer_name': c[0], 'record_count': c[1], 'total_amount': float(c[2] or 0)} for c in customer_ranking_data],
            'staff_stats': [],
            'fee_summary': [],
            'totals': {
                'labor_fee': float(totals[0] or 0) if totals else 0,
                'material_fee': float(totals[1] or 0) if totals else 0,
                'transport_fee': float(totals[2] or 0) if totals else 0,
                'other_fee': float(totals[3] or 0) if totals else 0,
                'total_fee': float(totals[4] or 0) if totals else 0
            },
            'date_range': {'start': start.date().isoformat(), 'end': (end - timedelta(days=1)).date().isoformat()}
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ===================== 导出 =====================


@statistics_bp.route('/dashboard', methods=['GET'])
@login_required
def get_dashboard():
    """获取仪表盘数据"""
    try:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        user_role = g.current_user.get('role', 'worker')
        user_staff = g.current_user.get('staff_name', '')

        # 今日工单
        today_q = _apply_record_permission(WorkRecord.query.filter(WorkRecord.work_date >= today, WorkRecord.work_date < tomorrow))
        today_count = today_q.count()
        today_total_q = _apply_record_permission(db.session.query(func.sum(WorkRecord.total_fee)).filter(
            WorkRecord.work_date >= today, WorkRecord.work_date < tomorrow
        ))
        today_total = today_total_q.scalar() or 0
        today_records = today_q.order_by(WorkRecord.work_date.desc()).limit(10).all()
        
        # 待办数量
        pending_q = PendingWork.query.filter_by(status='pending')
        if user_role == 'worker' and user_staff:
            pending_q = pending_q.filter(PendingWork.staff_name.like(f'%{user_staff}%'))
        pending_count = pending_q.count()
        unpaid_q = _apply_record_permission(db.session.query(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)).filter(
            WorkRecord.payment_status.in_(['unpaid','partial','monthly'])
        ))
        unpaid_amount = unpaid_q.scalar() or 0
        salary_q = db.session.query(func.sum(SalaryRecord.payable_amount - SalaryRecord.paid_amount)).filter_by(status='unsettled')
        if user_role == 'worker' and user_staff:
            salary_q = salary_q.filter(SalaryRecord.staff_name == user_staff)
        unpaid_salary = salary_q.scalar() or 0
        today_construction_count = today_q.filter(WorkRecord.record_type == 'construction').count()
        today_repair_count = today_q.filter(WorkRecord.record_type == 'repair').count()
        
        # 本月统计
        month_start = today.replace(day=1)
        month_q = _apply_record_permission(WorkRecord.query.filter(WorkRecord.work_date >= month_start))
        month_count = month_q.count()
        month_total = month_q.with_entities(func.sum(WorkRecord.total_fee)).scalar() or 0
        
        # 超期待办
        overdue_q = PendingWork.query.filter(
            PendingWork.status == 'pending',
            PendingWork.reminder_date < today
        )
        if user_role == 'worker' and user_staff:
            overdue_q = overdue_q.filter(PendingWork.staff_name.like(f'%{user_staff}%'))
        overdue_pending = overdue_q.count()

        # 待办事项列表（按紧急程度取前5条：超时 > 今天 > 未来）
        urgency_order = db.case(
            (PendingWork.reminder_date < today, 0),
            (PendingWork.reminder_date == today.replace(hour=0, minute=0, second=0, microsecond=0), 1),
            else_=2
        )
        top_pending_q = PendingWork.query.filter_by(status='pending')
        if user_role == 'worker' and user_staff:
            top_pending_q = top_pending_q.filter(PendingWork.staff_name.like(f'%{user_staff}%'))
        top_pending = top_pending_q.order_by(urgency_order, PendingWork.reminder_date.asc()).limit(5).all()
        
        # 全部记录总数
        total_count = _apply_record_permission(WorkRecord.query).count()
        
        # 本月收入（收款）
        payment_q = db.session.query(func.sum(PaymentRecord.amount)).filter(
            PaymentRecord.payment_date >= month_start,
            PaymentRecord.payment_date < (today + timedelta(days=1))
        )
        if user_role == 'worker':
            payment_q = payment_q.join(WorkRecord, PaymentRecord.record_id == WorkRecord.id).filter(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff}%'),
                    WorkRecord.staff_name == user_staff,
                    WorkRecord.created_by == user_staff
                )
            )
        month_payment = payment_q.scalar() or 0
        
        # 本月支出
        if user_role == 'admin':
            month_expense = db.session.query(func.sum(Expense.amount)).filter(
                Expense.expense_date >= month_start,
                Expense.expense_date < (today + timedelta(days=1))
            ).scalar() or 0
        else:
            month_expense = 0
        
        # 低库存预警
        low_stock_count = Material.query.filter(
            Material.min_stock > 0,
            Material.stock <= Material.min_stock
        ).count()
        
        # 待维护设备（到期维护）
        today_date = today.date()
        due_maintenance_count = CustomerEquipment.query.filter(
            CustomerEquipment.next_maintenance != None,
            CustomerEquipment.next_maintenance <= today_date,
            CustomerEquipment.status == 'normal'
        ).count()
        
        # 进行中项目
        active_project_count = Project.query.filter(Project.status == 'in_progress').count()
        
        # 客户总数
        customer_count = Customer.query.count()
        
        # 物料总数
        material_count = Material.query.count()
        
        # 最近收款记录
        recent_payments_q = PaymentRecord.query
        if user_role == 'worker' and user_staff:
            recent_payments_q = recent_payments_q.join(WorkRecord, PaymentRecord.record_id == WorkRecord.id).filter(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff}%'),
                    WorkRecord.staff_name == user_staff,
                    WorkRecord.created_by == user_staff
                )
            )
        recent_payments = recent_payments_q.order_by(PaymentRecord.created_at.desc()).limit(5).all()
        
        # 最近支出记录
        if user_role == 'admin':
            recent_expenses = Expense.query.order_by(Expense.created_at.desc()).limit(5).all()
        else:
            recent_expenses = []
        
        # 活跃客户（近30天工单最多的前5个）
        try:
            from datetime import timedelta as td
            thirty_days_ago = today - td(days=30)
            top_customers_q = db.session.query(
                WorkRecord.customer_name,
                func.count(WorkRecord.id).label('cnt'),
                func.sum(WorkRecord.total_fee).label('amt')
            ).filter(
                WorkRecord.work_date >= thirty_days_ago,
                WorkRecord.customer_name != ''
            )
            if user_role == 'worker' and user_staff:
                top_customers_q = top_customers_q.filter(
                    db.or_(
                        WorkRecord.staff_names.like(f'%{user_staff}%'),
                        WorkRecord.staff_name == user_staff,
                        WorkRecord.created_by == user_staff
                    )
                )
            top_customers = top_customers_q.group_by(WorkRecord.customer_name).order_by(func.count(WorkRecord.id).desc()).limit(5).all()
        except Exception as e:
            top_customers = []
        
        return jsonify({
            'today_count': today_count,
            'today_construction_count': today_construction_count,
            'today_repair_count': today_repair_count,
            'today_total': float(today_total),
            'pending_count': pending_count,
            'overdue_pending': overdue_pending,
            'unpaid_amount': float(unpaid_amount),
            'unpaid_salary': float(unpaid_salary),
            'month_count': month_count,
            'month_total': float(month_total),
            'month_payment': float(month_payment),
            'month_expense': float(month_expense),
            'month_profit': float(month_payment - month_expense),
            'total_count': total_count,
            'low_stock_count': low_stock_count,
            'due_maintenance_count': due_maintenance_count,
            'active_project_count': active_project_count,
            'customer_count': customer_count,
            'material_count': material_count,
            'today_records': [r.to_dict() for r in today_records],
            'recent_records': [r.to_dict() for r in today_records],
            'urgent_pending': [{'id':p.id,'title':p.title,'customer_name':p.customer_name,'work_content':p.work_content,'staff_name':p.staff_name,'reminder_date':p.reminder_date.isoformat() if p.reminder_date else None,'work_address':p.work_address,'status':p.status} for p in top_pending],
            'recent_payments': [p.to_dict() for p in recent_payments],
            'recent_expenses': [e.to_dict() for e in recent_expenses],
            'top_customers': [{'customer_name': c[0], 'count': c[1], 'amount': float(c[2] or 0)} for c in top_customers if c[0]]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===================== 日历 =====================


@statistics_bp.route('/statistics/advanced', methods=['GET'])
@login_required
def get_advanced_statistics():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        group_by = request.args.get('group_by', 'month')  # day/week/month/customer/staff/type

        start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.now() - timedelta(days=90)
        end = datetime.strptime(end_date, '%Y-%m-%d') if end_date else datetime.now()
        end = end + timedelta(days=1)

        base_filter = [WorkRecord.work_date >= start, WorkRecord.work_date < end]
        user_role = g.current_user.get('role', 'worker')
        user_staff_name = g.current_user.get('staff_name', '')
        if user_role == 'worker':
            base_filter.append(
                db.or_(
                    WorkRecord.staff_names.like(f'%{user_staff_name}%'),
                    WorkRecord.staff_name == user_staff_name,
                    WorkRecord.created_by == user_staff_name
                )
            )

        totals = db.session.query(
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee),
            func.sum(WorkRecord.labor_fee),
            func.sum(WorkRecord.material_fee),
            func.sum(WorkRecord.transport_fee),
            func.sum(WorkRecord.other_fee),
            func.sum(WorkRecord.tax_amount),
            func.sum(WorkRecord.paid_amount)
        ).filter(*base_filter).first()

        type_stats = db.session.query(
            WorkRecord.record_type,
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee)
        ).filter(*base_filter).group_by(WorkRecord.record_type).all()

        status_stats = db.session.query(
            WorkRecord.status,
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee)
        ).filter(*base_filter).group_by(WorkRecord.status).all()

        payment_stats = db.session.query(
            WorkRecord.payment_status,
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)
        ).filter(*base_filter).group_by(WorkRecord.payment_status).all()

        customer_stats = db.session.query(
            WorkRecord.customer_name,
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee)
        ).filter(*base_filter).group_by(WorkRecord.customer_name).order_by(func.sum(WorkRecord.total_fee).desc()).limit(10).all()

        staff_stats = db.session.query(
            WorkRecord.staff_name,
            func.count(WorkRecord.id),
            func.sum(WorkRecord.total_fee)
        ).filter(*base_filter).group_by(WorkRecord.staff_name).order_by(func.sum(WorkRecord.total_fee).desc()).limit(10).all()

        return jsonify({
            'totals': {
                'count': totals[0] or 0,
                'total_fee': float(totals[1] or 0),
                'labor_fee': float(totals[2] or 0),
                'material_fee': float(totals[3] or 0),
                'transport_fee': float(totals[4] or 0),
                'other_fee': float(totals[5] or 0),
                'tax_amount': float(totals[6] or 0),
                'paid_amount': float(totals[7] or 0),
                'unpaid_amount': float((totals[1] or 0) - (totals[7] or 0))
            },
            'by_type': [{'type': r[0], 'count': r[1], 'amount': float(r[2] or 0)} for r in type_stats],
            'by_status': [{'status': r[0], 'count': r[1], 'amount': float(r[2] or 0)} for r in status_stats],
            'by_payment': [{'payment_status': r[0], 'count': r[1], 'unpaid': float(r[2] or 0)} for r in payment_stats],
            'top_customers': [{'customer_name': r[0], 'count': r[1], 'amount': float(r[2] or 0)} for r in customer_stats if r[0]],
            'top_staff': [{'staff_name': r[0], 'count': r[1], 'amount': float(r[2] or 0)} for r in staff_stats if r[0]],
            'date_range': {'start': start.date().isoformat(), 'end': (end - timedelta(days=1)).date().isoformat()}
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@statistics_bp.route('/statistics/profit', methods=['GET'])
@login_required
@admin_required
def get_profit_statistics():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.now() - timedelta(days=90)
        end = datetime.strptime(end_date, '%Y-%m-%d') if end_date else datetime.now()
        end = end + timedelta(days=1)
        start_d = start.date()
        end_d = end.date()

        record_filter = [WorkRecord.work_date >= start, WorkRecord.work_date < end]
        payment_filter = [PaymentRecord.payment_date >= start_d, PaymentRecord.payment_date < end_d]
        salary_filter = [SalaryRecord.work_date >= start, SalaryRecord.work_date < end, SalaryRecord.status == 'settled']
        expense_filter = [Expense.expense_date >= start_d, Expense.expense_date < end_d]

        total_record_income = db.session.query(func.sum(WorkRecord.total_fee)).filter(*record_filter).scalar() or 0
        total_actual_payment = db.session.query(func.sum(PaymentRecord.amount)).filter(*payment_filter).scalar() or 0
        total_receivable = db.session.query(func.sum(WorkRecord.total_fee - WorkRecord.paid_amount)).filter(
            *record_filter, WorkRecord.payment_status.in_(['unpaid', 'partial', 'monthly'])
        ).scalar() or 0

        total_material_cost = db.session.query(func.sum(WorkRecord.material_fee)).filter(*record_filter).scalar() or 0
        total_transport_cost = db.session.query(func.sum(WorkRecord.transport_fee)).filter(*record_filter).scalar() or 0
        total_other_cost = db.session.query(func.sum(WorkRecord.other_fee)).filter(*record_filter).scalar() or 0
        total_tax = db.session.query(func.sum(WorkRecord.tax_amount)).filter(*record_filter).scalar() or 0

        total_salary = db.session.query(func.sum(SalaryRecord.payable_amount)).filter(*salary_filter).scalar() or 0

        total_expense = db.session.query(func.sum(Expense.amount)).filter(*expense_filter).scalar() or 0
        total_expense_purchase = db.session.query(func.sum(Expense.amount)).filter(
            *expense_filter, Expense.expense_type == 'purchase'
        ).scalar() or 0

        proj_salary_total = db.session.query(func.sum(ProjectSalary.payable_amount)).filter(
            ProjectSalary.status == 'settled',
            ProjectSalary.work_date >= start_d, ProjectSalary.work_date < end_d
        ).scalar() or 0
        proj_expense_total = db.session.query(func.sum(ProjectExpense.amount)).filter(
            ProjectExpense.expense_date >= start_d, ProjectExpense.expense_date < end_d
        ).scalar() or 0
        proj_income_total = db.session.query(func.sum(Project.receipt_amount)).filter(
            Project.created_at >= start, Project.created_at < end
        ).scalar() or 0

        total_income = float(total_actual_payment) + float(proj_income_total)
        total_labor_cost = float(total_salary) + float(proj_salary_total)
        total_material_all = float(total_material_cost) + float(total_expense_purchase)
        total_expense_other = float(total_expense) - float(total_expense_purchase) + float(total_transport_cost) + float(total_other_cost) + float(proj_expense_total)

        gross_profit = total_income - total_material_all - total_tax
        net_profit = total_income - total_material_all - total_labor_cost - total_expense_other - total_tax

        return jsonify({
            'total_income': round(total_income, 2),
            'total_actual_payment': round(float(total_actual_payment), 2),
            'total_record_amount': round(float(total_record_income), 2),
            'total_receivable': round(float(total_receivable), 2),
            'total_project_income': round(float(proj_income_total), 2),
            'total_labor_cost': round(total_labor_cost, 2),
            'total_material_cost': round(total_material_all, 2),
            'total_transport_cost': round(float(total_transport_cost), 2),
            'total_other_cost': round(float(total_other_cost), 2),
            'total_tax': round(float(total_tax), 2),
            'total_salary': round(total_labor_cost, 2),
            'total_expense': round(float(total_expense) + float(proj_expense_total), 2),
            'gross_profit': round(gross_profit, 2),
            'net_profit': round(net_profit, 2),
            'gross_margin': round((gross_profit / total_income * 100), 2) if total_income > 0 else 0,
            'net_margin': round((net_profit / total_income * 100), 2) if total_income > 0 else 0,
            'date_range': {'start': start_d.isoformat(), 'end': (end_d - timedelta(days=1)).isoformat()}
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===================== 站内消息通知 =====================

def _create_notification(user_name, title, content, notify_type='info', related_type='', related_id=None):
    try:
        notification = Notification(
            user_name=user_name,
            title=title,
            content=content,
            notify_type=notify_type,
            related_type=related_type,
            related_id=related_id
        )
        db.session.add(notification)
        return notification
    except Exception as e:
        print(f'创建通知失败: {e}')
        return None

def _notify_admins(title, content, notify_type='warning', related_type='', related_id=None):
    """给所有管理员发送通知"""
    try:
        admins = WorkerUser.query.filter_by(role='admin', enabled=True).all()
        for admin in admins:
            _create_notification(admin.username, title, content, notify_type, related_type, related_id)
    except Exception as e:
        print(f'通知管理员失败: {e}')

def _recalculate_project_totals(project_id):
    """重算项目实际成本（actual_amount）：工资+支出"""
    try:
        project = Project.query.get(project_id)
        if not project:
            return
        salary_total = db.session.query(func.coalesce(func.sum(ProjectSalary.payable_amount), 0)).filter(
            ProjectSalary.project_id == project_id,
            ProjectSalary.status == 'settled'
        ).scalar() or 0
        expense_total = db.session.query(func.coalesce(func.sum(ProjectExpense.amount), 0)).filter(
            ProjectExpense.project_id == project_id
        ).scalar() or 0
        project.actual_amount = round(float(salary_total) + float(expense_total), 2)
    except Exception as e:
        print(f'重算项目汇总失败: {e}')

def _auto_generate_inspection_todos():
    """轻量级自动巡检：每24小时最多执行一次，在访问待办列表时触发"""
    try:
        last_run_key = 'last_auto_inspection_run'
        last_run = SystemSetting.query.filter_by(key=last_run_key).first()
        today_str = date.today().isoformat()
        if last_run and last_run.value == today_str:
            return 0
        if not last_run:
            last_run = SystemSetting(key=last_run_key, value=today_str)
            db.session.add(last_run)
        else:
            last_run.value = today_str
        today = date.today()
        plans = MaintenancePlan.query.filter(
            MaintenancePlan.status == 'active',
            MaintenancePlan.next_date <= today
        ).all()
        count = 0
        for plan in plans:
            if plan.end_date and plan.start_date and plan.start_date > plan.end_date:
                plan.status = 'completed'
                continue
            pending = PendingWork(
                title=f'巡检维护：{plan.plan_name}',
                customer_name=plan.customer_name or '',
                work_address='',
                staff_name=plan.staff_name or '',
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
            if plan.staff_name:
                for sn in [s.strip() for s in plan.staff_name.split(',') if s.strip()]:
                    su = WorkerUser.query.filter_by(staff_name=sn, enabled=True).first()
                    if su:
                        _create_notification(su.username, f'巡检任务: {plan.plan_name}',
                            f'{plan.customer_name}的巡检任务已生成，请在{today_str}完成', 'info', 'pending_work', None)
            count += 1
        if count > 0:
            _notify_admins('🔔 自动生成巡检待办', f'系统自动生成了{count}条到期巡检任务', 'info', 'pending_work', None)
        return count
    except Exception as e:
        print(f'自动巡检生成失败: {e}')
        return 0



