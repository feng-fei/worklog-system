// This file uses ES module syntax, not compatible with IIFE scripts
// See migration notes
// =============================================
// usePermission.js - 权限控制 Composable
// =============================================
// 使用方式：
// import { usePermission } from './composables/usePermission'
// const { isAdmin, can } = usePermission()

// export function usePermission() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const isAdmin = computed(() => {
    return user.role === 'admin' || user.is_admin === true;
  });

  const isStaff = computed(() => {
    return user.role === 'staff' || user.role === 'technician';
  });

  /**
   * 检查当前用户是否有权限执行某个操作
   * @param {string} action - 操作名称，如 'delete_record', 'export_excel', 'manage_user'
   */
  const can = (action) => {
    if (isAdmin.value) return true;

    // 这里可以根据实际业务扩展权限表
    const permissionMap = {
      'delete_record': false,
      'export_excel': true,
      'manage_user': false,
      'view_finance': isAdmin.value,
      'edit_salary': isAdmin.value,
    };

    return permissionMap[action] ?? false;
  };

  /**
   * v-permission 指令支持
   * 用法：<el-button v-permission="'delete_record'">删除</el-button>
   */
  const permissionDirective = {
    mounted(el, binding) {
      const action = binding.value;
      if (!can(action)) {
        el.style.display = 'none';
        // 或者 el.parentNode?.removeChild(el);
      }
    }
  };

  return {
    user,
    isAdmin,
    isStaff,
    can,
    permissionDirective
  };
}