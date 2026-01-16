/*
 * @Description: AI 助手侧边栏组件
 * @Author: qingzi.wang
 * @Date: 2026-01-16 11:02:36
 * @LastEditTime: 2026-01-16 14:35:50
 */
import React, { useRef } from 'react'
import useUIStore from '@/store/uiStore'
import { ChatTab } from './ChatTab'
import { ConfigTab } from './ConfigTab'
import Modal from '@/components/common/Modal'

export const AIPanel: React.FC = () => {
  const { aiPanelOpen, toggleAIPanel } = useUIStore()
  const [modalVisible, setModalVisible] = React.useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  if (!aiPanelOpen) return null

  return (
    <>
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-screen w-96 bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col z-50 transform transition-transform duration-300"
        style={{
          transform: aiPanelOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">AI 助手</h2>
          <span className="flex gap-2">
            <button
              onClick={() => setModalVisible(true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 1024 1024" version="1.1" width="64" height="64">
                <path d="M555.52 926.72h-87.04c-19.456 0-36.352-14.336-39.936-34.304-6.656-37.376-38.912-64.512-76.8-64.512-16.384 0-32.256 5.12-46.08 14.848-16.384 11.776-39.424 10.24-53.76-4.608l-67.072-67.072c-14.336-14.336-16.384-37.376-4.608-53.76 9.728-13.312 14.848-29.184 14.848-46.08 0-37.888-27.136-70.144-64.512-76.8-19.968-3.584-34.304-20.48-34.304-39.936v-92.16c0-19.456 14.336-36.352 34.304-39.936 37.376-6.656 64.512-38.912 64.512-76.8 0-15.36-4.608-30.208-12.8-43.008-11.264-16.896-8.704-39.424 5.632-53.76l64-64c14.336-14.336 37.376-16.384 53.76-4.608 13.312 9.728 29.184 14.848 46.08 14.848 37.888 0 70.144-27.136 76.8-64.512 3.584-19.968 20.48-34.304 39.936-34.304h86.528c19.456 0 36.352 14.336 39.936 34.304 6.656 37.376 38.912 64.512 76.8 64.512 16.384 0 32.256-5.12 46.08-14.848 16.384-11.776 39.424-10.24 53.76 4.608L832.512 245.76c13.824 13.824 16.384 35.84 6.144 52.736-6.656 11.264-10.752 26.112-14.848 41.984-1.024 3.584-1.536 6.656-2.56 10.24-10.24 38.912 55.296 62.976 75.776 69.632 17.92 5.632 29.696 22.016 29.696 40.448v91.648c0 22.016-16.896 40.448-38.912 41.984-47.104 3.584-69.12 29.184-66.048 76.288 1.536 18.944 7.168 35.84 16.384 48.64 12.8 17.92 10.752 41.984-4.608 57.344l-61.952 61.952c-14.336 14.336-37.376 16.384-53.76 4.608-13.312-9.728-29.184-14.848-46.08-14.848-37.888 0-70.144 27.136-76.8 64.512-3.072 19.456-19.968 33.792-39.424 33.792z m-86.528-40.96h85.504c10.24-57.344 59.392-98.816 117.248-98.816 25.6 0 49.664 7.68 70.144 23.04l0.512-0.512 61.952-61.952c1.024-1.024 1.536-3.072 0.512-4.096-13.824-18.944-22.016-43.008-24.064-69.632-5.12-69.632 33.792-114.688 103.424-119.808 0.512 0 1.024-0.512 1.024-1.536V460.8c0-0.512-0.512-1.024-1.024-1.024-77.824-24.576-116.224-69.12-102.912-118.784 1.024-3.072 1.536-6.656 2.56-9.728 4.608-17.92 9.216-36.864 19.456-53.248 0.512-0.512 0.512-1.536 0-2.56L742.4 214.528s-0.512-0.512-0.512 0c-20.48 14.848-44.544 23.04-70.144 23.04-57.856 0-107.52-41.472-117.248-98.304H468.992c-10.24 57.344-59.392 98.816-117.248 98.816-25.6 0-49.664-7.68-70.144-23.04l-0.512 0.512-63.488 62.464c-0.512 0.512-0.512 1.536-0.512 2.56 12.8 19.456 19.456 41.984 19.456 65.536 0 57.856-41.472 107.52-98.304 117.248v91.648c57.344 10.24 98.816 59.392 98.816 117.248 0 25.6-7.68 49.664-23.04 70.144l0.512 0.512L281.6 809.984s0.512 0.512 0.512 0c20.48-14.848 44.544-23.04 70.144-23.04 57.344 0.512 107.008 41.472 116.736 98.816z" p-id="4951"></path><path d="M512 675.84c-90.112 0-163.84-73.728-163.84-163.84s73.728-163.84 163.84-163.84 163.84 73.728 163.84 163.84-73.728 163.84-163.84 163.84z m0-286.72c-67.584 0-122.88 55.296-122.88 122.88s55.296 122.88 122.88 122.88 122.88-55.296 122.88-122.88-55.296-122.88-122.88-122.88z"></path>
              </svg>
            </button>
            <button
              onClick={toggleAIPanel}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatTab />
        </div>
      </div>
      <Modal visible={modalVisible} title={'模型配置'} onClose={() => setModalVisible(false)} width={640}>
        <ConfigTab />
      </Modal>
    </>
  )
}

export default AIPanel
