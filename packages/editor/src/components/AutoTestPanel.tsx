/**
 * @Description: 自动化测试控制面板
 * @Author: qingzi.wang
 * @Date: 2025-11-10
 */

import React, { useEffect, useState } from 'react'
import type { CanvasEngine } from '@agilejs/core'
import { AutoTestManager, predefinedScenarios, type TestStep } from '../utils/autoTest'

interface AutoTestPanelProps {
  engine: CanvasEngine | null
}

export const AutoTestPanel: React.FC<AutoTestPanelProps> = ({ engine }) => {
  const [testManager, setTestManager] = useState<AutoTestManager | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [currentStepDescription, setCurrentStepDescription] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)

  // 初始化测试管理器
  useEffect(() => {
    if (!engine) return

    const manager = new AutoTestManager(engine)

    // 设置事件回调
    manager.onStepStart = (step: TestStep, index: number, total: number) => {
      setCurrentStep(index + 1)
      setTotalSteps(total)
      setCurrentStepDescription(step.description)
    }

    manager.onStepComplete = () => {
      // 可以在这里添加完成动画或提示
    }

    manager.onScenarioComplete = () => {
      // 场景完成后自动循环，不需要手动重置状态
    }

    manager.onScenarioStop = () => {
      setIsRunning(false)
      setIsPaused(false)
      setCurrentStep(0)
      setTotalSteps(0)
      setCurrentStepDescription('')
    }

    setTestManager(manager)

    return () => {
      manager.stop()
    }
  }, [engine])

  const handleStart = () => {
    if (!testManager || !selectedScenario) return

    const scenario = predefinedScenarios.find((s) => s.name === selectedScenario)
    if (!scenario) return

    testManager.start(scenario)
    setIsRunning(true)
    setIsPaused(false)
  }

  const handlePause = () => {
    if (!testManager) return
    testManager.pause()
    setIsPaused(true)
  }

  const handleResume = () => {
    if (!testManager) return
    testManager.resume()
    setIsPaused(false)
  }

  const handleStop = () => {
    if (!testManager) return
    testManager.stop()
  }

  const handleRestore = () => {
    if (!testManager) return
    testManager.restore()
  }

  const handleStepNext = () => {
    if (!testManager) return
    testManager.stepNext()
  }

  if (!engine) {
    return null
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          自动测试
          {isRunning && (
            <span className="inline-flex items-center justify-center w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 w-80 border border-gray-200 dark:border-gray-700">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          自动测试
        </h3>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 场景选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择测试场景</label>
        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
          disabled={isRunning}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">-- 请选择 --</option>
          {predefinedScenarios.map((scenario) => (
            <option key={scenario.name} value={scenario.name}>
              {scenario.name}
            </option>
          ))}
        </select>
        {selectedScenario && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {predefinedScenarios.find((s) => s.name === selectedScenario)?.description}
          </p>
        )}
      </div>

      {/* 进度显示 */}
      {isRunning && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
              步骤 {currentStep}/{totalSteps}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
                isPaused
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              }`}
            >
              {isPaused ? '已暂停' : '运行中'}
            </span>
          </div>
          {currentStepDescription && (
            <p className="text-xs text-gray-700 dark:text-gray-300">{currentStepDescription}</p>
          )}
          {totalSteps > 0 && (
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* 控制按钮 */}
      <div className="space-y-2">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={!selectedScenario}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            开始测试
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {!isPaused ? (
              <button
                onClick={handlePause}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                暂停
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                继续
              </button>
            )}
            <button
              onClick={handleStop}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              停止
            </button>
          </div>
        )}

        {/* 单步执行（仅在暂停或未运行时可用） */}
        <button
          onClick={handleStepNext}
          disabled={isRunning && !isPaused}
          className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          单步执行
        </button>

        {/* 恢复原始状态 */}
        <button
          onClick={handleRestore}
          disabled={isRunning && !isPaused}
          className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          恢复原状
        </button>
      </div>

      {/* 帮助提示 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <details className="text-xs text-gray-600 dark:text-gray-400">
          <summary className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 font-medium">
            使用说明
          </summary>
          <ul className="mt-2 space-y-1 pl-4 list-disc">
            <li>选择测试场景后点击"开始测试"自动运行</li>
            <li>运行中可以"暂停"/"继续"或"停止"测试</li>
            <li>"单步执行"可逐步查看每个变化</li>
            <li>"恢复原状"可将图形恢复到测试前状态</li>
            <li>部分场景支持循环播放</li>
          </ul>
        </details>
      </div>
    </div>
  )
}
