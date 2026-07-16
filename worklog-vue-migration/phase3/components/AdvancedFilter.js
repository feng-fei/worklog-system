// =============================================
// AdvancedFilter.js - 高级筛选组件
// =============================================
// 可复用于多个列表页面

const AdvancedFilter = {
  template: `
    <el-card shadow="never" class="advanced-filter-card">
      <div class="filter-header">
        <span>高级筛选</span>
        <el-button type="primary" size="small" @click="applyFilter">查询</el-button>
        <el-button size="small" @click="resetFilter">重置</el-button>
      </div>

      <el-form :model="filterForm" label-width="80px" size="small">
        <el-row :gutter="16">
          <el-col :span="8" v-for="(field, index) in fields" :key="index">
            <el-form-item :label="field.label">
              <!-- 文本输入 -->
              <el-input
                v-if="field.type === 'input'"
                v-model="filterForm[field.key]"
                :placeholder="field.placeholder || '请输入'"
                clearable
              />

              <!-- 选择器 -->
              <el-select
                v-else-if="field.type === 'select'"
                v-model="filterForm[field.key]"
                :placeholder="field.placeholder || '请选择'"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="opt in field.options"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <!-- 日期范围 -->
              <el-date-picker
                v-else-if="field.type === 'daterange'"
                v-model="filterForm[field.key]"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />

              <!-- 数字范围 -->
              <el-input-number
                v-else-if="field.type === 'number'"
                v-model="filterForm[field.key]"
                :min="field.min"
                :max="field.max"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  `,

  props: {
    // 筛选字段配置
    fields: {
      type: Array,
      required: true
      // 示例：
      // [
      //   { key: 'keyword', label: '关键词', type: 'input' },
      //   { key: 'status', label: '状态', type: 'select', options: [...] },
      //   { key: 'date_range', label: '日期', type: 'daterange' }
      // ]
    },
    // 初始值
    modelValue: {
      type: Object,
      default: () => ({})
    }
  },

  emits: ['update:modelValue', 'search', 'reset'],

  setup(props, { emit }) {
    const { reactive, watch } = Vue;

    const filterForm = reactive({ ...props.modelValue });

    watch(() => props.modelValue, (newVal) => {
      Object.assign(filterForm, newVal);
    }, { deep: true });

    const applyFilter = () => {
      emit('update:modelValue', { ...filterForm });
      emit('search', { ...filterForm });
    };

    const resetFilter = () => {
      // 重置为初始值
      Object.keys(filterForm).forEach(key => {
        filterForm[key] = Array.isArray(filterForm[key]) ? [] : '';
      });
      emit('update:modelValue', { ...filterForm });
      emit('reset');
    };

    return {
      filterForm,
      applyFilter,
      resetFilter
    };
  }
};

window.AdvancedFilter = AdvancedFilter;
AdvancedFilter;