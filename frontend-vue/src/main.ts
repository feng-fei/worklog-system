import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import permission from './directives/permission'
import './style.css'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.directive('permission', permission)

app.mount('#app')
