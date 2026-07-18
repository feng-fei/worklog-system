<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LayoutDashboard, ClipboardList, Plus, Bell, User } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/dashboard', name: '工作台', icon: LayoutDashboard },
  { path: '/records', name: '工单', icon: ClipboardList },
  { path: '', name: '新建', icon: Plus, isFAB: true },
  { path: '/pending', name: '待办', icon: Bell },
  { path: '/profile', name: '我的', icon: User },
]

const activePath = computed(() => route.path)

const handleNavClick = (item: typeof navItems[0]) => {
  if (item.isFAB) {
    router.push('/create')
  } else {
    router.push(item.path)
  }
}

const isActive = (path: string) => {
  if (!path) return false
  return activePath.value.startsWith(path)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
    <div class="relative bg-card/95 backdrop-blur-xl border-t border-border">
      <div class="flex items-end justify-around h-16 px-2">
        <template v-for="(item, index) in navItems" :key="index">
          <button
            v-if="!item.isFAB"
            class="flex flex-col items-center justify-center w-16 h-14 gap-0.5 tap-highlight-transparent transition-colors"
            :class="isActive(item.path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
            @click="handleNavClick(item)"
          >
            <component :is="item.icon" class="w-5 h-5" :stroke-width="isActive(item.path) ? 2.5 : 2" />
            <span class="text-[11px] font-medium">{{ item.name }}</span>
          </button>

          <div v-else class="relative -top-5">
            <button
              class="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center active:scale-95 transition-transform tap-highlight-transparent"
              @click="handleNavClick(item)"
            >
              <Plus class="w-6 h-6" :stroke-width="2.5" />
            </button>
          </div>
        </template>
      </div>
    </div>
  </nav>
</template>
