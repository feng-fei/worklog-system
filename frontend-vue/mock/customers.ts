import type { MockMethod } from 'vite-plugin-mock'

const industries = ['零售', '商业地产', '写字楼', '酒店', '医疗', '购物中心']

const nameList = [
  '华润万家超市',
  '万达广场',
  '凯德MALL',
  '大悦城',
  '合生汇',
  'SKP百货',
  '国贸中心',
  '银泰百货',
  '万科广场',
  '龙湖天街',
]
const contactList = ['李经理', '王主管', '赵总监', '钱经理', '孙主管']
const districtList = ['朝阳区', '海淀区', '西城区', '东城区', '丰台区']
const streetList = ['建国路', '中关村大街', '西直门外大街', '王府井大街', '西大望路']

function generateCustomers(count: number) {
  const items = []
  for (let i = 1; i <= count; i++) {
    const isVip = i % 3 === 0
    items.push({
      id: i,
      name: nameList[i % 10] + '（' + i + '号店）',
      contact: contactList[i % 5],
      phone: '13800' + String(138000 + i).padStart(5, '0'),
      address: '北京市' + districtList[i % 5] + streetList[i % 5] + i + '号',
      type: isVip ? 'vip' : 'normal',
      typeLabel: isVip ? 'VIP客户' : '普通客户',
      industry: industries[i % industries.length],
      createdAt: new Date(Date.now() - i * 86400000 * 5).toISOString().replace('T', ' ').substring(0, 10),
      totalOrders: 10 + i * 2,
      completedOrders: 8 + i,
      remark: isVip ? '长期合作客户，服务优先级高' : '',
    })
  }
  return items
}

const allCustomers = generateCustomers(32)

export default [
  {
    url: '/api/customers',
    method: 'get',
    response: ({ query }: any) => {
      const page = parseInt(query.page || '1')
      const pageSize = parseInt(query.pageSize || '10')
      const { keyword, type } = query

      let filtered = [...allCustomers]

      if (type && type !== 'all') {
        filtered = filtered.filter(r => r.type === type)
      }
      if (keyword) {
        filtered = filtered.filter(r =>
          r.name.includes(keyword) || r.contact.includes(keyword) || r.phone.includes(keyword)
        )
      }

      const total = filtered.length
      const vipCount = allCustomers.filter(r => r.type === 'vip').length

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
            total: allCustomers.length,
            vip: vipCount,
          },
        },
      }
    },
  },
  {
    url: '/api/customers/:id',
    method: 'get',
    response: ({ query }: any) => {
      const id = parseInt(query.id)
      const item = allCustomers.find(r => r.id === id)
      if (!item) {
        return { code: 404, message: '客户不存在', data: null }
      }
      return {
        code: 200,
        message: 'success',
        data: item,
      }
    },
  },
  {
    url: '/api/customers',
    method: 'post',
    response: ({ body }: any) => {
      const newId = allCustomers.length + 1
      const newItem = {
        id: newId,
        name: body.name || '新客户',
        contact: body.contact || '',
        phone: body.phone || '',
        address: body.address || '',
        type: body.type || 'normal',
        typeLabel: body.type === 'vip' ? 'VIP客户' : '普通客户',
        industry: body.industry || '零售',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 10),
        totalOrders: 0,
        completedOrders: 0,
        remark: body.remark || '',
      }
      allCustomers.unshift(newItem)
      return {
        code: 200,
        message: '创建成功',
        data: newItem,
      }
    },
  },
] as MockMethod[]
