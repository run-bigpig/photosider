import { Camera, ChevronDown, Link2 } from 'lucide-react'
import { brandLabels, brandNames, camerasForBrand, findCameraPreset } from './camera-catalog'
import { getBrandLogo, shouldTintBrandLogo } from './brand-logos'
import { getBrandTypography } from './typography'
import { LogoArtwork } from './LogoArtwork'
import type { Metadata, Settings } from './model'

export function CameraIdentity({
  settings,
  metadata,
  onBrandChange,
  onCameraChange,
}: {
  settings: Settings
  metadata: Metadata
  onBrandChange: (brand: string) => void
  onCameraChange: (camera: string) => void
}) {
  const presets = camerasForBrand(settings.brand)
  const selected = findCameraPreset(metadata.camera, settings.brand)
  const logo = getBrandLogo(settings)
  const font = getBrandTypography(settings)
  return (
    <div className="camera-identity" aria-label="相机与品牌联动设置">
      <div className="camera-identity-caption">
        <Camera size={13} />
        <span>拍摄设备</span>
        <small>
          <Link2 size={10} /> 型号与标记联动
        </small>
      </div>
      <div className="camera-brand-row">
        <div className="camera-brand-badge" aria-label={logo ? '品牌 Logo 预览' : '设备品牌预览'}>
          {settings.logo ? (
            <img src={settings.logo} alt="自定义 Logo" />
          ) : logo ? (
            <LogoArtwork
              item={logo}
              tint={shouldTintBrandLogo(settings, logo) ? '#425b32' : undefined}
            />
          ) : (
            <span
              style={{
                fontFamily: `"${font.family}", sans-serif`,
                fontWeight: font.weight,
                fontStyle: font.style,
              }}
            >
              {font.label}
            </span>
          )}
        </div>
        <label className="field camera-brand-field">
          <span>品牌</span>
          <select
            aria-label="品牌名称"
            value={settings.brand}
            onChange={(event) => onBrandChange(event.target.value)}
          >
            {brandNames.map((brand) => (
              <option key={brand} value={brand}>
                {brandLabels[brand] || brand}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field camera-model-field">
        <span>
          相机型号{' '}
          <small>
            {selected ? '已匹配预设' : metadata.camera ? '自定义型号' : '选择或输入型号'}
          </small>
        </span>
        <div className="camera-model-control">
          <input
            aria-label="相机型号"
            value={metadata.camera}
            placeholder={presets[0]?.camera || '输入你的相机型号'}
            onChange={(event) => onCameraChange(event.target.value)}
          />
          {presets.length > 0 && (
            <div className="camera-model-picker">
              <span>
                预设 <ChevronDown size={12} />
              </span>
              <select
                aria-label="常用机型"
                value=""
                onChange={(event) => {
                  if (event.target.value) onCameraChange(event.target.value)
                }}
              >
                <option value="" disabled>
                  选择 {brandLabels[settings.brand]} 机型
                </option>
                {presets.map((preset) => (
                  <option key={preset.camera} value={preset.camera}>
                    {preset.model}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </label>
      {presets.length > 0 ? (
        <div className="camera-quick-models" role="group" aria-label="常用机型快捷选择">
          {presets.slice(0, 3).map((preset) => (
            <button
              key={preset.camera}
              aria-pressed={selected?.camera === preset.camera}
              onClick={() => onCameraChange(preset.camera)}
            >
              {preset.model}
            </button>
          ))}
          <small>{presets.length} 款机型</small>
        </div>
      ) : (
        <p className="camera-identity-hint">
          {['TAMRON', 'ZEISS'].includes(settings.brand)
            ? '镜头品牌暂未收录机身预设，可自定义型号。'
            : '直接输入型号，或切换品牌选择常用机型。'}
        </p>
      )}
    </div>
  )
}
