import { reactive, computed, type Ref } from 'vue'

export interface ValidationRule {
  required?: boolean
  message?: string
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  validator?: (value: any) => boolean | string
}

export interface ValidationRules {
  [field: string]: ValidationRule | ValidationRule[]
}

export interface ValidationErrors {
  [field: string]: string
}

export function useFormValidation<T extends Record<string, any>>(
  form: T,
  rules: ValidationRules
) {
  const errors = reactive<ValidationErrors>({})

  const validateField = (field: string, value: any): string => {
    const fieldRules = rules[field]
    if (!fieldRules) return ''

    const ruleList = Array.isArray(fieldRules) ? fieldRules : [fieldRules]

    for (const rule of ruleList) {
      if (rule.required) {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          return rule.message || '此字段为必填项'
        }
      }

      if (value === undefined || value === null || value === '') continue

      if (rule.minLength !== undefined && String(value).length < rule.minLength) {
        return rule.message || `最少需要 ${rule.minLength} 个字符`
      }

      if (rule.maxLength !== undefined && String(value).length > rule.maxLength) {
        return rule.message || `最多允许 ${rule.maxLength} 个字符`
      }

      if (rule.min !== undefined && Number(value) < rule.min) {
        return rule.message || `最小值为 ${rule.min}`
      }

      if (rule.max !== undefined && Number(value) > rule.max) {
        return rule.message || `最大值为 ${rule.max}`
      }

      if (rule.pattern && !rule.pattern.test(String(value))) {
        return rule.message || '格式不正确'
      }

      if (rule.validator) {
        const result = rule.validator(value)
        if (result !== true) {
          return typeof result === 'string' ? result : rule.message || '验证失败'
        }
      }
    }

    return ''
  }

  const validate = (): boolean => {
    let isValid = true
    for (const field of Object.keys(rules)) {
      const error = validateField(field, (form as any)[field])
      errors[field as keyof typeof errors] = error
      if (error) isValid = false
    }
    return isValid
  }

  const validateFieldReactive = (field: string) => {
    errors[field as keyof typeof errors] = validateField(field, (form as any)[field])
  }

  const clearErrors = () => {
    for (const field of Object.keys(errors)) {
      delete errors[field as keyof typeof errors]
    }
  }

  const setError = (field: string, message: string) => {
    errors[field as keyof typeof errors] = message
  }

  const isValid = computed(() => {
    return Object.values(errors).every((e) => !e)
  })

  return {
    errors,
    validate,
    validateField: validateFieldReactive,
    clearErrors,
    setError,
    isValid,
  }
}

export const validators = {
  phone: (value: string): boolean | string => {
    if (!/^1[3-9]\d{9}$/.test(value)) {
      return '请输入正确的手机号'
    }
    return true
  },

  email: (value: string): boolean | string => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return '请输入正确的邮箱地址'
    }
    return true
  },

  required: (message = '此字段为必填项'): ValidationRule => ({
    required: true,
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || `最少需要 ${min} 个字符`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || `最多允许 ${max} 个字符`,
  }),

  pattern: (regex: RegExp, message = '格式不正确'): ValidationRule => ({
    pattern: regex,
    message,
  }),
}
