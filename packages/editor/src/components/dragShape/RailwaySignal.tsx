/*
 * @Description: 面板 Railway Signal 图形
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-11-13 10:27:29
 */
import type { PaletteItem } from '@/types'

// 提示：请将每个条目的 payload.xml 替换为对应 SVG 的完整字符串（去除 <script> 标签），
// 并根据 SVG 的 width/height 或 viewBox 替换默认的 viewBox 宽高；fit 可按需改为 'stretch' 或 'cover'。
// 若需要预览 JSX，可在 Palette 中另建或扩展生成预览；本文件仅以 xml 渲染器为主。

export const RailwaySignalItems: PaletteItem[] = [
  {
    key: 'railway-sighnal-endInsulation',
    label: '尽头线钢轨绝缘',
    shape: 'svg',
    payload: {
      paths: [{ d: 'M0 0 H8 V18 H0 V16 H6 V2 H0 Z' }],
      viewBox: { x: 0, y: 0, width: 8, height: 18 },
      fit: 'stretch',
      style: { fill: '#B8B8B8', stroke: 'transparent' }
    },
    preview: (
      <svg viewBox="0 0 8 18" className="w-full h-full">
        <path d="M0 0 H8 V18 H0 V16 H6 V2 H0 Z" fill="#B8B8B8" stroke="transparent" strokeWidth={0} />
      </svg>
    )
  },
  {
    key: 'railway-sighnal-axleCounter',
    label: '计轴',
    shape: 'svg',
    payload: {
      paths: [
        {
          d: 'M49,0 C54.5228475,0 59,4.4771525 59,10 C59,15.5228475 54.5228475,20 49,20 C45.2989953,20 42.0675799,17.9894491 40.3383925,15.0009861 L18.6616075,15.0009861 C16.9324201,17.9894491 13.7010047,20 10,20 C4.4771525,20 0,15.5228475 0,10 C0,4.4771525 4.4771525,0 10,0 C13.7014171,0 16.9331402,2.01099892 18.6621855,5.00001287 L40.3378145,5.00001287 C42.0668598,2.01099892 45.2985829,0 49,0 Z'
        }
      ],
      viewBox: { x: 0, y: 0, width: 59, height: 20 },
      fit: 'stretch',
      style: { fill: '#B8B8B8', stroke: 'transparent', strokeWidth: 0 }
    },
    preview: (
      <svg viewBox="0 0 59 20" className="w-full h-full">
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <path
            fill="#B8B8B8"
            d="M49,0 C54.5228475,0 59,4.4771525 59,10 C59,15.5228475 54.5228475,20 49,20 C45.2989953,20 42.0675799,17.9894491 40.3383925,15.0009861 L18.6616075,15.0009861 C16.9324201,17.9894491 13.7010047,20 10,20 C4.4771525,20 0,15.5228475 0,10 C0,4.4771525 4.4771525,0 10,0 C13.7014171,0 16.9331402,2.01099892 18.6621855,5.00001287 L40.3378145,5.00001287 C42.0668598,2.01099892 45.2985829,0 49,0 Z"
          ></path>
        </g>
      </svg>
    )
  },
  {
    key: 'railway-sighnal-insulatedOverlap',
    label: '绝缘锚段关节',
    shape: 'svg',
    payload: {
      paths: [
        {
          d: 'M31.338261,0.149071939 C31.7076747,0.137063346 32.0570884,0.230688462 32.3710057,0.425795047 C32.684923,0.620901633 32.9517489,0.897406309 33.248748,1.41182386 L33.4327965,1.73060532 C33.7297956,2.24502288 33.8358428,2.61435316 33.8478514,2.98376684 C33.85986,3.35318052 33.7662349,3.70259421 33.5711283,4.01651154 C33.3760217,4.33042888 33.099517,4.59725471 32.5850995,4.89425382 L22.7400386,10.5783024 C22.225621,10.8753015 21.8562907,10.9813487 21.4868771,10.9933572 C21.4053584,10.9960072 21.3248136,10.9935132 21.2454093,10.9859201 C21.1652548,10.9949171 21.083221,11 21,11 L2,11 C0.8954305,11 6.76353751e-17,10.1045695 0,9 L0,8 C-1.3527075e-16,6.8954305 0.8954305,6 2,6 L20.671,5.99904731 L30.0850995,0.564126801 C30.599517,0.267127689 30.9688473,0.161080531 31.338261,0.149071939 Z M57,6 C58.1045695,6 59,6.8954305 59,8 L59,9 C59,10.1045695 58.1045695,11 57,11 L33,11 C31.8954305,11 31,10.1045695 31,9 L31,8 C31,6.8954305 31.8954305,6 33,6 L57,6 Z'
        }
      ],
      viewBox: { x: 0, y: 0, width: 59, height: 11 },
      fit: 'stretch',
      style: { fill: '#B8B8B8', stroke: 'transparent', strokeWidth: 0 }
    },
    preview: (
      <svg viewBox="0 0 59 11" className="w-full h-full">
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <path
            fill="#B8B8B8"
            d="M31.338261,0.149071939 C31.7076747,0.137063346 32.0570884,0.230688462 32.3710057,0.425795047 C32.684923,0.620901633 32.9517489,0.897406309 33.248748,1.41182386 L33.4327965,1.73060532 C33.7297956,2.24502288 33.8358428,2.61435316 33.8478514,2.98376684 C33.85986,3.35318052 33.7662349,3.70259421 33.5711283,4.01651154 C33.3760217,4.33042888 33.099517,4.59725471 32.5850995,4.89425382 L22.7400386,10.5783024 C22.225621,10.8753015 21.8562907,10.9813487 21.4868771,10.9933572 C21.4053584,10.9960072 21.3248136,10.9935132 21.2454093,10.9859201 C21.1652548,10.9949171 21.083221,11 21,11 L2,11 C0.8954305,11 6.76353751e-17,10.1045695 0,9 L0,8 C-1.3527075e-16,6.8954305 0.8954305,6 2,6 L20.671,5.99904731 L30.0850995,0.564126801 C30.599517,0.267127689 30.9688473,0.161080531 31.338261,0.149071939 Z M57,6 C58.1045695,6 59,6.8954305 59,8 L59,9 C59,10.1045695 58.1045695,11 57,11 L33,11 C31.8954305,11 31,10.1045695 31,9 L31,8 C31,6.8954305 31.8954305,6 33,6 L57,6 Z"
          ></path>
        </g>
      </svg>
    )
  },
  {
    key: 'railway-sighnal-groundingClamp',
    label: '汇流排接地线夹',
    shape: 'svg',
    payload: {
      paths: [
        { d: 'M8,26 L2,26 L2,0 L38,0 L38,26 L32,26 L32,6 L8,6 L8,26 Z' },
        { d: 'M10 28 A5 5 0 1 0 0 28 A5 5 0 1 0 10 28 Z', fill: '#3A3838' },
        { d: 'M40 28 A5 5 0 1 0 30 28 A5 5 0 1 0 40 28 Z', fill: '#3A3838' }
      ],
      viewBox: { x: 0, y: 0, width: 40, height: 33 },
      fit: 'stretch',
      style: { fill: '#D8D8D8', stroke: 'transparent', strokeWidth: 0 }
    },
    preview: (
      <svg viewBox="0 0 40 33" className="w-full h-full">
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <path d="M8,26 L2,26 L2,0 L38,0 L38,26 L32,26 L32,6 L8,6 L8,26 Z" fill="#D8D8D8"></path>
          <circle fill="#3A3838" cx="5" cy="28" r="5"></circle>
          <circle fill="#3A3838" cx="35" cy="28" r="5"></circle>
        </g>
      </svg>
    )
  },
  {
    key: 'railway-sighnal-sectionInsulator',
    label: '分段绝缘器',
    shape: 'svg',
    payload: {
      paths: [
        {
          d: 'M0,0 L1.77603759,0 L1.77603759,26 L0,26 L0,0 Z M5.11198121,0 L6.88801879,0 L6.88801879,26 L5.11198121,26 L5.11198121,0 Z M10.2239624,0 L12,0 L12,26 L10.2239624,26 L10.2239624,0 Z'
        }
      ],
      viewBox: { x: 0, y: 0, width: 12, height: 26 },
      fit: 'stretch',
      style: { fill: '#B8B8B8', stroke: 'transparent', strokeWidth: 0 }
    },
    preview: (
      <svg viewBox="0 0 12 26" className="w-full h-full">
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <path
            fill="#B8B8B8"
            d="M0,0 L1.77603759,0 L1.77603759,26 L0,26 L0,0 Z M5.11198121,0 L6.88801879,0 L6.88801879,26 L5.11198121,26 L5.11198121,0 Z M10.2239624,0 L12,0 L12,26 L10.2239624,26 L10.2239624,0 Z"
          ></path>
        </g>
      </svg>
    )
  },
  {
    key: 'railway-sighnal-fuse',
    label: '熔断器',
    shape: 'svg',
    payload: {
      paths: [
        { d: 'M3 0 L4 0 L4 26 L3 26 Z' },
        {
          d: 'M7,6 L7,21 L0,21 L0,6 L7,6 Z M6.36363638,6.71428572 L0.63636364,6.71428572 L0.63636364,20.2857143 L6.36363638,20.2857143 L6.36363638,6.71428572 Z'
        }
      ],
      viewBox: { x: 0, y: 0, width: 7, height: 26 },
      fit: 'stretch',
      style: { fill: '#B8B8B8', stroke: 'transparent', strokeWidth: 0 }
    },
    preview: (
      <svg viewBox="0 0 7 26" className="w-full h-full">
        <g fill="#B8B8B8" strokeWidth="1" fillRule="nonzero">
          <polygon points="3 0 4 0 4 26 3 26"></polygon>
          <path d="M7,6 L7,21 L0,21 L0,6 L7,6 Z M6.36363638,6.71428572 L0.63636364,6.71428572 L0.63636364,20.2857143 L6.36363638,20.2857143 L6.36363638,6.71428572 Z"></path>
        </g>
      </svg>
    )
  }
]
