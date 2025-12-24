/*
 * @Description: 编辑JSON数据
 * @Author: qingzi.wang
 * @Date: 2025-10-20 18:42:45
 * @LastEditTime: 2025-12-10 16:22:18
 */
import React, { useState } from 'react'
import Tooltip from '@/components/common/Tooltip'
import Modal from '@/components/common/Modal'
import editSvg from '@/assets/images/edit.svg'
import AceEditor from 'react-ace'
import ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/theme-monokai'
import 'ace-builds/src-noconflict/theme-github'
import 'ace-builds/src-noconflict/ext-language_tools'
import 'ace-builds/src-noconflict/ext-searchbox'
import jsonWorkerUrl from 'ace-builds/src-noconflict/worker-json?url'

// 配置 worker 路径，使用 Vite 的 ?url 导入确保构建后路径正确
ace.config.setModuleUrl('ace/mode/json_worker', jsonWorkerUrl)
import { toScene, fromScene } from '@agilejs/core'
import type { CanvasEngine } from '@agilejs/core'

interface IProps {
  engine: CanvasEngine | null
}

const EditJsonAction: React.FC<IProps> = ({ engine }) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editorValue, setEditorValue] = useState<string>('')
  // 加载显示
  const handleShowEdit = () => {
    handleLoad()
    setModalVisible(true)
  }
  // 加载数据
  const handleLoad = () => {
    if (!engine) return
    const payload = toScene(engine)
    setEditorValue(JSON.stringify(payload, null, 2))
  }
  // 保存数据
  const handleSave = () => {
    if (!engine) return
    try {
      const parsed = JSON.parse(editorValue)
      localStorage.setItem('graphData', editorValue)
      fromScene(engine, parsed)
    } catch (error) {
      console.error('JSON 解析失败', error)
    }
  }
  // 编辑器内容变化
  const onChange = (newValue: string) => {
    setEditorValue(newValue)
  }
  return (
    <>
      <Tooltip content="编辑JSON数据">
        <div
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-gray-700 cursor-pointer transition"
          onClick={handleShowEdit}
        >
          <img src={editSvg} alt="编辑JSON数据" className="w-5 h-5 dark:invert" />
        </div>
      </Tooltip>
      <Modal visible={modalVisible} title={'编辑JSON数据'} onClose={() => setModalVisible(false)} width={640}>
        <AceEditor
          value={editorValue}
          mode="json"
          theme="github"
          name="json-editor"
          editorProps={{ $blockScrolling: true }}
          placeholder="Placeholder 文本"
          width="100%"
          height="400px"
          onChange={onChange}
          setOptions={{
            enableBasicAutocompletion: false,
            enableLiveAutocompletion: false,
            enableSnippets: false,
            enableMobileMenu: true,
            showLineNumbers: true,
            tabSize: 2
          }}
        />
        <div className="flex items-center gap-2 mt-2 justify-end">
          <button
            type="button"
            className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
            onClick={handleSave}
          >
            立即应用
          </button>
        </div>
      </Modal>
    </>
  )
}

export default EditJsonAction
