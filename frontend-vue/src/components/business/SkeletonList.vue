<script setup lang="ts">
interface Props {
  rows?: number
  avatar?: boolean
}

withDefaults(defineProps<Props>(), {
  rows: 3,
  avatar: true,
})
</script>

<template>
  <div class="space-y-3 p-4">
    <div
      v-for="i in rows"
      :key="i"
      class="bg-card rounded-2xl p-4 shadow-sm border border-border"
    >
      <div class="flex items-start gap-3">
        <div v-if="avatar" class="w-11 h-11 rounded-xl bg-muted animate-pulse shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div class="h-3 bg-muted rounded animate-pulse w-1/2" />
          <div class="h-3 bg-muted rounded animate-pulse w-2/3" />
        </div>
      </div>
      <div class="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
        <div class="h-3 bg-muted rounded animate-pulse w-16" />
        <div class="h-3 bg-muted rounded animate-pulse w-20" />
      </div>
    </div>
  </div>
</template>
