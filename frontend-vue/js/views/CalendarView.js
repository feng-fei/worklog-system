const CalendarView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <div class="section-title" style="margin:0;">工单日历</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <el-button @click="prevMonth"><el-icon><ArrowLeft /></el-icon></el-button>
            <span style="font-weight:600;font-size:16px;min-width:120px;text-align:center;">
              {{ currentYear }}年{{ currentMonth }}月
            </span>
            <el-button @click="nextMonth"><el-icon><ArrowRight /></el-icon></el-button>
            <el-button type="primary" @click="goToToday" size="small">今天</el-button>
          </div>
        </div>

        <div class="calendar-grid">
          <div v-for="day in weekDays" :key="day" class="calendar-weekday">{{ day }}</div>
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            class="calendar-day"
            :class="{
              'other-month': !day.isCurrentMonth,
              'today': day.isToday,
              'selected': selectedDay && selectedDay.dateStr === day.dateStr
            }"
            @click="selectDay(day)"
          >
            <div class="calendar-day-num">{{ day.day }}</div>
            <div style="display:flex;flex-wrap:wrap;">
              <div v-for="(r, i) in (day.records || []).slice(0, 3)" :key="i" class="calendar-dot"></div>
            </div>
          </div>
        </div>

        <div v-if="selectedDay" style="margin-top:20px;">
          <div class="section-title" style="margin-bottom:12px;">
            {{ selectedDay.dateStr }} 的工单
            <el-tag size="small" style="margin-left:8px;">{{ (selectedDay.records || []).length }} 条</el-tag>
          </div>
          <el-table :data="selectedDay.records || []" size="small" stripe v-if="(selectedDay.records || []).length > 0">
            <el-table-column prop="order_no" label="工单号" width="160" />
            <el-table-column prop="customer_name" label="客户" />
            <el-table-column prop="type_label" label="类型" width="80" />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="goToRecord(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="当天没有工单" :image-size="80" />
        </div>
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
    const loading = ref(false);

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    const currentYear = computed(() => currentDate.value.getFullYear());
    const currentMonth = computed(() => currentDate.value.getMonth() + 1);

    const calendarDays = computed(() => {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();

      const days = [];
      const today = new Date();

      for (let i = firstDay - 1; i >= 0; i--) {
        days.push({
          day: daysInPrevMonth - i,
          isCurrentMonth: false,
        });
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        days.push({
          day: d,
          isCurrentMonth: true,
          isToday: date.toDateString() === today.toDateString(),
          dateStr: dateStr,
          records: records.value.filter(r => {
            const workDate = r.work_date || r.created_at;
            if (!workDate) return false;
            return workDate.substring(0, 10) === dateStr;
          }),
        });
      }

      const remaining = 42 - days.length;
      for (let d = 1; d <= remaining; d++) {
        days.push({
          day: d,
          isCurrentMonth: false,
        });
      }

      return days;
    });

    const loadMonthRecords = async () => {
      loading.value = true;
      try {
        const year = currentDate.value.getFullYear();
        const month = currentDate.value.getMonth() + 1;
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const res = await apiService.getRecords({
          start_date: startDate,
          end_date: endDate,
          per_page: 200,
        });
        const data = res && res.records ? res.records : [];
        records.value = Array.isArray(data) ? data : [];
      } catch (e) {
        records.value = [];
      } finally {
        loading.value = false;
      }
    };

    const prevMonth = () => {
      currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1);
      selectedDay.value = null;
      loadMonthRecords();
    };

    const nextMonth = () => {
      currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1);
      selectedDay.value = null;
      loadMonthRecords();
    };

    const goToToday = () => {
      currentDate.value = new Date();
      selectedDay.value = null;
      loadMonthRecords();
    };

    const selectDay = (day) => {
      if (!day.isCurrentMonth) return;
      selectedDay.value = day;
    };

    const getStatusType = (status) => {
      const map = {
        pending: 'warning',
        in_progress: 'primary',
        completed: 'success',
        cancelled: 'info',
      };
      return map[status] || 'info';
    };

    const getStatusLabel = (status) => {
      const map = {
        pending: '待处理',
        in_progress: '处理中',
        completed: '已完成',
        cancelled: '已取消',
      };
      return map[status] || status || '-';
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
      loading,
      prevMonth,
      nextMonth,
      goToToday,
      selectDay,
      getStatusType,
      getStatusLabel,
      goToRecord,
    };
  },
};

window.CalendarView = CalendarView;
CalendarView;
