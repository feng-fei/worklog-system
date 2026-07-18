<script setup lang="ts">
import { useRouter } from 'vue-router'
import Card from '@/components/ui/Card.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useResponsive } from '@/composables/useResponsive'
import {
  Info,
  Building2,
  Code,
  Calendar,
} from 'lucide-vue-next'

const router = useRouter()
const { isDesktop } = useResponsive()

const systemInfo = [
  { icon: Building2, label: '系统名称', value: '工单管理系统' },
  { icon: Code, label: '版本号', value: 'v1.0.0' },
  { icon: Calendar, label: '发布日期', value: '2026-07-01' },
]
</script>

<template>
  <div class="min-h-full bg-background">
    <template v-if="isDesktop">
      <div class="mx-auto w-full max-w-3xl px-8 py-6">
        <h1 class="mb-6 text-2xl font-bold text-foreground">系统设置</h1>

        <Card class="overflow-hidden">
          <div class="bg-gradient-to-r from-primary to-primary/80 px-6 py-8 text-primary-foreground text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <Building2 class="h-8 w-8" />
            </div>
            <h2 class="text-xl font-bold">工单管理系统</h2>
            <p class="mt-1 text-sm opacity-80">Work Order Management System</p>
          </div>
          <div class="divide-y divide-border">
            <div
              v-for="item in systemInfo"
              :key="item.label"
              class="flex items-center justify-between px-6 py-4"
            >
              <div class="flex items-center gap-3 text-muted-foreground">
                <component :is="item.icon" class="h-4 w-4" />
                <span class="text-sm">{{ item.label }}</span>
              </div>
              <span class="text-sm font-medium text-foreground">{{ item.value }}</span>
            </div>
          </div>
        </Card>

        <p class="py-8 text-center text-xs text-muted-foreground">
          © 2026 工单管理系统. All rights reserved.
        </p>
      </div>
    </template>

    <template v-else>
      <MobileHeader title="系统设置" show-back />

      <div class="px-4 pt-4 pb-6">
        <Card class="overflow-hidden">
          <div class="bg-gradient-to-r from-primary to-primary/80 px-5 py-8 text-primary-foreground text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <Building2 class="h-8 w-8" />
            </div>
            <h2 class="text-xl font-bold">工单管理系统</h2>
            <p class="mt-1 text-sm opacity-80">Work Order Management System</p>
          </div>
          <div class="divide-y divide-border">
            <div
              v-for="item in systemInfo"
              :key="item.label"
              class="flex items-center justify-between px-5 py-4"
            >
              <div class="flex items-center gap-3 text-muted-foreground">
                <component :is="item.icon" class="h-4 w-4" />
                <span class="text-sm">{{ item.label }}</span>
              </div>
              <span class="text-sm font-medium text-foreground">{{ item.value }}</span>
            </div>
          </div>
        </Card>

        <p class="py-6 text-center text-xs text-muted-foreground">
          © 2026 工单管理系统. All rights reserved.
        </p>
      </div>
    </template>
  </div>
</template>
