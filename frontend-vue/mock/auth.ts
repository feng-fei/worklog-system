import type { MockMethod } from 'vite-plugin-mock'

const adminUser = {
  id: 1,
  username: 'admin',
  name: '张工程师',
  role: 'engineer',
  department: '工程部',
  phone: '13800138000',
  email: 'admin@ruiyi.com',
  avatar: '',
}

const token = 'mock-jwt-token-' + Date.now()

export default [
  {
    url: '/api/auth/login',
    method: 'post',
    response: ({ body }: any) => {
      const { username, password } = body
      if (username === 'admin' && password === '123456') {
        return {
          code: 200,
          message: '登录成功',
          data: {
            token,
            user: adminUser,
          },
        }
      }
      return {
        code: 401,
        message: '用户名或密码错误',
        data: null,
      }
    },
  },
  {
    url: '/api/auth/info',
    method: 'get',
    response: ({ headers }: any) => {
      const authHeader = headers.authorization || headers.Authorization
      if (!authHeader) {
        return {
          code: 401,
          message: '未登录',
          data: null,
        }
      }
      return {
        code: 200,
        message: 'success',
        data: adminUser,
      }
    },
  },
  {
    url: '/api/auth/logout',
    method: 'post',
    response: () => {
      return {
        code: 200,
        message: '退出成功',
        data: null,
      }
    },
  },
] as MockMethod[]
