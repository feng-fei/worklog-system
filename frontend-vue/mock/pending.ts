import type { MockMethod } from 'vite-plugin-mock'

const priorities = ['high', 'medium', 'low']
const priorityLabels: Record<string, string> = {
  high: '紧急',
  medium: '一般',
  low: '低',
}

function generatePendings(count: number) {
  const items = []
  for (let i = 1; i <= count; i++) {
    const priority = priorities[i % priorities.length]
    const completed = i > count * 0.6
    const now = Date.now() - i * 3600000 * 1.5
    const createdAt = new Date(now)
    const createdAtStr = createdAt.toISOString().replace('T', ' ').substring(0, 19)

    items.push({
      id: i,
      title: [
        '空调系统季度保养',
        '消防设备巡检',
        '电梯年检准备',
        '配电柜维护',
        '监控系统检修',
        '给排水系统检查',
        '新风系统滤网更换',
        '照明系统升级',
        '门禁系统维护',
        '弱电井清理',
      ][i % 10],
      priority,
      priorityLabel: priorityLabels[priority],
      completed,
      createdAt: createdAtStr,
      dueDate: new Date(now + 86400000 * 3).toISOString().replace('T', ' ').substring(0, 10),
      assigneeName: '张工程师',
      description: '定期维护任务，请按时完成。注意安全操作规范。',
      location: ['A栋1层', 'B栋3层', 'C栋5层', 'D栋2层', 'E栋4层'][i % 5],
    })
  }
  return items
}

const allPendings = generatePendings(24)

export default [
  {
    url: '/api/pending',
    method: 'get',
    response: ({ query }: any) => {
      const page = parseInt(query.page || '1')
      const pageSize = parseInt(query.pageSize || '10')
      const { status, priority } = query

      let filtered = [...allPendings]

      if (status === 'pending') {
        filtered = filtered.filter(r => !r.completed)
      } else if (status === 'completed') {
        filtered = filtered.filter(r => r.completed)
      }
      if (priority && priority !== 'all') {
        filtered = filtered.filter(r => r.priority === priority)
      }

      const total = filtered.length
      const pendingCount = allPendings.filter(r => !r.completed).length
      const completedCount = allPendings.filter(r => r.completed).length
      const highPriorityCount = allPendings.filter(r => r.priority === 'high' && !r.completed).length

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
          stats: {
            total: allPendings.length,
            pending: pendingCount,
            completed: completedCount,
            highPriority: highPriorityCount,
          },
        },
      }
    },
  },
  {
    url: '/api/pending/:id',
    method: 'get',
    response: ({ query }: any) => {
      const id = parseInt(query.id)
      const item = allPendings.find(r => r.id === id)
      if (!item) {
        return { code: 404, message: '待办不存在', data: null }
      }
      return {
        code: 200,
        message: 'success',
        data: item,
      }
    },
  },
  {
    url: '/api/pending/:id/complete',
    method: 'post',
    response: ({ query }: any) => {
      const id = parseInt(query.id)
      const item = allPendings.find(r => r.id === id)
      if (!item) {
        return { code: 404, message: '待办不存在', data: null }
      }
      item.completed = true
      return {
        code: 200,
        message: '已完成',
        data: item,
      }
    },
  },
] as MockMethod[]
