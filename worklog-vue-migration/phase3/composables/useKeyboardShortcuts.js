// This file uses ES module syntax, not compatible with IIFE scripts
// See migration notes
// =============================================
// useKeyboardShortcuts.js - 全局快捷键 Composable
// =============================================
// 使用示例：
// import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
// useKeyboardShortcuts({
//   'ctrl+k': () => router.push('/records'),
//   'ctrl+n': () => showCreateDialog.value = true
// })

// export function useKeyboardShortcuts(shortcuts = {}) {
  const handleKeydown = (e) => {
    const key = [];
    if (e.ctrlKey || e.metaKey) key.push('ctrl');
    if (e.altKey) key.push('alt');
    if (e.shiftKey) key.push('shift');
    key.push(e.key.toLowerCase());

    const combo = key.join('+');

    if (shortcuts[combo]) {
      e.preventDefault();
      shortcuts[combo]();
    }
  };

  const register = () => {
    document.addEventListener('keydown', handleKeydown);
  };

  const unregister = () => {
    document.removeEventListener('keydown', handleKeydown);
  };

  // 自动注册（可选）
  // onMounted(register);
  // onUnmounted(unregister);

  return {
    register,
    unregister
  };
}