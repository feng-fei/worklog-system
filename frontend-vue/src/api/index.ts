import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { toast } from '@/components/ui/toast/useToast'
import type {
  User,
  LoginResponse,
  PaginatedResponse,
  WorkRecord,
  PendingWork,
  Customer,
  Material,
  Staff,
  DashboardStats,
  Notification,
} from '@/types'

declare module 'axios' {
  interface AxiosRequestConfig {
    silent?: boolean
  }
}

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const isMobile = window.location.pathname.startsWith('/m/')
      const redirect = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = isMobile ? `/m/login?redirect=${redirect}` : `/login?redirect=${redirect}`
      return Promise.reject(error)
    }

    const message = error.response?.data?.error || error.response?.data?.message || error.message || '请求失败'
    if (error.config?.silent !== true) {
      toast(message, { type: 'error' })
    }

    return Promise.reject(error)
  },
)

const unwrap = <T>(res: AxiosResponse<T>) => res.data

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }).then(unwrap),
  me: () => api.get<{ user: User }>('/auth/me').then(r => r.data.user),
  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/change-password', { old_password, new_password }).then(unwrap),
}

export const recordsApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<WorkRecord>>('/records', { params }).then(unwrap),
  get: (id: number) => api.get<WorkRecord>(`/records/${id}`).then(unwrap),
  create: (data: Partial<WorkRecord> | FormData) =>
    api.post<WorkRecord>('/records', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }).then(unwrap),
  update: (id: number, data: Partial<WorkRecord> | FormData) =>
    api.put<WorkRecord>(`/records/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }).then(unwrap),
  updateStatus: (id: number, status: string) =>
    api.put<WorkRecord>(`/records/${id}`, { status }).then(unwrap),
  complete: (id: number, data?: Record<string, any>) =>
    api.post(`/records/${id}/complete`, data).then(unwrap),
  delete: (id: number) => api.delete(`/records/${id}`).then(unwrap),
  uploadPhotos: (files: File[]) => {
    const formData = new FormData()
    files.forEach(f => formData.append('photos', f))
    return api.post<{ photos: string[] }>('/records/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap)
  },
}

export const pendingApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<PendingWork>>('/pending', { params }).then(unwrap),
  get: (id: number) => api.get<PendingWork>(`/pending/${id}`).then(unwrap),
  create: (data: Partial<PendingWork>) =>
    api.post<PendingWork>('/pending', data).then(unwrap),
  update: (id: number, data: Partial<PendingWork>) =>
    api.put<PendingWork>(`/pending/${id}`, data).then(unwrap),
  complete: (id: number, data?: Record<string, any>) =>
    api.post(`/pending/${id}/complete`, data).then(unwrap),
  delete: (id: number) => api.delete(`/pending/${id}`).then(unwrap),
}

export const statisticsApi = {
  dashboard: () => api.get<DashboardStats>('/dashboard').then(unwrap),
  monthly: () => api.get('/statistics').then(unwrap),
}

export const customersApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Customer> & { customers?: Customer[] }>('/customers', { params }).then(r => ({
      ...r.data,
      records: r.data.records || r.data.customers || [],
    })),
  get: (id: number) => api.get<{ customer: Customer; records: WorkRecord[] }>(`/customers/${id}`).then(unwrap),
  overview: (id: number) => api.get(`/customers/${id}/overview`).then(unwrap),
  create: (data: Partial<Customer>) => api.post<Customer>('/customers', data).then(unwrap),
  update: (id: number, data: Partial<Customer>) =>
    api.put<Customer>(`/customers/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete(`/customers/${id}`).then(unwrap),
}

export const materialsApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Material>>('/materials', { params }).then(unwrap),
  get: (id: number) => api.get<Material>(`/materials/${id}`).then(unwrap),
  create: (data: Partial<Material>) => api.post<Material>('/materials', data).then(unwrap),
  update: (id: number, data: Partial<Material>) =>
    api.put<Material>(`/materials/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete(`/materials/${id}`).then(unwrap),
}

export const staffsApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Staff>>('/staffs', { params }).then(unwrap),
  get: (id: number) => api.get<Staff>(`/staffs/${id}`).then(unwrap),
  create: (data: Partial<Staff>) => api.post<Staff>('/staffs', data).then(unwrap),
  update: (id: number, data: Partial<Staff>) =>
    api.put<Staff>(`/staffs/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete(`/staffs/${id}`).then(unwrap),
}

export const notificationsApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Notification>>('/notifications', { params }).then(unwrap),
  read: (id: number) => api.post(`/notifications/${id}/read`).then(unwrap),
  readAll: () => api.post('/notifications/read-all').then(unwrap),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count').then(r => r.data.count),
}

export default api
