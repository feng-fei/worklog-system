    // ========== 站内通知 ==========
    let _notifyPage = 1;
    let _notifyPerPage = 20;
    let _notifyTimer = null;

    function startNotifyPolling() {
        refreshUnreadCount();
        if (_notifyTimer) clearInterval(_notifyTimer);
        _notifyTimer = setInterval(refreshUnreadCount, 60000);
    }

    function stopNotifyPolling() {
        if (_notifyTimer) {
            clearInterval(_notifyTimer);
            _notifyTimer = null;
        }
    }

    function refreshUnreadCount() {
        apiFetch('/api/notifications/unread-count')
            .then(function(data) {
                const badge = document.getElementById('notifyBadge');
                if (badge) {
                    const count = data.unread_count || 0;
                    if (count > 0) {
                        badge.textContent = count > 99 ? '99+' : count;
                        badge.classList.remove('d-none');
                    } else {
                        badge.classList.add('d-none');
                    }
                }
            })
            .catch(function() {});
    }

    function loadNotifications() {
        const filterEl = document.getElementById('notifyFilter');
        const filter = filterEl ? filterEl.value : '';
        const container = document.getElementById('notifyListContainer');
        const pageList = document.getElementById('notifyPageList');

        let url = '/api/notifications?page=' + _notifyPage + '&per_page=' + _notifyPerPage;
        if (filter !== '') url += '&is_read=' + filter;

        apiFetch(url).then(function(data) {
            const records = data.records || [];
            
            // 下拉通知列表
            if (container) {
                if (records.length === 0) {
                    container.innerHTML = '<div class="text-center text-muted py-4 small">暂无通知</div>';
                } else {
                    let html = '';
                    records.slice(0, 8).forEach(function(n) {
                        const iconClass = n.notify_type === 'warning' ? 'bi-exclamation-triangle text-warning' :
                                         n.notify_type === 'success' ? 'bi-check-circle text-success' :
                                         n.notify_type === 'danger' ? 'bi-x-circle text-danger' :
                                         'bi-info-circle text-primary';
                        const readClass = n.is_read ? 'opacity-60' : '';
                        html += '<li><a class="dropdown-item ' + readClass + '" href="#" onclick="handleNotifyClick(' + n.id + ', \'' + (n.related_type || '') + '\', ' + (n.related_id || 0) + ');return false;">' +
                                '<div class="d-flex gap-2">' +
                                '<i class="bi ' + iconClass + ' mt-1"></i>' +
                                '<div class="flex-1 min-w-0">' +
                                '<div class="fw-medium small text-truncate">' + (n.title || '') + '</div>' +
                                '<div class="text-muted small text-truncate" style="max-width:280px;">' + (n.content || '') + '</div>' +
                                '<div class="text-muted is-11 mt-1">' + formatNotifyTime(n.created_at) + '</div>' +
                                '</div></div></a></li>';
                    });
                    container.innerHTML = html;
                }
            }
            
            // 消息中心页面列表
            if (pageList) {
                if (records.length === 0) {
                    pageList.innerHTML = '<div class="card"><div class="card-body text-center text-muted py-5">暂无通知消息</div></div>';
                } else {
                    let html = '<div class="card"><div class="list-group list-group-flush">';
                    records.forEach(function(n) {
                        const iconClass = n.notify_type === 'warning' ? 'bi-exclamation-triangle text-warning' :
                                         n.notify_type === 'success' ? 'bi-check-circle text-success' :
                                         n.notify_type === 'danger' ? 'bi-x-circle text-danger' :
                                         'bi-info-circle text-primary';
                        const readClass = n.is_read ? 'bg-transparent' : 'list-group-item-light';
                        html += '<div class="list-group-item ' + readClass + ' px-3 py-3">' +
                                '<div class="d-flex gap-3 align-items-start">' +
                                '<i class="bi ' + iconClass + ' fs-5 mt-1"></i>' +
                                '<div class="flex-grow-1 min-w-0">' +
                                '<div class="d-flex align-items-center justify-content-between mb-1">' +
                                '<h6 class="mb-0 fw-medium">' + (n.title || '') + '</h6>' +
                                '<small class="text-muted text-nowrap">' + formatNotifyTime(n.created_at) + '</small>' +
                                '</div>' +
                                '<p class="mb-2 small text-muted">' + (n.content || '') + '</p>' +
                                '<div class="d-flex gap-2">' +
                                (!n.is_read ? '<button class="btn btn-sm btn-outline-primary" onclick="markOneRead(' + n.id + ')">标记已读</button>' : '') +
                                '<button class="btn btn-sm btn-outline-danger" onclick="deleteOneNotify(' + n.id + ')">删除</button>' +
                                (n.related_id ? '<button class="btn btn-sm btn-outline-secondary" onclick="handleNotifyClick(' + n.id + ', \'' + (n.related_type || '') + '\', ' + n.related_id + ')">查看详情</button>' : '') +
                                '</div></div></div></div>';
                    });
                    html += '</div></div>';
                    pageList.innerHTML = html;
                }
                
                // 分页
                const nav = document.getElementById('notifyPageNav');
                if (nav && data.pages > 1) {
                    nav.innerHTML = _renderSimplePagination(_notifyPage, data.pages, function(p) {
                        _notifyPage = p;
                        loadNotifications();
                    });
                }
            }
        }).catch(function(err) {
            console.error('加载通知失败:', err);
        });
    }

    function formatNotifyTime(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        const now = new Date();
        const diff = (now - d) / 1000;
        if (diff < 60) return '刚刚';
        if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
        if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
        if (diff < 604800) return Math.floor(diff / 86400) + '天前';
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function markOneRead(id) {
        apiFetch('/api/notifications/' + id + '/read', { method: 'POST' })
            .then(function() {
                refreshUnreadCount();
                loadNotifications();
            });
    }

    function markAllRead(event) {
        if (event) event.stopPropagation();
        apiFetch('/api/notifications/read-all', { method: 'POST' })
            .then(function() {
                refreshUnreadCount();
                loadNotifications();
            });
    }

    function deleteOneNotify(id) {
        if (!confirm('确定删除这条通知吗？')) return;
        apiFetch('/api/notifications/' + id, { method: 'DELETE' })
            .then(function() {
                refreshUnreadCount();
                loadNotifications();
            });
    }

    function clearReadNotifs(event) {
        if (event) event.stopPropagation();
        if (!confirm('确定清除所有已读通知吗？')) return;
        apiFetch('/api/notifications/clear-read', { method: 'POST' })
            .then(function() {
                refreshUnreadCount();
                loadNotifications();
            });
    }

    function handleNotifyClick(id, relatedType, relatedId) {
        apiFetch('/api/notifications/' + id + '/read', { method: 'POST' }).catch(function(){});
        refreshUnreadCount();
        
        if (relatedType === 'work_record' && relatedId) {
            loadRecordDetail(relatedId);
        } else if (relatedType === 'pending' && relatedId) {
            switchTab('tab-pending');
        } else if (relatedType === 'payment' && relatedId) {
            switchTab('tab-payments');
        }
    }

    // ========== 通知设置（保留兼容） ==========
    function loadNotifySettings() {
        loadNotifications();
    }

    function saveNotifySettings() {
        alert('站内通知无需配置Webhook，通知将直接显示在顶部铃铛中。');
    }

    function testNotification() {
        alert('站内通知模式下，通知将在相关事件触发时自动显示。');
    }
