const PhotoUpload = {
  template: `
    <div class="photo-upload">
      <el-upload
        ref="uploadRef"
        :action="uploadUrl"
        :headers="headers"
        :data="uploadData"
        list-type="picture-card"
        :file-list="fileList"
        :on-success="handleSuccess"
        :on-error="handleError"
        :on-remove="handleRemove"
        :before-upload="beforeUpload"
        :limit="maxCount"
        multiple
        drag
      >
        <div class="upload-slot">
          <el-icon class="upload-icon"><Plus /></el-icon>
          <div class="upload-text">点击或拖拽上传照片</div>
          <div class="upload-hint">支持 jpg/png，单张 ≤ 5MB，最多 {{ maxCount }} 张</div>
        </div>
      </el-upload>

      <div class="photo-actions" v-if="fileList.length > 0">
        <el-button size="small" @click="clearAll">清空所有照片</el-button>
        <span class="photo-count">{{ fileList.length }} / {{ maxCount }} 张</span>
      </div>
    </div>
  `,

  props: {
    modelValue: {
      type: Array,
      default: () => []
    },
    maxCount: {
      type: Number,
      default: 9
    },
    uploadUrl: {
      type: String,
      default: '/api/upload'
    },
    uploadData: {
      type: Object,
      default: () => ({})
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },

  emits: ['update:modelValue', 'change', 'upload-success', 'upload-error'],

  setup(props, { emit }) {
    const { ref, computed, watch } = Vue;
    const { ElMessage } = ElementPlus;

    const uploadRef = ref(null);
    const fileList = ref([]);

    const initFileList = () => {
      if (props.modelValue && props.modelValue.length > 0) {
        fileList.value = props.modelValue.map((item, index) => ({
          uid: item.id || index,
          name: item.name || `photo-${index}`,
          url: item.url || item,
          status: 'success'
        }));
      }
    };

    initFileList();

    watch(() => props.modelValue, (newVal) => {
      if (newVal && Array.isArray(newVal)) {
        fileList.value = newVal.map((item, index) => ({
          uid: item.id || index,
          name: item.name || `photo-${index}`,
          url: item.url || item,
          status: 'success'
        }));
      }
    }, { deep: true });

    const headers = computed(() => {
      const token = localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    });

    const beforeUpload = (file) => {
      const isImage = file.type.startsWith('image/');
      const isLt5M = file.size / 1024 / 1024 < 5;

      if (!isImage) {
        ElMessage.error('只能上传图片文件！');
        return false;
      }
      if (!isLt5M) {
        ElMessage.error('单张照片不能超过 5MB！');
        return false;
      }
      if (fileList.value.length >= props.maxCount) {
        ElMessage.warning(`最多只能上传 ${props.maxCount} 张照片`);
        return false;
      }
      return true;
    };

    const handleSuccess = (response, file) => {
      const photoInfo = {
        id: response.id || response.filename || Date.now(),
        name: response.filename || file.name,
        url: response.url || ''
      };

      const index = fileList.value.findIndex(f => f.uid === file.uid);
      if (index !== -1) {
        fileList.value[index] = { ...photoInfo, uid: file.uid, status: 'success' };
      }

      emit('update:modelValue', getCleanPhotoList());
      emit('change', getCleanPhotoList());
      emit('upload-success', photoInfo);
    };

    const handleError = (err, file) => {
      ElMessage.error('照片上传失败，请重试');
      emit('upload-error', { file, error: err });
    };

    const handleRemove = (file) => {
      fileList.value = fileList.value.filter(f => f.uid !== file.uid);
      emit('update:modelValue', getCleanPhotoList());
      emit('change', getCleanPhotoList());
    };

    const getCleanPhotoList = () => {
      return fileList.value
        .filter(f => f.status === 'success' || f.url)
        .map(f => ({
          id: f.id || f.uid,
          name: f.name || '',
          url: f.url || ''
        }));
    };

    const clearAll = () => {
      fileList.value = [];
      emit('update:modelValue', []);
      emit('change', []);
    };

    const getPhotos = () => getCleanPhotoList();
    const setPhotos = (photos) => {
      if (Array.isArray(photos)) {
        fileList.value = photos.map((p, i) => ({
          uid: p.id || i,
          name: p.name || `photo-${i}`,
          url: p.url || p,
          status: 'success'
        }));
      }
    };

    return {
      uploadRef,
      fileList,
      headers,
      beforeUpload,
      handleSuccess,
      handleError,
      handleRemove,
      clearAll,
      getPhotos,
      setPhotos
    };
  }
};

window.PhotoUpload = PhotoUpload;
