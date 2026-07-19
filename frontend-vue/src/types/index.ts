export interface User {
  id: number
  user_id?: number
  username: string
  staff_name: string
  role: 'admin' | 'worker'
  staff_id: number | null
  enabled?: boolean
  created_at?: string
  exp?: number
  iat?: number
}

export interface LoginResponse {
  token: string
  user: User
  error?: string
}

export interface ApiError {
  error: string
}

export interface PaginatedResponse<T> {
  records: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface WorkRecord {
  id: number
  order_no: string
  record_type: 'construction' | 'maintenance' | 'repair' | 'inspection'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  repair_result?: string
  is_completed: boolean
  customer_id?: number
  customer_name: string
  customer_phone?: string
  contact_name?: string
  contact_person?: string
  contact_phone?: string
  staff_id?: number
  staff_name: string
  staff_names: string[] | string
  work_date?: string
  start_time?: string
  end_time?: string
  accept_time?: string
  appointment_date?: string
  completed_at?: string
  work_address?: string
  address?: string
  fault_description?: string
  fault_diagnosis?: string
  fault_phenomenon?: string
  fault_judgment?: string
  repair_process?: string
  process_result?: string
  incomplete_reason?: string
  incomplete_reason_type?: string
  service_category?: string
  involved_systems?: string
  customer_feedback?: string
  satisfaction?: string
  remark?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  project_id?: number | null
  project_name?: string
  total_fee: number
  labor_fee?: number
  labour_fee?: number
  material_fee?: number
  equipment_fee_total?: number
  debug_fee?: number
  other_fee?: number
  travel_fee?: number
  tax_amount?: number
  tax_rate?: number
  tax_type?: 'no' | 'included' | 'excluded' | string
  amount?: number
  payment_status: 'unpaid' | 'partial' | 'paid' | 'monthly'
  paid_amount?: number
  fee_items?: FeeItem[]
  expense_items?: ExpenseItem[]
  photos?: PhotoItem[]
  temp_staff_details?: TempStaffDetail[]
  created_at: string
  updated_at?: string
  created_by?: string
}

export interface FeeItem {
  id?: number
  name: string
  quantity: number
  unit_price: number
  amount: number
  remark?: string
}

export interface ExpenseItem {
  id?: number
  category: string
  amount: number
  remark?: string
}

export interface PhotoItem {
  id?: number
  url: string
  type?: string
  remark?: string
}

export interface TempStaffDetail {
  id?: number
  name: string
  days: number
  daily_wage: number
  amount: number
}

export interface PendingWork {
  id: number
  title: string
  todo_type: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  customer_id?: number
  customer_name: string
  contact_name?: string
  contact_phone?: string
  work_address?: string
  staff_id?: number
  staff_name: string
  work_content?: string
  reminder_date?: string | null
  related_record_type?: string
  related_record_id?: number | null
  created_at?: string
}

export interface Customer {
  id: number
  name: string
  short_name: string
  full_name: string
  phone?: string
  address?: string
  contact_name?: string
  credit_code?: string
  invoice_title?: string
  tax_number?: string
  invoice_address?: string
  invoice_phone?: string
  bank_name?: string
  bank_account?: string
  remark?: string
  created_at?: string
}

export interface Material {
  id: number
  material_no: string
  name: string
  category: string
  spec?: string
  model?: string
  brand?: string
  unit: string
  stock: number
  min_stock: number
  max_stock: number
  unit_price: number
  supplier?: string
  location?: string
  is_low_stock: boolean
  remark?: string
  created_at?: string
}

export interface Staff {
  id: number
  name: string
  phone?: string
  position?: string
  staff_type: 'fixed' | 'temp'
  status: 'active' | 'inactive'
  daily_wage: number
  monthly_salary: number
  hire_date?: string
  project?: string
  has_account: boolean
  enabled?: boolean
  id_card?: string
  remark?: string
  created_at?: string
}

export interface DashboardStats {
  active_project_count: number
  customer_count: number
  due_maintenance_count: number
  low_stock_count: number
  material_count: number
  month_count: number
  month_expense: number
  month_payment: number
  month_profit: number
  month_total: number
  overdue_pending: number
  pending_count: number
  recent_expenses: Expense[]
  recent_records?: WorkRecord[]
}

export interface Expense {
  id: number
  amount: number
  category: string
  category_id: number
  category_name: string
  created_at: string
  created_by?: string
  customer_id?: number
  customer_name?: string
  expense_date: string
  expense_type: string
  is_invoiced: string
  note?: string
  payment_method?: string
  project_id?: number
  project_name?: string
  record_id?: number
  remark?: string
  staff_name?: string
}

export interface Notification {
  id: number
  type: string
  title: string
  content: string
  is_read: boolean
  related_type?: string
  related_id?: number
  created_at: string
}
