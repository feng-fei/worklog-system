<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Sun, Moon, Monitor } from 'lucide-vue-next'
import { useTheme, type ThemeMode } from '@/composables/useTheme'

const { themeMode, setTheme } = useTheme()
const isOpen = ref(false)

const themes: { value: ThemeMode; label: string; icon: any }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

const currentTheme = computed(() => themes.find(t => t.value === themeMode.value) || themes[2])

const toggleDropdown = (e: MouseEvent) => {
  e.stopPropagation()
  isOpen.value = !isOpen.value
}

const selectTheme = (mode: ThemeMode) => {
  setTheme(mode)
  isOpen.value = false
}

const closeDropdown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('#theme-switcher-container')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <div id="theme-switcher-container" class="relative">
    <button
      class="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
      title="切换主题"
      @click="toggleDropdown"
    >
      <component :is="currentTheme.icon" class="h-5 w-5" />
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md z-50"
    >
      <div class="p-1">
        <button
          v-for="theme in themes"
          :key="theme.value"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors"
          :class="themeMode === theme.value ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'"
          @click="selectTheme(theme.value)"
        >
          <component :is="theme.icon" class="h-4 w-4" />
          <span>{{ theme.label }}</span>
          <span v-if="themeMode === theme.value" class="ml-auto h-2 w-2 rounded-full bg-primary"></span>
        </button>
      </div>
    </div>
  </div>
</template>
