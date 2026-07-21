<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, X, Image as ImageIcon } from 'lucide-vue-next'

interface PhotoItem {
  url: string
  file?: File
  name: string
  size: number
}

interface Props {
  modelValue?: string[]
  maxCount?: number
  maxSizeMB?: number
  compress?: boolean
  compressQuality?: number
  compressMaxWidth?: number
  accept?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  maxCount: 9,
  maxSizeMB: 10,
  compress: true,
  compressQuality: 0.8,
  compressMaxWidth: 1280,
  accept: 'image/*',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'change', photos: PhotoItem[]): void
}>()

const photos = ref<PhotoItem[]>([])
const uploading = ref(false)

const canAddMore = computed(() => photos.value.length < props.maxCount)

const compressImage = (file: File, quality: number, maxWidth: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法创建 canvas 上下文'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

const handleFileSelect = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  uploading.value = true
  try {
    const newPhotos: PhotoItem[] = []
    const remaining = props.maxCount - photos.value.length

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i]

      if (file.size > props.maxSizeMB * 1024 * 1024) {
        console.warn(`文件 ${file.name} 超过 ${props.maxSizeMB}MB，已跳过`)
        continue
      }

      let url: string
      let compressedSize = file.size

      if (props.compress && file.type.startsWith('image/')) {
        try {
          url = await compressImage(file, props.compressQuality, props.compressMaxWidth)
          const base64Length = url.length - 'data:image/jpeg;base64,'.length
          compressedSize = Math.floor((base64Length * 3) / 4)
        } catch {
          url = URL.createObjectURL(file)
        }
      } else {
        url = URL.createObjectURL(file)
      }

      newPhotos.push({
        url,
        file,
        name: file.name,
        size: compressedSize,
      })
    }

    photos.value = [...photos.value, ...newPhotos]
    emit('update:modelValue', photos.value.map((p) => p.url))
    emit('change', photos.value)
  } catch (e) {
    console.error('处理图片失败', e)
  } finally {
    uploading.value = false
    target.value = ''
  }
}

const removePhoto = (index: number) => {
  const photo = photos.value[index]
  if (photo.url.startsWith('blob:')) {
    URL.revokeObjectURL(photo.url)
  }
  photos.value.splice(index, 1)
  emit('update:modelValue', photos.value.map((p) => p.url))
  emit('change', photos.value)
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}
</script>

<template>
  <div class="w-full">
    <div class="grid grid-cols-3 gap-2">
      <div
        v-for="(photo, index) in photos"
        :key="index"
        class="relative aspect-square overflow-hidden rounded-xl bg-muted group"
      >
        <img
          :src="photo.url"
          :alt="photo.name"
          class="h-full w-full object-cover"
        />
        <button
          type="button"
          class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
          @click="removePhoto(index)"
        >
          <X class="h-4 w-4" />
        </button>
        <div class="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white">
          {{ formatSize(photo.size) }}
        </div>
      </div>

      <label
        v-if="canAddMore"
        class="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary active:bg-accent"
      >
        <Upload v-if="!uploading" class="h-8 w-8" />
        <div v-else class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <span class="mt-2 text-xs">
          {{ uploading ? '上传中...' : `添加照片 (${photos.length}/${maxCount})` }}
        </span>
        <input
          type="file"
          :accept="accept"
          multiple
          class="hidden"
          :disabled="uploading"
          @change="handleFileSelect"
        />
      </label>
    </div>

    <p v-if="compress" class="mt-2 text-xs text-muted-foreground">
      <ImageIcon class="mr-1 inline h-3 w-3" />
      照片将自动压缩至 {{ compressMaxWidth }}px 宽度，节省流量和存储空间
    </p>
  </div>
</template>
