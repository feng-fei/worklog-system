<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LayoutDashboard, ClipboardList, Plus, Bell, User, Wrench, Building2, X } from 'lucide-vue-next'

const props = defineProps<{
  keyboardOpen?: boolean
}>()

const route = useRoute()
const router = useRouter()

const fabOpen = ref(false)

const navItems = [
  { path: '/dashboard', name: '工作台', icon: LayoutDashboard },
  { path: '/records', name: '工单', icon: ClipboardList },
  { path: '', name: '新建', icon: Plus, isFAB: true },
  { path: '/pending', name: '待办', icon: Bell },
  { path: '/profile', name: '我的', icon: User },
]

const fabMenuItems = [
  { path: '/customer-create', name: '新建客户', icon: Building2 },
  { path: '/pending-create', name: '新建待办', icon: Bell },
  { path: '/create', name: '新建工单', icon: Wrench },
]

const activePath = computed(() => route.path)

const toggleFab = () => {
  fabOpen.value = !fabOpen.value
}

const closeFab = () => {
  fabOpen.value = false
}

const handleFabItemClick = (path: string) => {
  closeFab()
  router.push(path)
}

const handleNavClick = (item: typeof navItems[0]) => {
  if (item.isFAB) {
    toggleFab()
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
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom transition-transform duration-300 ease-out"
    :class="{
      'translate-y-full': props.keyboardOpen,
    }"
  >
    <Transition name="fade">
      <div
        v-if="fabOpen"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        @click="closeFab"
      />
    </Transition>

    <div class="relative bg-card/95 backdrop-blur-2xl border-t border-border shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.06)] z-50">
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
            <div class="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pb-2">
              <TransitionGroup name="fab-item" tag="div" class="flex flex-col items-center gap-3">
                <div
                  v-for="(menuItem, menuIndex) in fabMenuItems"
                  v-show="fabOpen"
                  :key="menuItem.path"
                  class="flex items-center gap-3"
                  :style="{ transitionDelay: fabOpen ? `${menuIndex * 60}ms` : '0ms' }"
                >
                  <span class="text-xs font-medium text-foreground bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-border">
                    {{ menuItem.name }}
                  </span>
                  <button
                    class="w-11 h-11 rounded-xl bg-card/95 backdrop-blur-md text-foreground shadow-lg border border-border flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-card hover:shadow-xl"
                    @click="handleFabItemClick(menuItem.path)"
                  >
                    <component :is="menuItem.icon" class="w-5 h-5" :stroke-width="2" />
                  </button>
                </div>
              </TransitionGroup>
            </div>

            <div class="absolute -inset-0.5 bg-gradient-to-r from-orange-500/30 to-amber-500/30 rounded-full blur-md opacity-70 animate-pulse-soft" />
            <button
              class="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-primary-foreground shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-92 transition-all duration-300 ease-out tap-highlight-transparent hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5"
              @click="handleNavClick(item)"
            >
              <Plus
                v-if="!fabOpen"
                class="w-6 h-6 transition-all duration-300 ease-out"
                :stroke-width="2.5"
              />
              <X
                v-else
                class="w-6 h-6 transition-all duration-300 ease-out rotate-45"
                :stroke-width="2.5"
              />
            </button>
          </div>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fab-item-enter-active,
.fab-item-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fab-item-enter-from,
.fab-item-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.8);
}

.fab-item-move {
  transition: transform 0.25s ease;
}
</style>
