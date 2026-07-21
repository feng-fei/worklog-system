/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    public?: boolean
    showHeader?: boolean
    showNav?: boolean
    showSidebar?: boolean
    layout?: 'default' | 'full' | 'empty'
  }
}

export {}
