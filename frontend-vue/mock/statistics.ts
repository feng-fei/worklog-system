import type { MockMethod } from 'vite-plugin-mock'

export default [
  {
    url: '/api/statistics/dashboard',
    method: 'get',
    response: () => {
      return {
        code: 200,
        message: 'success',
        data: {
          todayRecords: 8,
          pendingRecords: 23,
          completedToday: 5,
          totalCustomers: 32,
          monthRecords: 156,
          monthCompleted: 132,
          completionRate: 84.6,
          trend: [
            { date: '周一', value: 12 },
            { date: '周二', value: 18 },
            { date: '周三', value: 15 },
            { date: '周四', value: 22 },
            { date: '周五', value: 19 },
            { date: '周六', value: 8 },
            { date: '周日', value: 5 },
          ],
          typeStats: [
            { type: 'repair', label: '维修工单', value: 68, color: '#ef4444' },
            { type: 'install', label: '安装工单', value: 42, color: '#3b82f6' },
            { type: 'maintenance', label: '保养工单', value: 35, color: '#22c55e' },
            { type: 'inspection', label: '巡检工单', value: 28, color: '#f59e0b' },
          ],
          pendingHighPriority: 6,
          todayEarnings: 2580,
          monthEarnings: 68500,
          materialsLowStock: 4,
        },
      }
    },
  },
  {
    url: '/api/statistics/monthly',
    method: 'get',
    response: () => {
      const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      const data = months.map((month, i) => ({
        month,
        records: 80 + Math.floor(Math.random() * 80),
        completed: 70 + Math.floor(Math.random() * 70),
        earnings: 40000 + Math.floor(Math.random() * 40000),
      }))
      return {
        code: 200,
        message: 'success',
        data,
      }
    },
  },
] as MockMethod[]
