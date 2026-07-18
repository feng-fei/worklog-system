import type { MockMethod } from 'vite-plugin-mock'

const categories = ['electrical', 'hvac', 'network', 'fire']
const categoryLabels: Record<string, string> = {
  electrical: '电气',
  hvac: '暖通',
  network: '网络',
  fire: '消防',
}

const supplierList = ['西门子电气', '格力空调', '华为技术', '海湾消防', '正泰电器', '美的暖通', '中兴通讯', '天广消防']

const materialNames: Record<string, string[]> = {
  electrical: ['空气开关', '接触器', '继电器', '配电柜', '电缆桥架', '母线槽', '电容器', '变频器'],
  hvac: ['空调压缩机', '风机盘管', '冷却塔', '水泵', '新风系统', '过滤网', '温控器', '电磁阀'],
  network: ['交换机', '路由器', '光纤模块', '网线', 'AP面板', '机柜', '理线架', '光模块'],
  fire: ['烟感探测器', '喷淋头', '消防泵', '灭火器', '消防水带', '报警主机', '防火门', '应急灯'],
}

function generateMaterials(count: number) {
  const items = []
  for (let i = 1; i <= count; i++) {
    const category = categories[i % categories.length]
    const names = materialNames[category]
    const name = names[i % names.length]
    const stock = 5 + (i * 3) % 100
    const minStock = 10 + (i % 5) * 5
    const lowStock = stock < minStock

    items.push({
      id: i,
      name: name + '-' + String.fromCharCode(65 + (i % 8)),
      sku: 'SKU' + String(i).padStart(6, '0'),
      category,
      categoryLabel: categoryLabels[category],
      stock,
      minStock,
      lowStock,
      unit: ['个', '台', '套', '米', '箱'][i % 5],
      price: Number((10 + i * 5.5 + Math.random() * 100).toFixed(2)),
      costPrice: Number((5 + i * 3.5 + Math.random() * 50).toFixed(2)),
      supplier: supplierList[i % supplierList.length],
      supplierPhone: '13900' + String(100000 + i).padStart(6, '0'),
      location: ['A仓库', 'B仓库', 'C仓库'][i % 3] + '-' + String.fromCharCode(65 + (i % 6)) + '区',
      createdAt: new Date(Date.now() - i * 86400000 * 3).toISOString().replace('T', ' ').substring(0, 10),
      remark: lowStock ? '库存不足，需要补货' : '库存充足',
    })
  }
  return items
}

const allMaterials = generateMaterials(40)

function generateTransactions(materialId: number) {
  const items = []
  for (let i = 1; i <= 8; i++) {
    const isIn = i % 2 === 0
    const qty = isIn ? 10 + i * 2 : 1 + (i % 5)
    items.push({
      id: i,
      type: isIn ? 'in' : 'out',
      typeLabel: isIn ? '入库' : '出库',
      quantity: qty,
      relatedOrder: isIn ? 'PO' + String(1000 + i) : 'WO' + String(2000 + i),
      operator: isIn ? '仓管员王' : '张工程师',
      createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString().replace('T', ' ').substring(0, 16),
      remark: isIn ? '采购入库' : '工单领用',
    })
  }
  return items
}

export default [
  {
    url: '/api/materials',
    method: 'get',
    response: ({ query }: any) => {
      const page = parseInt(query.page || '1')
      const pageSize = parseInt(query.pageSize || '10')
      const { keyword, category, lowStock } = query

      let filtered = [...allMaterials]

      if (category && category !== 'all') {
        filtered = filtered.filter(r => r.category === category)
      }
      if (lowStock === 'true') {
        filtered = filtered.filter(r => r.lowStock)
      }
      if (keyword) {
        filtered = filtered.filter(r =>
          r.name.includes(keyword) || r.sku.includes(keyword)
        )
      }

      const total = filtered.length
      const lowStockCount = allMaterials.filter(r => r.lowStock).length

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
            total: allMaterials.length,
            lowStock: lowStockCount,
          },
        },
      }
    },
  },
  {
    url: '/api/materials/:id',
    method: 'get',
    response: ({ query }: any) => {
      const id = parseInt(query.id)
      const item = allMaterials.find(r => r.id === id)
      if (!item) {
        return { code: 404, message: '物料不存在', data: null }
      }
      const transactions = generateTransactions(id)
      return {
        code: 200,
        message: 'success',
        data: {
          ...item,
          transactions,
        },
      }
    },
  },
  {
    url: '/api/materials',
    method: 'post',
    response: ({ body }: any) => {
      const newId = allMaterials.length + 1
      const category = body.category || 'electrical'
      const newItem = {
        id: newId,
        name: body.name || '新物料',
        sku: 'SKU' + String(newId).padStart(6, '0'),
        category,
        categoryLabel: categoryLabels[category] || '其他',
        stock: body.stock || 0,
        minStock: body.minStock || 10,
        lowStock: (body.stock || 0) < (body.minStock || 10),
        unit: body.unit || '个',
        price: body.price || 0,
        costPrice: body.costPrice || 0,
        supplier: body.supplier || '',
        supplierPhone: body.supplierPhone || '',
        location: body.location || '',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 10),
        remark: body.remark || '',
      }
      allMaterials.unshift(newItem)
      return {
        code: 200,
        message: '创建成功',
        data: newItem,
      }
    },
  },
] as MockMethod[]
