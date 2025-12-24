/*
 * @Description: 面板基础图形
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-11-22 23:01:12
 */
import type { PaletteItem } from '@/types'

export const BasicItems: PaletteItem[] = [
  {
    key: 'line',
    label: '直线',
    shape: 'line',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <line x1="6" y1="34" x2="34" y2="6" stroke="black" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    key: 'rect',
    label: '直角矩形',
    shape: 'rect',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect x="3" y="8" width="34" height="24" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'rounded-rect',
    label: '圆角矩形',
    shape: 'rounded-rect',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect x="3" y="8" width="34" height="24" fill="white" stroke="black" strokeWidth="2" rx="3" />
      </svg>
    )
  },
  {
    key: 'text',
    label: '文本',
    shape: 'text',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <text x="20" y="20" textAnchor="middle" dominantBaseline="central" fontSize="32" fill="black">
          T
        </text>
      </svg>
    )
  },
  {
    key: 'circle',
    label: '圆形',
    shape: 'circle',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="17" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'ellipse',
    label: '椭圆',
    shape: 'ellipse',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <ellipse cx="20" cy="20" rx="18" ry="12" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'diamond',
    label: '菱形',
    shape: 'diamond',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M20 3 L37 20 L20 37 L3 20 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'triangle',
    label: '三角形',
    shape: 'triangle',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M20 3 L37 36 L3 36 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'right-triangle',
    label: '直角三角形',
    shape: 'right-triangle',
    payload: { orientation: 'bl' }, // 直角位于左下：'bl' | 'br' | 'tl' | 'tr'
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M4 36 L4 4 L36 36 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'semicircle',
    label: '半圆',
    shape: 'semicircle',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M4 30 A16 16 0 0 1 36 30 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'cylinder',
    label: '圆柱',
    shape: 'cylinder',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path
          d="M5 10 A15 5 0 0 1 35 10 A15 5 0 0 1 5 10 Z M5 10 L5 30 A15 5 0 0 0 35 30 L35 10"
          fill="white"
          stroke="black"
          strokeWidth="2"
        />
      </svg>
    )
  },
  {
    key: 'trapezoid',
    label: '梯形',
    shape: 'trapezoid',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M10 8 L30 8 L36 32 L4 32 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'right-arrow',
    label: '箭头',
    shape: 'right-arrow',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M3 14 L23 14 L23 6 L37 20 L23 34 L23 26 L3 26 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'double-arrow',
    label: '左右双箭头',
    shape: 'double-arrow',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path
          d="M17 14 L23 14 L23 6 L37 20 L23 34 L23 26 L17 26 L17 34 L3 20 L17 6 Z"
          fill="white"
          stroke="black"
          strokeWidth="2"
        />
      </svg>
    )
  },
  {
    key: 'corner',
    label: '拐角',
    shape: 'corner',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M4 4 H36 L30 10 H10 V30 L4 36 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'cross',
    label: '十字形',
    shape: 'cross',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M16 6 H24 V16 H34 V24 H24 V34 H16 V24 H6 V16 H16 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'sector',
    label: '扇形',
    shape: 'sector',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M20 32 L3 15 A24 24 0 0 1 37 15 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'parallelogram',
    label: '平行四边形',
    shape: 'parallelogram',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M8 8 L36 8 L32 32 L4 32 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'pentagon',
    label: '五边形',
    shape: 'pentagon',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M20 3 L36 15 L30 36 L10 36 L4 15 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'hexagon',
    label: '六边形',
    shape: 'hexagon',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M10 3 L30 3 L38 20 L30 37 L10 37 L2 20 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'octagon',
    label: '八边形',
    shape: 'octagon',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path d="M13 3 L27 3 L37 13 L37 27 L27 37 L13 37 L3 27 L3 13 Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    )
  },
  {
    key: 'star',
    label: '星形',
    shape: 'star',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path
          d="M20 2 L24.5 14 H37.5 L27 22 L31 35 L20 27 L9 35 L13 22 L2.5 14 H15.5 Z"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth={2}
        />
      </svg>
    )
  },
  {
    key: 'cloud',
    label: '云朵',
    shape: 'cloud',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <path
          d="M10 30 C5 30,3 25,5 21 C6 16,11 14,15 16 C16 10,21 9,26 13 C29 12,33 14,34 18 C37 18,39 21,38.5 25 C38.5 29,35 32,31.5 32 L12 32 C11.5 32,10.5 31,10 30 Z"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth={2}
        />
      </svg>
    )
  },
  {
    key: 'image',
    label: '图片',
    shape: 'image',
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect x="4" y="8" width="32" height="24" fill="white" stroke="black" strokeWidth="2" rx="2" />
        <circle cx="13" cy="16" r="3" fill="black" opacity="0.3" />
        <path d="M 4 28 L 14 20 L 20 24 L 28 16 L 36 24 L 36 32 L 4 32 Z" fill="black" opacity="0.3" />
      </svg>
    )
  }
]
