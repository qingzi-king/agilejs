/*
 * @Description: 未来图形示例（SVG）
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-10-12 00:33:02
 */
import type { PaletteItem } from '@/types'

export const FutureItems: PaletteItem[] = [
  {
    key: 'svg-star',
    label: 'SVG 星形',
    shape: 'svg',
    disabled: false,
    payload: {
      svgPath: 'M50 8 L61 38 H92 L66 56 L76 86 L50 68 L24 86 L34 56 L8 38 H39 Z',
      viewBox: { x: 8, y: 8, width: 84, height: 78 },
      fit: 'stretch',
      style: { fill: '#ffffff', stroke: '#000000', lineWidth: 2 }
    },
    preview: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path
          d="M50 8 L61 38 H92 L66 56 L76 86 L50 68 L24 86 L34 56 L8 38 H39 Z"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth={2}
        />
      </svg>
    )
  }
]
