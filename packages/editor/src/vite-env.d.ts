/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** 接口请求地址 */
  VITE_APP_SERVER_HOST: string
  /** ws地址 */
  VITE_APP_WS_HOST: string
  /** 系统版本名称（开发版、测试版） */
  VITE_APP_SYSTEM_NAME: string
}
