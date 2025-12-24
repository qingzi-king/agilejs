/*
 * @Description: 首页（也可能是过渡页）
 * @Author: qingzi.wang
 * @Date: 2023-05-09 09:20:40
 * @LastEditTime: 2025-10-20 20:36:50
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/editor')
  }, [navigate])
  return <>loading</>
}
