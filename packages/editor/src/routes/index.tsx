/*
 * @Description: 路由定义
 * @Author: qingzi.wang
 * @Date: 2023-05-09 09:20:40
 * @LastEditTime: 2025-12-02 09:53:12
 */
import { createHashRouter, Outlet } from 'react-router-dom'
import Home from '@/pages/home'
import EditorUnit from '@/pages/editor'
import PreviewUnit from '@/pages/preview'
import ErrorPage from '@/pages/common/error'
import NoMatch from '@/pages/common/noMatch'

// 默认路由配置
const defaultRoute = {
  element: (
    <>
      <Outlet />
    </>
  ),
  errorElement: <ErrorPage />
}
// 系统路由配置
const systemRoutes = [
  {
    path: '/',
    element: <Home />
  },
  {
    ...defaultRoute,
    children: [
      {
        path: '/editor',
        element: <EditorUnit />
      }
    ]
  },
  {
    ...defaultRoute,
    children: [
      {
        path: '/preview',
        element: <PreviewUnit />
      }
    ]
  },
  {
    path: '*',
    element: <NoMatch />
  }
]

export const routes = createHashRouter(systemRoutes)
