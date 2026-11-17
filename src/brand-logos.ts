import type { Settings } from './model'

export type BrandLogo = {
  id: string
  brand: string
  name: string
  monochrome: boolean
  src: string
}
const logo = (id: string, brand: string, name: string, monochrome = true): BrandLogo => ({
  id,
  brand,
  name,
  monochrome,
  src: `/logos/camera/${id}.png`,
})

export const brandLogos: BrandLogo[] = [
  logo('sony', 'SONY', '经典字标'),
  logo('fujifilm', 'FUJIFILM', '经典字标', false),
  logo('nikon', 'NIKON', '经典字标'),
  logo('nikon_full', 'NIKON', '黄色方标', false),
  logo('canon', 'CANON', '红色字标', false),
  logo('leica_red_full', 'LEICA', '红色圆标', false),
  logo('leica', 'LEICA', '手写字标'),
  logo('leica_full', 'LEICA', '黑色方标', false),
  logo('hasselblad', 'HASSELBLAD', 'H 标记'),
  logo('hasselblad-t', 'HASSELBLAD', '完整组合标'),
  logo('lumix', 'LUMIX', '经典字标'),
  logo('dji', 'DJI', '经典标记'),
  logo('install360', 'INSTA360', '经典字标'),
  logo('kodak', 'KODAK', '经典字标'),
  logo('mamiya', 'MAMIYA', '红色字标', false),
  logo('olympus', 'OLYMPUS', '彩色字标', false),
  logo('panasonic', 'PANASONIC', '蓝色字标', false),
  logo('pentax', 'PENTAX', '红色字标', false),
  logo('phaseOne', 'PHASE ONE', '彩色字标', false),
  logo('red', 'RED', '经典字标'),
  logo('red_full', 'RED', 'SHOT ON RED', false),
  logo('ricoh', 'RICOH', '红色字标', false),
  logo('rolleiflex', 'ROLLEI', '经典字标'),
  logo('sigma', 'SIGMA', '经典字标'),
  logo('tamron', 'TAMRON', '经典字标'),
  logo('zeiss_full', 'ZEISS', '蓝色方标', false),
]

export function getBrandLogo(settings: Pick<Settings, 'brand' | 'brandLogo' | 'logo'>) {
  if (settings.logo || settings.brandLogo === 'text') return undefined
  const choices = brandLogos.filter((item) => item.brand === settings.brand)
  return choices.find((item) => item.id === settings.brandLogo) || choices[0]
}

export function shouldTintBrandLogo(settings: Pick<Settings, 'brandLogoColor'>, item: BrandLogo) {
  return (
    settings.brandLogoColor === 'text' ||
    (settings.brandLogoColor !== 'original' && item.monochrome)
  )
}
