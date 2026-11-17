import type { Metadata, Settings } from './model'

export const brandNames = [
  'PHOTOSIDER',
  'SONY',
  'CANON',
  'NIKON',
  'FUJIFILM',
  'LUMIX',
  'LEICA',
  'HASSELBLAD',
  'RICOH',
  'OM SYSTEM',
  'OLYMPUS',
  'PENTAX',
  'DJI',
  'INSTA360',
  'GOPRO',
  'APPLE',
  'KODAK',
  'MAMIYA',
  'PANASONIC',
  'PHASE ONE',
  'RED',
  'ROLLEI',
  'SIGMA',
  'TAMRON',
  'ZEISS',
] as const
export const brandLabels: Record<string, string> = {
  PHOTOSIDER: '自定义 / 工作室',
  SONY: '索尼 · SONY',
  CANON: '佳能 · Canon',
  NIKON: '尼康 · Nikon',
  FUJIFILM: '富士 · FUJIFILM',
  LUMIX: '松下 · LUMIX',
  LEICA: '徕卡 · Leica',
  HASSELBLAD: '哈苏 · Hasselblad',
  RICOH: '理光 · RICOH',
  'OM SYSTEM': 'OM SYSTEM',
  OLYMPUS: '奥林巴斯 · OLYMPUS',
  PENTAX: '宾得 · PENTAX',
  DJI: '大疆 · DJI',
  INSTA360: '影石 · Insta360',
  GOPRO: 'GoPro',
  APPLE: 'Apple · iPhone',
  KODAK: '柯达 · Kodak',
  MAMIYA: '玛米亚 · Mamiya',
  PANASONIC: '松下 · Panasonic',
  'PHASE ONE': '飞思 · Phase One',
  RED: 'RED',
  ROLLEI: '禄来 · Rollei',
  SIGMA: '适马 · SIGMA',
  TAMRON: '腾龙 · TAMRON（镜头）',
  ZEISS: '蔡司 · ZEISS（镜头）',
}
export type CameraPreset = { brand: string; model: string; camera: string; aliases: string[] }
type Entry = string | [string, ...string[]]
const series = (brand: string, prefix: string, entries: Entry[]): CameraPreset[] =>
  entries.map((entry) => {
    const [model, ...aliases] = typeof entry === 'string' ? [entry] : entry
    return { brand, model, camera: `${prefix} ${model}`, aliases }
  })

// Common current bodies and widely used earlier models; this is not a sales ranking.
export const cameraPresets: CameraPreset[] = [
  ...series('SONY', 'SONY', [
    ['α7 V', 'ILCE-7M5', 'A7M5', 'A7 V'],
    ['α7 IV', 'ILCE-7M4', 'A7M4', 'A7 IV'],
    ['α7R V', 'ILCE-7RM5', 'A7R5', 'A7R V'],
    ['α7C II', 'ILCE-7CM2', 'A7C2'],
    ['α7CR', 'ILCE-7CR'],
    ['α6700', 'ILCE-6700', 'A6700'],
    ['α6400', 'ILCE-6400', 'A6400'],
    ['ZV-E10 II', 'ZV-E10M2'],
    'ZV-E10',
    ['α7 III', 'ILCE-7M3', 'A7M3'],
    ['α1 II', 'ILCE-1M2'],
    ['α9 III', 'ILCE-9M3'],
    ['α7S III', 'ILCE-7SM3'],
    ['RX100 VII', 'DSC-RX100M7'],
  ]),
  ...series('CANON', 'Canon', [
    'EOS R50',
    'EOS R6 Mark III',
    'EOS R5 Mark II',
    'EOS R6 Mark II',
    'EOS R8',
    'EOS R10',
    'EOS R7',
    'EOS R50 V',
    'EOS R1',
    'EOS R3',
    'EOS R5',
    'EOS 5D Mark IV',
    'PowerShot G7 X Mark III',
  ]),
  ...series('NIKON', 'Nikon', [
    ['Z6 III', 'NIKON Z6_3', 'Z6III'],
    ['Z5 II', 'NIKON Z5_2', 'Z5II'],
    ['Z50 II', 'NIKON Z50_2', 'Z50II'],
    ['Z f', 'NIKON ZF'],
    'Z8',
    'Z9',
    ['Z7 II', 'NIKON Z7_2'],
    ['Z6 II', 'NIKON Z6_2'],
    'Z fc',
    'Z30',
    'D850',
    'D750',
  ]),
  ...series('FUJIFILM', 'FUJIFILM', [
    'X100VI',
    'X-T5',
    'X-M5',
    'X-E5',
    'X-T50',
    'X-T30 III',
    'X-S20',
    'X-H2',
    'X-H2S',
    'GFX100RF',
    'GFX100 II',
    'GFX100S II',
  ]),
  ...series('LUMIX', 'LUMIX', [
    ['S5II', 'DC-S5M2', 'S5 II'],
    ['S5IIX', 'DC-S5M2X'],
    ['S9', 'DC-S9'],
    ['S1II', 'DC-S1M2'],
    ['S1RII', 'DC-S1RM2'],
    ['GH7', 'DC-GH7'],
    ['G9II', 'DC-G9M2'],
    ['S5', 'DC-S5'],
  ]),
  ...series('LEICA', 'Leica', ['Q3', 'Q3 43', 'M11', 'M11-P', 'SL3', 'D-Lux 8', 'Q2']),
  ...series('HASSELBLAD', 'Hasselblad', [
    'X2D II 100C',
    'X2D 100C',
    '907X & CFV 100C',
    'X1D II 50C',
  ]),
  ...series('RICOH', 'RICOH', ['GR IV', 'GR III', 'GR IIIx', 'GR III HDF', 'GR IIIx HDF']),
  ...series('OM SYSTEM', 'OM SYSTEM', ['OM-1 Mark II', 'OM-3', 'OM-5 Mark II', 'OM-5']),
  ...series('OLYMPUS', 'OLYMPUS', ['PEN E-P7', 'E-M1 Mark III', 'E-M5 Mark III', 'E-M10 Mark IV']),
  ...series('PENTAX', 'PENTAX', ['K-1 Mark II', 'K-3 Mark III', 'KF', '17']),
  ...series('DJI', 'DJI', [
    'Osmo Pocket 3',
    'Osmo Action 5 Pro',
    'Mini 4 Pro',
    'Air 3S',
    'Mavic 4 Pro',
  ]),
  ...series('INSTA360', 'Insta360', ['X5', 'X4', 'Ace Pro 2', 'GO 3S']),
  ...series('GOPRO', 'GoPro', ['HERO13 Black', 'HERO12 Black', 'HERO11 Black']),
  ...series('APPLE', 'Apple', [
    'iPhone 17 Pro',
    'iPhone 17 Pro Max',
    'iPhone 16 Pro',
    'iPhone 16 Pro Max',
    'iPhone 15 Pro',
    'iPhone 15 Pro Max',
  ]),
  ...series('KODAK', 'Kodak', ['PIXPRO FZ55', 'PIXPRO FZ45']),
  ...series('MAMIYA', 'Mamiya', ['645 AFD III', 'RZ67 Pro II']),
  ...series('PHASE ONE', 'Phase One', ['XF IQ4 150MP', 'XT IQ4 150MP']),
  ...series('RED', 'RED', ['V-RAPTOR [X]', 'KOMODO-X', 'KOMODO 6K']),
  ...series('ROLLEI', 'Rollei', ['Rolleiflex 2.8F', 'Rollei 35']),
  ...series('SIGMA', 'SIGMA', ['BF', 'fp L', 'fp']),
]
const normalize = (value: string) =>
  value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/Α|α/g, 'A')
    .replace(/[^A-Z0-9]/g, '')
const modelIndex = new Map<string, CameraPreset>()
for (const preset of cameraPresets) {
  for (const name of [preset.camera, preset.model, ...preset.aliases]) {
    const key = normalize(name)
    // Ambiguous bare names must not silently choose a manufacturer.
    if (!modelIndex.has(key)) modelIndex.set(key, preset)
    else if (modelIndex.get(key)?.brand !== preset.brand) modelIndex.delete(key)
  }
}
export function findCameraPreset(camera: string, brand?: string) {
  const key = normalize(camera)
  if (!key) return undefined
  if (brand)
    return camerasForBrand(brand).find((item) =>
      [item.camera, item.model, ...item.aliases].some((alias) => normalize(alias) === key),
    )
  return modelIndex.get(key)
}
export function camerasForBrand(brand: string) {
  const entries = cameraPresets.filter(
    (item) => item.brand === (brand === 'PANASONIC' ? 'LUMIX' : brand),
  )
  return brand === 'PANASONIC'
    ? entries.map((item) => ({ ...item, brand, camera: `Panasonic ${item.camera}` }))
    : entries
}
const sameFamily = (a: string, b: string) =>
  a === b || (['LUMIX', 'PANASONIC'].includes(a) && ['LUMIX', 'PANASONIC'].includes(b))
export function detectCameraBrand(camera: string, make = ''): string | undefined {
  const preset = findCameraPreset(camera)
  if (preset) return preset.brand
  const text = camera.toUpperCase()
  // Exact brand tokens avoid accidental matches such as RED in INFRARED.
  for (const brand of brandNames) {
    if (brand === 'PHOTOSIDER') continue
    if (new RegExp(`(^|[^A-Z0-9])${brand.replaceAll(' ', '\\s*')}([^A-Z0-9]|$)`).test(text))
      return brand === 'PANASONIC' && /LUMIX|DC-|DMC-/.test(text) ? 'LUMIX' : brand
  }
  if (/^(ILCE-|ILME-|DSC-)/i.test(camera)) return 'SONY'
  if (/^EOS\s/i.test(camera)) return 'CANON'
  if (/^(DC-|DMC-)/i.test(camera)) return 'LUMIX'
  if (/^IPHONE\b/i.test(camera)) return 'APPLE'
  if (/^(OM DIGITAL SOLUTIONS|OM SYSTEM)/i.test(make)) return 'OM SYSTEM'
  if (make && make !== camera) return detectCameraBrand(make)
  return undefined
}
export function getCameraBrand(metadata: Pick<Metadata, 'camera' | 'cameraBrand' | 'cameraMake'>) {
  const inferred = detectCameraBrand(metadata.camera)
  if (metadata.cameraBrand && (!inferred || sameFamily(metadata.cameraBrand, inferred)))
    return metadata.cameraBrand
  return inferred || detectCameraBrand('', metadata.cameraMake) || 'PHOTOSIDER'
}
export function resolveCameraSettings(
  settings: Settings,
  metadata?: Pick<Metadata, 'camera' | 'cameraBrand' | 'cameraMake'>,
): Settings {
  if (!metadata) return settings
  const brand = getCameraBrand(metadata)
  return {
    ...settings,
    brand,
    brandLogo:
      brand === settings.brand || settings.brandLogo === 'text' ? settings.brandLogo : 'auto',
  }
}
