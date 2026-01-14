/*
 * @Description: 获取设备像素比（Device Pixel Ratio）
 * @Author: qingzi.wang
 * @Date: 2026-01-09 22:40:58
 * @LastEditTime: 2026-01-09 22:56:48
 */
export function getDeviceDpr(): number {
  return (typeof window !== "undefined" && (window.devicePixelRatio || 1)) || 1;
}
