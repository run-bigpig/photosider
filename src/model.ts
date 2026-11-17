export type Metadata = {
  camera: string
  cameraBrand?: string
  cameraMake?: string
  lens: string
  focal: string
  aperture: string
  shutter: string
  iso: string
  date: string
  location: string
  caption: string
}
export type MediaItem = {
  id: string
  name: string
  url: string
  kind: 'image' | 'video'
  width: number
  height: number
  metadata: Metadata
  demo?: boolean
  hasExif?: boolean
  duration?: number
  poster?: string
}
export type TemplateId =
  | 'signature'
  | 'gallery'
  | 'film'
  | 'minimal'
  | 'postcard'
  | 'noir'
  | 'instant'
  | 'cinema'
  | 'blur'
  | 'stamp'
  | 'sprocket'
  | 'mat'
  | 'editorial'
  | 'slide'
export type LogoLayout = {
  showBrand: boolean
  logoPosition:
    | 'auto'
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'
  logoX: number
  logoY: number
  logoScale: number
  logoRotation: number
}
export const defaultLogoLayout: LogoLayout = {
  showBrand: true,
  logoPosition: 'auto',
  logoX: 0,
  logoY: 0,
  logoScale: 100,
  logoRotation: 0,
}
export type ElementTransform = { x: number; y: number; scale: number; rotation: number }
export const defaultElementTransform: ElementTransform = { x: 0, y: 0, scale: 1, rotation: 0 }
export type Settings = LogoLayout & {
  template: TemplateId
  color: string
  textColor: string
  padding: number
  radius: number
  shadow: number
  ratio: string
  customWidth: number
  customHeight: number
  font: 'sans' | 'serif' | 'mono' | 'camera'
  canvasFont: string
  elementFonts: Partial<Record<TemplateId, Record<string, string>>>
  brandFont: 'auto' | import('./typography').BrandFontId
  textSize: number
  showExif: boolean
  showDate: boolean
  showLocation: boolean
  logoLayouts: Partial<Record<TemplateId, LogoLayout>>
  elementLayouts: Partial<Record<TemplateId, Record<string, ElementTransform>>>
  brand: string
  brandLogo: string
  brandLogoColor: 'auto' | 'original' | 'text'
  logo: string
  rotation: number
  zoom: number
  offsetX: number
  offsetY: number
}
export const defaultSettings: Settings = {
  template: 'signature',
  color: '#faf9f6',
  textColor: '#282b28',
  padding: 4.5,
  radius: 0,
  shadow: 0,
  ratio: 'original',
  customWidth: 3,
  customHeight: 2,
  font: 'sans',
  canvasFont: 'source-sans',
  elementFonts: {},
  brandFont: 'auto',
  textSize: 100,
  showExif: true,
  showDate: true,
  showLocation: true,
  ...defaultLogoLayout,
  logoLayouts: {},
  elementLayouts: {},
  brand: 'PHOTOSIDER',
  brandLogo: 'auto',
  brandLogoColor: 'auto',
  logo: '',
  rotation: 0,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}
export type Template = {
  id: TemplateId
  name: string
  subtitle: string
  tag?: string
  color: string
  category: '简约' | '胶片' | '创意'
  padding: number
  footer: number
  top?: number
  dark?: boolean
  brand: boolean
  ratio?: string
}
export const templates: Template[] = [
  {
    id: 'signature',
    name: '经典签名',
    subtitle: 'SIGNATURE',
    tag: '精选',
    color: '#faf9f6',
    category: '简约',
    padding: 4.5,
    footer: 0.105,
    brand: true,
  },
  {
    id: 'gallery',
    name: '画廊留白',
    subtitle: 'GALLERY',
    color: '#fffdfa',
    category: '简约',
    padding: 8,
    footer: 0.18,
    brand: true,
  },
  {
    id: 'film',
    name: '胶片日记',
    subtitle: 'FILM DIARY',
    color: '#252824',
    category: '胶片',
    padding: 4.5,
    footer: 0.1,
    brand: true,
    dark: true,
  },
  {
    id: 'minimal',
    name: '极简时刻',
    subtitle: 'MINIMAL',
    color: '#ffffff',
    category: '简约',
    padding: 2,
    footer: 0.07,
    brand: true,
  },
  {
    id: 'postcard',
    name: '旅行明信片',
    subtitle: 'POSTCARD',
    color: '#eee9df',
    category: '创意',
    padding: 4.5,
    footer: 0.145,
    brand: true,
  },
  {
    id: 'noir',
    name: '暗调叙事',
    subtitle: 'NOIR',
    color: '#20231f',
    category: '简约',
    padding: 4.5,
    footer: 0.105,
    brand: true,
    dark: true,
  },
  {
    id: 'instant',
    name: '即刻拍立得',
    subtitle: 'INSTANT PRINT',
    tag: '新',
    color: '#fffdf5',
    category: '创意',
    padding: 6,
    footer: 0.22,
    brand: true,
    ratio: '4:5',
  },
  {
    id: 'cinema',
    name: '电影画幅',
    subtitle: 'CINEMA SCOPE',
    color: '#151917',
    category: '创意',
    padding: 1.5,
    footer: 0.09,
    top: 0.055,
    brand: true,
    dark: true,
    ratio: '16:9',
  },
  {
    id: 'blur',
    name: '氛围虚化',
    subtitle: 'SOFT FOCUS',
    tag: '新',
    color: '#faf9f6',
    category: '创意',
    padding: 7,
    footer: 0.12,
    brand: true,
  },
  {
    id: 'stamp',
    name: '远方来信',
    subtitle: 'POSTAGE STAMP',
    color: '#e8e6dc',
    category: '创意',
    padding: 7.5,
    footer: 0.17,
    top: 0.025,
    brand: true,
  },
  {
    id: 'sprocket',
    name: '35mm 片孔',
    subtitle: 'SPROCKET 35',
    color: '#20211d',
    category: '胶片',
    padding: 6,
    footer: 0.11,
    top: 0.025,
    brand: true,
    dark: true,
  },
  {
    id: 'mat',
    name: '双层卡纸',
    subtitle: 'DOUBLE MAT',
    color: '#e9e4d9',
    category: '简约',
    padding: 9,
    footer: 0.115,
    brand: true,
  },
  {
    id: 'editorial',
    name: '杂志封面',
    subtitle: 'EDITORIAL',
    color: '#f8f4e9',
    category: '创意',
    padding: 2,
    footer: 0.14,
    brand: true,
  },
  {
    id: 'slide',
    name: '幻灯片收藏',
    subtitle: 'SLIDE MOUNT',
    color: '#ecebdc',
    category: '胶片',
    padding: 8,
    footer: 0.14,
    top: 0.025,
    brand: true,
  },
]
export const templateFor = (id: TemplateId) =>
  templates.find((template) => template.id === id) || templates[0]
export const supportsBrandMark = (id: TemplateId) => templateFor(id).brand
export const emptyMetadata: Metadata = {
  camera: '',
  lens: '',
  focal: '',
  aperture: '',
  shutter: '',
  iso: '',
  date: '',
  location: '',
  caption: '',
}
export const demos: MediaItem[] = [
  {
    id: 'demo-alpine',
    name: '阿尔卑斯的清晨.jpg',
    url: '/demo/alpine.jpg',
    kind: 'image',
    width: 1800,
    height: 1200,
    demo: true,
    metadata: {
      camera: 'SONY α7R V',
      lens: 'FE 24–70mm F2.8 GM II',
      focal: '35',
      aperture: '2.8',
      shutter: '1/250',
      iso: '100',
      date: '2025.10.18',
      location: 'DOLOMITES, ITALY',
      caption: '山有回响，心有远方。',
    },
  },
  {
    id: 'demo-forest',
    name: '光落在森林里.jpg',
    url: '/demo/forest.jpg',
    kind: 'image',
    width: 1800,
    height: 1200,
    demo: true,
    metadata: {
      camera: 'FUJIFILM X-T5',
      lens: 'XF 23mm F1.4 R LM WR',
      focal: '23',
      aperture: '4',
      shutter: '1/125',
      iso: '400',
      date: '2025.10.22',
      location: 'INTO THE WOODS',
      caption: '收集一束光。',
    },
  },
  {
    id: 'demo-coast',
    name: '海风经过的地方.jpg',
    url: '/demo/coast.jpg',
    kind: 'image',
    width: 1800,
    height: 1200,
    demo: true,
    metadata: {
      camera: 'NIKON Z f',
      lens: 'NIKKOR Z 40mm f/2',
      focal: '40',
      aperture: '5.6',
      shutter: '1/500',
      iso: '100',
      date: '2025.11.02',
      location: 'SOMEWHERE BY THE SEA',
      caption: '把时间留给海。',
    },
  },
]
export const ratios = ['original', '3:2', '4:3', '1:1', '4:5', '2:3', '16:9', '9:16']
export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
}
export function ratioValue(s: Settings, original: number) {
  if (s.ratio === 'original') return original
  if (s.ratio === 'custom') return clamp(s.customWidth / s.customHeight, 0.2, 5)
  const [a, b] = s.ratio.split(':').map(Number)
  return a > 0 && b > 0 ? clamp(a / b, 0.2, 5) : original
}
export function safeName(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
      .slice(0, 100) || 'photosider'
  )
}
export function formatExposure(n: unknown) {
  const v = Number(n)
  return v > 0 ? (v < 1 ? `1/${Math.round(1 / v)}` : `${Math.round(v * 100) / 100}`) : ''
}
