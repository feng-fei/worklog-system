import type { MockMethod } from 'vite-plugin-mock'

const types = ['system', 'work', 'notice', 'urgent']
const typeLabels: Record<string, string> = {
  system: '系统通知',
  work: '工单通知',
  notice: '公告通知',
  urgent: '紧急通知',
}

const titles = [
  '新工单已分配',
  '系统维护通知',
  '月度报表已生成',
  '客户满意度调查',
  '新员工入职通知',
  '设备保养提醒',
  '安全检查通知',
  '培训课程更新',
  '节假日安排',
  '工资条已发放',
]

const contents = [
  '您有新的工单待处理，请及时查看并开始工作。',
  '系统将于本周六凌晨进行维护，届时服务可能短暂中断。',
  '上月工作报表已生成，可在统计中心查看详细数据。',
  '本月客户满意度调查已开启，请协助完成。',
  '新同事加入团队，欢迎大家多多关照。',
  '您负责的设备即将到达保养周期，请提前安排。',
  '下周三将进行安全检查，请做好准备工作。',
  '在线培训课程已更新，可随时登录学习。',
  '国庆假期安排已发布，请查看详情。',
  '本月工资条已发放，请注意查收。',
]

function generateNotifications(count: number) {
  const items = []
  for (let i = 1; i <= count; i++) {
    const type = types[i % types.length]
    const isRead = i > count * 0.3
    const now = Date.now() - i * 3600000 * 3
    const createdAt = new Date(now).toISOString().replace('T', ' ').substring(0, 16)

    items.push({
      id: i,
      type,
      typeLabel: typeLabels[type],
      title: titles[i % titles.length],
      content: contents[i % contents.length],
      read: isRead,
      createdAt,
    })
  }
  return items
}

const allNotifications = generateNotifications(30)

export default [
  {
    url: '/api/notifications',
    method: 'get',
    response: ({ query }: any) => {
      const page = parseInt(query.page || '1')
      const pageSize = parseInt(query.pageSize || '10')
      const { type, unread } = query

      let filtered = [...allNotifications]

      if (type && type !== 'all') {
        filtered = filtered.filter(r => r.type === type)
      }
      if (unread === 'true') {
        filtered = filtered.filter(r => !r.read)
      }

      const total = filtered.length
      const unreadCount = allNotifications.filter(r => !r.read).length

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
            total: allNotifications.length,
            unread: unreadCount,
          },
        },
      }
    },
  },
  {
    url: '/api/notifications/:id/read',
    method: 'post',
    response: ({ query }: any) => {
      const id = parseInt(query.id)
      const item = allNotifications.find(r => r.id === id)
      if (!item) {
        return { code: 404, message: '通知不存在', data: null }
      }
      item.read = true
      return {
        code: 200,
        message: '已标记为已读',
        data: item,
      }
    },
  },
  {
    url: '/api/notifications/read-all',
    method: 'post',
    response: () => {
      allNotifications.forEach(n => (n.read = true))
      return {
        code: 200,
        message: '全部已读',
        data: null,
      }
    },
  },
] as MockMethod[]
