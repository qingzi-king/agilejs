/*
 * @Description: 应用入口
 * @Author: qingzi.wang
 * @Date: 2023-05-09 09:20:40
 * @LastEditTime: 2025-04-25 14:21:57
 */
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { routes } from '@/routes'

let timer: NodeJS.Timeout | null = null

export default function Main() {
  useEffect(() => {
    // 确保localStorage的操作在客户端执行
    handleRemoveAppLoadingMask()
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [])
  /**
   * 移除页面加载遮罩
   */
  const handleRemoveAppLoadingMask = () => {
    const appLoadingMask = document.getElementById('d-app-loading-mask')
    if (appLoadingMask) {
      timer = setTimeout(() => {
        appLoadingMask.remove()
      }, 150)
    }
  }
  return <RouterProvider router={routes} />
}
