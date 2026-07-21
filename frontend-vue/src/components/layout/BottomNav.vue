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
    <div class="relative bg-card/95 backdrop-blur-2xl border-t border-border shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.06)]">
      <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
      <div class="flex items-end justify-around h-16 px-1">
        <template v-for="(item, index) in navItems" :key="index">
          <button
            v-if="!item.isFAB"
            class="flex flex-col items-center justify-center flex-1 h-14 gap-0.5 tap-highlight-transparent transition-all duration-300 ease-out"
            :class="isActive(item.path) ? 'text-primary scale-[1.02]' : 'text-muted-foreground hover:text-foreground'"
            @click="handleNavClick(item)"
          >
            <div class="relative">
              <component :is="item.icon" class="w-[22px] h-[22px] transition-all duration-300 ease-out" :stroke-width="isActive(item.path) ? 2.5 : 1.8" />
              <div v-if="isActive(item.path)" class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_rgba(245,112,29,0.6)]" />
            </div>
            <span class="text-[11px] font-medium transition-all duration-300" :class="isActive(item.path) ? 'font-semibold' : ''">{{ item.name }}</span>
          </button>

          <div v-else class="relative -top-5 px-1">
            <div class="absolute -inset-0.5 bg-gradient-to-r from-orange-500/30 to-amber-500/30 rounded-full blur-md opacity-70 animate-pulse-soft" />
            <button
              class="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-primary-foreground shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-92 transition-all duration-300 ease-out tap-highlight-transparent hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5"
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
