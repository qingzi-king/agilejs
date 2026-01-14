/// <reference types="vite/client" />

declare module 'stats.js' {
  export default class Stats {
    dom: HTMLElement
    showPanel(panel: number): void
    begin(): void
    end(): void
    update(): void
  }
}

interface ImportMetaEnv {
  /** 接口请求地址 */
  VITE_APP_SERVER_HOST: string
  /** ws地址 */
  VITE_APP_WS_HOST: string
  /** 系统版本名称（开发版、测试版） */
  VITE_APP_SYSTEM_NAME: string
}
