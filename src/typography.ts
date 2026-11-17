import { supportsBrandMark, type Metadata, type Settings } from './model'
import { getBrandLogo } from './brand-logos'
import { getCameraBrand, resolveCameraSettings } from './camera-catalog'

export { brandNames } from './camera-catalog'
export type BrandFontId =
  | 'studio'
  | 'besley'
  | 'source-sans'
  | 'barlow'
  | 'barlow-italic'
  | 'baskerville'
  | 'courgette'
  | 'chakra'
  | 'belleza'
  | 'manrope'
export type Typeface = {
  id: BrandFontId
  name: string
  family: string
  weight: number
  style: 'normal' | 'italic'
}
export const typefaces: Typeface[] = [
  { id: 'studio', name: 'DM Sans · 现代', family: 'StudioSans', weight: 700, style: 'normal' },
  {
    id: 'besley',
    name: 'Besley · 经典粗衬线',
    family: 'BrandBesley',
    weight: 700,
    style: 'normal',
  },
  {
    id: 'source-sans',
    name: 'Source Sans 3 · 人文无衬线',
    family: 'BrandSourceSans',
    weight: 600,
    style: 'normal',
  },
  {
    id: 'barlow',
    name: 'Barlow · 精密无衬线',
    family: 'BrandBarlow',
    weight: 700,
    style: 'normal',
  },
  {
    id: 'barlow-italic',
    name: 'Barlow Bold Italic · 运动斜体',
    family: 'BrandBarlow',
    weight: 700,
    style: 'italic',
  },
  {
    id: 'baskerville',
    name: 'Libre Baskerville · 古典衬线',
    family: 'BrandBaskerville',
    weight: 700,
    style: 'normal',
  },
  {
    id: 'courgette',
    name: 'Courgette · 手写签名',
    family: 'BrandCourgette',
    weight: 400,
    style: 'normal',
  },
  {
    id: 'chakra',
    name: 'Chakra Petch · 工业刻字',
    family: 'BrandChakra',
    weight: 600,
    style: 'normal',
  },
  {
    id: 'belleza',
    name: 'Belleza · 优雅人文',
    family: 'BrandBelleza',
    weight: 400,
    style: 'normal',
  },
  {
    id: 'manrope',
    name: 'Manrope · 几何无衬线',
    family: 'BrandManrope',
    weight: 700,
    style: 'normal',
  },
]
const profiles: Record<string, { label: string; wordmark: BrandFontId; metadata: BrandFontId }> = {
  PHOTOSIDER: { label: 'PHOTOSIDER', wordmark: 'studio', metadata: 'studio' },
  SONY: { label: 'SONY', wordmark: 'besley', metadata: 'source-sans' },
  FUJIFILM: { label: 'FUJIFILM', wordmark: 'barlow', metadata: 'barlow' },
  NIKON: { label: 'Nikon', wordmark: 'barlow-italic', metadata: 'barlow' },
  CANON: { label: 'Canon', wordmark: 'baskerville', metadata: 'source-sans' },
  LEICA: { label: 'Leica', wordmark: 'courgette', metadata: 'chakra' },
  HASSELBLAD: { label: 'HASSELBLAD', wordmark: 'belleza', metadata: 'belleza' },
  LUMIX: { label: 'LUMIX', wordmark: 'manrope', metadata: 'barlow' },
  APPLE: { label: 'Apple', wordmark: 'manrope', metadata: 'manrope' },
}
const findTypeface = (id: string) => typefaces.find((f) => f.id === id) || typefaces[0]
export type LibraryFont = Omit<Typeface, 'id'> & {
  id: string
  category: '无衬线' | '衬线' | '手写' | '艺术' | '等宽'
  language: '中文' | '西文'
  keywords: string
  usage: string
}
export const libraryFonts: LibraryFont[] = [
  ...[
    [
      'source-han-sans',
      '思源黑体',
      'PhotoHanSans',
      '无衬线',
      'source han sans siyuan heiti',
      '清晰克制 · 相机信息、拍摄参数',
    ],
    [
      'source-han-serif',
      '思源宋体',
      'PhotoHanSerif',
      '衬线',
      'source han serif siyuan songti',
      '细腻人文 · 画廊题注、旅行文案',
    ],
    [
      'zcool-xiaowei',
      '站酷小微 Logo 体',
      'PhotoXiaoWei',
      '衬线',
      'zcool xiaowei zhan ku logo',
      '古朴有力 · 邮票、复古标题',
    ],
    [
      'zcool-huangyou',
      '站酷庆科黄油体',
      'PhotoHuangYou',
      '艺术',
      'zcool qingke huangyou zhan ku',
      '圆角几何 · 胶片标注、创意标题',
    ],
    [
      'zcool-kuaile',
      '站酷快乐体',
      'PhotoKuaiLe',
      '艺术',
      'zcool kuaile zhan ku',
      '轻松活泼 · 拍立得、生活记录',
    ],
    [
      'zhi-mang-xing',
      '钟齐志莽行书',
      'PhotoZhiMang',
      '手写',
      'zhi mang xing zhongqi zhimangxing xingshu',
      '自然笔意 · 签名、诗句与手写文案',
    ],
  ].map(([id, name, family, category, keywords, usage]) => ({
    id,
    name,
    family,
    category: category as LibraryFont['category'],
    keywords,
    usage,
    language: '中文' as const,
    weight: 400,
    style: 'normal' as const,
  })),
  ...typefaces.map((face): LibraryFont => ({
    ...face,
    category: ['besley', 'baskerville'].includes(face.id)
      ? '衬线'
      : face.id === 'courgette'
        ? '手写'
        : '无衬线',
    language: '西文',
    keywords: face.id + ' camera 相机',
    usage: face.id === 'courgette' ? '流畅签名字样 · 西文手写' : '相机型号、英文标题与参数',
  })),
  {
    id: 'studio-mono',
    name: 'IBM Plex Mono · 精密等宽',
    family: 'StudioMono',
    weight: 400,
    style: 'normal',
    category: '等宽',
    language: '西文',
    keywords: 'ibm plex mono dengkuan 参数',
    usage: '数字对齐 · EXIF 参数、胶片编号',
  },
]
export const findLibraryFont = (id?: string) => libraryFonts.find((face) => face.id === id)
export const textFontId = (settings: Settings, id: string) =>
  settings.elementFonts?.[settings.template]?.[id] || settings.canvasFont || 'auto'
export const textTypeface = (settings: Settings, id: string) =>
  findLibraryFont(textFontId(settings, id))
export const libraryFontFamily = (face: LibraryFont) =>
  `"${face.family}", "PhotoHanSans", sans-serif`
export const wordmarkFontId = (settings: Settings) =>
  settings.elementFonts?.[settings.template]?.logo ??
  (settings.canvasFont && settings.canvasFont !== 'auto'
    ? settings.canvasFont
    : settings.brandFont || 'auto')
export function wordmarkFontPatch(settings: Settings, id: string): Partial<Settings> {
  return {
    brandFont: typefaces.find((face) => face.id === id)?.id || 'auto',
    elementFonts: {
      ...settings.elementFonts,
      [settings.template]: { ...settings.elementFonts?.[settings.template], logo: id },
    },
  }
}
export function getBrandTypography(settings: Pick<Settings, 'brand' | 'brandFont'>) {
  const profile = profiles[settings.brand] || profiles.PHOTOSIDER
  return {
    ...findTypeface(
      settings.brandFont && settings.brandFont !== 'auto' ? settings.brandFont : profile.wordmark,
    ),
    label: profiles[settings.brand]?.label || settings.brand,
  }
}
export function getCameraTypography(
  settings: Pick<Settings, 'brand'>,
  metadata?: Pick<Metadata, 'camera' | 'cameraBrand' | 'cameraMake'>,
) {
  const brand = metadata ? getCameraBrand(metadata) : settings.brand
  const face = findTypeface((profiles[brand] || profiles.PHOTOSIDER).metadata)
  return { ...face, weight: 400, style: 'normal' as const }
}
const pendingFonts = new Map<string, Promise<FontFace[]>>()
function retryFailedFace(face: Pick<Typeface, 'family' | 'weight' | 'style'>) {
  const familyName = (name: string) => name.replace(/["']/g, '').trim()
  const failed = [...document.fonts].some(
    (font) => familyName(font.family) === face.family && font.status === 'error',
  )
  if (!failed) return undefined
  // A CSS FontFace remains in the error state after a network failure. Create a
  // fresh face from the same local CSS source so the explicit retry can recover.
  for (const sheet of [...document.styleSheets]) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    for (const rule of [...rules]) {
      if (!(rule instanceof CSSFontFaceRule) || familyName(rule.style.fontFamily) !== face.family)
        continue
      if ((rule.style.fontStyle || 'normal') !== face.style) continue
      const weights = (rule.style.fontWeight || '400').split(/\s+/).map(Number)
      if (face.weight < weights[0] || face.weight > (weights[1] || weights[0])) continue
      const retry = new FontFace(face.family, rule.style.getPropertyValue('src'), {
        style: face.style,
        weight: rule.style.fontWeight || '400',
        display: 'swap',
      })
      return retry.load().then((loaded) => {
        document.fonts.add(loaded)
        return [loaded]
      })
    }
  }
  return undefined
}
function loadFace(face: Pick<Typeface, 'family' | 'weight' | 'style'>) {
  const spec = `${face.style} ${face.weight} 28px "${face.family}"`
  if (!pendingFonts.has(spec)) {
    const promise = (retryFailedFace(face) || document.fonts.load(spec, 'Aa0123456789'))
      .then((loaded) => {
        if (!loaded.length) throw new Error('字体未能加载，请刷新页面重试')
        return loaded
      })
      .catch((error) => {
        pendingFonts.delete(spec)
        throw error
      })
    pendingFonts.set(spec, promise)
  }
  return pendingFonts.get(spec)!
}
export async function loadLibraryFont(id: string) {
  const face = findLibraryFont(id)
  if (!face) return
  await Promise.all([
    loadFace(face),
    ...(face.id !== 'source-han-sans' ? [loadFace(libraryFonts[0])] : []),
  ])
}
export async function ensureTypography(settings: Settings, metadata?: Metadata) {
  settings = resolveCameraSettings(settings, metadata)
  const faces: Pick<Typeface, 'family' | 'weight' | 'style'>[] = []
  if (
    settings.showBrand &&
    !settings.logo &&
    !getBrandLogo(settings) &&
    supportsBrandMark(settings.template)
  )
    faces.push(getBrandTypography(settings))
  if (settings.font === 'camera') {
    const face = getCameraTypography(settings, metadata)
    faces.push(face, { ...face, weight: 600 })
  }
  const custom = new Set([
    settings.canvasFont,
    ...Object.values(settings.elementFonts?.[settings.template] || {}),
  ])
  await Promise.all([...faces.map(loadFace), ...[...custom].map(loadLibraryFont)])
}
