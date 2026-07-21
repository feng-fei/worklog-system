<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { staffsApi, recordsApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  User,
  Phone,
  Calendar,
  FileText,
  Edit,
  KeyRound,
  Power,
  IdCard,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
} from 'lucide-vue-next'
import { formatDate, relativeTime } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const staffId = computed(() => Number(route.params.id))
const staff = ref<any>(null)
const loading = ref(true)
const records = ref<any[]>([])
const recordsLoading = ref(false)

const statusMap: Record<string, { label: string; variant: string }> = {
  active: { label: '在职', variant: 'success' },
  inactive: { label: '离职', variant: 'secondary' },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const loadStaff = async () => {
  loading.value = true
  try {
    const res = await staffsApi.get(staffId.value)
    staff.value = res.data
  } catch (e) {
    console.error('加载员工详情失败', e)
  } finally {
    loading.value = false
  }
}

const loadRecords = async () => {
  recordsLoading.value = true
  try {
    const res = await recordsApi.list({
      staff_id: staffId.value,
      page_size: 5,
    })
    const data = res.data
    records.value = data.records || data.list || data.items || []
  } catch (e) {
    console.error('加载员工工单失败', e)
  } finally {
    recordsLoading.value = false
  }
}

const goToEdit = () => {
  router.push(`/staffs/${staffId.value}/edit`)
}

const handleToggleEnabled = async () => {
  if (!confirm(staff.value?.status === 'active' ? '确定要禁用该员工吗？' : '确定要启用该员工吗？')) return
  try {
    await staffsApi.toggleEnabled(staffId.value)
    loadStaff()
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

const handleResetPassword = async () => {
  if (!confirm('确定要重置该员工的密码吗？重置后密码将恢复为默认密码。')) return
  try {
    await staffsApi.resetPassword(staffId.value)
    alert('密码重置成功')
  } catch (e: any) {
    alert(e.response?.data?.error || '重置失败')
  }
}

const goToRecordDetail = (id: number) => {
  router.push(`/records/${id}`)
}

onMounted(() => {
  loadStaff()
  loadRecords()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      title="员工详情"
      show-back
    >
      <template #right>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
          @click="goToEdit"
        >
          <Edit class="h-5 w-5" />
        </button>
      </template>
    </MobileHeader>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">
        <div class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p>加载中...</p>
      </div>
    </div>

    <template v-else-if="staff">
      <div class="flex-1 overflow-y-auto pb-32">
        <div class="bg-gradient-to-r from-primary to-primary/80 px-5 py-6 text-primary-foreground">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-xl font-bold">
                {{ staff.name || staff.staff_name || '员工详情' }}
              </h1>
              <p v-if="staff.position || staff.role" class="mt-1 text-sm opacity-80">
                {{ staff.position || staff.role }}
              </p>
            </div>
            <Badge variant="outline" class="bg-white/20 text-white border-white/30">
              {{ getStatusInfo(staff.status).label }}
            </Badge>
          </div>
          <p v-if="staff.created_at" class="mt-2 text-sm opacity-80">
            入职于 {{ formatDate(staff.join_date || staff.entry_date || staff.created_at, 'YYYY年MM月DD日') }}
          </p>
        </div>

        <div class="space-y-4 p-4">
          <Card class="p-5">
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <User class="h-5 w-5 text-primary" />
              基本信息
            </h3>
            <div class="space-y-3 text-sm">
              <div class="flex items-start gap-3">
                <User class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">姓名</p>
                  <p class="font-medium">{{ staff.name || staff.staff_name || '-' }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <IdCard class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">岗位/职位</p>
                  <p class="font-medium">{{ staff.position || staff.role || '-' }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <Phone class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">联系电话</p>
                  <p class="font-medium">{{ staff.phone || staff.contact_phone || '-' }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <Calendar class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">入职日期</p>
                  <p class="font-medium">{{ formatDate(staff.join_date || staff.entry_date || staff.created_at, 'YYYY-MM-DD') }}</p>
                </div>
              </div>
              <div v-if="staff.id_card" class="flex items-start gap-3">
                <IdCard class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">身份证号</p>
                  <p class="font-medium">{{ staff.id_card }}</p>
                </div>
              </div>
              <div v-if="staff.emergency_contact" class="flex items-start gap-3">
                <ShieldAlert class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">紧急联系人</p>
                  <p class="font-medium">
                    {{ staff.emergency_contact }}
                    <span v-if="staff.emergency_phone" class="text-muted-foreground ml-2">{{ staff.emergency_phone }}</span>
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card class="p-5">
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <FileText class="h-5 w-5 text-primary" />
              近期工单
            </h3>
            <div v-if="recordsLoading" class="py-6 text-center text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              <p class="text-sm">加载中...</p>
            </div>
            <div v-else-if="records.length === 0" class="py-6 text-center text-muted-foreground">
              <p class="text-sm">暂无工单记录</p>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="record in records"
                :key="record.id"
                class="flex items-center justify-between rounded-xl bg-muted/50 p-3 cursor-pointer active:scale-[0.99] transition-transform"
                @click="goToRecordDetail(record.id)"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm truncate">
                      {{ record.order_no || '#' + record.id }}
                    </span>
                    <Badge :variant="getStatusInfo(record.status).variant as any" size="sm">
                      {{ getStatusInfo(record.status).label }}
                    </Badge>
                  </div>
                  <p class="mt-1 text-xs text-muted-foreground truncate">
                    {{ record.work_content?.slice(0, 30) || record.title || '无标题' }}
                  </p>
                </div>
                <ChevronRight class="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div class="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 pb-safe">
        <div class="mx-auto flex max-w-lg gap-3">
          <Button
            variant="outline"
            size="xl"
            class="flex-1"
            @click="handleResetPassword"
          >
            <KeyRound class="h-5 w-5" />
            重置密码
          </Button>
          <Button
            :variant="staff.status === 'active' ? 'destructive' : 'default'"
            size="xl"
            class="flex-1"
            @click="handleToggleEnabled"
          >
            <Power class="h-5 w-5" />
            {{ staff.status === 'active' ? '禁用' : '启用' }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
