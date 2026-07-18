<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { templatesApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import PullRefresh from '@/components/business/PullRefresh.vue'
import Table from '@/components/ui/Table.vue'
import TableHeader from '@/components/ui/TableHeader.vue'
import TableBody from '@/components/ui/TableBody.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableHead from '@/components/ui/TableHead.vue'
import TableCell from '@/components/ui/TableCell.vue'
import { useResponsive } from '@/composables/useResponsive'
import {
  Search,
  Plus,
  ChevronRight,
  FileText,
  RefreshCw,
  Tag,
  Layers,
  DollarSign,
  Pencil,
  Trash2,
  Wrench,
  Hammer,
  AlertCircle,
} from 'lucide-vue-next'

const router = useRouter()
const { isDesktop } = useResponsive()
const toggleSidebar = inject('toggleSidebar', () => {})

const templates = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterType = ref('all')
const currentPage = ref(1)
const hasMore = ref(true)

const templateTypeMap: Record<string, { label: string; variant: string; icon: any }> = {
  construction: { label: '施工', variant: 'default', icon: Hammer },
  repair: { label: '维修', variant: 'secondary', icon: Wrench },
}

const priorityMap: Record<string, { label: string; variant: string }> = {
  high: { label: '高', variant: 'destructive' },
  normal: { label: '普通', variant: 'default' },
  low: { label: '低', variant: 'secondary' },
}

const getTemplateType = (item: any) => {
  return templateTypeMap[item.template_type] || { label: '未知', variant: 'outline', icon: FileText }
}

const getPriority = (item: any) => {
  return priorityMap[item.priority] || { label: '普通', variant: 'default' }
}

const getTotalFee = (item: any) => {
  const labor = item.labor_fee || 0
  const material = item.material_fee || 0
  const transport = item.transport_fee || 0
  const other = item.other_fee || 0
  return labor + material + transport + other
}

const loadTemplates = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await templatesApi.list({
      page: currentPage.value,
      page_size: 20,
      keyword: searchQuery.value || undefined,
      template_type: filterType.value !== 'all' ? filterType.value : undefined,
    })

    const data = res.data
    const list = data.records || (Array.isArray(data) ? data : [])
    const pageSize = 20

    if (refresh) {
      templates.value = list
    } else {
      templates.value = [...templates.value, ...list]
    }

    hasMore.value = data.pages ? currentPage.value < data.pages : list.length >= pageSize
    currentPage.value++
  } catch (e) {
    console.error('加载模板列表失败', e)
  } finally {
    loading.value = false
  }
}

const goToCreate = () => {
  router.push('/templates/create')
}

const goToEdit = (id: number) => {
  router.push(`/templates/${id}/edit`)
}

const handleDelete = async (id: number) => {
  if (!confirm('确定要删除这个模板吗？')) return
  try {
    await templatesApi.delete(id)
    loadTemplates(true)
  } catch (e) {
    console.error('删除模板失败', e)
  }
}

const onRefresh = () => {
  return loadTemplates(true)
}

const filteredTemplates = computed(() => {
  if (!searchQuery.value) return templates.value
  const query = searchQuery.value.toLowerCase()
  return templates.value.filter((t) =>
    (t.name || '').toLowerCase().includes(query) ||
    (t.category || '').toLowerCase().includes(query) ||
    (t.work_subtype || '').toLowerCase().includes(query)
  )
})

const typeOptions = [
  { key: 'all', label: '全部' },
  { key: 'construction', label: '施工' },
  { key: 'repair', label: '维修' },
]

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  loadTemplates(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <template v-if="isDesktop">
      <div class="mx-auto w-full max-w-7xl px-8 py-6">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-2xl font-bold text-foreground">模板管理</h1>
          <button
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            @click="goToCreate"
          >
            <Plus class="h-4 w-4" />
            新建模板
          </button>
        </div>

        <Card class="mb-6 p-4">
          <div class="flex items-center gap-4">
            <div class="relative flex-1 max-w-md">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索模板名称、分类..."
                class="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              v-model="filterType"
              class="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              @change="loadTemplates(true)"
            >
              <option v-for="t in typeOptions" :key="t.key" :value="t.key">
                {{ t.label }}
              </option>
            </select>
            <button
              class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
              @click="onRefresh"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
              刷新
            </button>
          </div>
        </Card>

        <Card class="overflow-hidden">
          <div v-if="loading && templates.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredTemplates.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无模板记录</p>
          </div>

          <template v-else>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模板名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>总费用</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="template in filteredTemplates"
                  :key="template.id"
                  clickable
                  @click="goToEdit(template.id)"
                >
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ template.name }}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="getTemplateType(template).variant as any" size="sm">
                      {{ getTemplateType(template).label }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-muted-foreground">{{ template.category || '-' }}</TableCell>
                  <TableCell>
                    <Badge :variant="getPriority(template).variant as any" size="sm">
                      {{ getPriority(template).label }}
                    </Badge>
                  </TableCell>
                  <TableCell>¥{{ getTotalFee(template).toFixed(2) }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ formatDate(template.created_at) }}</TableCell>
                  <TableCell class="text-right">
                    <div class="inline-flex items-center gap-1">
                      <button
                        class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                        @click.stop="goToEdit(template.id)"
                      >
                        <Pencil class="h-4 w-4" />
                        编辑
                      </button>
                      <button
                        class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                        @click.stop="handleDelete(template.id)"
                      >
                        <Trash2 class="h-4 w-4" />
                        删除
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div v-if="hasMore && !loading" class="border-t border-border p-4 text-center">
              <button
                class="text-sm text-primary hover:underline"
                @click="loadTemplates()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && templates.length > 0" class="border-t border-border p-4 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </Card>
      </div>
    </template>

    <template v-else>
      <MobileHeader title="模板" :showMenu="true" @menu-click="toggleSidebar">
        <template #right>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
            @click="onRefresh"
          >
            <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
          </button>
        </template>
      </MobileHeader>

      <div class="sticky top-14 z-30 bg-background px-4 pb-3 pt-2">
        <div class="relative">
          <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索模板名称、分类..."
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="t in typeOptions"
            :key="t.key"
            class="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            :class="filterType === t.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
            @click="filterType = t.key; loadTemplates(true)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <PullRefresh class="flex-1" @refresh="onRefresh">
        <div class="space-y-3 px-4 pb-6">
          <div v-if="loading && templates.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredTemplates.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无模板记录</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮添加新模板</p>
          </div>

          <template v-else>
            <Card
              v-for="template in filteredTemplates"
              :key="template.id"
              class="p-4 active:scale-[0.99] transition-transform cursor-pointer"
              @click="goToEdit(template.id)"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">
                    {{ template.name }}
                  </span>
                  <Badge :variant="getTemplateType(template).variant as any" size="sm">
                    {{ getTemplateType(template).label }}
                  </Badge>
                </div>
                <ChevronRight class="h-5 w-5 text-muted-foreground" />
              </div>

              <div class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Tag class="h-4 w-4 flex-shrink-0" />
                <span>{{ template.category || '-' }}</span>
              </div>

              <div class="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <AlertCircle class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ getPriority(template).label }}优先级</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">¥{{ getTotalFee(template).toFixed(2) }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Layers class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ formatDate(template.created_at) }}</span>
                </div>
              </div>
            </Card>

            <div v-if="hasMore && !loading" class="py-4 text-center">
              <button
                class="text-sm text-primary"
                @click="loadTemplates()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && templates.length > 0" class="py-4 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </div>
      </PullRefresh>

      <button
        class="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 active:scale-90"
        @click="goToCreate"
      >
        <Plus class="h-7 w-7" />
      </button>
    </template>
  </div>
</template>
