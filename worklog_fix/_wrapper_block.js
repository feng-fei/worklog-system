
// 恢复 inline 函数（比 app.min.js 的版本功能更完整）
if (typeof _inlineLoadDashboard === 'function') window.loadDashboard = _inlineLoadDashboard;
if (typeof _inlineShowCustomerDropdown === 'function') window.showCustomerDropdown = _inlineShowCustomerDropdown;
// 兼容 apiFetch 返回 Response 对象的情况
(function(){
    var _orig = apiFetch;
    apiFetch = function(url, options) {
        return _orig(url, options).then(function(resp) {
            if (resp && typeof resp.json === 'function') {
                return resp.json().then(function(data) {
                    if (data && typeof data === 'object') data.json = function() { return this; };
                    return data;
                });
            }
            return resp;
        });
    };
})();
// 让 app.min.js 的 switchTab 也能加载 index.html 中定义的页面数据
(function(){
    var origSwitchTab = window.switchTab;
    if (typeof origSwitchTab !== 'function') return;
    window.switchTab = function(tabId) {
        origSwitchTab.apply(this, arguments);
        setTimeout(function() {
            if (tabId === 'tab-payments') { loadPayments(); loadPaymentStats(); }
            if (tabId === 'tab-expenses') { loadExpenses(); loadExpenseCategories(); }
            if (tabId === 'tab-templates') { loadTemplates(); }
            if (tabId === 'tab-projects') { loadProjects(); }
            if (tabId === 'tab-materials') { loadMaterials(); }
            if (tabId === 'tab-equipments') { loadEquipments(); }
            if (tabId === 'tab-maintenance') { loadMaintenancePlans(); }
            if (tabId === 'tab-advanced-stats') { loadAdvancedStats(); }
            if (tabId === 'tab-notifications') { loadNotifySettings(); }
        }, 50);
    };
})();
