/*
 * @Description: 面板 Cisco Control Module 图形
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-10-12 15:10:22
 */
import type { PaletteItem } from '@/types'

export const CiscoControlModuleItems: PaletteItem[] = [
  // {
  //   key: 'cisco-control-module-paths',
  //   label: '10GE FCoE（paths）',
  //   shape: 'svg',
  //   payload: {
  //     viewBox: { x: 0, y: 0, width: 57, height: 78 },
  //     fit: 'contain',
  //     // 基于同一图形的多路径版本，使用 SvgPathRenderer 渲染
  //     paths: [
  //       { d: 'm57 33.06-9.749 9.232H.001l12.24-9.232z', fill: '#087BBB' },
  //       { d: 'm57 33.06-9.749 9.232H.001l12.24-9.232z', stroke: '#FFF', strokeWidth: 0.4, fill: 'none' },
  //       { d: 'M0 78h47.251V42.293H.001z', fill: '#78B3DA' },
  //       { d: 'M0 78h47.251V42.293H.001z', stroke: '#FFF', strokeWidth: 0.4, fill: 'none' },
  //       { d: 'M56.026 69.236V33.543l-9.065 8.75V78z', fill: '#328FC7' },
  //       { d: 'M56.026 69.236V33.543l-9.065 8.75V78z', stroke: '#FFF', strokeWidth: 0.4, fill: 'none' },
  //       { d: 'm57 0-9.749 9.246H.001L12.24 0z', fill: '#087BBB' },
  //       { d: 'm57 0-9.749 9.246H.001L12.24 0z', stroke: '#FFF', strokeWidth: 0.4, fill: 'none' },
  //       { d: 'M0 42.638h47.251V9.246H.001z', fill: '#087BBB' },
  //       { d: 'M0 42.638h47.251V9.246H.001z', stroke: '#FFF', strokeWidth: 0.4, fill: 'none' },
  //       { d: 'M56.026 33.863V.469L46.96 9.246v33.392z', fill: '#087BBB' },
  //       { d: 'M56.026 33.863V.469L46.96 9.246v33.392z', stroke: '#FFF', strokeWidth: 0.4, fill: 'none' },
  //       { d: 'M19.232 25.179h-7.069v-1.824l-2.667 2.693 2.667 2.696v-1.825h7.069zM23.232 30.9v7.072h-1.827l2.696 2.653 2.686-2.653H24.96V30.9zM23.232 21.396v-7.072h-1.827l2.696-2.666 2.686 2.666H24.96v7.072zM28.961 26.919h7.076v1.825l2.673-2.696-2.673-2.693v1.824h-7.076z', fill: '#FFF' },
  //       { d: 'M35.489 37.392c-1.344 1.39-7.445-2.457-13.631-8.598-6.202-6.143-10.138-12.266-8.809-13.669 1.331-1.404 7.43 2.458 13.617 8.6 6.189 6.14 10.14 12.267 8.823 13.667z', stroke: '#FFF', strokeWidth: 0.3478, fill: 'none' },
  //       { d: 'M35.126 15.018c1.393 1.329-2.448 7.42-8.61 13.614-6.149 6.18-12.28 10.128-13.683 8.8-1.393-1.329 2.46-7.423 8.609-13.617 6.148-6.18 12.29-10.115 13.684-8.797z', stroke: '#FFF', strokeWidth: 0.3478, fill: 'none' },
  //       { d: 'M27.002 30.157c2.333-1.636 2.889-4.857 1.265-7.186a5.175 5.175 0 0 0-7.198-1.265 5.146 5.146 0 0 0-1.262 7.173 5.163 5.163 0 0 0 7.195 1.278', fill: '#BFBEBE' },
  //       { d: 'M22.041 54.412H10.158M26.505 50.568H39.64', stroke: '#FFF', strokeWidth: 1.425, fill: 'none' },
  //       { d: 'M36.556 46.08v8.666l5.21-4.168z', fill: '#FFF' },
  //       { d: 'M36.556 46.08v8.666l5.21-4.168z', stroke: '#FFF', strokeWidth: 0.19, fill: 'none' },
  //       { d: 'M11.374 58.826v-8.641L6.151 54.33z', fill: '#FFF' },
  //       { d: 'M11.374 58.826v-8.641L6.151 54.33z', stroke: '#FFF', strokeWidth: 0.19, fill: 'none' },
  //       { d: 'M22.041 70.068H10.158M26.505 66.199H39.64', stroke: '#FFF', strokeWidth: 1.425, fill: 'none' },
  //       { d: 'M36.556 61.712v8.666l5.21-4.17z', fill: '#FFF' },
  //       { d: 'M36.556 61.712v8.666l5.21-4.17z', stroke: '#FFF', strokeWidth: 0.19, fill: 'none' },
  //       { d: 'M11.374 74.484v-8.666l-5.223 4.168z', fill: '#FFF' },
  //       { d: 'M11.374 74.484v-8.666l-5.223 4.168z', stroke: '#FFF', strokeWidth: 0.19, fill: 'none' },
  //     ],
  //   },
  //   preview: (
  //     <svg viewBox="0 0 57 78" className="w-full h-full">
  //       <path fill="#087BBB" d="m57 33.06-9.749 9.232H.001l12.24-9.232z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.4} d="m57 33.06-9.749 9.232H.001l12.24-9.232z" />
  //       <path fill="#78B3DA" d="M0 78h47.251V42.293H.001z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.4} d="M0 78h47.251V42.293H.001z" />
  //       <path fill="#328FC7" d="M56.026 69.236V33.543l-9.065 8.75V78z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.4} d="M56.026 69.236V33.543l-9.065 8.75V78z" />
  //       <path fill="#087BBB" d="m57 0-9.749 9.246H.001L12.24 0z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.4} d="m57 0-9.749 9.246H.001L12.24 0z" />
  //       <path fill="#087BBB" d="M0 42.638h47.251V9.246H.001z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.4} d="M0 42.638h47.251V9.246H.001z" />
  //       <path fill="#087BBB" d="M56.026 33.863V.469L46.96 9.246v33.392z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.4} d="M56.026 33.863V.469L46.96 9.246v33.392z" />
  //       <path fill="#FFF" d="M19.232 25.179h-7.069v-1.824l-2.667 2.693 2.667 2.696v-1.825h7.069zM23.232 30.9v7.072h-1.827l2.696 2.653 2.686-2.653H24.96V30.9zM23.232 21.396v-7.072h-1.827l2.696-2.666 2.686 2.666H24.96v7.072zM28.961 26.919h7.076v1.825l2.673-2.696-2.673-2.693v1.824h-7.076z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.3478} d="M35.489 37.392c-1.344 1.39-7.445-2.457-13.631-8.598-6.202-6.143-10.138-12.266-8.809-13.669 1.331-1.404 7.43 2.458 13.617 8.6 6.189 6.14 10.14 12.267 8.823 13.667z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.3478} d="M35.126 15.018c1.393 1.329-2.448 7.42-8.61 13.614-6.149 6.18-12.28 10.128-13.683 8.8-1.393-1.329 2.46-7.423 8.609-13.617 6.148-6.18 12.29-10.115 13.684-8.797z" />
  //       <path fill="#BFBEBE" d="M27.002 30.157c2.333-1.636 2.889-4.857 1.265-7.186a5.175 5.175 0 0 0-7.198-1.265 5.146 5.146 0 0 0-1.262 7.173 5.163 5.163 0 0 0 7.195 1.278" />
  //       <path fill="none" stroke="#FFF" strokeWidth={1.425} d="M22.041 54.412H10.158M26.505 50.568H39.64" />
  //       <path fill="#FFF" d="M36.556 46.08v8.666l5.21-4.168z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.19} d="M36.556 46.08v8.666l5.21-4.168z" />
  //       <path fill="#FFF" d="M11.374 58.826v-8.641L6.151 54.33z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.19} d="M11.374 58.826v-8.641L6.151 54.33z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={1.425} d="M22.041 70.068H10.158M26.505 66.199H39.64" />
  //       <path fill="#FFF" d="M36.556 61.712v8.666l5.21-4.17z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.19} d="M36.556 61.712v8.666l5.21-4.17z" />
  //       <path fill="#FFF" d="M11.374 74.484v-8.666l-5.223 4.168z" />
  //       <path fill="none" stroke="#FFF" strokeWidth={0.19} d="M11.374 74.484v-8.666l-5.223 4.168z" />
  //     </svg>
  //   ),
  // },
  {
    key: 'cisco-control-module-stretch',
    label: '10GE FCoE（stretch）',
    shape: 'svg',
    payload: {
      viewBox: { x: 0, y: 0, width: 57, height: 78 },
      fit: 'stretch',
      xml: '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="57" height="78"><path fill="#087BBB" d="m57 33.06-9.749 9.232H.001l12.24-9.232z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="m57 33.06-9.749 9.232H.001l12.24-9.232z"/><path fill="#78B3DA" d="M0 78h47.251V42.293H.001z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M0 78h47.251V42.293H.001z"/><path fill="#328FC7" d="M56.026 69.236V33.543l-9.065 8.75V78z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M56.026 69.236V33.543l-9.065 8.75V78z"/><path fill="#087BBB" d="m57 0-9.749 9.246H.001L12.24 0z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="m57 0-9.749 9.246H.001L12.24 0z"/><path fill="#087BBB" d="M0 42.638h47.251V9.246H.001z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M0 42.638h47.251V9.246H.001z"/><path fill="#087BBB" d="M56.026 33.863V.469L46.96 9.246v33.392z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M56.026 33.863V.469L46.96 9.246v33.392z"/><path style="fill:#FFF" d="M19.232 25.179h-7.069v-1.824l-2.667 2.693 2.667 2.696v-1.825h7.069zM23.232 30.9v7.072h-1.827l2.696 2.653 2.686-2.653H24.96V30.9zM23.232 21.396v-7.072h-1.827l2.696-2.666 2.686 2.666H24.96v7.072zM28.961 26.919h7.076v1.825l2.673-2.696-2.673-2.693v1.824h-7.076z"/><path style="fill:none" stroke="#FFF" stroke-width=".34780000000000005" d="M35.489 37.392c-1.344 1.39-7.445-2.457-13.631-8.598-6.202-6.143-10.138-12.266-8.809-13.669 1.331-1.404 7.43 2.458 13.617 8.6 6.189 6.14 10.14 12.267 8.823 13.667z"/><path style="fill:none" stroke="#FFF" stroke-width=".34780000000000005" d="M35.126 15.018c1.393 1.329-2.448 7.42-8.61 13.614-6.149 6.18-12.28 10.128-13.683 8.8-1.393-1.329 2.46-7.423 8.609-13.617 6.148-6.18 12.29-10.115 13.684-8.797z"/><path fill="#BFBEBE" d="M27.002 30.157c2.333-1.636 2.889-4.857 1.265-7.186a5.175 5.175 0 0 0-7.198-1.265 5.146 5.146 0 0 0-1.262 7.173 5.163 5.163 0 0 0 7.195 1.278"/><path style="fill:none" stroke="#FFF" stroke-width="1.425" d="M22.041 54.412H10.158M26.505 50.568H39.64"/><path style="fill:#FFF" d="M36.556 46.08v8.666l5.21-4.168z"/><path style="fill:none" stroke="#FFF" stroke-width=".19" d="M36.556 46.08v8.666l5.21-4.168z"/><path style="fill:#FFF" d="M11.374 58.826v-8.641L6.151 54.33z"/><path style="fill:none" stroke="#FFF" stroke-width=".19" d="M11.374 58.826v-8.641L6.151 54.33z"/><path style="fill:none" stroke="#FFF" stroke-width="1.425" d="M22.041 70.068H10.158M26.505 66.199H39.64"/><path style="fill:#FFF" d="M36.556 61.712v8.666l5.21-4.17z"/><path style="fill:none" stroke="#FFF" stroke-width=".19" d="M36.556 61.712v8.666l5.21-4.17z"/><path style="fill:#FFF" d="M11.374 74.484v-8.666l-5.223 4.168z"/><path style="fill:none" stroke="#FFF" stroke-width=".19" d="M11.374 74.484v-8.666l-5.223 4.168z"/></svg>'
    }
  },
  {
    key: 'cisco-control-module-floor',
    label: 'floor standing机柜',
    shape: 'svg',
    payload: {
      viewBox: { x: 0, y: 0, width: 77, height: 66 },
      fit: 'stretch',
      xml: '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="77" height="66"><path fill="#087BBB" d="M13.997 62.199h52.619V10.388h-52.62z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M66.616 10.388h-52.62v51.81h52.62"/><path fill="#087BBB" d="M66.616 62.199 77 51.813V0H10.383L0 10.388h66.616z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M66.616 62.199 77 51.813V0H10.383L0 10.388h66.616z"/><path fill="#231F20" d="M66.616 10.388 77 0"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M66.616 10.388 77 0M44.659 18.41h9.248M15.594 22.648h42.813V12.34H15.594zM51.83 35.858h6.362v-8.46H51.83z"/><path style="fill:none" stroke="#231F20" stroke-width=".4" d="M.855 61.36h13.206V11.147H.855zM3.23 13.66h8.456M3.23 16.3h8.456M3.23 18.954h8.456M3.23 21.593h8.456M3.23 24.232h8.456M3.23 26.87h8.456M3.23 29.525h8.456M3.23 32.163h8.456M3.23 34.801h8.456M3.23 37.44h8.456M3.23 40.08h8.456M3.23 42.718h8.456M3.23 45.387h8.456M3.23 48.026h8.456M3.23 50.665h8.456M3.23 53.304h8.456M3.23 55.942h8.456M3.23 58.581h8.456"/><path fill="#087BBB" d="M9.56 62.306 6.923 66h55.49l-1.581-3.694z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M9.56 62.306 6.923 66h55.49l-1.581-3.694z"/><path fill="#087BBB" d="m62.413 66 3.445-3.694H60.83z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="m62.413 66 3.445-3.694H60.83z"/></svg>'
    }
  },
  {
    key: 'cisco-control-module-switch',
    label: 'content switch module',
    shape: 'svg',
    payload: {
      viewBox: { x: 0, y: 0, width: 78, height: 58 },
      fit: 'stretch',
      xml: '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="78" height="58"><path fill="#087BBB" d="M20.715 58h51.098V6.926H20.715z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M20.715 58h51.098V6.926H20.715z"/><path fill="#087BBB" d="M26.69.322h51.087L71.38 6.779H20.295z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M26.69.322h51.087L71.38 6.779H20.295z"/><path fill="#087BBB" d="m78 48.186-6.398 9.345V6.445L78 0z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="m78 48.186-6.398 9.345V6.445L78 0z"/><path fill="#087BBB" d="M0 58h20.715V6.926H0z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M0 58h20.715V6.926H0z"/><path fill="#087BBB" d="M6.772.322h20.715l-6.398 6.457H.375z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M6.772.322h20.715l-6.398 6.457H.375z"/><path fill="#087BBB" d="M20.715 6.926V58"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M20.715 6.926V58"/><path fill="#231F20" d="M21.09 25.346H.374"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M21.09 25.346H.374"/><path style="fill:#FFF" d="M38.836 31.36H27.772v-1.875l-4.166 2.772 4.166 2.756v-1.881h11.065zM40.434 36.991l-7.828 7.82-1.327-1.341-.993 4.916 4.91-.99-1.328-1.341 7.814-7.792zM45.545 39.858v11.04h-1.883l2.783 4.174 2.76-4.175h-1.887V39.858zM51.186 38.263l7.826 7.792-1.342 1.342 4.922.989-.992-4.916-1.342 1.34-7.799-7.819zM54.057 33.132h11.05v1.88l4.155-2.755-4.155-2.772v1.874h-11.05zM52.459 27.51l7.799-7.804L61.6 21.02l.992-4.904-4.922 1.004 1.342 1.314-7.827 7.818zM47.318 24.655V13.604h1.887l-2.76-4.16-2.783 4.16h1.883v11.051zM41.682 26.252l-7.814-7.818 1.328-1.314-4.91-1.004.993 4.903 1.327-1.314 7.827 7.805z"/><path style="fill:#FFF" d="M55.693 25.496c-3.609-5.172-10.756-6.43-15.933-2.81-5.178 3.619-6.437 10.745-2.812 15.917 3.636 5.172 10.755 6.441 15.933 2.81 5.178-3.607 6.45-10.744 2.812-15.917M8.422 16.068H5.105v-.566l-1.252.832 1.252.833v-.565h3.317zM8.905 17.765l-2.349 2.337-.393-.393-.3 1.46 1.477-.298-.405-.39 2.35-2.35zM10.438 18.615v3.313h-.566l.833 1.252.833-1.252h-.566v-3.313zM12.124 18.132l2.35 2.348-.392.391 1.465.299-.301-1.46-.392.392-2.35-2.337zM12.987 16.602h3.316v.565l1.253-.833-1.253-.832v.566h-3.316zM12.503 14.918l2.351-2.349.392.405.3-1.474-1.463.3.391.39-2.35 2.349zM10.972 14.055v-3.312h.566l-.833-1.252-.833 1.252h.565v3.312zM9.285 14.539l-2.35-2.349.405-.39-1.477-.3.3 1.474.393-.405 2.35 2.349z"/><path style="fill:#FFF" d="M13.485 14.312c-1.094-1.555-3.232-1.932-4.776-.84a3.42 3.42 0 0 0-.853 4.77 3.436 3.436 0 0 0 4.788.84 3.41 3.41 0 0 0 .841-4.77M9.556 42.036v9.189h-1.56l2.295 3.477 2.308-3.477H11.04v-9.189zM12.11 41.842l3.136 8.617-1.46.533 3.35 2.484.967-4.064-1.458.535-3.15-8.62zM8.538 41.842l-3.137 8.617 1.46.533-3.35 2.484-.966-4.064 1.458.535 3.15-8.62zM9.556 27.813v8.856h-1.56l2.295 3.452 2.308-3.452H11.04v-8.856z"/></svg>'
    }
  },
  {
    key: 'cisco-control-module-fwsm',
    label: 'firewall service module (fwsm)',
    shape: 'svg',
    payload: {
      viewBox: { x: 0, y: 0, width: 47, height: 76 },
      fit: 'stretch',
      xml: '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="47" height="76"><path fill="#087FBF" d="m46.875.214-5.268 5.953H0L6.81.214z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="m46.875.214-5.268 5.953H0L6.81.214z"/><path fill="#087FBF" d="M0 22.832h41.607V5.926H0z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M0 22.832h41.607V5.926H0z"/><path fill="#087FBF" d="M46.87 17.295V.375l-5.263 5.55v16.907z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M46.87 17.295V.375l-5.263 5.55v16.907z"/><path fill="#087FBF" d="M41.607 22.649v33.256l5.262-5.525V17.11z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M41.607 22.649v33.256l5.262-5.525V17.11z"/><path style="fill:none" stroke="#FFF" stroke-linecap="round" stroke-linejoin="round" stroke-width=".4" d="M41.398 11.237H.202M44.56 2.64H3.353M41.398 16.95H.202M47 5.303l-5.252 5.745M47 11.016l-5.252 5.731"/><path fill="#231F20" d="M12.408 6.002v5.176"/><path style="fill:none" stroke="#FFF" stroke-linecap="round" stroke-linejoin="round" stroke-width=".4" d="M12.408 6.002v5.176M28.336 6.002v5.176M12.408 17.225v5.184M28.336 17.225v5.184M20.702 11.478v5.189M4.761 11.478v5.189M36.629 11.478v5.189M18.327 0l-5.919 5.904M34.252 0l-5.916 5.904"/><path fill="#087FBF" d="M0 55.647h41.607V22.65H0z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M41.607 22.649v32.998H0V22.65"/><path fill="#087FBF" d="M0 76h41.607V55.576H0z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M0 76h41.607V55.576H0z"/><path fill="#087FBF" d="M46.87 70.452V50.166l-5.263 5.55V76z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M46.87 70.452V50.166l-5.263 5.55V76z"/><path style="fill:#FFF" d="M21.49 35.295v-7.2h1.221l-1.805-2.713-1.796 2.714h1.223v7.199zM17.818 36.335l-5.087-5.09.86-.86-3.193-.653.64 3.195.874-.86 5.085 5.088zM15.959 39.683H8.762v-1.237l-2.714 1.797 2.714 1.82v-1.235h7.197zM16.998 43.343l-5.086 5.1-.874-.872-.64 3.195 3.194-.655-.86-.847 5.086-5.102zM20.333 42.68v13.89H19.11l1.796 2.729 1.805-2.729h-1.22V42.68zM24.004 44.162l5.074 5.102-.846.847 3.194.655-.654-3.195-.848.872-5.102-5.1zM25.863 40.828h7.198v1.236l2.726-1.82-2.726-1.798v1.237h-7.198zM24.822 37.155l5.102-5.089.848.86.654-3.194-3.193.654.845.86-5.074 5.089z"/><path style="fill:#FFF" d="M25.324 46.293c3.36-2.365 4.178-7.022 1.815-10.395-2.367-3.362-7.01-4.195-10.37-1.828-3.373 2.367-4.191 7.024-1.838 10.385 2.364 3.36 7.008 4.179 10.393 1.838"/><path style="fill:none" stroke="#FFF" stroke-linecap="round" stroke-linejoin="round" stroke-width=".4" d="M44.572 2.794v16.575"/><path style="fill:#FFF" d="M20.46 63.612h10.964v-1.07l3.578 2.168-3.578 2.23v-1.095H20.46zM20.46 70.434h10.964v-1.097l3.578 2.193-3.578 2.23v-1.095H20.46zM20.71 60.35H9.756v-1.07l-3.59 2.166 3.59 2.23v-1.094H20.71zM20.71 67.169H9.756v-1.095l-3.59 2.193 3.59 2.231v-1.095H20.71z"/><path style="fill:none" stroke="#FFF" stroke-linecap="round" stroke-linejoin="round" stroke-width=".4" d="M41.398 22.723H.202M47 16.8l-5.252 5.733M41.398 55.53H.202M46.717 50.418l-4.83 5.077"/></svg>'
    }
  },
  {
    key: 'cisco-control-module-service',
    label: 'service module',
    shape: 'svg',
    payload: {
      viewBox: { x: 0, y: 0, width: 61, height: 77 },
      fit: 'stretch',
      xml: '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="61" height="77"><path fill="#087BBB" d="m60.852 0-6.837 7.742H.001L8.859 0z"/><path style="fill:none" stroke="#FFF" stroke-width=".5" d="m60.852 0-6.837 7.742H.001L8.859 0z"/><path fill="#087BBB" d="M54.015 7.742v26.857l6.831-7.188V.533z"/><path style="fill:none" stroke="#FFF" stroke-width=".5" d="M54.015 7.742v26.857l6.831-7.188V.533z"/><path fill="#087BBB" d="M0 77h54.015V34.177H.001z"/><path style="fill:none" stroke="#FFF" stroke-width=".5" d="M54.015 77V34.176H.001V77"/><path fill="#087BBB" d="M0 34.28h54.015V7.743H.001z"/><path style="fill:none" stroke="#FFF" stroke-width=".5" d="M0 34.28h54.015V7.743H.001z"/><path fill="#087BBB" d="M60.846 69.795V27.143l-6.83 7.188V77z"/><path style="fill:none" stroke="#FFF" stroke-width=".5" d="M60.846 69.795V27.143l-6.83 7.188V77z"/><path style="fill:#FFF" d="M27.904 60.6v9.335h1.58l-2.332 3.53-2.354-3.53h1.6V60.6zM23.135 59.247l-6.608 6.614 1.126 1.124-4.14.834.832-4.144 1.124 1.086 6.607-6.576zM20.726 54.903H11.38v1.582L7.85 54.15l3.528-2.339v1.585h9.347zM22.076 50.147l-6.607-6.611-1.124 1.124-.832-4.143 4.14.834-1.126 1.125 6.608 6.611zM26.398 50.989V32.964h-1.6l2.354-3.53 2.332 3.53h-1.58V50.99zM31.162 49.087l6.613-6.611-1.123-1.125 4.14-.834-.833 4.143-1.124-1.124-6.61 6.611zM33.578 53.396h9.328v-1.585l3.527 2.339-3.527 2.335v-1.582h-9.328zM32.225 58.185l6.61 6.576 1.123-1.086.834 4.144-4.14-.834 1.123-1.124-6.613-6.614z"/><path style="fill:#FFF" d="M32.846 46.324c4.403 3.072 5.461 9.098 2.388 13.466-3.071 4.37-9.094 5.468-13.458 2.393-4.386-3.075-5.443-9.102-2.39-13.47 3.072-4.408 9.092-5.465 13.46-2.39M26.561 16.309H40.79v-1.42l4.656 2.822-4.656 2.897v-1.399H26.56zM26.561 25.152H40.79v-1.42l4.656 2.842-4.656 2.898V28.05H26.56zM26.89 12.068H12.66v-1.42l-4.657 2.841 4.657 2.896v-1.42H26.89zM26.89 20.909H12.66v-1.4l-4.657 2.823 4.657 2.896v-1.4H26.89z"/><path style="fill:none" stroke="#FFF" stroke-linecap="round" stroke-linejoin="round" stroke-width=".5" d="M53.734 76.916H.287M61 .122 54.179 7.59M53.734 34.318H.287M60.633 27.484l-6.255 6.572"/></svg>'
    }
  },
  {
    key: 'cisco-control-module-system',
    label: 'system controller',
    shape: 'svg',
    payload: {
      viewBox: { x: 0, y: 0, width: 75, height: 70 },
      fit: 'stretch',
      xml: '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="75" height="70"><path fill="#026C9B" d="M0 70h55.439V13.499H0z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M0 70h55.439V13.499H0z"/><path fill="#026C9B" d="M55.439 13.43 74.693.326H19.255L0 13.43z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M55.439 13.43 74.693.326H19.255L0 13.43z"/><path fill="#026C9B" d="M75 56.5V0L55.814 13.5V70z"/><path style="fill:none" stroke="#FFF" stroke-width=".4" d="M75 56.5V0L55.814 13.5V70z"/><path style="fill:none" stroke="#FFF" stroke-width="1.5" d="M27.7 40.695c5.419 0 9.813-4.403 9.813-9.833S33.12 21.03 27.7 21.03c-5.407 0-9.794 4.403-9.794 9.833s4.387 9.833 9.794 9.833zM27.7 43.994v14.815"/><path style="fill:#FFF" d="M33.984 58.882H21.649l5.906 7.448z"/><path style="fill:none" stroke="#FFF" stroke-width="1.5" d="M20.653 42.012 12.74 54.518"/><path style="fill:#FFF" d="M17.985 57.939 7.576 51.325 8.6 60.791z"/><path style="fill:none" stroke="#FFF" stroke-width="1.5" d="m34.576 42.012 7.914 12.506"/><path style="fill:#FFF" d="m37.263 57.939 10.41-6.614-1.023 9.466z"/></svg>'
    }
  }
]
