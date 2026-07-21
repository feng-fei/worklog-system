import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function parseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null
  let d: Date
  if (typeof date === 'string') {
    let str = date.trim()
    if (!str) return null
    
    if (str.endsWith('Z')) {
      str = str.slice(0, -1)
    }
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      str = str + 'T00:00:00'
    }
    
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str) && !str.includes('+') && !str.includes('-', 10)) {
      const parts = str.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
      if (parts) {
        d = new Date(
          parseInt(parts[1]),
          parseInt(parts[2]) - 1,
          parseInt(parts[3]),
          parseInt(parts[4]),
          parseInt(parts[5]),
          parseInt(parts[6])
        )
        if (!isNaN(d.getTime())) {
          return d
        }
      }
    }
    
    d = new Date(str)
    if (isNaN(d.getTime())) {
      d = new Date(date)
    }
  } else {
    d = date
  }
  if (isNaN(d.getTime())) return null
  return d
}

export function formatDate(date: Date | string | null | undefined, format: string = 'YYYY-MM-DD'): string {
  const d = parseDate(date)
  if (!d) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm')
}

export function relativeTime(date: Date | string | null | undefined): string {
  const d = parseDate(date)
  if (!d) return ''

  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return formatDate(date, 'MM-DD')
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '¥0'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '¥0'
  return '¥' + num.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
