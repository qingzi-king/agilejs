import React, { useMemo } from 'react'

export const MarkdownRenderer: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
  const rendered = useMemo(() => {
    if (!content) return null

    // 将 markdown 转换为 React 元素
    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let listItems: string[] = []
    let listType: 'ul' | 'ol' | null = null

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const ListTag = listType === 'ul' ? 'ul' : 'ol'
        elements.push(
          <ListTag key={elements.length} className={listType === 'ul' ? 'list-disc list-inside my-2' : 'list-decimal list-inside my-2'}>
            {listItems.map((item, i) => <li key={i} className="ml-2">{parseInlineMarkdown(item)}</li>)}
          </ListTag>
        )
        listItems = []
        listType = null
      }
    }

    const parseInlineMarkdown = (text: string): React.ReactNode => {
      // 处理行内代码、加粗、斜体、链接
      const parts: React.ReactNode[] = []
      let remaining = text
      let key = 0

      while (remaining) {
        // 行内代码 `code`
        const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/)
        if (codeMatch) {
          if (codeMatch[1]) parts.push(parseInlineMarkdown(codeMatch[1]))
          parts.push(<code key={key++} className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-sm font-mono">{codeMatch[2]}</code>)
          remaining = codeMatch[3]
          continue
        }

        // 加粗 **text** 或 __text__
        const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/) || remaining.match(/^(.*?)__([^_]+)__(.*)$/)
        if (boldMatch) {
          if (boldMatch[1]) parts.push(parseInlineMarkdown(boldMatch[1]))
          parts.push(<strong key={key++}>{boldMatch[2]}</strong>)
          remaining = boldMatch[3]
          continue
        }

        // 斜体 *text* 或 _text_
        const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*(.*)$/) || remaining.match(/^(.*?)_([^_]+)_(.*)$/)
        if (italicMatch) {
          if (italicMatch[1]) parts.push(parseInlineMarkdown(italicMatch[1]))
          parts.push(<em key={key++}>{italicMatch[2]}</em>)
          remaining = italicMatch[3]
          continue
        }

        // 链接 [text](url)
        const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/)
        if (linkMatch) {
          if (linkMatch[1]) parts.push(linkMatch[1])
          parts.push(<a key={key++} href={linkMatch[3]} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{linkMatch[2]}</a>)
          remaining = linkMatch[4]
          continue
        }

        // 没有更多匹配
        parts.push(remaining)
        break
      }

      if (parts.length === 1) return parts[0]
      // 用 key 包裹每个 part，避免 React 警告
      return <>{parts.map((part, i) => <React.Fragment key={i}>{part}</React.Fragment>)}</>
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 代码块开始/结束
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          flushList()
          inCodeBlock = true
          codeBlockContent = []
        } else {
          elements.push(
            <pre key={elements.length} className="my-2 p-3 bg-gray-800 dark:bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          )
          inCodeBlock = false
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }

      // 标题
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headerMatch) {
        flushList()
        const level = headerMatch[1].length
        const text = headerMatch[2]
        const sizeClasses: Record<number, string> = {
          1: 'text-xl font-bold mt-4 mb-2',
          2: 'text-lg font-bold mt-3 mb-2',
          3: 'text-base font-semibold mt-2 mb-1',
          4: 'text-sm font-semibold mt-2 mb-1',
          5: 'text-sm font-medium mt-1 mb-1',
          6: 'text-xs font-medium mt-1 mb-1'
        }
        const headerContent = parseInlineMarkdown(text)
        switch (level) {
          case 1:
            elements.push(<h1 key={elements.length} className={sizeClasses[1]}>{headerContent}</h1>)
            break
          case 2:
            elements.push(<h2 key={elements.length} className={sizeClasses[2]}>{headerContent}</h2>)
            break
          case 3:
            elements.push(<h3 key={elements.length} className={sizeClasses[3]}>{headerContent}</h3>)
            break
          case 4:
            elements.push(<h4 key={elements.length} className={sizeClasses[4]}>{headerContent}</h4>)
            break
          case 5:
            elements.push(<h5 key={elements.length} className={sizeClasses[5]}>{headerContent}</h5>)
            break
          default:
            elements.push(<h6 key={elements.length} className={sizeClasses[6]}>{headerContent}</h6>)
        }
        continue
      }

      // 无序列表
      const ulMatch = line.match(/^[-*]\s+(.+)$/)
      if (ulMatch) {
        if (listType !== 'ul') flushList()
        listType = 'ul'
        listItems.push(ulMatch[1])
        continue
      }

      // 有序列表
      const olMatch = line.match(/^\d+\.\s+(.+)$/)
      if (olMatch) {
        if (listType !== 'ol') flushList()
        listType = 'ol'
        listItems.push(olMatch[1])
        continue
      }

      // 水平线
      if (/^[-*_]{3,}$/.test(line.trim())) {
        flushList()
        elements.push(<hr key={elements.length} className="my-3 border-gray-300 dark:border-gray-600" />)
        continue
      }

      // 空行
      if (!line.trim()) {
        flushList()
        continue
      }

      // 普通段落
      flushList()
      elements.push(<p key={elements.length} className="my-1">{parseInlineMarkdown(line)}</p>)
    }

    // 处理未闭合的代码块
    if (inCodeBlock && codeBlockContent.length > 0) {
      elements.push(
        <pre key={elements.length} className="my-2 p-3 bg-gray-800 dark:bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
          <code>{codeBlockContent.join('\n')}</code>
        </pre>
      )
    }

    flushList()

    return elements
  }, [content])

  return <div className={`markdown-content ${className}`}>{rendered}</div>
}
