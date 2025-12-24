/*
 * @Description: 访问错误页面
 * @Author: qingzi.wang
 * @Date: 2023-05-09 09:20:40
 * @LastEditTime: 2025-04-25 14:02:57
 */
import { useRouteError } from 'react-router-dom'

export default function ErrorPage() {
  const error: any = useRouteError()
  return (
    <div className="d-error-page">
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error.statusText || error.message}</i>
      </p>
    </div>
  )
}
