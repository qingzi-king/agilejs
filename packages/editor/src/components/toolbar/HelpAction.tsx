/*
 * @Description:
 * @Author: qingzi.wang
 * @Date: 2025-10-17 15:57:28
 * @LastEditTime: 2025-12-02 17:57:34
 */
import React from 'react'
import Tooltip from '@/components/common/Tooltip'
import Modal from '@/components/common/Modal'
import helpSvg from '@/assets/images/help.svg'

const HelpAction: React.FC = () => {
  const [modalVisible, setModalVisible] = React.useState(false)
  return (
    <>
      <Tooltip content="操作帮助">
        <div
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-gray-700 cursor-pointer transition"
          onClick={() => setModalVisible(true)}
        >
          <img src={helpSvg} alt="帮助" className="w-5 h-5 dark:invert" />
        </div>
      </Tooltip>
      <Modal visible={modalVisible} title={'画布操作帮助'} onClose={() => setModalVisible(false)} width={640}>
        <ul className="list-disc pl-5 text-sm text-gray-800 dark:text-gray-100 space-y-1">
          <li>空白处左键拖动：平移画布</li>
          <li>滚轮：缩放画布</li>
          <li>空白处点击：取消所有选择</li>
          <li>全选：Cmd/Ctrl+A</li>
          <li>框选：按住 Cmd/Ctrl + 左键在空白处拖拽（Shift 叠加选择）</li>
          <li>撤消：Cmd/Ctrl+Z；重做：Shift+Cmd/Ctrl+Z</li>
          <li>蓝色方块：拖动调整尺寸</li>
          <li>红色圆点：拖动旋转节点</li>
          <li>按住Shift调整尺寸：保持宽高比</li>
          <li>按住Shift旋转：15度对齐</li>
          <li>
            折线边：Alt/Shift+点击线段插点，拖动蓝色方块移动拐点；Cmd/Ctrl+点击拐点删除，点击或拖动端点重连到最近锚点，点击空白或其他元素可取消边控制
          </li>
          <li>直线：按住Shift+点击线插点（不显示）；拖动蓝色方块移动插点；按住Alt+点击拐点可删除；</li>
          <li>框选并拖动：先框选再按住Shift拖动</li>
          <li>组合：Cmd/Ctrl+G；解组：Shift+Cmd/Ctrl+G</li>
          <li>格式刷：选中元素后点击开启，再次点击关闭（源节点选择避开标签）</li>
        </ul>
      </Modal>
    </>
  )
}

export default HelpAction
