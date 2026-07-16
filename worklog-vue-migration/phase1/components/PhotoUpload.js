// =============================================
// PhotoUpload.js - 照片上传组件（Vue 3 + Element Plus）
// =============================================
// 功能：支持多图上传、预览、删除、拖拽
// 兼容 Legacy 照片上传逻辑，可直接替换
// =============================================

const PhotoUpload = {
  template: `
    <div class="photo-upload">
      <!-- 上传区域 -->
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

      <!-- 额外操作 -->
      <div class="photo-actions" v-if="fileList.length > 0">
        <el-button size="small" @click="clearAll">清空所有照片</el-button>
        <span class="photo-count">{{ fileList.length }} / {{ maxCount }} 张</span>
      </div>
    </div>
  `,

  props: {
    // 已上传的照片列表（支持 v-model）
    modelValue: {
      type: Array,
      default: () => []
    },
    // 最大上传数量
    maxCount: {
      type: Number,
      default: 9
    },
    // 上传接口地址（可根据实际后端调整）
    uploadUrl: {
      type: String,
      default: '/api/upload/photo'
    },
    // 额外上传参数
    uploadData: {
      type: Object,
      default: () => ({})
    },
    // 是否禁用
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

    // 初始化 fileList
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

    // 监听外部 modelValue 变化
    watch(() => props.modelValue, (newVal) => {
      if (newVal) {
        fileList.value = newVal.map((item, index) => ({
          uid: item.id || index,
          name: item.name || `photo-${index}`,
          url: item.url || item,
          status: 'success'
        }));
      }
    }, { deep: true });

    // 请求头（可根据需要添加 token）
    const headers = computed(() => {
      const token = localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    });

    // 上传前校验
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

    // 上传成功
    const handleSuccess = (response, file, fileListRes) => {
      // 假设后端返回 { url: 'xxx', id: xxx }
      const photoInfo = {
        id: response.id || Date.now(),
        name: file.name,
        url: response.url || response.data?.url || file.url
      };

      // 更新 fileList
      const index = fileList.value.findIndex(f => f.uid === file.uid);
      if (index !== -1) {
        fileList.value[index] = { ...file, ...photoInfo, status: 'success' };
      }

      // 同步到父组件
      emit('update:modelValue', getCleanPhotoList());
      emit('change', getCleanPhotoList());
      emit('upload-success', photoInfo);

      ElMessage.success('照片上传成功');
    };

    // 上传失败
    const handleError = (err, file) => {
      ElMessage.error('照片上传失败，请重试');
      emit('upload-error', { file, error: err });
    };

    // 删除照片
    const handleRemove = (file) => {
      fileList.value = fileList.value.filter(f => f.uid !== file.uid);
      emit('update:modelValue', getCleanPhotoList());
      emit('change', getCleanPhotoList());
    };

    // 获取干净的照片数据（只保留必要字段）
    const getCleanPhotoList = () => {
      return fileList.value
        .filter(f => f.status === 'success' || f.url)
        .map(f => ({
          id: f.id || f.uid,
          name: f.name,
          url: f.url || f.response?.url
        }));
    };

    // 清空所有照片
    const clearAll = () => {
      fileList.value = [];
      emit('update:modelValue', []);
      emit('change', []);
    };

    // 暴露方法给父组件调用
    const getPhotos = () => getCleanPhotoList();
    const setPhotos = (photos) => {
      fileList.value = photos.map((p, i) => ({
        uid: p.id || i,
        name: p.name || `photo-${i}`,
        url: p.url || p,
        status: 'success'
      }));
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

// 注册为全局组件（可选）
window.PhotoUpload = PhotoUpload;

PhotoUpload;