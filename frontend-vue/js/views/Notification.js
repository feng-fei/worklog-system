const NotificationView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <div class="section-title" style="margin:0;">消息中心</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleMarkAllRead" v-if="unreadCount > 0">
              <el-icon style="margin-right:4px;"><Check /></el-icon>
              全部已读
            </el-button>
            <el-button @click="handleClearRead">
              <el-icon style="margin-right:4px;"><Delete /></el-icon>
              清除已读
            </el-button>
            <el-button @click="loadData">
              <el-icon style="margin-right:4px;"><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <div class="filter-bar" style="margin-bottom:16px;flex-wrap:wrap;gap:8px;">
          <el-radio-group v-model="filterType" @change="handleFilterChange">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="unread">未读</el-radio-button>
            <el-radio-button label="read">已读</el-radio-button>
          </el-radio-group>
          <span style="margin-left:16px;color:#909399;font-size:14px;">
            未读消息：<span style="color:#f56c6c;font-weight:bold;">{{ unreadCount }}</span> 条
          </span>
        </div>

        <div v-if="notifications.length === 0 && !loading" style="padding:60px;text-align:center;color:#909399;">
          <el-icon style="font-size:64px;margin-bottom:16px;"><Bell /></el-icon>
          <div>暂无消息</div>
        </div>

        <div v-else class="notification-list" v-loading="loading">
          <div
            v-for="item in notifications"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.is_read }"
            @click="handleRead(item)"
          >
            <div class="notification-content">
              <div class="notification-title">
                <span>{{ item.title }}</span>
                <span class="notification-time">{{ formatDateTime(item.created_at) }}</span>
              </div>
              <div class="notification-message">{{ item.content || item.message }}</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
              <el-button v-if="!item.is_read" link type="primary" size="small" @click.stop="handleRead(item)">
                标记已读
              </el-button>
              <el-button link type="danger" size="small" @click.stop="handleDelete(item)">
                删除
              </el-button>
            </div>
          </div>
        </div>

        <div class="pagination-bar" v-if="pagination.total > 0">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.per_page"
            :page-sizes="[10, 20, 50]"
            :total="pagination.total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </div>
  `,

  setup() {
    const { ref, reactive, onMounted } = Vue;

    const notifications = ref([]);
    const loading = ref(false);
    const filterType = ref('all');
    const unreadCount = ref(0);

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '-';
      return dayjs(dateStr).fromNow();
    };

    const loadData = () => {
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
      };
      if (filterType.value === 'unread') {
        params.is_read = '0';
      } else if (filterType.value === 'read') {
        params.is_read = '1';
      }

      apiService.getNotifications(params)
        .then((res) => {
          const data = res && res.records ? res.records : [];
          notifications.value = Array.isArray(data) ? data : [];
          pagination.total = (res && res.total) || 0;
        })
        .catch(() => {
          notifications.value = [];
          pagination.total = 0;
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const loadUnreadCount = () => {
      apiService.getUnreadNotificationCount()
        .then((res) => {
          unreadCount.value = (res && (res.unread_count != null ? res.unread_count : res.count)) || 0;
        })
        .catch(() => {});
    };

    const handleRead = async (item) => {
      if (item.is_read) return;
      try {
        await apiService.markNotificationRead(item.id);
        item.is_read = true;
        loadUnreadCount();
      } catch (e) {}
    };

    const handleDelete = async (item) => {
      try {
        await apiService.deleteNotification(item.id);
        ElementPlus.ElMessage.success('已删除');
        loadData();
        loadUnreadCount();
      } catch (e) {}
    };

    const handleMarkAllRead = async () => {
      try {
        await apiService.markAllNotificationsRead();
        ElementPlus.ElMessage.success('已全部标记为已读');
        loadData();
        loadUnreadCount();
      } catch (e) {}
    };

    const handleClearRead = async () => {
      try {
        await ElementPlus.ElMessageBox.confirm('确定要清除所有已读消息吗？', '提示', { type: 'warning' });
        await apiService.clearReadNotifications();
        ElementPlus.ElMessage.success('清除成功');
        loadData();
        loadUnreadCount();
      } catch (e) {}
    };

    const handleFilterChange = () => {
      pagination.page = 1;
      loadData();
    };

    const handlePageChange = (page) => {
      pagination.page = page;
      loadData();
    };

    const handleSizeChange = (size) => {
      pagination.per_page = size;
      pagination.page = 1;
      loadData();
    };

    onMounted(() => {
      loadData();
      loadUnreadCount();
    });

    return {
      notifications,
      loading,
      filterType,
      unreadCount,
      pagination,
      formatDateTime,
      loadData,
      handleRead,
      handleDelete,
      handleMarkAllRead,
      handleClearRead,
      handleFilterChange,
      handlePageChange,
      handleSizeChange,
    };
  },
};

window.NotificationView = NotificationView;
NotificationView;
