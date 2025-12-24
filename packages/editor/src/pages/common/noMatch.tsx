/*
 * @Description: 404页面
 * @Author: qingzi.wang
 * @Date: 2023-05-09 09:20:40
 * @LastEditTime: 2025-12-02 10:01:01
 */
import { ReactNode } from 'react'
interface IProps {
  title?: ReactNode
}

export default function NoMatch({ title }: IProps) {
  return <center>{title || '当前访问的内容不存在！'}</center>
}
