/*
 * @Description:
 * @Author: qingzi.wang
 * @Date: 2025-04-28 16:47:21
 * @LastEditTime: 2025-04-29 09:29:22
 */

/**
 * 节流函数
 * @param func 函数体
 * @param limit 限制时间ms
 * @returns function
 */
export function throttle(func: (...args: any[]) => void, limit: number) {
  let lastCall = 0

  return function (...args: any[]) {
    const now = Date.now()

    if (now - lastCall >= limit) {
      lastCall = now
      func(...args)
    }
  }
}
/**
 * 随机生成字符串
 * @param length 长度
 * @returns string
 */
export function generateRandomCode(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
