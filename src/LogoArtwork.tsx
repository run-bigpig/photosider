import type { BrandLogo } from './brand-logos'

export function LogoArtwork({ item, tint }: { item: BrandLogo; tint?: string }) {
  const label = `${item.brand} · ${item.name}`
  return tint ? (
    <span
      className="brand-logo-art"
      role="img"
      aria-label={label}
      style={{
        backgroundColor: tint,
        maskImage: `url("${item.src}")`,
        WebkitMaskImage: `url("${item.src}")`,
      }}
    />
  ) : (
    <img className="brand-logo-art" src={item.src} alt={label} />
  )
}
