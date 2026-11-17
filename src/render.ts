import {
  clamp,
  ratioValue,
  templateFor,
  supportsBrandMark,
  type Settings,
  type Metadata,
  defaultElementTransform,
} from './model'
import {
  ensureTypography,
  getBrandTypography,
  getCameraTypography,
  textTypeface,
  libraryFontFamily,
} from './typography'
import { getBrandLogo, shouldTintBrandLogo } from './brand-logos'
import { resolveCameraSettings } from './camera-catalog'

const cache = new Map<string, Promise<HTMLImageElement>>()
const pendingDraws = new WeakMap<HTMLCanvasElement, object>()
const tintedLogos = new WeakMap<HTMLImageElement, { color: string; canvas: HTMLCanvasElement }>()

function tintLogo(image: HTMLImageElement, color: string) {
  const previous = tintedLogos.get(image)
  if (previous?.color === color) return previous.canvas
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  tintedLogos.set(image, { color, canvas })
  return canvas
}
export function loadImage(url: string) {
  if (!cache.has(url))
    cache.set(
      url,
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => {
          cache.delete(url)
          reject(new Error('图片加载失败，请检查文件格式'))
        }
        img.src = url
      }),
    )
  return cache.get(url)!
}
export function forgetImage(url: string) {
  cache.delete(url)
}

export function frameLayout(
  width: number,
  height: number,
  s: Settings,
  maxSide = 2400,
  evenDimensions = false,
) {
  const rotated = s.rotation % 180 !== 0
  const sw = rotated ? height : width,
    sh = rotated ? width : height
  const pad = s.padding / 100
  const template = templateFor(s.template)
  const footer = template.footer
  const top = template.top || 0
  const naturalRatio = (1 + pad * 2) / (sh / sw + pad * 2 + footer + top)
  const ratio = ratioValue(s, naturalRatio)
  const longSide = clamp(maxSide, 320, 8192)
  let w = Math.round(ratio >= 1 ? longSide : longSide * ratio)
  let h = Math.round(ratio >= 1 ? longSide / ratio : longSide)
  if (evenDimensions) {
    w -= w % 2
    h -= h % 2
  }
  const p = Math.min(w * pad, h * 0.15)
  const f = Math.min(w * footer, h * 0.3)
  const t = Math.min(w * top, h * 0.12)
  return {
    width: w,
    height: h,
    x: p,
    y: p + t,
    imageWidth: w - p * 2,
    imageHeight: Math.max(1, h - p * 2 - f - t),
    footer: f,
    padding: p,
    sourceWidth: sw,
    sourceHeight: sh,
  }
}
export type CanvasElement = {
  id: string
  kind: 'text' | 'logo'
  label: string
  text?: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  offsetX: number
  offsetY: number
}
type RenderSession = {
  settings: Settings
  width: number
  height: number
  elements: CanvasElement[]
}
const renderSessions = new WeakMap<CanvasRenderingContext2D, RenderSession>()
const canvasElements = new WeakMap<HTMLCanvasElement, CanvasElement[]>()
export const getCanvasElements = (canvas: HTMLCanvasElement) => canvasElements.get(canvas) || []
const elementLabels: Record<string, string> = {
  camera: '相机型号',
  caption: '作品文案',
  exif: '拍摄参数',
  details: '相机与参数',
  lens: '镜头名称',
  'date-location': '日期与地点',
  logo: '相机 Logo',
}
function positionElement(
  ctx: CanvasRenderingContext2D,
  id: string,
  kind: 'text' | 'logo',
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  draw: () => void,
  offsetX = 0,
  offsetY = 0,
  textValue?: string,
) {
  const session = renderSessions.get(ctx)
  const transform =
    id === 'logo'
      ? { ...defaultElementTransform, rotation: session?.settings.logoRotation || 0 }
      : session?.settings.elementLayouts?.[session.settings.template]?.[id] ||
        defaultElementTransform
  const cx = x + (transform.x / 100) * (session?.width || 0)
  const cy = y + (transform.y / 100) * (session?.height || 0)
  session?.elements.push({
    id,
    kind,
    label: elementLabels[id] || label,
    ...(textValue !== undefined ? { text: textValue } : {}),
    x: cx,
    y: cy,
    width: width * transform.scale,
    height: height * transform.scale,
    rotation: transform.rotation,
    offsetX,
    offsetY,
  })
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((transform.rotation * Math.PI) / 180)
  ctx.scale(transform.scale, transform.scale)
  draw()
  ctx.restore()
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  max: number,
  size: number,
  options: {
    color?: string
    weight?: number
    align?: CanvasTextAlign
    family?: string
    style?: 'normal' | 'italic'
    fit?: boolean
    id?: string
  } = {},
) {
  ctx.fillStyle = options.color || '#272b26'
  ctx.textAlign = options.align || 'left'
  ctx.textBaseline = 'middle'
  const id = options.id || `decoration:${value}`
  const settings = renderSessions.get(ctx)?.settings
  const face = settings && textTypeface(settings, id)
  const family = face
    ? libraryFontFamily(face)
    : options.family || 'StudioSans, "PingFang SC", "Microsoft YaHei", sans-serif'
  const fontSpec = (px: number) =>
    `${face?.style || options.style || 'normal'} ${face?.weight || options.weight || 400} ${px}px ${family}`
  ctx.font = fontSpec(size)
  if (options.fit)
    ctx.font = fontSpec(size * Math.min(1, max / Math.max(1, ctx.measureText(value).width)))
  let shown = value
  while (shown.length > 0 && ctx.measureText(shown).width > max) shown = shown.slice(0, -1)
  if (shown !== value && shown.length > 1) shown = shown.slice(0, -1) + '…'
  if (!shown) return
  const measured = ctx.measureText(shown)
  const width = Math.max(1, measured.width)
  const height =
    Math.max(
      size * 0.9,
      (measured.actualBoundingBoxAscent || size * 0.55) +
        (measured.actualBoundingBoxDescent || size * 0.25),
    ) * 1.15
  const centerX =
    x + (options.align === 'right' ? -width / 2 : options.align === 'center' ? 0 : width / 2)
  positionElement(
    ctx,
    id,
    options.id === 'logo' ? 'logo' : 'text',
    shown,
    centerX,
    y,
    width,
    height,
    () => {
      ctx.textAlign = 'center'
      ctx.fillText(shown, 0, 0)
    },
    0,
    0,
    value,
  )
}
const softBackgrounds = new WeakMap<object, { key: string; canvas: HTMLCanvasElement }>()
function softBackground(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  width: number,
  height: number,
) {
  const key = `${width}:${height}`
  const cached = softBackgrounds.get(source)
  if (cached?.key === key && source instanceof HTMLImageElement) return cached.canvas
  const canvas = cached?.canvas || document.createElement('canvas')
  canvas.width = Math.max(32, Math.round((320 * width) / Math.max(width, height)))
  canvas.height = Math.max(32, Math.round((320 * height) / Math.max(width, height)))
  const ctx = canvas.getContext('2d')!
  const scale = Math.max((canvas.width + 40) / sw, (canvas.height + 40) / sh)
  ctx.filter = 'blur(9px)'
  ctx.drawImage(
    source,
    (canvas.width - sw * scale) / 2,
    (canvas.height - sh * scale) / 2,
    sw * scale,
    sh * scale,
  )
  softBackgrounds.set(source, { key, canvas })
  return canvas
}

type MarkBounds = {
  x: number
  y: number
  width: number
  height: number
  offsetX: number
  offsetY: number
}
const brandAreas = new WeakMap<HTMLCanvasElement, MarkBounds>()
export const getBrandMarkBounds = (canvas: HTMLCanvasElement) => brandAreas.get(canvas)
function brandGeometry(
  g: ReturnType<typeof frameLayout>,
  s: Settings,
  logo: HTMLImageElement | null,
  size: number,
) {
  const centered = ['gallery', 'postcard', 'instant', 'stamp'].includes(s.template)
  const maxWidth = (g.width * 0.105 * s.logoScale) / 100
  const maxHeight = (g.footer * (centered ? 0.18 : 0.42) * s.logoScale) / 100
  const aspect = logo ? logo.width / logo.height : 4
  const width = Math.min(maxWidth, maxHeight * aspect),
    height = width / aspect
  const margin = Math.max(g.padding * 0.55, g.width * 0.022)
  const footerTop = g.y + g.imageHeight
  const left = Math.max(g.x, g.width * 0.035)
  let x = centered ? g.width / 2 : left + width / 2
  let y = centered ? footerTop + g.footer * 0.16 : footerTop + g.footer * 0.51 - size * 0.12
  if (s.template === 'editorial') {
    x = g.width - left - width / 2
    y = footerTop + g.footer * 0.52
  }
  if (s.logoPosition !== 'auto') {
    x = s.logoPosition.includes('left')
      ? margin + width / 2
      : s.logoPosition.includes('right')
        ? g.width - margin - width / 2
        : g.width / 2
    y = s.logoPosition.startsWith('top')
      ? margin + height / 2
      : s.logoPosition.startsWith('bottom')
        ? g.height - margin - height / 2
        : g.height / 2
  }
  const originX = x,
    originY = y
  x = clamp(x + (g.width * s.logoX) / 100, width / 2 + 1, g.width - width / 2 - 1)
  y = clamp(y + (g.height * s.logoY) / 100, height / 2 + 1, g.height - height / 2 - 1)
  return {
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
    offsetX: ((x - originX) / g.width) * 100,
    offsetY: ((y - originY) / g.height) * 100,
  }
}

export async function drawFrame(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  s: Settings,
  m: Metadata,
  maxSide = 2400,
  evenDimensions = false,
) {
  s = resolveCameraSettings(s, m)
  const g = frameLayout(sourceWidth, sourceHeight, s, maxSide, evenDimensions)
  const ticket = {}
  pendingDraws.set(canvas, ticket)
  await ensureTypography(s, m)
  const builtin = getBrandLogo(s)
  const logoUrl = s.showBrand && supportsBrandMark(s.template) ? s.logo || builtin?.src : undefined
  const logo = logoUrl ? await loadImage(logoUrl) : null
  // A slow asset from an earlier selection must not overwrite the latest preview.
  if (pendingDraws.get(canvas) !== ticket) return g
  if (canvas.width !== g.width || canvas.height !== g.height) {
    canvas.width = g.width
    canvas.height = g.height
  }
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, g.width, g.height)
  renderSessions.set(ctx, { settings: s, width: g.width, height: g.height, elements: [] })
  const rgb = s.color.replace('#', '')
  const dark =
    parseInt(rgb.slice(0, 2), 16) * 0.299 +
      parseInt(rgb.slice(2, 4), 16) * 0.587 +
      parseInt(rgb.slice(4, 6), 16) * 0.114 <
    128
  const color = s.textColor
  ctx.fillStyle = s.color
  ctx.fillRect(0, 0, g.width, g.height)
  if (s.template === 'blur') {
    ctx.drawImage(
      softBackground(source, sourceWidth, sourceHeight, g.width, g.height),
      0,
      0,
      g.width,
      g.height,
    )
    ctx.save()
    ctx.globalAlpha = 0.24
    ctx.fillStyle = s.color
    ctx.fillRect(0, 0, g.width, g.height)
    ctx.globalAlpha = 0.9
    ctx.fillRect(0, g.y + g.imageHeight + g.width * 0.025, g.width, g.height)
    ctx.restore()
  }
  if (s.template === 'stamp') {
    const edge = g.width * 0.018,
      hole = g.width * 0.007,
      step = g.width * 0.025
    ctx.fillStyle = dark ? '#363b31' : '#fffef8'
    ctx.fillRect(edge, edge, g.width - edge * 2, g.height - edge * 2)
    ctx.fillStyle = s.color
    for (let x = edge; x <= g.width - edge; x += step) {
      for (const y of [edge, g.height - edge]) {
        ctx.beginPath()
        ctx.arc(x, y, hole, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    for (let y = edge; y <= g.height - edge; y += step) {
      for (const x of [edge, g.width - edge]) {
        ctx.beginPath()
        ctx.arc(x, y, hole, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  if (s.template === 'mat' || s.template === 'slide') {
    const inset = g.width * (s.template === 'mat' ? 0.018 : 0.006)
    ctx.fillStyle = s.template === 'mat' ? '#fdfcf7' : '#4d5045'
    ctx.fillRect(g.x - inset, g.y - inset, g.imageWidth + inset * 2, g.imageHeight + inset * 2)
    ctx.strokeStyle = '#00000025'
    ctx.lineWidth = Math.max(1, g.width * 0.0012)
    ctx.strokeRect(g.x - inset, g.y - inset, g.imageWidth + inset * 2, g.imageHeight + inset * 2)
    ctx.strokeStyle = '#ffffffba'
    ctx.beginPath()
    ctx.moveTo(g.x - inset, g.y + g.imageHeight + inset)
    ctx.lineTo(g.x - inset, g.y - inset)
    ctx.lineTo(g.x + g.imageWidth + inset, g.y - inset)
    ctx.stroke()
  }
  ctx.save()
  const radius = Math.min(
    (s.radius / 100) * g.imageWidth,
    Math.min(g.imageHeight, g.imageWidth) / 2,
  )
  if (s.shadow > 0 || s.template === 'blur') {
    ctx.shadowColor = '#00000055'
    ctx.shadowBlur = ((s.shadow || 28) / 100) * g.width * 0.035
    ctx.shadowOffsetY = ((s.shadow || 28) / 100) * g.width * 0.012
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.roundRect(g.x, g.y, g.imageWidth, g.imageHeight, radius)
    ctx.fill()
    ctx.shadowColor = 'transparent'
  }
  ctx.beginPath()
  ctx.roundRect(g.x, g.y, g.imageWidth, g.imageHeight, radius)
  ctx.clip()
  const scale = Math.max(g.imageWidth / g.sourceWidth, g.imageHeight / g.sourceHeight) * s.zoom
  const overflowX = Math.max(0, g.sourceWidth * scale - g.imageWidth) / 2
  const overflowY = Math.max(0, g.sourceHeight * scale - g.imageHeight) / 2
  ctx.translate(
    g.x + g.imageWidth / 2 - (overflowX * s.offsetX) / 100,
    g.y + g.imageHeight / 2 - (overflowY * s.offsetY) / 100,
  )
  ctx.rotate((s.rotation * Math.PI) / 180)
  ctx.drawImage(
    source,
    (-sourceWidth * scale) / 2,
    (-sourceHeight * scale) / 2,
    sourceWidth * scale,
    sourceHeight * scale,
  )
  ctx.restore()
  if (s.template === 'instant') {
    ctx.strokeStyle = '#00000018'
    ctx.lineWidth = Math.max(1, g.width * 0.002)
    ctx.strokeRect(g.x, g.y, g.imageWidth, g.imageHeight)
  }
  const cameraFont = `"${getCameraTypography(s, m).family}", "PingFang SC", "Microsoft YaHei", sans-serif`
  const font =
    s.font === 'camera'
      ? cameraFont
      : s.font === 'serif'
        ? 'Georgia, "Songti SC", serif'
        : s.font === 'mono'
          ? 'StudioMono, "Courier New", monospace'
          : 'StudioSans, "PingFang SC", "Microsoft YaHei", sans-serif'
  const mono =
    s.font === 'camera' ? cameraFont : 'StudioMono, "Courier New", "PingFang SC", monospace'
  const size = (Math.max(9, g.width * 0.018) * s.textSize) / 100
  const tiny = size * 0.69
  const footerTop = g.y + g.imageHeight
  const cy = footerTop + g.footer * 0.51
  const left = Math.max(g.x, g.width * 0.035),
    right = g.width - left
  const muted = dark ? '#b2b5ac' : '#85877f'
  const mark = s.showBrand ? brandGeometry(g, s, logo, size) : null
  const groupMark = s.showBrand
    ? brandGeometry(g, { ...s, logoScale: 100, logoX: 0, logoY: 0 }, logo, size)
    : null
  const groupedBrand = Boolean(
    mark &&
    s.logoPosition === 'auto' &&
    !['gallery', 'postcard', 'instant', 'stamp', 'editorial'].includes(s.template),
  )
  const params = [
    m.focal && `${m.focal}mm`,
    m.aperture && `f/${m.aperture}`,
    m.shutter && `${m.shutter}s`,
    m.iso && `ISO ${m.iso}`,
  ]
    .filter(Boolean)
    .join('  ·  ')
  const sub = [s.showDate && m.date, s.showLocation && m.location].filter(Boolean).join('  /  ')
  if (['gallery', 'postcard', 'instant', 'stamp'].includes(s.template)) {
    text(
      ctx,
      m.caption || m.camera || 'A MOMENT TO REMEMBER',
      g.width / 2,
      footerTop + g.footer * (s.showBrand ? 0.43 : 0.38),
      g.width * 0.82,
      size * 1.2,
      {
        color,
        id: 'caption',
        family: ['gallery', 'instant'].includes(s.template) ? 'Georgia, "Songti SC", serif' : font,
        align: 'center',
      },
    )
    if (s.showExif)
      text(
        ctx,
        [m.camera, params].filter(Boolean).join('   /   '),
        g.width / 2,
        footerTop + g.footer * 0.66,
        g.width * 0.85,
        tiny,
        { color: muted, align: 'center', family: mono, id: 'details' },
      )
    if (sub)
      text(ctx, sub, g.width / 2, footerTop + g.footer * 0.84, g.width * 0.85, tiny * 0.8, {
        color: muted,
        id: 'date-location',
        align: 'center',
        family: mono,
      })
  } else if (s.template === 'editorial') {
    text(
      ctx,
      m.caption || 'THE ART OF SEEING',
      left,
      footerTop + g.footer * 0.36,
      g.width * (s.showBrand && s.logoPosition === 'auto' ? 0.72 : 0.88),
      size * 1.3,
      { color, family: 'Georgia, "Songti SC", serif', fit: true, id: 'caption' },
    )
    text(
      ctx,
      [m.camera, s.showExif && params].filter(Boolean).join('  /  '),
      left,
      footerTop + g.footer * 0.67,
      g.width * (s.showBrand && s.logoPosition === 'auto' ? 0.72 : 0.88),
      tiny,
      { color: muted, family: mono, id: 'details' },
    )
    if (sub)
      text(
        ctx,
        sub,
        left,
        footerTop + g.footer * 0.86,
        g.width * (s.showBrand && s.logoPosition === 'auto' ? 0.72 : 0.88),
        tiny * 0.8,
        {
          color: muted,
          id: 'date-location',
          family: mono,
        },
      )
  } else if (s.template === 'minimal') {
    const cameraLeft =
      groupedBrand && mark ? left + (groupMark?.width || 0) + g.width * 0.018 : left
    text(
      ctx,
      m.caption || m.camera || 'PHOTOSIDER',
      cameraLeft,
      cy,
      g.width * 0.5 - cameraLeft,
      size * 0.9,
      { color, family: font, fit: true, id: 'caption' },
    )
    if (s.showExif && params)
      text(ctx, params, right, cy - (sub ? size * 0.5 : 0), g.width * 0.43, size * 0.68, {
        color,
        id: 'exif',
        family: mono,
        align: 'right',
      })
    if (sub)
      text(
        ctx,
        sub,
        right,
        cy + (s.showExif && params ? size * 0.8 : 0),
        g.width * 0.43,
        tiny * 0.85,
        { color: muted, family: mono, align: 'right', id: 'date-location' },
      )
  } else {
    const hasSub = Boolean(sub)
    const hasBrand = groupedBrand
    const markWidth = groupMark?.width || 0
    const gap = g.width * 0.018
    const cameraLeft = hasBrand ? left + markWidth + gap : left
    const cameraWidth = Math.max(g.width * 0.12, g.width * 0.52 - cameraLeft)
    if (hasBrand) {
      ctx.save()
      ctx.strokeStyle = muted
      ctx.globalAlpha = 0.26
      ctx.lineWidth = Math.max(1, g.width / 1600)
      ctx.beginPath()
      ctx.moveTo(left + markWidth + gap * 0.45, cy - size * 0.78)
      ctx.lineTo(left + markWidth + gap * 0.45, cy + size * 0.98)
      ctx.stroke()
      ctx.restore()
    }
    text(
      ctx,
      m.camera || 'A MOMENT TO REMEMBER',
      cameraLeft,
      cy - (hasSub ? size * 0.48 : 0),
      cameraWidth,
      size,
      { color, weight: 600, family: font, fit: true, id: 'camera' },
    )
    if (sub)
      text(ctx, sub, cameraLeft, cy + size * 0.9, cameraWidth, tiny, {
        color: muted,
        family: mono,
        id: 'date-location',
      })
    if (s.showExif)
      text(ctx, params, right, cy - (m.lens ? size * 0.52 : 0), g.width * 0.39, size * 0.75, {
        color,
        id: 'exif',
        family: mono,
        align: 'right',
      })
    if (s.showExif && m.lens)
      text(ctx, m.lens, right, cy + size * 0.96, g.width * 0.39, tiny, {
        color: muted,
        id: 'lens',
        family: font,
        align: 'right',
      })
  }
  if (s.template === 'sprocket') {
    ctx.fillStyle = '#ddd9bc'
    const step = g.width * 0.048,
      holeWidth = g.width * 0.027,
      holeHeight = g.width * 0.018
    for (let x = g.width * 0.04; x < g.width * 0.96 - holeWidth; x += step) {
      for (const y of [g.width * 0.026, g.height - g.width * 0.044]) {
        ctx.beginPath()
        ctx.roundRect(x, y, holeWidth, holeHeight, g.width * 0.003)
        ctx.fill()
      }
    }
    text(
      ctx,
      '35  /  FRAME 01  /  135 COLOR NEGATIVE',
      g.width / 2,
      g.width * 0.067,
      g.width * 0.75,
      tiny * 0.66,
      { color: '#c5a46c', family: mono, align: 'center' },
    )
  }
  if (s.template === 'cinema') {
    text(ctx, 'C I N E M A   /   0 1', left, g.y * 0.48, g.width * 0.5, tiny * 0.74, {
      color: '#b8baa9',
      family: mono,
    })
    text(ctx, 'A FRAME TO REMEMBER', right, g.y * 0.48, g.width * 0.4, tiny * 0.65, {
      color: '#b8baa9',
      family: mono,
      align: 'right',
    })
    ctx.fillStyle = '#a6a58955'
    ctx.fillRect(
      g.x,
      g.y - Math.max(1, g.width * 0.001),
      g.imageWidth,
      Math.max(1, g.width * 0.001),
    )
  }
  if (s.template === 'stamp') {
    text(
      ctx,
      'P O S T A L   M E M O R Y   /   0 1',
      g.width / 2,
      g.y * 0.55,
      g.width * 0.78,
      tiny * 0.67,
      { color: muted, family: mono, align: 'center' },
    )
    ctx.save()
    ctx.strokeStyle = '#66735b55'
    ctx.lineWidth = Math.max(1, g.width * 0.001)
    for (let index = 0; index < 3; index++) {
      ctx.beginPath()
      ctx.arc(
        g.width * 0.86,
        footerTop + g.footer * 0.48,
        g.width * (0.025 + index * 0.006),
        0,
        Math.PI * 2,
      )
      ctx.stroke()
    }
    ctx.restore()
  }
  if (s.template === 'editorial') {
    const fade = ctx.createLinearGradient(0, g.y, 0, g.y + g.imageHeight * 0.32)
    fade.addColorStop(0, '#141c1860')
    fade.addColorStop(1, '#141c1800')
    ctx.fillStyle = fade
    ctx.fillRect(g.x, g.y, g.imageWidth, g.imageHeight * 0.32)
    text(ctx, 'FIELDNOTES', g.width / 2, g.y + g.width * 0.074, g.width * 0.88, g.width * 0.098, {
      color: '#fffdf4',
      weight: 600,
      family: 'Georgia, serif',
      align: 'center',
      fit: true,
    })
    text(
      ctx,
      'A VISUAL JOURNAL  /  ISSUE 01',
      g.width / 2,
      g.y + g.width * 0.137,
      g.width * 0.86,
      tiny * 0.85,
      { color: '#fffdf4', family: mono, align: 'center' },
    )
    const barcodeX = g.width * 0.88,
      barcodeY = g.y + g.imageHeight - g.width * 0.095
    ctx.fillStyle = '#fffdf4e8'
    ctx.fillRect(
      barcodeX - g.width * 0.01,
      barcodeY - g.width * 0.01,
      g.width * 0.085,
      g.width * 0.07,
    )
    ctx.fillStyle = '#353c33'
    let position = 0
    for (let index = 0; index < 20; index++) {
      const stroke = g.width * (index % 3 === 0 ? 0.0025 : 0.001)
      ctx.fillRect(barcodeX + position, barcodeY, stroke, g.width * 0.037)
      position += stroke + g.width * 0.0015
    }
  }
  if (s.template === 'slide') {
    text(ctx, 'COLOR SLIDE', left, g.y * 0.46, g.width * 0.48, tiny * 0.8, {
      color: '#748075',
      weight: 600,
      family: mono,
    })
    text(ctx, '01  /  E-6', right, g.y * 0.46, g.width * 0.3, tiny * 0.75, {
      color: '#7d8272',
      family: mono,
      align: 'right',
    })
    ctx.fillStyle = '#637d8a'
    ctx.fillRect(left, g.y * 0.65, g.width * 0.065, g.width * 0.004)
  }
  if (s.template === 'film') {
    text(
      ctx,
      '◼  PORTRA 400',
      left,
      g.y + Math.max(size, g.padding / 2),
      g.width * 0.3,
      tiny * 0.75,
      { color: '#e2af74', family: mono },
    )
  }
  if (mark) {
    brandAreas.set(canvas, mark)
    if (logo) {
      const artwork = builtin && shouldTintBrandLogo(s, builtin) ? tintLogo(logo, color) : logo
      positionElement(
        ctx,
        'logo',
        'logo',
        '相机 Logo',
        mark.x + mark.width / 2,
        mark.y + mark.height / 2,
        mark.width,
        mark.height,
        () => ctx.drawImage(artwork, -mark.width / 2, -mark.height / 2, mark.width, mark.height),
        mark.offsetX,
        mark.offsetY,
      )
    } else {
      const face = getBrandTypography(s)
      text(
        ctx,
        face.label,
        mark.x + mark.width / 2,
        mark.y + mark.height / 2,
        mark.width,
        Math.min(
          (size * (face.id === 'courgette' ? 1.05 : 0.85) * s.logoScale) / 100,
          mark.height * 0.95,
        ),
        {
          id: 'logo',
          color,
          family: `"${face.family}", sans-serif`,
          style: face.style,
          weight: face.weight,
          align: 'center',
          fit: true,
        },
      )
    }
  } else brandAreas.delete(canvas)
  canvasElements.set(canvas, renderSessions.get(ctx)?.elements || [])
  renderSessions.delete(ctx)
  return g
}
export function canvasBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.96) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('导出失败，图片尺寸可能过大'))),
      type,
      quality,
    ),
  )
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
