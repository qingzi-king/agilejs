/*
 * @Description: 基于XML的SVG预览（面板用），将 xml 包裹成完整 <svg> 文本，生成 Blob URL，使用 <img> 展示
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-10-12 15:10:39
 */
import React, { useEffect, useMemo, useState } from 'react'

type ViewBox = { x: number; y: number; width: number; height: number }

export interface SvgXmlPreviewProps {
  xml: string
  viewBox?: ViewBox
  className?: string
  style?: React.CSSProperties
  alt?: string
}

function ensureSvgWrapped(xml: string, viewBox?: ViewBox) {
  if (!xml) return ''
  if (xml.includes('<svg')) return xml
  const vb = viewBox ?? { x: 0, y: 0, width: 100, height: 100 }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}">${xml}</svg>`
}

export const SvgXmlPreview: React.FC<SvgXmlPreviewProps> = ({ xml, viewBox, className, style, alt }) => {
  const [url, setUrl] = useState<string | null>(null)
  const svgText = useMemo(() => ensureSvgWrapped(xml, viewBox), [xml, viewBox])

  useEffect(() => {
    if (typeof window === 'undefined') return // SSR 保护
    try {
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
      const objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
      return () => {
        URL.revokeObjectURL(objectUrl)
      }
    } catch {
      setUrl(null)
    }
  }, [svgText])

  if (!url) return null

  return (
    <img
      src={url}
      alt={alt || 'svg-preview'}
      className={className || 'w-full h-full object-contain'}
      style={style}
      draggable={false}
    />
  )
}

export default SvgXmlPreview
