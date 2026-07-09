import { useState, useEffect, useCallback } from 'react'

const sourceOptions = ['Reuters', 'The Guardian', 'BBC Top Story', 'TechCrunch']
const categoryOptions = ['Politics', 'Technology', 'Entertainment', 'Finance', 'Sports', 'Health']
const DIFY_URL = import.meta.env.VITE_DIFY_URL || ''
const DIFY_API_KEY = import.meta.env.VITE_DIFY_API_KEY || ''
const HISTORY_KEY = 'news_reporter_history'

const t = {
  en: {
    appTitle: 'News for Students',
    langToggle: '中',
    sectionTitle: 'Select Authoritative Source / Category',
    sourceLabel: 'AUTHORITATIVE SOURCES',
    categoryLabel: 'SELECT CATEGORY',
    generate: 'Generate Document',
    generating: 'Generating...',
    newsPreview: 'News report preview',
    personalReflection: 'Personal reflection',
    sourceMeta: 'Source',
    categoryMeta: 'Category',
    openSource: 'Open original source',
    generated: 'Report generated successfully!',
    docxDone: 'DOCX downloaded',
    pdfDone: 'PDF opened for print',
    mdDone: 'Markdown downloaded',
    shared: 'Shared',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    contact: 'Contact Support',
    copy: '© 2024 News for Students. Driven by Visionary AI.',
    defaultHeadline: 'Pick a source and category, then generate your report',
    defaultSummary:
      'Your report will appear here after you click Generate Document. The output includes the source, date, concise summary, and a natural personal reflection.',
    defaultPersonal:
      'I have not generated a report yet, so this section will update once the workflow runs.',
    dlLabel: 'Source',
    dlDate: 'Date',
    dlSummary: 'Summary',
    dlReflection: 'Personal Reflection',
    historyTitle: 'History',
    newReport: '+ New Report',
    noHistory: 'No saved reports',
    deleteTitle: 'Delete',
  },
  zh: {
    appTitle: '每日新闻播报',
    langToggle: 'EN',
    sectionTitle: '选择权威来源 / 新闻类别',
    sourceLabel: '权威来源',
    categoryLabel: '新闻类别',
    generate: '生成文档',
    generating: '生成中...',
    newsPreview: '新闻报告预览',
    personalReflection: '个人总结',
    sourceMeta: '来源',
    categoryMeta: '类别',
    openSource: '查看原文',
    generated: '报告生成成功！',
    docxDone: 'DOCX 已下载',
    pdfDone: 'PDF 打印窗口已打开',
    mdDone: 'Markdown 已下载',
    shared: '已分享',
    privacy: '隐私政策',
    terms: '服务条款',
    contact: '联系我们',
    copy: '© 2024 每日新闻播报. AI 驱动.',
    defaultHeadline: '选择新闻来源和类别，然后生成报告',
    defaultSummary: '点击"生成文档"后，你的新闻报告将在这里显示。报告包含来源、日期、摘要和个人总结。',
    defaultPersonal: '我还没有生成报告，这部分会在工作流运行后更新。',
    dlLabel: '来源',
    dlDate: '日期',
    dlSummary: '摘要',
    dlReflection: '个人总结',
    historyTitle: '历史记录',
    newReport: '+ 新建报告',
    noHistory: '暂无保存的报告',
    deleteTitle: '删除',
  },
}

function defaultReport(lang) {
  const u = t[lang] || t.en
  return {
    source: 'Reuters',
    date: 'Jul 7, 2026',
    headline: u.defaultHeadline,
    headlineZh: '',
    summary: u.defaultSummary,
    summaryZh: '',
    personal: u.defaultPersonal,
    personalZh: '',
    link: '',
  }
}

/* ---------- localStorage ---------- */

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
}

/* ---------- helpers ---------- */

function extractJson(text) {
  let cleaned = text.trim()
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) cleaned = codeBlock[1].trim()
  return cleaned
}

function htmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDate(dateStr) {
  if (!dateStr || dateStr.includes('DD') || dateStr.includes('YYYY') || dateStr === 'Mon DD, YYYY') {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  return dateStr
}

function parseDifyAnswer(payload) {
  // Workflow with multiple branches produces text, text_1, text_2 etc.
  // Find the first non-null output
  const outputs = payload?.data?.outputs || {}
  const text =
    Object.values(outputs).find((v) => v != null) ||
    payload?.answer ||
    payload?.data?.answer ||
    ''
  if (!text) {
    const errMsg = payload?.data?.error || JSON.stringify(payload)
    throw new Error(errMsg)
  }
  try {
    const parsed = JSON.parse(extractJson(text))
    return {
      source: parsed.source || 'Unknown',
      date: formatDate(parsed.date),
      headline: parsed.headline || parsed.title || 'Generated News Report',
      headlineZh: parsed.headline_zh || '',
      summary: parsed.summary || '',
      summaryZh: parsed.summary_zh || '',
      personal: parsed.personal_reflection || parsed.personal || '',
      personalZh: parsed.personal_reflection_zh || '',
      link: parsed.url || parsed.link || '',
    }
  } catch {
    return {
      source: 'Unknown',
      date: formatDate(''),
      headline: 'Generated News Report',
      headlineZh: '',
      summary: text,
      summaryZh: '',
      personal: '',
      personalZh: '',
      link: '',
    }
  }
}

function buildReportMarkdown(report, lang) {
  const u = t[lang] || t.en
  const safeDate = formatDate(report.date)
  return [
    `# ${report.headline}`,
    '',
    `**${u.dlLabel}:** ${report.source}`,
    `**${u.dlDate}:** ${safeDate}`,
    report.link ? `**Link:** ${report.link}` : '',
    '',
    `## ${u.dlSummary}`,
    report.summary,
    '',
    `## ${u.dlReflection}`,
    report.personal,
  ]
    .filter((l) => l !== undefined)
    .join('\n')
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function handleDownloadMD(report, lang) {
  const md = buildReportMarkdown(report, lang)
  downloadFile(md, `news-report-${Date.now()}.md`, 'text/markdown')
}

function handleDownloadDOCX(report, lang) {
  const u = t[lang] || t.en
  const safeDate = formatDate(report.date)
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>News Report</title></head>
<body>
<h1>${htmlEscape(report.headline)}</h1>
<p><strong>${u.dlLabel}:</strong> ${htmlEscape(report.source)}</p>
<p><strong>${u.dlDate}:</strong> ${htmlEscape(safeDate)}</p>
${report.link ? `<p><strong>Link:</strong> <a href="${htmlEscape(report.link)}">${htmlEscape(report.link)}</a></p>` : ''}
<h2>${u.dlSummary}</h2>
<p>${htmlEscape(report.summary)}</p>
<h2>${u.dlReflection}</h2>
<p>${htmlEscape(report.personal)}</p>
</body>
</html>`
  downloadFile(html, `news-report-${Date.now()}.doc`, 'application/msword')
}

function handleDownloadPDF(report, lang) {
  const u = t[lang] || t.en
  const safeDate = formatDate(report.date)
  const content = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>News Report</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 60px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 26px; margin-bottom: 8px; }
  .meta { color: #666; font-size: 14px; margin-bottom: 32px; }
  .meta p { margin: 2px 0; }
  h2 { font-size: 18px; margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  p { font-size: 15px; }
  .reflection { font-style: italic; color: #333; }
</style>
</head>
<body>
<h1>${htmlEscape(report.headline)}</h1>
<div class="meta">
  <p><strong>${u.dlLabel}:</strong> ${htmlEscape(report.source)}</p>
  <p><strong>${u.dlDate}:</strong> ${htmlEscape(safeDate)}</p>
  ${report.link ? `<p><strong>Link:</strong> ${htmlEscape(report.link)}</p>` : ''}
</div>
<h2>${u.dlSummary}</h2>
<p>${htmlEscape(report.summary)}</p>
<h2>${u.dlReflection}</h2>
<p class="reflection">${htmlEscape(report.personal)}</p>
</body>
</html>`
  const blob = new Blob([content], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => { win.print(); URL.revokeObjectURL(url) }
  }
}

async function handleShare(report, lang) {
  const text = buildReportMarkdown(report, lang)
  if (navigator.share) {
    try { await navigator.share({ title: report.headline, text }) } catch {}
  } else {
    await navigator.clipboard.writeText(text)
  }
}

/* ========== Component ========== */

export default function App() {
  const [lang, setLang] = useState('en')
  const [selectedSource, setSelectedSource] = useState('Reuters')
  const [selectedCategory, setSelectedCategory] = useState('Technology')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(() => defaultReport('en'))
  const [showZh, setShowZh] = useState(false)
  const [toast, setToast] = useState(null)
  const [history, setHistory] = useState(loadHistory)
  const [activeId, setActiveId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const u = t[lang] || t.en

  const displayReport =
    showZh && report.headlineZh
      ? { ...report, headline: report.headlineZh, summary: report.summaryZh, personal: report.personalZh }
      : report

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  const switchLang = () => setLang((p) => (p === 'en' ? 'zh' : 'en'))

  /* -- history helpers -- */

  const addToHistory = useCallback((r) => {
    const entry = { ...r, id: Date.now().toString(), createdAt: Date.now() }
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 50)
      saveHistory(next)
      return next
    })
    setActiveId(entry.id)
    setReport(r)
  }, [])

  const deleteFromHistory = (id) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id)
      saveHistory(next)
      return next
    })
    if (activeId === id) {
      setActiveId(null)
      setReport(defaultReport(lang))
    }
  }

  const loadFromHistory = (item) => {
    setActiveId(item.id)
    setReport(item)
    setShowZh(false)
    setSelectedSource(item.source)
    setSelectedCategory(item.category || 'Technology')
  }

  const startNew = () => {
    setActiveId(null)
    setReport(defaultReport(lang))
    setShowZh(false)
    setError('')
  }

  /* -- generate -- */

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError('')
    setShowZh(false)

    try {
      if (!DIFY_URL) throw new Error('Missing VITE_DIFY_URL in environment variables')

      const response = await fetch(DIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(DIFY_API_KEY ? { Authorization: `Bearer ${DIFY_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          inputs: {
            source: selectedSource,
            category: selectedCategory,
            language: lang === 'zh' ? 'Chinese' : 'English',
            today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            weekAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
          },
          response_mode: 'blocking',
          user: 'news-reporter-user',
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Dify ${response.status}: ${body}`)
      }

      const payload = await response.json()

      if (payload?.data?.status === 'failed') {
        throw new Error(payload.data.error || 'Workflow execution failed')
      }

      const nextReport = parseDifyAnswer(payload)
      const enriched = { ...nextReport, source: nextReport.source || selectedSource, category: selectedCategory }
      addToHistory(enriched)
      showToast(u.generated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  const isViewingHistory = activeId !== null

  /* ========== RENDER ========== */

  return (
    <div className={`page ${sidebarOpen ? 'sidebarOpen' : ''}`}>
      {toast && (
        <div className={`toast ${toast.type}`} onClick={() => setToast(null)}>
          <span className="toastIcon">{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.message}
        </div>
      )}

      {/* ---- sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebarHead">
          <span className="sidebarTitle">{u.historyTitle}</span>
          <button className="sidebarClose" type="button" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
        </div>

        <button className="newReportBtn" type="button" onClick={startNew}>
          {u.newReport}
        </button>

        <div className="historyList">
          {history.length === 0 ? (
            <div className="historyEmpty">{u.noHistory}</div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className={`historyItem ${activeId === item.id ? 'historyActive' : ''}`}
                onClick={() => loadFromHistory(item)}
              >
                <div className="historyItemTop">
                  <span className="historyDate">{item.date}</span>
                  <button
                    className="historyDelete"
                    type="button"
                    title={u.deleteTitle}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFromHistory(item.id)
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="historySource">{item.source}</div>
                <div className="historyHeadline">{item.headline}</div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ---- main ---- */}
      <div className="mainWrap">
        <header className="topbar">
          <div className="topbarLeft">
            <button className="hamburger" type="button" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <div className="brand">
              <div className="brandMark">▦</div>
              <div>
                <h1>{u.appTitle}</h1>
              </div>
            </div>
          </div>
          <div className="topbarRight">
            <button className="langToggle" type="button" onClick={switchLang}>
              {u.langToggle}
            </button>
            <div className="avatar" aria-label="profile" />
          </div>
        </header>

        <main className="shell">
          {!isViewingHistory && (
            <>
              <section className="section">
                <h2>{u.sectionTitle}</h2>

                <div className="sourceSection">
                  <div className="sectionLabel">{u.sourceLabel}</div>
                  <div className="pillRow sourceRow">
                    {sourceOptions.map((item) => (
                      <button
                        key={item}
                        className={`pill ${selectedSource === item ? 'active' : ''}`}
                        onClick={() => setSelectedSource(item)}
                        type="button"
                      >
                        <span className="pillIcon">◉</span>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="categoryBlock">
                  <div className="sectionLabel">{u.categoryLabel}</div>
                  <div className="pillRow categories">
                    {categoryOptions.map((item) => (
                      <button
                        key={item}
                        className={`chip ${selectedCategory === item ? 'chipActive' : ''}`}
                        onClick={() => setSelectedCategory(item)}
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="generateSection">
                <button
                  className="generateButton"
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedSource || !selectedCategory}
                >
                  <span className="docIcon">▣</span>
                  {isGenerating ? u.generating : u.generate}
                </button>
              </section>
            </>
          )}

          {error ? <div className="errorBanner">{error}</div> : null}

          {isViewingHistory && (
            <div className="viewingBanner">
              正在查看历史报告 —{' '}
              <button type="button" className="backLink" onClick={startNew}>
                {u.newReport}
              </button>
            </div>
          )}

          <section className="reportCard">
            <div className="reportHeader">
              <div className="reportIdentity">
                <div className="reportBadge">◧</div>
                <div>
                  <div className="reportSource">{report.source}</div>
                  <div className="reportDate">{report.date}</div>
                </div>
              </div>

              <div className="formatActions">
                {report.headlineZh && (
                  <button
                    className={`langToggle ${showZh ? 'langActive' : ''}`}
                    type="button"
                    onClick={() => setShowZh(!showZh)}
                  >
                    {showZh ? 'EN' : '中'}
                  </button>
                )}
                <button
                  className="formatBtn formatBtn0"
                  type="button"
                  onClick={() => { handleDownloadDOCX(displayReport, lang); showToast(u.docxDone) }}
                >
                  .docx
                </button>
                <button
                  className="formatBtn formatBtn1"
                  type="button"
                  onClick={() => { handleDownloadPDF(displayReport, lang); showToast(u.pdfDone) }}
                >
                  PDF
                </button>
                <button
                  className="formatBtn formatBtn2"
                  type="button"
                  onClick={() => { handleDownloadMD(displayReport, lang); showToast(u.mdDone) }}
                >
                  MD
                </button>
                <button
                  className="iconBtn"
                  type="button"
                  aria-label="share"
                  onClick={async () => {
                    await handleShare(displayReport, lang)
                    showToast(u.shared)
                  }}
                >
                  ⤴
                </button>
              </div>
            </div>

            <div className="metaRow">
              <span className="metaTag">
                {u.sourceMeta}: {report.source}
              </span>
              <span className="metaTag">
                {u.categoryMeta}: {report.category || selectedCategory}
              </span>
              {report.link ? (
                <a className="metaLink" href={report.link} target="_blank" rel="noreferrer">
                  {u.openSource}
                </a>
              ) : null}
            </div>

            <div className="contentGrid">
              <article className="documentColumn">
                <div className="titleRow">
                  <span className="miniIcon">▣</span>
                  <h3>{u.newsPreview}</h3>
                </div>
                <h4 className="headline">{displayReport.headline}</h4>
                <p className="documentText">{displayReport.summary}</p>
              </article>

              <aside className="takeawayColumn">
                <div className="titleRow takeawayTitleRow">
                  <span className="miniIcon blue">✦</span>
                  <h3>{u.personalReflection}</h3>
                </div>
                <p className="takeawayText">{displayReport.personal}</p>
              </aside>
            </div>
          </section>
        </main>

        <footer className="footer">
          <div className="footerBrand">{u.appTitle}</div>
          <nav className="footerLinks">
            <span>{u.privacy}</span>
            <span>{u.terms}</span>
            <span>{u.contact}</span>
          </nav>
          <div className="footerCopy">{u.copy}</div>
        </footer>
      </div>
    </div>
  )
}
