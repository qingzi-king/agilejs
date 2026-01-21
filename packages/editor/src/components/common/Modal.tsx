/*
 * @Description:
 * @Author: qingzi.wang
 * @Date: 2025-10-14 12:26:16
 * @LastEditTime: 2026-01-21 16:46:30
 */
import React from 'react'
import { createPortal } from 'react-dom'

export interface ModalProps {
  visible: boolean
  title?: string
  onClose: () => void
  width?: number
  children?: React.ReactNode
  footer?: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ visible, title, onClose, width = 560, children, footer }) => {
  if (!visible) return null
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className="relative bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{ width, maxWidth: '90vw', maxHeight: '84vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="font-medium text-sm">{title}</div>
          <button
            type="button"
            className="top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl cursor-pointer"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="p-3 overflow-auto flex-1" style={{ maxHeight: 'calc(84vh - 64px - 40px)' }}>
          {children}
        </div>
        {footer ? (
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

export default Modal
