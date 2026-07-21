<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, X, Image as ImageIcon, Loader2 } from 'lucide-vue-next'

interface Props {
  modelValue: string[]
  max?: number
}

const props = withDefaults(defineProps<Props>(), {
  max: 9,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const localPreviews = ref<{ file: File; preview: string }[]>([])

const photos = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const canAdd = computed(() => photos.value.length < props.max)

const triggerSelect = () => {
  if (!canAdd.value) return
  fileInput.value?.click()
}

const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const remaining = props.max - photos.value.length
  const newFiles = Array.from(files).slice(0, remaining)

  uploading.value = true
  try {
    const { recordsApi } = await import('@/api')
    const res = await recordsApi.uploadPhotos(newFiles)
    if (res.photos && Array.isArray(res.photos)) {
      photos.value = [...photos.value, ...res.photos]
    }
  } catch {
    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        localPreviews.value.push({ file, preview: reader.result as string })
      }
      reader.readAsDataURL(file)
    })
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const removePhoto = (index: number) => {
  photos.value = photos.value.filter((_, i) => i !== index)
}

const removeLocalPreview = (index: number) => {
  localPreviews.value.splice(index, 1)
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
      <div
        v-for="(photo, idx) in photos"
        :key="photo"
        class="relative aspect-square rounded-xl overflow-hidden bg-muted group"
      >
        <img :src="photo.startsWith('/') ? photo : `/${photo}`" alt="" class="w-full h-full object-cover" />
        <button
          class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop="removePhoto(idx)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        v-for="(item, idx) in localPreviews"
        :key="'local-' + idx"
        class="relative aspect-square rounded-xl overflow-hidden bg-muted group"
      >
        <img :src="item.preview" alt="" class="w-full h-full object-cover" />
        <button
          class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
          @click.stop="removeLocalPreview(idx)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
        <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
          本地预览
        </div>
      </div>

      <button
        v-if="canAdd"
        class="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/30"
        @click="triggerSelect"
      >
        <Loader2 v-if="uploading" class="w-6 h-6 animate-spin" />
        <Plus v-else class="w-6 h-6" />
        <span class="text-xs">{{ uploading ? '上传中' : '添加照片' }}</span>
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="onFileChange"
    />

    <p v-if="photos.length > 0" class="text-xs text-muted-foreground">
      已上传 {{ photos.length }} / {{ max }} 张
    </p>
  </div>
</template>
