const Validators = {
  required: (message = '此项为必填') => [
    { required: true, message, trigger: 'blur' }
  ],
  
  requiredSelect: (message = '请选择') => [
    { required: true, message, trigger: 'change' }
  ],
  
  name: (message = '请输入名称', min = 1, max = 100) => [
    { required: true, message, trigger: 'blur' },
    { min, max, message: `长度在 ${min} 到 ${max} 个字符`, trigger: 'blur' }
  ],
  
  phone: (required = false) => {
    const rules = []
    if (required) {
      rules.push({ required: true, message: '请输入手机号', trigger: 'blur' })
    }
    rules.push({
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号',
      trigger: 'blur'
    })
    return rules
  },
  
  email: (required = false) => {
    const rules = []
    if (required) {
      rules.push({ required: true, message: '请输入邮箱', trigger: 'blur' })
    }
    rules.push({ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' })
    return rules
  },
  
  amount: (required = true, min = 0, max = 99999999) => {
    const rules = []
    if (required) {
      rules.push({ required: true, message: '请输入金额', trigger: 'blur' })
    }
    rules.push({
      validator: (rule, value, callback) => {
        if (value === '' || value === null || value === undefined) {
          if (required) callback(new Error('请输入金额'))
          else callback()
          return
        }
        const num = parseFloat(value)
        if (isNaN(num)) {
          callback(new Error('请输入有效数字'))
        } else if (num < min) {
          callback(new Error(`金额不能小于 ${min}`))
        } else if (num > max) {
          callback(new Error(`金额不能大于 ${max}`))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    })
    return rules
  },
  
  number: (message = '请输入数字', required = false) => {
    const rules = []
    if (required) {
      rules.push({ required: true, message, trigger: 'blur' })
    }
    rules.push({ type: 'number', message, trigger: 'blur' })
    return rules
  },
  
  integer: (message = '请输入整数', required = false, min = null, max = null) => {
    const rules = []
    if (required) {
      rules.push({ required: true, message, trigger: 'blur' })
    }
    rules.push({
      validator: (rule, value, callback) => {
        if (value === '' || value === null || value === undefined) {
          if (required) callback(new Error(message))
          else callback()
          return
        }
        if (!Number.isInteger(Number(value))) {
          callback(new Error(message))
        } else if (min !== null && Number(value) < min) {
          callback(new Error(`不能小于 ${min}`))
        } else if (max !== null && Number(value) > max) {
          callback(new Error(`不能大于 ${max}`))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    })
    return rules
  },
  
  date: (message = '请选择日期', required = true) => {
    const rules = []
    if (required) {
      rules.push({ required: true, message, trigger: 'change' })
    }
    return rules
  },
  
  idCard: (required = false) => {
    const rules = []
    if (required) {
      rules.push({ required: true, message: '请输入身份证号', trigger: 'blur' })
    }
    rules.push({
      pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
      message: '请输入正确的身份证号',
      trigger: 'blur'
    })
    return rules
  },
  
  length: (min = 0, max = 500, message = null) => [{
    min, max,
    message: message || `长度在 ${min} 到 ${max} 个字符`,
    trigger: 'blur'
  }]
}

window.Validators = Validators
