export const printPapers = {
  a4: { name: 'A4 · 210 × 297 mm', width: 210, height: 297 },
  letter: { name: 'Letter · 216 × 279 mm', width: 215.9, height: 279.4 },
  photo: { name: '6 寸照片 · 102 × 152 mm', width: 101.6, height: 152.4 },
}
export type PrintOptions = {
  paper: keyof typeof printPapers
  orientation: 'auto' | 'portrait' | 'landscape'
  margin: number
}

/** Open during the click event, before rendering, so mobile popup blockers allow it. */
export function createPrintPreview(options: PrintOptions) {
  const view = window.open('', '_blank')
  if (!view) throw new Error('打印预览未能打开，请允许此网站弹出窗口后重试')
  view.opener = null
  const doc = view.document
  doc.documentElement.lang = 'zh-CN'
  doc.title = 'Photosider · 打印作品'
  const viewport = doc.createElement('meta')
  viewport.name = 'viewport'
  viewport.content = 'width=device-width, initial-scale=1'
  const paper = printPapers[options.paper] || printPapers.a4
  const margin = Math.min(20, Math.max(0, options.margin))
  const fontUrl = new URL('/fonts/brands/source-sans-3.ttf', window.location.href).href
  const chineseUrl = new URL('/fonts/curated/source-han-sans.woff2', window.location.href).href
  const style = doc.createElement('style')
  style.textContent = `
    @font-face {font-family:PrintSans;src:url('${fontUrl}');font-weight:200 900;font-display:swap}
    @font-face {font-family:PrintChinese;src:url('${chineseUrl}');font-display:swap}
    * {box-sizing:border-box}
    body {margin:0;background:#eeefe7;color:#45523c;font:14px PrintSans,PrintChinese,sans-serif}
    .print-toolbar {position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 28px;background:#fafbf5f2;border-bottom:1px solid #dce3d0;backdrop-filter:blur(10px)}
    h1 {font-size:20px;letter-spacing:-.4px;margin:0 0 3px}
    .print-status {font-size:12px;color:#919d82;margin:0}
    .print-actions {display:flex;gap:10px;flex-shrink:0}
    button {font:inherit;min-height:42px;border-radius:6px;cursor:pointer;padding:0 18px;border:1px solid #d5dfc7;background:#f4f7eb;color:#6f835b}
    button:focus-visible {outline:2px solid #b77855;outline-offset:3px}
    button.primary {background:#788e60;color:#fffef3;border-color:#788e60;font-weight:600}
    button:disabled {opacity:.45;cursor:wait}
    main {padding:28px 16px;display:flex;flex-direction:column;align-items:center;gap:24px}
    .print-sheet {background:white;box-shadow:0 4px 22px #26342118;flex-shrink:0;overflow:hidden}
    .print-image {width:100%;height:100%;margin:0}
    .print-sheet img {width:100%;height:100%;object-fit:contain;display:block}
    @page {size:${paper.width}mm ${paper.height}mm;margin:${margin}mm}
    @page photosider-portrait {size:${paper.width}mm ${paper.height}mm;margin:${margin}mm}
    @page photosider-landscape {size:${paper.height}mm ${paper.width}mm;margin:${margin}mm}
    @media (max-width:600px) {.print-toolbar {align-items:flex-start;flex-direction:column;padding:16px 20px;gap:12px}.print-actions{width:100%}.print-actions button.primary{flex:1}main{padding:18px 12px;gap:18px}}
    @media print {
      html,body {margin:0;padding:0;background:white}
      .print-toolbar {display:none!important}
      main {display:block;padding:0;margin:0}
      .print-sheet {margin:0;padding:0!important;box-shadow:none;break-inside:avoid;break-after:page;aspect-ratio:auto!important;width:var(--content-width)!important;height:var(--content-height)!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .print-sheet:last-child {break-after:auto}
      .print-image {padding:0!important}
    }
  `
  doc.head.append(viewport, style)
  const toolbar = doc.createElement('header')
  toolbar.className = 'print-toolbar'
  const heading = doc.createElement('div')
  const title = doc.createElement('h1')
  title.textContent = 'Photosider / 打印预览'
  const status = doc.createElement('p')
  status.className = 'print-status'
  status.setAttribute('role', 'status')
  status.textContent = '正在准备作品，请稍候…'
  heading.append(title, status)
  const actions = doc.createElement('div')
  actions.className = 'print-actions'
  const close = doc.createElement('button')
  close.textContent = '关闭预览'
  close.onclick = () => view.close()
  const print = doc.createElement('button')
  print.className = 'primary'
  print.textContent = '打印 / 保存为 PDF'
  print.disabled = true
  print.onclick = () => {
    try {
      view.focus()
      view.print()
    } catch {
      status.textContent = '未能打开打印窗口，可通过浏览器菜单打印，或返回应用下载作品。'
    }
  }
  actions.append(close, print)
  toolbar.append(heading, actions)
  const pages = doc.createElement('main')
  pages.setAttribute('aria-label', '待打印作品')
  doc.body.replaceChildren(toolbar, pages)
  const urls: string[] = []
  const release = () => {
    urls.splice(0).forEach((url) => URL.revokeObjectURL(url))
  }
  view.addEventListener('pagehide', release, { once: true })
  const checkOpen = () => {
    if (view.closed) throw new Error('已关闭打印预览')
  }
  return {
    close: () => {
      release()
      if (!view.closed) view.close()
    },
    async addPage(blob: Blob, name: string, width: number, height: number) {
      checkOpen()
      const landscape =
        options.orientation === 'landscape' || (options.orientation === 'auto' && width > height)
      const pageWidth = landscape ? paper.height : paper.width
      const pageHeight = landscape ? paper.width : paper.height
      const sheet = doc.createElement('section')
      sheet.className = 'print-sheet'
      sheet.style.page = landscape ? 'photosider-landscape' : 'photosider-portrait'
      sheet.style.width = `min(100%, ${pageWidth}mm)`
      sheet.style.aspectRatio = `${pageWidth} / ${pageHeight}`
      // Screen preview includes the paper margins; @page supplies them on paper.
      sheet.style.setProperty('--content-width', `${pageWidth - margin * 2}mm`)
      sheet.style.setProperty('--content-height', `${pageHeight - margin * 2 - 0.2}mm`)
      const image = doc.createElement('img')
      const frame = doc.createElement('figure')
      frame.className = 'print-image'
      frame.style.padding = `${(margin / pageWidth) * 100}%`
      image.alt = name
      const url = URL.createObjectURL(blob)
      urls.push(url)
      image.src = url
      frame.append(image)
      sheet.append(frame)
      pages.append(sheet)
      await image.decode()
      checkOpen()
    },
    async print(isCancelled?: () => boolean) {
      checkOpen()
      status.textContent = `${pages.children.length} 张作品 · 每张一页 · ${paper.name.split(' · ')[0]}`
      print.disabled = false
      // Artwork fonts are already baked into the PNG. Only wait for layout,
      // with a fallback when the preview is backgrounded or closed meanwhile.
      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 100)
        view.requestAnimationFrame(() => {
          window.clearTimeout(timeout)
          resolve()
        })
      })
      checkOpen()
      if (isCancelled?.()) throw new Error('已取消打印准备')
      view.focus()
      try {
        view.print()
      } catch {
        status.textContent = '作品已准备好，请点击上方“打印 / 保存为 PDF”继续。'
      }
    },
  }
}
