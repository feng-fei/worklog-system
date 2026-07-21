import type { MockMethod } from 'vite-plugin-mock'

const types = ['repair', 'install', 'maintenance', 'inspection']
const typeLabels: Record<string, string> = {
  repair: '维修工单',
  install: '安装工单',
  maintenance: '保养工单',
  inspection: '巡检工单',
}

const priorities = ['high', 'medium', 'low']
const priorityLabels: Record<string, string> = {
  high: '紧急',
  medium: '一般',
  low: '低',
}

const statuses = ['pending', 'processing', 'completed', 'cancelled']
const statusLabels: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
}

const customers = [
  { id: 1, name: '华润万家超市', contact: '李经理', phone: '13800138001', address: '北京市朝阳区建国路88号' },
  { id: 2, name: '万达广场', contact: '王主管', phone: '13800138002', address: '北京市海淀区中关村大街1号' },
  { id: 3, name: '凯德MALL', contact: '赵总监', phone: '13800138003', address: '北京市西城区西直门外大街1号' },
  { id: 4, name: '大悦城', contact: '钱经理', phone: '13800138004', address: '北京市东城区王府井大街138号' },
  { id: 5, name: '合生汇', contact: '孙主管', phone: '13800138005', address: '北京市朝阳区西大望路21号' },
]

function generateRecords(count: number) {
  const records = []
  for (let i = 1; i <= count; i++) {
    const type = types[i % types.length]
    const priority = priorities[i % priorities.length]
    const status = statuses[i % statuses.length]
    const customer = customers[i % customers.length]
    const now = Date.now() - i * 3600000 * 2
    const createdAt = new Date(now)
    const createdAtStr = createdAt.toISOString().replace('T', ' ').substring(0, 19)

    records.push({
      id: i,
      code: `WO${String(i).padStart(6, '0')}`,
      title: `${typeLabels[type]} - ${customer.name}${i}号设备`,
      type,
      typeLabel: typeLabels[type],
      priority,
      priorityLabel: priorityLabels[priority],
      status,
      statusLabel: statusLabels[status],
      description: `设备故障报修，需要尽快处理。故障现象：设备运行异常，有异响发出。`,
      customerId: customer.id,
      customerName: customer.name,
      customerContact: customer.contact,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      assigneeId: 1,
      assigneeName: '张工程师',
      createdAt: createdAtStr,
      updatedAt: createdAtStr,
      startedAt: status !== 'pending' ? createdAtStr : null,
      completedAt: status === 'completed' ? new Date(now + 7200000).toISOString().replace('T', ' ').substring(0, 19) : null,
      estimatedHours: 2 + (i % 4),
      actualHours: status === 'completed' ? 2 + (i % 3) : 0,
      materials: [],
      images: [],
      remark: status === 'completed' ? '已完成维修，设备运行正常' : '',
    })
  }
  return records
}

const allRecords = generateRecords(56)

export default [
  {
    url: '/api/records',
    method: 'get',
    response: ({ query }: any) => {
      const page = parseInt(query.page || '1')
      const pageSize = parseInt(query.pageSize || '10')
      const { status, type, keyword } = query

      let filtered = [...allRecords]

      if (status && status !== 'all') {
        filtered = filtered.filter(r => r.status === status)
      }
      if (type && type !== 'all') {
        filtered = filtered.filter(r => r.type === type)
      }
      if (keyword) {
        filtered = filtered.filter(r =>
          r.title.includes(keyword) || r.code.includes(keyword) || r.customerName.includes(keyword)
        )
      }

      const total = filtered.length
      const start = (page - 1) * pageSize
      const list = filtered.slice(start, start + pageSize)

      return {
        code: 200,
        message: 'success',
        data: {
          list,
          total,
          page,
          pageSize,
        },
      }
    },
  },
  {
    url: '/api/records/:id',
    method: 'get',
    response: ({ query }: any) => {
      const id = parseInt(query.id)
      const record = allRecords.find(r => r.id === id)
      if (!record) {
        return {
          code: 404,
          message: '工单不存在',
          data: null,
        }
      }
      return {
        code: 200,
        message: 'success',
        data: record,
      }
    },
  },
  {
    url: '/api/records',
    method: 'post',
    response: ({ body }: any) => {
      const newId = allRecords.length + 1
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      const type = body.type || 'repair'
      const newRecord = {
        id: newId,
        code: `WO${String(newId).padStart(6, '0')}`,
        title: body.title || `${typeLabels[type]} - 新工单`,
        type,
        typeLabel: typeLabels[type],
        priority: body.priority || 'medium',
        priorityLabel: priorityLabels[body.priority || 'medium'],
        status: 'pending',
        statusLabel: '待处理',
        description: body.description || '',
        customerId: body.customerId || 1,
        customerName: body.customerName || '新客户',
        customerContact: body.customerContact || '',
        customerPhone: body.customerPhone || '',
        customerAddress: body.customerAddress || '',
        assigneeId: 1,
        assigneeName: '张工程师',
        createdAt: now,
        updatedAt: now,
        startedAt: null,
        completedAt: null,
        estimatedHours: body.estimatedHours || 2,
        actualHours: 0,
        materials: [],
        images: [],
        remark: '',
      }
      allRecords.unshift(newRecord)
      return {
        code: 200,
        message: '创建成功',
        data: newRecord,
      }
    },
  },
  {
    url: '/api/records/:id/start',
    method: 'post',
    response: ({ query }: any) => {
      const id = parseInt(query.id)
      const record = allRecords.find(r => r.id === id)
      if (!record) {
        return { code: 404, message: '工单不存在', data: null }
      }
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      record.status = 'processing'
      record.statusLabel = '处理中'
      record.startedAt = now
      record.updatedAt = now
      return {
        code: 200,
        message: '已开始处理',
        data: record,
      }
    },
  },
  {
    url: '/api/records/:id/complete',
    method: 'post',
    response: ({ query, body }: any) => {
      const id = parseInt(query.id)
      const record = allRecords.find(r => r.id === id)
      if (!record) {
        return { code: 404, message: '工单不存在', data: null }
      }
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      record.status = 'completed'
      record.statusLabel = '已完成'
      record.completedAt = now
      record.actualHours = body?.actualHours || record.estimatedHours
      record.remark = body?.remark || ''
      record.updatedAt = now
      return {
        code: 200,
        message: '工单已完成',
        data: record,
      }
    },
  },
] as MockMethod[]
