// 轻量 Markdown -> HTML 转换，输出供 <rich-text nodes="..."> 使用
// 仅覆盖报考方案常见语法：标题、列表、表格、引用、加粗/斜体/行内代码、链接、分隔线、代码块

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const STYLE = {
  table: 'width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;margin:16rpx 0;font-size:24rpx',
  th: 'border:1px solid #e5e7eb;padding:10rpx;background:#f3f4f6;text-align:left;word-break:break-word;overflow-wrap:anywhere',
  td: 'border:1px solid #e5e7eb;padding:10rpx;word-break:break-word;overflow-wrap:anywhere',
  code: 'background:#f3f4f6;padding:16rpx;border-radius:8rpx;white-space:pre-wrap;margin:16rpx 0;display:block;font-size:24rpx',
  inlineCode: 'background:#f3f4f6;padding:2rpx 8rpx;border-radius:4rpx',
  quote: 'border-left:6rpx solid #d4d4d8;padding:8rpx 20rpx;color:#4b5563;margin:12rpx 0',
}

function inline(text: string): string {
  let out = escapeHtml(text)
  // 行内代码
  out = out.replace(/`([^`]+)`/g, `<code style="${STYLE.inlineCode}">$1</code>`)
  // 加粗
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 斜体
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  // 链接
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  return out
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map(cell => cell.trim())
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-')
}

export function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let i = 0
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // 代码块
    if (/^```/.test(line)) {
      closeList()
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(escapeHtml(lines[i]))
        i++
      }
      i++
      html.push(`<div style="${STYLE.code}">${buf.join('<br/>')}</div>`)
      continue
    }

    // 表格
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      closeList()
      const header = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]))
        i++
      }
      const thead = `<thead><tr>${header
        .map(h => `<th style="${STYLE.th}">${inline(h)}</th>`)
        .join('')}</tr></thead>`
      const tbody = `<tbody>${rows
        .map(r => `<tr>${r.map(c => `<td style="${STYLE.td}">${inline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>`
      html.push(`<table style="${STYLE.table}">${thead}${tbody}</table>`)
      continue
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = Math.min(heading[1].length, 4)
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      i++
      continue
    }

    // 分隔线
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      closeList()
      html.push('<hr/>')
      i++
      continue
    }

    // 引用
    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      closeList()
      html.push(`<blockquote style="${STYLE.quote}">${inline(quote[1])}</blockquote>`)
      i++
      continue
    }

    // 有序列表
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/)
    if (ordered) {
      if (listType !== 'ol') {
        closeList()
        html.push('<ol>')
        listType = 'ol'
      }
      html.push(`<li>${inline(ordered[1])}</li>`)
      i++
      continue
    }

    // 无序列表
    const unordered = line.match(/^\s*[-*+]\s+(.*)$/)
    if (unordered) {
      if (listType !== 'ul') {
        closeList()
        html.push('<ul>')
        listType = 'ul'
      }
      html.push(`<li>${inline(unordered[1])}</li>`)
      i++
      continue
    }

    // 空行
    if (!line.trim()) {
      closeList()
      i++
      continue
    }

    // 普通段落
    closeList()
    html.push(`<p>${inline(line)}</p>`)
    i++
  }

  closeList()
  return `<div class="md-root">${html.join('')}</div>`
}
