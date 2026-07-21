<script setup lang="ts">
interface Props {
  mode?: 'card' | 'table'
  rows?: number
  cols?: number
}

withDefaults(defineProps<Props>(), {
  mode: 'card',
  rows: 5,
  cols: 2,
})
</script>

<template>
  <div class="skeleton-wrapper">
    <div v-if="mode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      <div
        v-for="i in rows"
        :key="i"
        class="bg-card rounded-2xl p-4 shadow-sm border border-border overflow-hidden"
      >
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="h-5 w-16 rounded-md bg-muted shimmer" />
          <div class="h-5 w-16 rounded-full bg-muted shimmer shrink-0" />
        </div>
        <div class="h-5 bg-muted rounded shimmer w-3/4 mb-1" />
        <div class="h-3 bg-muted rounded shimmer w-1/3 mb-2" />
        <div class="h-4 bg-muted rounded shimmer w-full mb-3" />
        <div class="h-4 bg-muted rounded shimmer w-2/3 mb-3" />
        <div class="flex items-center justify-between pt-3 border-t border-border/60">
          <div class="h-3 bg-muted rounded shimmer w-20" />
          <div class="h-4 bg-muted rounded shimmer w-16" />
        </div>
      </div>
    </div>

    <div v-else class="rounded-2xl border border-border overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-muted/20">
              <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                <div class="h-3 bg-muted rounded shimmer w-16" />
              </th>
              <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                <div class="h-3 bg-muted rounded shimmer w-20" />
              </th>
              <th class="hidden md:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">
                <div class="h-3 bg-muted rounded shimmer w-12" />
              </th>
              <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                <div class="h-3 bg-muted rounded shimmer w-12" />
              </th>
              <th class="hidden lg:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">
                <div class="h-3 bg-muted rounded shimmer w-16" />
              </th>
              <th class="hidden lg:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">
                <div class="h-3 bg-muted rounded shimmer w-20" />
              </th>
              <th class="hidden md:table-cell text-right text-xs font-medium text-muted-foreground px-4 py-3">
                <div class="h-3 bg-muted rounded shimmer w-12 ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="i in rows"
              :key="i"
              class="border-b border-border/50 last:border-0"
            >
              <td class="px-4 py-3">
                <div class="h-4 bg-muted rounded shimmer w-24 font-mono" />
              </td>
              <td class="px-4 py-3">
                <div class="h-4 bg-muted rounded shimmer w-32 mb-1" />
                <div class="h-3 bg-muted rounded shimmer w-40" />
              </td>
              <td class="hidden md:table-cell px-4 py-3">
                <div class="h-5 bg-muted rounded-full shimmer w-16" />
              </td>
              <td class="px-4 py-3">
                <div class="h-5 bg-muted rounded-full shimmer w-16" />
              </td>
              <td class="hidden lg:table-cell px-4 py-3">
                <div class="h-4 bg-muted rounded shimmer w-20" />
              </td>
              <td class="hidden lg:table-cell px-4 py-3">
                <div class="h-4 bg-muted rounded shimmer w-24" />
              </td>
              <td class="hidden md:table-cell px-4 py-3 text-right">
                <div class="h-4 bg-muted rounded shimmer w-16 ml-auto" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shimmer {
  position: relative;
  overflow: hidden;
  background-color: hsl(var(--muted));
}

.shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.2) 20%,
    rgba(255, 255, 255, 0.5) 60%,
    rgba(255, 255, 255, 0)
  );
  animation: shimmer 1.5s infinite;
}

.dark .shimmer::after {
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.05) 20%,
    rgba(255, 255, 255, 0.1) 60%,
    rgba(255, 255, 255, 0)
  );
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
