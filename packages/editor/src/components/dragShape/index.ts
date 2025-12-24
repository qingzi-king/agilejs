/*
 * @Description: 面板图形集合入口
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:08:28
 * @LastEditTime: 2025-10-30 10:15:59
 */
import { BasicItems } from './Basic'
import { CiscoSwitchItems } from './CiscoSwitch'
import { CiscoControlModuleItems } from './CiscoControlModule'
import { RailwaySignalItems } from './RailwaySignal'
import { FutureItems } from './Future'
import type { PaletteGroup } from '@/types'

// 分组导出：统一供面板渲染使用
export const paletteGroups: PaletteGroup[] = [
  { key: 'basic', title: '基础图形', items: BasicItems },
  { key: 'svg', title: 'SVG 示例', items: FutureItems },
  { key: 'railway_signal', title: '铁路信号类', items: RailwaySignalItems },
  { key: 'cisco_control_module', title: 'Cisco Controllers and Modules', items: CiscoControlModuleItems },
  { key: 'cisco_switches_auto', title: 'Cisco Switches', items: CiscoSwitchItems }
]
