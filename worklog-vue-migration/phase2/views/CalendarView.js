// =============================================
// CalendarView.js - 日历视图
// =============================================
// 功能：月视图日历 + 工单标记 + 点击日期查看当天工单
// =============================================

const CalendarView = {
  template: `
    <div class="calendar-view">
      <div class="page-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div class="section-title" style="margin:0;">工单日历</div>
          <div>
            <el-button @click="prevMonth">上个月</el-button>
            <span style="margin: 0 16px; font-weight: bold; font-size: 16px;">
              {{ currentYear }} 年 {{ currentMonth }} 月
            </span>
            <el-button @click="nextMonth">下个月</el-button>
            <el-button type="primary" @click="goToToday" style="margin-left:12px;">今天</el-button>
          </div>
        </div>

        <!-- 日历表格 -->
        <div class="calendar-grid">
          <!-- 星期标题 -->
          <div class="calendar-header">
            <div v-for="day in weekDays" :key="day" class="calendar-header-cell">{{ day }}</div>
          </div>

          <!-- 日期格子 -->
          <div class="calendar-body">
            <div
              v-for="(day, index) in calendarDays"
              :key="index"
              class="calendar-cell"
              :class="{ 'other-month': !day.isCurrentMonth, 'today': day.isToday, 'has-records': day.records && day.records.length > 0 }"
              @click="selectDay(day)"
            >
              <div class="day-number">{{ day.day }}</div>
              <div v-if="day.records && day.records.length > 0" class="record-indicators">
                <div class="record-dot" v-for="(r, i) in day.records.slice(0, 3)" :key="i"></div>
                <span v-if="day.records.length > 3" class="more-count">+{{ day.records.length - 3 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 选中日期的工单列表 -->
        <div v-if="selectedDay && selectedDay.records && selectedDay.records.length > 0" class="selected-day-records" style="margin-top: 24px;">
          <div class="section-title" style="margin-bottom:12px;">
            {{ selectedDay.dateStr }} 的工单 ({{ selectedDay.records.length }} 条)
          </div>
          <el-table :data="selectedDay.records" size="small" border>
            <el-table-column prop="order_no" label="工单号" width="160" />
            <el-table-column prop="customer_name" label="客户" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="goToRecord(row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <el-empty v-else-if="selectedDay" description="当天没有工单" />
      </div>
    </div>
  `,

  setup() {
    const { ref, computed, onMounted } = Vue;
    const { useRouter } = VueRouter;
    const router = useRouter();

    const currentDate = ref(new Date());
    const records = ref([]);
    const selectedDay = ref(null);

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    const currentYear = computed(() => currentDate.value.getFullYear());
    const currentMonth = computed(() => currentDate.value.getMonth() + 1);

    // 生成日历数据
    const calendarDays = computed(() => {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();

      const days = [];
      const today = new Date();

      // 上个月的日期
      for (let i = firstDay - 1; i >= 0; i--) {
        days.push({
          day: daysInPrevMonth - i,
          isCurrentMonth: false,
          date: new Date(year, month - 1, daysInPrevMonth - i)
        });
      }

      // 本月日期
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dateStr = date.toISOString().split('T')[0];

        days.push({
          day: d,
          isCurrentMonth: true,
          isToday: date.toDateString() === today.toDateString(),
          date: date,
          dateStr: dateStr,
          records: records.value.filter(r => r.work_date === dateStr)
        });
      }

      // 下个月补位
      const remaining = 42 - days.length;
      for (let d = 1; d <= remaining; d++) {
        days.push({
          day: d,
          isCurrentMonth: false,
          date: new Date(year, month + 1, d)
        });
      }

      return days;
    });

    // 加载当月工单
    const loadMonthRecords = async () => {
      try {
        const year = currentDate.value.getFullYear();
        const month = currentDate.value.getMonth() + 1;

        const res = await apiService.getRecords({
          start_date: `${year}-${String(month).padStart(2, '0')}-01`,
          end_date: `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
        });

        records.value = res.records || [];
      } catch (e) {
        console.error('加载日历工单失败', e);
      }
    };

    const prevMonth = () => {
      currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1);
      loadMonthRecords();
      selectedDay.value = null;
    };

    const nextMonth = () => {
      currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1);
      loadMonthRecords();
      selectedDay.value = null;
    };

    const goToToday = () => {
      currentDate.value = new Date();
      loadMonthRecords();
      selectedDay.value = null;
    };

    const selectDay = (day) => {
      if (day.isCurrentMonth) {
        selectedDay.value = day;
      }
    };

    const getStatusType = (status) => {
      const map = {
        pending: 'warning',
        in_progress: 'primary',
        completed: 'success',
        cancelled: 'info'
      };
      return map[status] || 'info';
    };

    const getStatusLabel = (status) => {
      const map = {
        pending: '待处理',
        in_progress: '处理中',
        completed: '已完成',
        cancelled: '已取消'
      };
      return map[status] || status;
    };

    const goToRecord = (record) => {
      router.push(`/records/${record.id}`);
    };

    onMounted(() => {
      loadMonthRecords();
    });

    return {
      currentYear,
      currentMonth,
      weekDays,
      calendarDays,
      selectedDay,
      prevMonth,
      nextMonth,
      goToToday,
      selectDay,
      getStatusType,
      getStatusLabel,
      goToRecord
    };
  }
};

window.CalendarView = CalendarView;
CalendarView;