<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { systemApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Play,
  Clock,
  Save,
  Settings,
  Calendar,
  Archive,
  CheckCircle,
  XCircle,
  FileText,
} from 'lucide-vue-next'

const backups = ref<any[]>([])
const settings = ref({
  backup_enabled: '0',
  backup_frequency: 'daily',
  backup_time: '02:00',
  backup_keep_count: '10',
  backup_weekday: '0',
  backup_day: '1',
})
const loading = ref(false)
const creating = ref(false)
const restoring = ref(false)
const selectedBackup = ref('')

const frequencyOptions = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

const weekdayOptions = [
  { value: '0', label: '周一' },
  { value: '1', label: '周二' },
  { value: '2', label: '周三' },
  { value: '3', label: '周四' },
  { value: '4', label: '周五' },
  { value: '5', label: '周六' },
  { value: '6', label: '周日' },
]

const dayOptions = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}日`,
}))

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

const formatBackupDate = (filename: string) => {
  try {
    const match = filename.match(/(\d{8})_(\d{6})/)
    if (match) {
      const dateStr = match[1]
      const timeStr = match[2]
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)} ${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`
    }
  } catch {}
  return filename
}

const loadBackups = async () => {
  loading.value = true
  try {
    const res = await systemApi.backupList()
    backups.value = res.data.backups || []
  } catch (e) {
    console.error('加载备份列表失败', e)
  } finally {
    loading.value = false
  }
}

const loadSettings = async () => {
  try {
    const res = await systemApi.backupSettings()
    settings.value = { ...settings.value, ...res.data }
  } catch (e) {
    console.error('加载备份设置失败', e)
  }
}

const saveSettings = async () => {
  try {
    await systemApi.updateBackupSettings(settings.value)
    alert('备份设置已保存')
  } catch (e: any) {
    alert(e.response?.data?.error || '保存失败')
  }
}

const createBackup = async () => {
  if (creating.value) return
  creating.value = true
  try {
    await systemApi.runBackupNow()
    alert('手动备份创建成功')
    loadBackups()
  } catch (e: any) {
    alert(e.response?.data?.error || '备份创建失败')
  } finally {
    creating.value = false
  }
}

const downloadBackup = (filename: string) => {
  systemApi.downloadBackup(filename).then((res) => {
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  })
}

const deleteBackup = async (filename: string) => {
  if (!confirm(`确定删除备份文件 ${filename} 吗？`)) return
  try {
    await systemApi.deleteBackup(filename)
    loadBackups()
  } catch (e: any) {
    alert(e.response?.data?.error || '删除失败')
  }
}

const restoreBackup = async () => {
  if (!selectedBackup.value) {
    alert('请选择要恢复的备份')
    return
  }
  if (!confirm('恢复备份将覆盖当前数据库，确定继续吗？建议先创建一个当前数据的备份。')) return
  restoring.value = true
  try {
    await systemApi.restoreBackup({ filename: selectedBackup.value })
    alert('恢复成功，页面将刷新')
    setTimeout(() => window.location.reload(), 1500)
  } catch (e: any) {
    alert(e.response?.data?.error || '恢复失败')
  } finally {
    restoring.value = false
  }
}

onMounted(() => {
  loadBackups()
  loadSettings()
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <MobileHeader title="数据备份" show-back>
      <template #right>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"
          @click="loadBackups(); loadSettings()"
        >
          <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
        </button>
      </template>
    </MobileHeader>

    <div class="flex-1 space-y-4 px-4 py-4 pb-6">
      <Card class="p-4">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings class="h-5 w-5" />
          </div>
          <div>
            <h3 class="font-semibold">自动备份设置</h3>
            <p class="text-xs text-muted-foreground">配置数据库定时自动备份</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">启用自动备份</p>
              <p class="text-xs text-muted-foreground">开启后将按计划自动备份数据库</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                :checked="settings.backup_enabled === '1'"
                @change="settings.backup_enabled = ($event.target as HTMLInputElement).checked ? '1' : '0'"
                class="sr-only peer"
              />
              <div class="w-12 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div v-if="settings.backup_enabled === '1'" class="space-y-4 pt-2 border-t border-border">
            <div>
              <label class="text-sm font-medium mb-2 block">备份频率</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="opt in frequencyOptions"
                  :key="opt.value"
                  class="py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  :class="settings.backup_frequency === opt.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'"
                  @click="settings.backup_frequency = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div v-if="settings.backup_frequency === 'weekly'">
              <label class="text-sm font-medium mb-2 block">备份日期</label>
              <select
                v-model="settings.backup_weekday"
                class="w-full h-10 px-3 rounded-lg border border-input bg-background"
              >
                <option v-for="opt in weekdayOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div v-if="settings.backup_frequency === 'monthly'">
              <label class="text-sm font-medium mb-2 block">备份日期（每月）</label>
              <select
                v-model="settings.backup_day"
                class="w-full h-10 px-3 rounded-lg border border-input bg-background"
              >
                <option v-for="opt in dayOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="text-sm font-medium mb-2 block flex items-center gap-2">
                <Clock class="h-4 w-4" />
                备份时间
              </label>
              <input
                type="time"
                v-model="settings.backup_time"
                class="w-full h-10 px-3 rounded-lg border border-input bg-background"
              />
            </div>

            <div>
              <label class="text-sm font-medium mb-2 block flex items-center gap-2">
                <Archive class="h-4 w-4" />
                保留份数
              </label>
              <input
                type="number"
                v-model="settings.backup_keep_count"
                min="1"
                max="50"
                class="w-full h-10 px-3 rounded-lg border border-input bg-background"
              />
              <p class="text-xs text-muted-foreground mt-1">最多保留最近 N 份备份，超过将自动删除最早的备份</p>
            </div>
          </div>

          <Button class="w-full" @click="saveSettings">
            <Save class="h-4 w-4 mr-2" />
            保存设置
          </Button>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <Play class="h-5 w-5" />
            </div>
            <div>
              <h3 class="font-semibold">手动备份</h3>
              <p class="text-xs text-muted-foreground">立即创建一个数据库备份</p>
            </div>
          </div>
        </div>
        <Button class="w-full" :disabled="creating" @click="createBackup">
          <Database class="h-4 w-4 mr-2" />
          {{ creating ? '备份中...' : '立即备份' }}
        </Button>
      </Card>

      <Card class="p-4">
        <h3 class="font-semibold mb-3 flex items-center gap-2">
          <FileText class="h-5 w-5 text-primary" />
          备份列表
          <Badge variant="secondary" size="sm">{{ backups.length }}</Badge>
        </h3>

        <div v-if="loading" class="py-8 text-center text-muted-foreground">
          <RefreshCw class="mx-auto mb-2 h-6 w-6 animate-spin" />
          加载中...
        </div>

        <div v-else-if="backups.length === 0" class="py-8 text-center">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Archive class="h-6 w-6 text-muted-foreground" />
          </div>
          <p class="text-muted-foreground text-sm">暂无备份文件</p>
        </div>

        <div v-else class="space-y-2">
          <label
            v-for="backup in backups"
            :key="backup.filename"
            class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
            :class="selectedBackup === backup.filename ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'"
          >
            <input
              type="radio"
              :value="backup.filename"
              v-model="selectedBackup"
              class="accent-primary"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ backup.filename }}</p>
              <div class="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span class="flex items-center gap-1">
                  <Calendar class="h-3 w-3" />
                  {{ formatBackupDate(backup.filename) }}
                </span>
                <span>{{ formatFileSize(backup.size) }}</span>
              </div>
            </div>
            <div class="flex gap-1">
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent"
                @click.stop="downloadBackup(backup.filename)"
              >
                <Download class="h-4 w-4 text-primary" />
              </button>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent"
                @click.stop="deleteBackup(backup.filename)"
              >
                <Trash2 class="h-4 w-4 text-destructive" />
              </button>
            </div>
          </label>
        </div>

        <div v-if="backups.length > 0" class="mt-4 pt-4 border-t border-border">
          <Button variant="destructive" class="w-full" :disabled="!selectedBackup || restoring" @click="restoreBackup">
            <Upload class="h-4 w-4 mr-2" />
            {{ restoring ? '恢复中...' : '恢复选中备份' }}
          </Button>
          <p class="mt-2 text-xs text-center text-muted-foreground">
            警告：恢复备份会覆盖当前所有数据
          </p>
        </div>
      </Card>
    </div>
  </div>
</template>
