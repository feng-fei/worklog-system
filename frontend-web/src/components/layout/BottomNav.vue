<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Bell,
  User,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

interface NavItem {
  name: string
  path: string
  label: string
  icon: any
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', label: '工作台', icon: LayoutDashboard },
  { name: 'Records', path: '/records', label: '工单', icon: ClipboardList },
  { name: 'RecordCreate', path: '/records/create', label: '新建', icon: PlusCircle },
  { name: 'Pending', path: '/pending', label: '待办', icon: Bell },
  { name: 'Profile', path: '/profile', label: '我的', icon: User },
]

const isActive = (item: NavItem) => {
  if (item.name === 'RecordCreate') {
    return route.name === 'RecordCreate'
  }
  return route.name === item.name
}

const isCenterButton = (index: number) => index === 2

const handleNav = (item: NavItem) => {
  router.push(item.path)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg pb-safe">
    <div class="relative mx-auto flex h-16 max-w-lg items-center justify-around px-2">
      <template v-for="(item, index) in navItems" :key="item.name">
        <button
          v-if="isCenterButton(index)"
          class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
          @click="handleNav(item)"
        >
          <div
            class="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 active:scale-95"
          >
            <component :is="item.icon" class="h-7 w-7" :stroke-width="2.5" />
          </div>
        </button>

        <button
          v-else
          class="flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors duration-200"
          :class="isActive(item) ? 'text-primary' : 'text-muted-foreground'"
          @click="handleNav(item)"
        >
          <component :is="item.icon" class="h-6 w-6" :stroke-width="isActive(item) ? 2.2 : 1.8" />
          <span class="text-xs font-medium">{{ item.label }}</span>
        </button>
      </template>
    </div>
  </nav>
</template>
