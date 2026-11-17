import { useCallback, useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import {
  Aperture,
  ArrowDownToLine,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Crop,
  Download,
  Printer,
  Expand,
  Ellipsis,
  FileImage,
  Film,
  Grid2X2,
  ImagePlus,
  Layers,
  LockKeyhole,
  Maximize2,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
  Bookmark,
  Copy,
  CheckCircle2,
} from 'lucide-react'
import exifr from 'exifr'
import { zipSync } from 'fflate'
import {
  clamp,
  defaultSettings,
  defaultLogoLayout,
  demos,
  emptyMetadata,
  formatExposure,
  ratios,
  safeName,
  supportsBrandMark,
  templates,
  type MediaItem,
  type Metadata,
  type Settings,
  type TemplateId,
} from './model'
import {
  canvasBlob,
  downloadBlob,
  drawFrame,
  forgetImage,
  frameLayout,
  loadImage,
  getCanvasElements,
  type CanvasElement,
} from './render'
import { brandLogos, getBrandLogo } from './brand-logos'
import { LogoArtwork } from './LogoArtwork'
import { CanvasEditor } from './CanvasEditor'
import { readVideoMedia } from './video-media'
import { createPrintPreview, printPapers, type PrintOptions } from './print'
import { FontPicker } from './FontPicker'
import { findLibraryFont, textTypeface } from './typography'
import {
  readLocalProject,
  writeLocalProject,
  restoreMedia,
  putMediaFiles,
  putMediaPoster,
  deleteMediaFile,
  clearMediaFiles,
  type MediaFile,
} from './storage'
import { CameraIdentity } from './CameraIdentity'
import {
  detectCameraBrand,
  findCameraPreset,
  getCameraBrand,
  resolveCameraSettings,
} from './camera-catalog'
import {
  ensureTypography,
  getBrandTypography,
  getCameraTypography,
  wordmarkFontId,
  wordmarkFontPatch,
} from './typography'

type Preset = { id: string; name: string; settings: Settings }
type Notice = { text: string; type?: 'error' | 'success' }
type ExportOptions = {
  format: 'jpeg' | 'png'
  size: number
  quality: number
  all: boolean
  audio: boolean
}
const STORAGE_KEY = 'photosider.presets.v1'
const tabLabels = { frame: '边框', text: '文字', adjust: '构图' }

function IconButton({
  title,
  children,
  onClick,
  disabled,
  className = '',
}: {
  title: string
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
function Toggle({
  label,
  checked,
  onChange,
  hint,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  hint?: string
  disabled?: boolean
}) {
  return (
    <label className="toggle-row">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  )
}
function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (n: number) => void
}) {
  return (
    <label className="range-control">
      <span className="control-label">
        {label}
        <output>
          {Number(value.toFixed(1))}
          {unit}
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--range': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
function Field({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
}: {
  label: string
  value: string
  onChange: (s: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={160}
      />
    </label>
  )
}
function Modal({
  children,
  title,
  subtitle,
  onClose,
  wide = false,
  busy = false,
}: {
  children: ReactNode
  title: string
  subtitle?: string
  onClose: () => void
  wide?: boolean
  busy?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
      if (e.key === 'Tab') {
        const els = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
          ) || [],
        )
        const first = els[0],
          last = els[els.length - 1]
        if (!els.length) {
          e.preventDefault()
          return
        }
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault()
          last.focus()
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === ref.current)
        ) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose, busy])
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? 'modal-wide' : ''}`}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">PHOTOSIDER STUDIO</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton title="关闭对话框" onClick={onClose} disabled={busy}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function App() {
  const [initialProject] = useState(readLocalProject)
  const [hydrating, setHydrating] = useState(Boolean(initialProject.project))
  const [canSave, setCanSave] = useState(!initialProject.error)
  const [projectSaveError, setProjectSaveError] = useState(initialProject.error)
  const [mediaSaveError, setMediaSaveError] = useState('')
  const [savingMedia, setSavingMedia] = useState(false)
  const pendingMedia = useRef(new Map<string, MediaFile>())
  const [items, setItems] = useState<MediaItem[]>(initialProject.project ? [] : demos)
  const [activeId, setActiveId] = useState(initialProject.project?.activeId || demos[0].id)
  const [settings, setSettings] = useState<Settings>(
    initialProject.project?.settings || defaultSettings,
  )
  const [history, setHistory] = useState<Settings[]>([])
  const [future, setFuture] = useState<Settings[]>([])
  const [tab, setTab] = useState<'frame' | 'text' | 'adjust'>('frame')
  const [library, setLibrary] = useState<'templates' | 'presets'>('templates')
  const [category, setCategory] = useState('全部')
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(initialProject.project?.dark || false)
  const [compactWorkspace, setCompactWorkspace] = useState(
    () => window.matchMedia('(max-width: 760px)').matches,
  )
  const [mobilePanel, setMobilePanel] = useState<'templates' | 'settings' | null>(null)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [modal, setModal] = useState<
    'export' | 'preset' | 'camera' | 'help' | 'clear' | 'fonts' | 'wordmark-fonts' | null
  >(null)
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      return Array.isArray(saved)
        ? saved
            .filter(
              (p) =>
                typeof p.name === 'string' &&
                p.settings &&
                templates.some((t) => t.id === p.settings.template),
            )
            .map((p) => ({
              ...p,
              settings: {
                ...defaultSettings,
                ...p.settings,
                brandLogo: p.settings.brandLogo || 'text',
              },
            }))
        : []
    } catch {
      return []
    }
  })
  const [presetName, setPresetName] = useState('我的摄影边框')
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportTarget, setExportTarget] = useState<'download' | 'print'>('download')
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    paper: 'a4',
    orientation: 'auto',
    margin: 8,
  })
  const [progress, setProgress] = useState(0)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'jpeg',
    size: 2400,
    quality: 96,
    all: false,
    audio: true,
  })
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([])
  const [source, setSource] = useState<HTMLImageElement | HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [cameraError, setCameraError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment')
  const [cameraLiveFrame, setCameraLiveFrame] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const cameraVideo = useRef<HTMLVideoElement>(null)
  const cameraCanvas = useRef<HTMLCanvasElement>(null)
  const objectUrls = useRef(new Set<string>())
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancelExport = useRef(false)
  const dragDepth = useRef(0)
  const lastSettingTime = useRef(0)
  const active = items.find((i) => i.id === activeId) || items[0]
  const cameraSettings = resolveCameraSettings(settings, active?.metadata)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    void document.fonts.ready.then(() => setFontsReady(true))
  }, [])
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)')
    const update = () => setCompactWorkspace(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    document.querySelector('.settings-content')?.scrollTo({ top: 0 })
  }, [tab])

  const notify = useCallback((text: string, type: Notice['type'] = 'success') => {
    setNotice({ text, type })
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 4500)
  }, [])
  useEffect(() => {
    const project = initialProject.project
    if (!project) return
    let disposed = false
    void restoreMedia(project.items)
      .then((restored) => {
        if (disposed) {
          restored.items
            .filter((item) => !item.demo)
            .forEach((item) => {
              URL.revokeObjectURL(item.url)
              if (item.poster) URL.revokeObjectURL(item.poster)
            })
          return
        }
        restored.items
          .filter((item) => !item.demo)
          .forEach((item) => {
            objectUrls.current.add(item.url)
            if (item.poster) objectUrls.current.add(item.poster)
          })
        setItems(restored.items)
        setActiveId(
          restored.items.some((item) => item.id === project.activeId)
            ? project.activeId
            : restored.items[0]?.id || '',
        )
        setHydrating(false)
        if (restored.missing.length)
          notify(`${restored.missing.length} 个暂存文件已不可用，其余编辑内容已恢复`, 'error')
        else if (restored.items.length) notify('已恢复上次创作，照片仍保存在本机')
      })
      .catch(() => {
        if (disposed) return
        setCanSave(false)
        setHydrating(false)
        setProjectSaveError('无法读取上次暂存，原有数据未被覆盖。请检查浏览器存储设置后刷新重试。')
        notify('本机项目恢复失败，请检查浏览器存储设置后刷新重试', 'error')
      })
    return () => {
      disposed = true
    }
  }, [initialProject, notify])

  useEffect(() => {
    if (hydrating || !canSave) return
    const save = () => {
      try {
        writeLocalProject(items, settings, activeId, dark)
        setProjectSaveError('')
      } catch {
        setProjectSaveError('本机保存失败，浏览器空间不足或存储被禁用。请先导出作品，再释放空间。')
      }
    }
    save()
    window.addEventListener('pagehide', save)
    return () => window.removeEventListener('pagehide', save)
  }, [items, settings, activeId, dark, hydrating, canSave])

  const clearLocalProject = async () => {
    try {
      writeLocalProject([], defaultSettings, '', dark)
      await clearMediaFiles()
      objectUrls.current.forEach((url) => {
        forgetImage(url)
        URL.revokeObjectURL(url)
      })
      objectUrls.current.clear()
      pendingMedia.current.clear()
      setItems([])
      setActiveId('')
      setSettings(defaultSettings)
      setHistory([])
      setFuture([])
      setMediaSaveError('')
      setProjectSaveError('')
      setCanSave(true)
      setModal(null)
      notify('已清空本机项目，我的预设与已下载作品保留')
    } catch {
      notify('无法清空暂存，请检查浏览器存储设置后重试', 'error')
    }
  }
  const retryMediaSave = async () => {
    setSavingMedia(true)
    try {
      await putMediaFiles([...pendingMedia.current.values()])
      pendingMedia.current.clear()
      writeLocalProject(items, settings, activeId, dark)
      setMediaSaveError('')
      setProjectSaveError('')
      notify('本机保存成功')
    } catch {
      notify('本机存储仍不可用，请释放浏览器空间后重试', 'error')
    } finally {
      setSavingMedia(false)
    }
  }

  const change = useCallback((patch: Partial<Settings>, separate = false) => {
    const now = Date.now(),
      current = settingsRef.current
    if (separate || now - lastSettingTime.current > 450) {
      setHistory((h) => [...h.slice(-39), current])
      setFuture([])
    }
    lastSettingTime.current = now
    const next = { ...current, ...patch }
    settingsRef.current = next
    setSettings(next)
  }, [])
  const undo = useCallback(() => {
    if (!history.length) return
    setFuture((f) => [settings, ...f])
    setSettings(history[history.length - 1])
    setHistory(history.slice(0, -1))
  }, [history, settings])
  const redo = useCallback(() => {
    if (!future.length) return
    setHistory((h) => [...h, settings])
    setSettings(future[0])
    setFuture(future.slice(1))
  }, [future, settings])
  const updateCamera = (camera: string) => {
    const brand = detectCameraBrand(camera) || cameraSettings.brand
    setItems((current) =>
      current.map((item) =>
        item.id === active?.id
          ? { ...item, metadata: { ...item.metadata, camera, cameraBrand: brand, cameraMake: '' } }
          : item,
      ),
    )
    if (brand !== cameraSettings.brand)
      change({ brand, brandLogo: 'auto', brandFont: 'auto', logo: '' }, true)
  }
  const selectCameraBrand = (brand: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === active?.id
          ? {
              ...item,
              metadata: {
                ...item.metadata,
                camera: getCameraBrand(item.metadata) === brand ? item.metadata.camera : '',
                cameraBrand: brand,
                cameraMake: '',
              },
            }
          : item,
      ),
    )
    change({ brand, brandLogo: 'auto', brandFont: 'auto', logo: '' }, true)
  }
  const updateMeta = (key: keyof Metadata, value: string) => {
    if (key === 'camera') return updateCamera(value)
    setItems((current) =>
      current.map((item) =>
        item.id === active?.id ? { ...item, metadata: { ...item.metadata, [key]: value } } : item,
      ),
    )
  }

  useEffect(() => {
    let ignore = false
    setSource(null)
    setPlaying(false)
    setVideoTime(0)
    if (!active) return
    if (active.kind === 'image') {
      loadImage(active.url)
        .then((img) => {
          if (!ignore) setSource(img)
        })
        .catch((e) => {
          if (!ignore) notify(e.message, 'error')
        })
      return () => {
        ignore = true
      }
    }
    const v = document.createElement('video')
    v.src = active.url
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.onloadeddata = () => {
      if (!ignore) {
        setSource(v)
        // Older saved videos have no poster yet; fill it from the paused first frame.
        if (!active.poster)
          void readVideoMedia(active.url)
            .then(({ poster }) => {
              const item = itemsRef.current.find((item) => item.id === active.id)
              if (ignore || !item || item.poster) return
              const url = URL.createObjectURL(poster)
              objectUrls.current.add(url)
              setItems((current) =>
                current.map((item) => (item.id === active.id ? { ...item, poster: url } : item)),
              )
              void putMediaPoster(active.id, poster).catch(() => {
                /* The original remains saved; the poster can be regenerated on next view. */
              })
            })
            .catch(() => {
              /* The video remains playable when a legacy poster cannot be generated. */
            })
      }
    }
    v.ontimeupdate = () => {
      if (!ignore) setVideoTime(v.currentTime)
    }
    v.onended = () => setPlaying(false)
    v.onerror = () => {
      if (!ignore) notify('浏览器无法解码这个视频，请尝试 MP4（H.264）或 WebM', 'error')
    }
    return () => {
      ignore = true
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
  }, [active?.id, active?.url, notify])

  useEffect(() => {
    if (!source || !active || !canvasRef.current) return
    let raf = 0,
      stopped = false
    const draw = () => {
      if (stopped || !canvasRef.current) return
      void drawFrame(
        canvasRef.current,
        source,
        active.width,
        active.height,
        settings,
        active.metadata,
        1600,
      )
        .then(() => {
          if (!stopped && canvasRef.current) {
            const next = getCanvasElements(canvasRef.current)
            setCanvasElements((current) =>
              JSON.stringify(current) === JSON.stringify(next) ? current : next,
            )
          }
        })
        .catch((error) => {
          if (!stopped) notify(error.message, 'error')
        })
      if (active.kind === 'video' && playing) raf = requestAnimationFrame(draw)
    }
    ensureTypography(settings, active.metadata)
      .then(() => {
        if (!stopped) draw()
      })
      .catch((error) => {
        if (!stopped) notify(error.message, 'error')
      })
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [source, active, settings, playing, videoTime, fontsReady, notify])

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
      clearTimeout(noticeTimer.current)
    },
    [],
  )

  const importFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || hydrating) return
      setImporting(true)
      const added: MediaItem[] = [],
        originals: MediaFile[] = [],
        errors: string[] = []
      for (const file of files.slice(0, 100)) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          errors.push(file.name)
          continue
        }
        const url = URL.createObjectURL(file)
        let poster: string | undefined
        try {
          const kind = file.type.startsWith('video/') ? 'video' : 'image'
          let width = 0,
            height = 0,
            duration: number | undefined,
            posterBlob: Blob | undefined
          const metadata: Metadata = { ...emptyMetadata }
          let hasExif = false
          if (kind === 'image') {
            const img = await loadImage(url)
            width = img.naturalWidth
            height = img.naturalHeight
            try {
              const exif = await exifr.parse(file, {
                pick: [
                  'Make',
                  'Model',
                  'LensModel',
                  'FocalLength',
                  'FNumber',
                  'ExposureTime',
                  'ISO',
                  'DateTimeOriginal',
                  'GPSLatitude',
                  'GPSLongitude',
                  'GPSLatitudeRef',
                  'GPSLongitudeRef',
                ],
              })
              if (exif) {
                hasExif = !!(exif.Model || exif.FocalLength || exif.ExposureTime)
                const rawCamera = String(exif.Model || exif.Make || '')
                metadata.cameraMake = String(exif.Make || '')
                metadata.cameraBrand = detectCameraBrand(rawCamera, metadata.cameraMake)
                metadata.camera =
                  findCameraPreset(rawCamera, metadata.cameraBrand)?.camera || rawCamera
                metadata.lens = String(exif.LensModel || '')
                metadata.focal = exif.FocalLength
                  ? String(Math.round(Number(exif.FocalLength) * 10) / 10)
                  : ''
                metadata.aperture = exif.FNumber ? String(exif.FNumber) : ''
                metadata.shutter = formatExposure(exif.ExposureTime)
                metadata.iso = exif.ISO ? String(exif.ISO) : ''
                if (exif.DateTimeOriginal instanceof Date)
                  metadata.date = [
                    exif.DateTimeOriginal.getFullYear(),
                    String(exif.DateTimeOriginal.getMonth() + 1).padStart(2, '0'),
                    String(exif.DateTimeOriginal.getDate()).padStart(2, '0'),
                  ].join('.')
                if (typeof exif.latitude === 'number' && typeof exif.longitude === 'number')
                  metadata.location = `${exif.latitude.toFixed(5)}°, ${exif.longitude.toFixed(5)}°`
              }
            } catch {
              /* An image without readable EXIF is still editable. */
            }
          } else {
            const video = await readVideoMedia(url)
            width = video.width
            height = video.height
            duration = video.duration
            posterBlob = video.poster
            poster = URL.createObjectURL(posterBlob)
            objectUrls.current.add(poster)
          }
          if (!width || !height) throw new Error('无法读取尺寸')
          objectUrls.current.add(url)
          added.push({
            id: crypto.randomUUID(),
            name: file.name,
            url,
            width,
            height,
            kind,
            metadata,
            hasExif,
            duration,
            poster,
          })
          originals.push({ id: added[added.length - 1].id, blob: file, poster: posterBlob })
        } catch {
          if (poster) {
            URL.revokeObjectURL(poster)
            objectUrls.current.delete(poster)
          }
          URL.revokeObjectURL(url)
          forgetImage(url)
          errors.push(file.name)
        }
      }
      if (added.length) {
        let stored = true
        setSavingMedia(true)
        try {
          await putMediaFiles(originals)
        } catch {
          stored = false
          originals.forEach((original) => pendingMedia.current.set(original.id, original))
          setMediaSaveError('照片暂时无法保存在本机，刷新前请先导出作品或重试保存。')
        } finally {
          setSavingMedia(false)
        }
        const nextItems = [...itemsRef.current.filter((item) => !item.demo), ...added]
        if (canSave) {
          try {
            writeLocalProject(
              nextItems,
              { ...settingsRef.current, rotation: 0, zoom: 1, offsetX: 0, offsetY: 0 },
              added[0].id,
              dark,
            )
          } catch {
            stored = false
            setProjectSaveError(
              '本机保存失败，浏览器空间不足或存储被禁用。请先导出作品，再释放空间。',
            )
          }
        } else stored = false
        setItems(nextItems)
        setActiveId(added[0].id)
        change({ rotation: 0, zoom: 1, offsetX: 0, offsetY: 0 }, true)
        notify(
          stored
            ? `已导入 ${added.length} 个文件${errors.length ? `，${errors.length} 个格式暂不支持` : '，已暂存在本机'}`
            : '已导入，但本机存储空间不足或被禁用，刷新前请重试保存或先导出作品',
          stored ? 'success' : 'error',
        )
      } else notify('未能读取文件，请选择 JPG、PNG、WebP 或浏览器支持的视频', 'error')
      setImporting(false)
      setDragging(false)
    },
    [notify, change, hydrating, dark, canSave],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable ||
        modal
      )
        return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        inputRef.current?.click()
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const index = items.findIndex((i) => i.id === active?.id),
          next = items[index + (e.key === 'ArrowRight' ? 1 : -1)]
        if (next) {
          e.preventDefault()
          setActiveId(next.id)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, modal, items, active])

  const selectTemplate = (id: TemplateId) => {
    const t = templates.find((t) => t.id === id)!
    if (id === settings.template) return
    const currentLayout = {
      showBrand: settings.showBrand,
      logoPosition: settings.logoPosition,
      logoX: settings.logoX,
      logoY: settings.logoY,
      logoScale: settings.logoScale,
      logoRotation: settings.logoRotation,
    }
    change(
      {
        template: id,
        ...defaultLogoLayout,
        ...settings.logoLayouts?.[id],
        logoLayouts: { ...settings.logoLayouts, [settings.template]: currentLayout },
        color: t.color,
        textColor: t.dark ? '#f2f0e8' : '#282b28',
        padding: t.padding,
        ratio: t.ratio || 'original',
      },
      true,
    )
  }
  const removeItem = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    if (!item.demo) {
      forgetImage(item.url)
      URL.revokeObjectURL(item.url)
      objectUrls.current.delete(item.url)
      if (item.poster) {
        URL.revokeObjectURL(item.poster)
        objectUrls.current.delete(item.poster)
      }
    }
    const remaining = items.filter((i) => i.id !== id)
    pendingMedia.current.delete(id)
    try {
      writeLocalProject(
        remaining,
        settings,
        activeId === id ? remaining[0]?.id || '' : activeId,
        dark,
      )
      if (!item.demo)
        void deleteMediaFile(id).catch(() =>
          notify('无法释放此文件的本机暂存，可稍后清空项目重试', 'error'),
        )
    } catch {
      setProjectSaveError('移除结果未能保存，请检查浏览器存储设置')
    }
    setItems(remaining)
    if (activeId === id) setActiveId(remaining[0]?.id || '')
  }
  const savePreset = () => {
    const name = presetName.trim()
    if (!name) return
    const next = [...presets, { id: crypto.randomUUID(), name, settings: { ...cameraSettings } }]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setPresets(next)
      setModal(null)
      notify('预设已保存在当前浏览器')
    } catch {
      notify('浏览器存储空间不足，请删除部分预设或使用较小的 Logo', 'error')
    }
  }
  const deletePreset = (id: string) => {
    const next = presets.filter((p) => p.id !== id)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setPresets(next)
    } catch {
      notify('无法更新本地预设，请检查浏览器存储设置', 'error')
    }
  }
  const uploadLogo = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('请选择图片格式的 Logo', 'error')
      return
    }
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImage(url)
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, 500 / Math.max(img.width, img.height))
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      change({ logo: canvas.toDataURL('image/png'), showBrand: true }, true)
    } catch {
      notify('Logo 无法读取，请尝试 PNG 或 JPG', 'error')
    } finally {
      URL.revokeObjectURL(url)
      forgetImage(url)
    }
  }
  const exportImages = async () => {
    const chosen = exportOptions.all
      ? items.filter((i) => i.kind === 'image')
      : active?.kind === 'image'
        ? [active]
        : []
    if (!chosen.length) return
    setExporting(true)
    setProgress(0)
    cancelExport.current = false
    const blobs: { name: string; blob: Blob }[] = []
    try {
      await document.fonts.ready
      for (let index = 0; index < chosen.length; index++) {
        if (cancelExport.current) throw new Error('已取消导出')
        const item = chosen[index],
          img = await loadImage(item.url),
          canvas = document.createElement('canvas')
        const maxSide = exportOptions.size || Math.max(item.width, item.height)
        await ensureTypography(settings, item.metadata)
        await drawFrame(canvas, img, item.width, item.height, settings, item.metadata, maxSide)
        const blob = await canvasBlob(
          canvas,
          exportOptions.format === 'png' ? 'image/png' : 'image/jpeg',
          exportOptions.quality / 100,
        )
        blobs.push({
          name: `${safeName(item.name)}_photosider${chosen.length > 1 ? `_${String(index + 1).padStart(2, '0')}` : ''}.${exportOptions.format === 'png' ? 'png' : 'jpg'}`,
          blob,
        })
        canvas.width = 0
        canvas.height = 0
        setProgress(Math.round(((index + 1) / chosen.length) * 90))
        await new Promise((r) => setTimeout(r, 0))
      }
      if (cancelExport.current) throw new Error('已取消导出')
      if (blobs.length === 1) downloadBlob(blobs[0].blob, blobs[0].name)
      else {
        const files: Record<string, Uint8Array> = {}
        for (const f of blobs) files[f.name] = new Uint8Array(await f.blob.arrayBuffer())
        const zip = zipSync(files, { level: 0 })
        downloadBlob(
          new Blob([zip as BlobPart], { type: 'application/zip' }),
          `Photosider_${blobs.length}张作品.zip`,
        )
      }
      setProgress(100)
      setModal(null)
      notify(`已导出 ${blobs.length} 张作品${blobs.length > 1 ? '，已打包为 ZIP' : ''}`)
    } catch (e) {
      notify((e as Error).message || '导出失败，请尝试更小的尺寸', 'error')
    } finally {
      setExporting(false)
    }
  }

  const printWorks = async () => {
    const chosen = exportOptions.all
      ? items.filter((item) => item.kind === 'image')
      : active
        ? [active]
        : []
    if (!chosen.length) return
    let preview: ReturnType<typeof createPrintPreview> | undefined
    try {
      preview = createPrintPreview(printOptions)
      setExporting(true)
      setProgress(0)
      cancelExport.current = false
      for (let index = 0; index < chosen.length; index++) {
        if (cancelExport.current) throw new Error('已取消打印准备')
        const item = chosen[index]
        let image: CanvasImageSource
        if (item.kind === 'video') {
          if (!(source instanceof HTMLVideoElement) || source.readyState < 2)
            throw new Error('视频画面尚未准备好，请稍后重试')
          source.pause()
          setPlaying(false)
          image = source
        } else image = await loadImage(item.url)
        const canvas = document.createElement('canvas')
        try {
          await drawFrame(
            canvas,
            image,
            item.width,
            item.height,
            settings,
            item.metadata,
            exportOptions.size || Math.max(item.width, item.height),
          )
          const blob = await canvasBlob(canvas, 'image/png')
          if (cancelExport.current) throw new Error('已取消打印准备')
          await preview.addPage(blob, item.name, canvas.width, canvas.height)
        } finally {
          canvas.width = 0
          canvas.height = 0
        }
        setProgress(Math.round(((index + 1) / chosen.length) * 100))
      }
      if (cancelExport.current) throw new Error('已取消打印准备')
      await preview.print(() => cancelExport.current)
      notify('打印预览已准备好，可在系统窗口打印或保存为 PDF')
    } catch (error) {
      preview?.close()
      notify((error as Error).message || '打印准备失败，请重试或选择较小的尺寸', 'error')
    } finally {
      setExporting(false)
    }
  }

  const exportVideo = async () => {
    if (!active || active.kind !== 'video') return
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      notify('当前浏览器不支持视频导出，请使用较新版本的 Chrome、Edge 或 Safari', 'error')
      return
    }
    // Generic MP4 support can select VP9/Opus and lose short video tracks during
    // muxing. Prefer H.264/AAC MP4, and use native WebM for the WebM codecs.
    const mime = [
      exportOptions.audio ? 'video/mp4;codecs=avc1,mp4a.40.2' : 'video/mp4;codecs=avc1',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ].find((t) => MediaRecorder.isTypeSupported(t))
    if (!mime) {
      notify('当前浏览器没有可用的视频编码器', 'error')
      return
    }
    setExporting(true)
    setProgress(0)
    cancelExport.current = false
    const video = document.createElement('video'),
      canvas = document.createElement('canvas')
    let audioCtx: AudioContext | undefined,
      stream: MediaStream | undefined,
      raf = 0,
      recorder: MediaRecorder | undefined
    try {
      await ensureTypography(settings, active.metadata)
      if (exportOptions.audio) {
        audioCtx = new AudioContext()
        await audioCtx.resume()
      }
      video.src = active.url
      video.playsInline = true
      video.muted = true
      video.preload = 'auto'
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('视频准备超时')), 15000)
        video.onloadeddata = () => {
          clearTimeout(timeout)
          resolve()
        }
        video.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('视频无法解码'))
        }
      })
      const paintFrame = () =>
        drawFrame(
          canvas,
          video,
          active.width,
          active.height,
          settings,
          active.metadata,
          Math.min(exportOptions.size || 1920, 1920),
          true,
        )
      await paintFrame()
      stream = canvas.captureStream(30)
      const captureTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack
      const requestCanvasFrame = () => {
        if (captureTrack.readyState === 'live' && typeof captureTrack.requestFrame === 'function')
          captureTrack.requestFrame()
      }
      if (audioCtx) {
        const input = audioCtx.createMediaElementSource(video),
          destination = audioCtx.createMediaStreamDestination()
        input.connect(destination)
        destination.stream.getAudioTracks().forEach((track) => stream!.addTrack(track))
        // Route audio only into the recording stream; muting the element also mutes this signal.
        video.muted = false
      }
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
      const chunks: Blob[] = []
      const finished = new Promise<Blob>((resolve, reject) => {
        recorder!.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data)
        }
        recorder!.onstop = () => resolve(new Blob(chunks, { type: mime.split(';')[0] }))
        recorder!.onerror = () => reject(new Error('视频编码失败，请降低导出尺寸'))
      })
      let paintError: Error | undefined
      const paint = async () => {
        if (cancelExport.current) {
          video.pause()
          if (recorder?.state === 'recording') recorder.stop()
          return
        }
        try {
          await paintFrame()
          requestCanvasFrame()
        } catch (error) {
          paintError = error as Error
          video.pause()
          if (recorder?.state === 'recording') recorder.stop()
          return
        }
        setProgress(Math.min(99, Math.round((video.currentTime / video.duration) * 100)))
        if (!video.ended)
          raf = requestAnimationFrame(() => {
            void paint()
          })
      }
      video.onended = () => {
        cancelAnimationFrame(raf)
        if (recorder?.state === 'recording') recorder.stop()
      }
      recorder.start(1000)
      // Prime the video track before playback starts. A very short clip can end
      // before automatic canvas capture emits its first frame on a busy device.
      await paintFrame()
      requestCanvasFrame()
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => {
          requestCanvasFrame()
          requestAnimationFrame(() => resolve())
        }),
      )
      await video.play()
      void paint()
      const blob = await finished
      if (paintError) throw paintError
      if (cancelExport.current) throw new Error('已取消导出')
      if (!blob.size) throw new Error('未能生成视频，请使用其他浏览器重试')
      downloadBlob(
        blob,
        `${safeName(active.name)}_photosider.${mime.includes('mp4') ? 'mp4' : 'webm'}`,
      )
      setProgress(100)
      setModal(null)
      notify('视频已在本地处理并导出')
    } catch (e) {
      notify((e as Error).message || '视频导出失败', 'error')
    } finally {
      cancelAnimationFrame(raf)
      video.pause()
      if (recorder?.state === 'recording') recorder.stop()
      video.removeAttribute('src')
      video.load()
      stream?.getTracks().forEach((t) => t.stop())
      await audioCtx?.close()
      canvas.width = 0
      setExporting(false)
    }
  }

  useEffect(() => {
    if (modal !== 'camera') return
    let disposed = false,
      stream: MediaStream | undefined,
      raf = 0
    setCameraReady(false)
    setCameraError('')
    const run = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error('摄像头需要 HTTPS 或 localhost 地址，请在安全连接下打开。')
        await ensureTypography(settingsRef.current)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: cameraFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
        if (disposed) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = cameraVideo.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        // Some browsers resolve play() before decoded dimensions are available.
        // Enable the shutter only once taking a real frame can succeed.
        const readyDeadline = performance.now() + 8000
        await new Promise<void>((resolve, reject) => {
          const checkFrame = () => {
            if (disposed) return resolve()
            if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2)
              return resolve()
            if (performance.now() >= readyDeadline)
              return reject(new Error('摄像头画面准备超时，请重新打开'))
            requestAnimationFrame(checkFrame)
          }
          checkFrame()
        })
        if (disposed) return
        setCameraReady(true)
        const draw = () => {
          if (disposed) return
          if (cameraCanvas.current && video.videoWidth)
            void drawFrame(
              cameraCanvas.current,
              video,
              video.videoWidth,
              video.videoHeight,
              settingsRef.current,
              {
                ...emptyMetadata,
                camera: 'PHOTOSIDER CAMERA',
                date: new Date().toLocaleDateString('sv-SE').replaceAll('-', '.'),
              },
              1400,
            )
          raf = requestAnimationFrame(draw)
        }
        draw()
      } catch (e) {
        if (!disposed)
          setCameraError(
            (e as Error).name === 'NotAllowedError'
              ? '摄像头权限未开启。请在浏览器地址栏允许访问摄像头后重试。'
              : (e as Error).name === 'NotFoundError'
                ? '没有找到可用摄像头，你也可以直接导入照片。'
                : (e as Error).message,
          )
      }
    }
    void run()
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [modal, cameraFacing])
  const takePhoto = async () => {
    const video = cameraVideo.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const blob = await canvasBlob(canvas, 'image/jpeg', 0.98)
    await importFiles([
      new File([blob], `拍摄_${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.jpg`, {
        type: 'image/jpeg',
      }),
    ])
    setModal(null)
    notify('拍摄完成，可以继续调整边框和参数')
  }

  const output = active
    ? frameLayout(
        active.width,
        active.height,
        settings,
        exportOptions.size || Math.max(active.width, active.height),
      )
    : null
  const visibleTemplates = templates.filter(
    (t) =>
      (!query || `${t.name} ${t.subtitle}`.toLowerCase().includes(query.toLowerCase())) &&
      (category === '全部' || category === t.category),
  )
  const selectPanelTab = (next: typeof tab) => {
    setTab(next)
    setMobilePanel('settings')
  }
  const closeModal = useCallback(() => {
    if (!exporting) setModal(null)
  }, [exporting])
  const supportsBrand = supportsBrandMark(settings.template)
  const brandTextFace = textTypeface(cameraSettings, 'logo')
  const brandTypography = { ...getBrandTypography(cameraSettings), ...brandTextFace }
  const selectedBrandLogo = getBrandLogo(cameraSettings)
  const availableBrandLogos = brandLogos.filter((item) => item.brand === cameraSettings.brand)
  const cameraTypography = getCameraTypography(settings, active?.metadata)
  const formatTime = (n: number) =>
    `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`

  const workspaceViewActions = (
    <>
      <button className="camera-link" aria-label="拍一张" onClick={() => setModal('camera')}>
        <Camera size={15} />
        <span>拍一张</span>
      </button>
      <IconButton title={dark ? '浅色工作台' : '深色工作台'} onClick={() => setDark((d) => !d)}>
        {dark ? <Sun size={16} /> : <Moon size={16} />}
        <span className="workspace-view-label">{dark ? '浅色工作台' : '深色工作台'}</span>
      </IconButton>
      <IconButton
        title="全屏预览"
        onClick={() => {
          if (document.fullscreenElement) void document.exitFullscreen()
          else
            void stageRef.current
              ?.requestFullscreen()
              .catch(() => notify('当前浏览器暂不支持全屏', 'error'))
        }}
      >
        <Maximize2 size={16} />
        <span className="workspace-view-label">全屏预览</span>
      </IconButton>
    </>
  )

  return (
    <div
      className={`app ${dark ? 'dark-workspace' : ''} ${mobilePanel ? 'panel-open' : ''}`}
      style={{ '--sheet-height': sheetExpanded ? '58dvh' : '43dvh' } as CSSProperties}
      onDragEnter={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault()
          dragDepth.current++
          setDragging(true)
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        dragDepth.current--
        if (dragDepth.current <= 0) {
          dragDepth.current = 0
          setDragging(false)
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        void importFiles(Array.from(e.dataTransfer.files))
      }}
    >
      <input
        ref={inputRef}
        type="file"
        tabIndex={-1}
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
        className="visually-hidden"
        onChange={(e) => {
          void importFiles(Array.from(e.target.files || []))
          e.target.value = ''
        }}
        aria-label="导入照片或视频"
      />
      <input
        ref={logoInputRef}
        type="file"
        tabIndex={-1}
        accept="image/*"
        className="visually-hidden"
        aria-label="上传自定义 Logo"
        onChange={(e) => {
          void uploadLogo(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <header className="app-header">
        <a className="wordmark" href="/" aria-label="Photosider 首页">
          <span className="brand-mark">
            <Crop size={22} strokeWidth={1.8} />
            <i />
          </span>
          <span>
            photosider<span className="wordmark-dot">.</span>
          </span>
        </a>
        <div className="header-spacer" />
        <span className="privacy-note">
          <ShieldCheck size={14} />
          照片只属于你，本地处理
        </span>
        <IconButton title="使用帮助" onClick={() => setModal('help')}>
          <CircleHelp size={18} />
        </IconButton>
        <button
          className="button button-dark header-export"
          disabled={!active || exporting}
          onClick={() => {
            setExportOptions((o) => ({ ...o, all: false }))
            setModal('export')
          }}
        >
          <ArrowDownToLine size={16} />
          <span>导出作品</span>
          <span className="export-key">↗</span>
        </button>
      </header>

      <main className="studio-grid">
        <aside
          className={`template-panel ${mobilePanel === 'templates' ? 'mobile-open' : ''}`}
          aria-label="边框模板与预设"
        >
          <button
            className="sheet-handle"
            aria-label={sheetExpanded ? '收起模板面板' : '展开模板面板'}
            onClick={() => setSheetExpanded((e) => !e)}
          >
            <span />
          </button>
          <div className="panel-mobile-heading">
            <span>{library === 'templates' ? '边框模板' : '我的预设'}</span>
            <IconButton title="关闭模板面板" onClick={() => setMobilePanel(null)}>
              <X size={20} />
            </IconButton>
          </div>
          <div className="library-top">
            <div>
              <span className="eyebrow">THE FRAME COLLECTION</span>
              <h2>{library === 'templates' ? '为影像，留一点余白。' : '收藏你的创作风格。'}</h2>
            </div>
            <button
              className="import-button"
              onClick={() => inputRef.current?.click()}
              disabled={importing}
            >
              <ImagePlus size={18} />
              <span>{importing ? '正在读取文件…' : '导入照片 / 视频'}</span>
              <Plus size={15} />
            </button>
            <span className="import-caption">拖放文件到任意位置 · 支持批量导入</span>
          </div>
          <div className="library-nav">
            <button
              className={library === 'templates' ? 'active' : ''}
              onClick={() => setLibrary('templates')}
            >
              <Grid2X2 size={14} />
              边框模板<span>{String(templates.length).padStart(2, '0')}</span>
            </button>
            <button
              className={library === 'presets' ? 'active' : ''}
              onClick={() => setLibrary('presets')}
            >
              <Bookmark size={14} />
              我的预设<span>{presets.length.toString().padStart(2, '0')}</span>
            </button>
          </div>
          <div className="library-content">
            {library === 'templates' ? (
              <>
                <div className="search-field">
                  <Search size={14} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="找一个喜欢的边框"
                    aria-label="搜索边框"
                  />
                  {query && (
                    <button aria-label="清除搜索" onClick={() => setQuery('')}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="category-tabs">
                  {['全部', '简约', '胶片', '创意'].map((c) => (
                    <button
                      key={c}
                      className={category === c ? 'active' : ''}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                  <span>{visibleTemplates.length} 款</span>
                </div>
                <div className="template-grid">
                  {visibleTemplates.map((t, index) => (
                    <button
                      key={t.id}
                      className={`template-card ${settings.template === t.id ? 'selected' : ''}`}
                      onClick={() => selectTemplate(t.id)}
                      aria-pressed={settings.template === t.id}
                    >
                      <div
                        className={`template-preview template-${t.id}`}
                        style={{ '--paper': t.color } as CSSProperties}
                      >
                        <div className="mini-frame">
                          <img src="/demo/alpine.jpg" alt="" />
                          <div className="mini-meta">
                            <span />
                            <i />
                            <span />
                          </div>
                        </div>
                        {t.tag && <span className="template-tag">{t.tag}</span>}
                        {settings.template === t.id && (
                          <span className="template-check">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <div className="template-card-label">
                        <span>{t.name}</span>
                        <span className="template-index">{String(index + 1).padStart(2, '0')}</span>
                      </div>
                      <small>{t.subtitle}</small>
                    </button>
                  ))}
                </div>
                {!visibleTemplates.length && (
                  <div className="empty-mini">
                    <Search size={24} />
                    <p>没有找到这个边框</p>
                    <button
                      onClick={() => {
                        setQuery('')
                        setCategory('全部')
                      }}
                    >
                      查看所有模板
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="preset-list">
                {presets.length ? (
                  presets.map((p) => (
                    <div className="preset-item" key={p.id}>
                      <button
                        onClick={() => {
                          change(p.settings, true)
                          notify(`已应用预设「${p.name}」`)
                        }}
                      >
                        <span className="preset-icon" style={{ background: p.settings.color }}>
                          <Crop size={18} color={p.settings.textColor} />
                        </span>
                        <span>
                          <strong>{p.name}</strong>
                          <small>
                            {templates.find((t) => t.id === p.settings.template)?.name} · 本地预设
                          </small>
                        </span>
                      </button>
                      <IconButton title={`删除预设 ${p.name}`} onClick={() => deletePreset(p.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  ))
                ) : (
                  <div className="preset-empty">
                    <Bookmark size={28} strokeWidth={1.3} />
                    <h3>把喜欢的风格留下</h3>
                    <p>
                      调整边框后保存预设，
                      <br />
                      下一次创作，一键开始。
                    </p>
                    <button className="button button-light" onClick={() => setModal('preset')}>
                      <Plus size={14} />
                      保存当前样式
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="library-bottom">
            <div className="collection-note">
              <Aperture size={23} strokeWidth={1.2} />
              <div>
                <strong>好照片，自成风格。</strong>
                <p>你的视角，就是独一无二的签名。</p>
              </div>
            </div>
            <div className="local-badge">
              <LockKeyhole size={12} />
              <span>无需登录 · 无需上传 · 自由创作</span>
            </div>
          </div>
        </aside>

        <section className="workspace" aria-label="作品预览">
          <div className="workspace-toolbar">
            <div className="workspace-document">
              <span
                className={`saved-label ${projectSaveError || mediaSaveError ? 'save-error' : ''}`}
                role="status"
                title={
                  projectSaveError ||
                  mediaSaveError ||
                  '图片与编辑进度仅保存在当前浏览器，刷新后自动恢复'
                }
              >
                <Check size={10} />
                {hydrating
                  ? '正在恢复'
                  : projectSaveError || mediaSaveError
                    ? '本机保存失败'
                    : savingMedia || importing
                      ? '正在保存'
                      : '已存本机'}
              </span>
            </div>
            <div id="canvas-edit-toolbar" className="canvas-edit-toolbar" />
            <div className="workspace-actions">
              <div className="workspace-history" role="group" aria-label="编辑历史">
                <IconButton
                  title="撤销样式（Ctrl / ⌘ Z）"
                  onClick={undo}
                  disabled={!history.length}
                >
                  <Undo2 size={16} />
                </IconButton>
                <IconButton
                  title="重做样式（Ctrl / ⌘ Shift Z）"
                  onClick={redo}
                  disabled={!future.length}
                >
                  <Undo2 size={16} className="flip" />
                </IconButton>
              </div>
              <button
                className="workspace-preset"
                title="保存为我的预设"
                aria-label="保存为我的预设"
                onClick={() => setModal('preset')}
              >
                <Bookmark size={15} />
                <span>存为预设</span>
              </button>
              <span className="workspace-action-divider" aria-hidden="true" />
              {compactWorkspace ? (
                <details
                  className="workspace-more"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget))
                      event.currentTarget.open = false
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.currentTarget.open = false
                      event.currentTarget.querySelector('summary')?.focus()
                    }
                  }}
                >
                  <summary aria-label="更多画布操作" title="更多画布操作">
                    <Ellipsis size={20} />
                  </summary>
                  <div
                    className="workspace-tools"
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('button'))
                        event.currentTarget.closest('details')?.removeAttribute('open')
                    }}
                  >
                    {workspaceViewActions}
                  </div>
                </details>
              ) : (
                <div className="workspace-tools">{workspaceViewActions}</div>
              )}
            </div>
          </div>
          <div className="canvas-stage" ref={stageRef}>
            {active ? (
              <>
                <div className="stage-topline">
                  <span className="stage-marker">
                    PHOTO /{' '}
                    {String(items.findIndex((i) => i.id === active.id) + 1).padStart(2, '0')}
                    {active.demo && <span className="sample-label">示例</span>}
                  </span>
                  <strong className="workspace-title" title={active.name}>
                    {active.name.replace(/\.[^.]+$/, '')}
                  </strong>
                  <span className="original-size">
                    {active.width} × {active.height} <i />{' '}
                    {active.kind === 'video' ? 'VIDEO' : 'RGB'}
                  </span>
                </div>
                <div className="artboard-space">
                  <div
                    className={`artboard ${!source ? 'loading' : ''}`}
                    style={
                      {
                        aspectRatio: output ? `${output.width} / ${output.height}` : '3 / 2',
                        '--art-ratio': output ? output.width / output.height : 1.5,
                      } as CSSProperties
                    }
                  >
                    <CanvasEditor
                      canvasRef={canvasRef}
                      elements={canvasElements}
                      settings={cameraSettings}
                      mediaId={active.id}
                      onChange={change}
                    />
                    {!source && <span className="canvas-loading">正在准备画布…</span>}
                  </div>
                </div>
                <div className="stage-bottomline">
                  <span>
                    <span className="status-dot" />
                    点选文字或 Logo · 单指拖动，双指缩放旋转
                  </span>
                  <button
                    onClick={() => {
                      change({ zoom: 1, offsetX: 0, offsetY: 0 }, true)
                      notify('画面已适应画布')
                    }}
                  >
                    <Expand size={13} />
                    适应画布
                  </button>
                </div>
              </>
            ) : (
              <div className="workspace-empty">
                <div className="empty-icon">
                  <ImagePlus size={32} strokeWidth={1.3} />
                </div>
                <span className="eyebrow">YOUR NEXT GREAT FRAME</span>
                <h1>
                  让每一张照片，
                  <br />
                  都有被珍藏的样子。
                </h1>
                <p>拖入照片或视频，开始你的下一件作品。</p>
                <button className="button button-dark" onClick={() => inputRef.current?.click()}>
                  <Plus size={16} />
                  导入你的影像
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setItems(demos)
                    setActiveId(demos[0].id)
                  }}
                >
                  先用示例照片试一试 <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="canvas-controls">
            <span className="ratio-label">
              <Crop size={14} />
              画布比例
            </span>
            <div className="ratio-options">
              {ratios.map((r) => (
                <button
                  className={settings.ratio === r ? 'active' : ''}
                  key={r}
                  onClick={() => change({ ratio: r }, true)}
                  aria-label={`画布比例 ${r === 'original' ? '原图' : r}`}
                >
                  <span className={`ratio-icon ratio-${r.replace(':', '-')}`} />
                  {r === 'original' ? '原图' : r}
                </button>
              ))}
            </div>
            <button
              className={`custom-ratio ${settings.ratio === 'custom' ? 'active' : ''}`}
              onClick={() => {
                change({ ratio: 'custom' }, true)
                selectPanelTab('adjust')
              }}
            >
              <SlidersHorizontal size={13} />
              <span>自定义</span>
            </button>
          </div>
          {active?.kind === 'video' && (
            <div className="video-controls">
              <IconButton
                title={playing ? '暂停预览' : '播放预览'}
                onClick={() => {
                  if (!(source instanceof HTMLVideoElement)) return
                  if (playing) {
                    source.pause()
                    setPlaying(false)
                  } else {
                    if (source.ended) source.currentTime = 0
                    source
                      .play()
                      .then(() => setPlaying(true))
                      .catch(() => notify('视频暂时无法播放', 'error'))
                  }
                }}
              >
                {playing ? <Pause size={15} /> : <Play size={15} />}
              </IconButton>
              <input
                type="range"
                aria-label="视频预览进度"
                min={0}
                max={active.duration || 1}
                step={0.1}
                value={videoTime}
                onChange={(e) => {
                  if (source instanceof HTMLVideoElement)
                    source.currentTime = Number(e.target.value)
                  setVideoTime(Number(e.target.value))
                }}
              />
              <span>
                {formatTime(videoTime)} / {formatTime(active.duration || 0)}
              </span>
              <span className="muted-label">静音预览</span>
            </div>
          )}
          <div className="filmstrip">
            <div className="filmstrip-heading">
              <div>
                <Layers size={14} />
                <strong>影像列表</strong>
                <span className="count-badge">{items.length.toString().padStart(2, '0')}</span>
              </div>
              <div>
                <span className="filmstrip-tip">同一套边框，装裱每一份回忆</span>
                <button
                  onClick={() => {
                    setExportOptions((o) => ({ ...o, all: true }))
                    setModal('export')
                  }}
                  disabled={!items.some((i) => i.kind === 'image')}
                >
                  <Copy size={13} />
                  批量导出
                </button>
              </div>
            </div>
            <div className="filmstrip-track">
              {items.map((item, i) => (
                <div
                  className={`filmstrip-item ${active?.id === item.id ? 'active' : ''}`}
                  key={item.id}
                  data-media-kind={item.kind}
                >
                  <button
                    className="filmstrip-select"
                    onClick={() => setActiveId(item.id)}
                    title={item.name}
                  >
                    {item.kind === 'image' || item.poster ? (
                      <img
                        src={item.kind === 'video' ? item.poster : item.url}
                        alt={item.name}
                        className={item.kind === 'video' ? 'video-poster' : undefined}
                      />
                    ) : (
                      <span className="video-thumb">
                        <Film size={24} />
                      </span>
                    )}
                    {item.kind === 'video' && (
                      <span className="video-thumb-badge">
                        <Play size={8} fill="currentColor" />
                        {formatTime(item.duration || 0)}
                      </span>
                    )}
                    <span className="filmstrip-number">{String(i + 1).padStart(2, '0')}</span>
                    {active?.id === item.id && (
                      <span className="filmstrip-check">
                        <Check size={10} />
                      </span>
                    )}
                  </button>
                  <button
                    className="filmstrip-delete"
                    aria-label={`移除 ${item.name}`}
                    onClick={() => removeItem(item.id)}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button
                className="add-media"
                onClick={() => inputRef.current?.click()}
                disabled={importing}
                aria-label="添加更多照片或视频"
              >
                <Plus size={21} strokeWidth={1.4} />
                <span>添加影像</span>
              </button>
              <div className="filmstrip-fill">
                <span>
                  MAKE ROOM
                  <br />
                  FOR YOUR MOMENTS.
                </span>
                <Aperture size={30} strokeWidth={0.8} />
              </div>
            </div>
          </div>
          <footer className="workspace-footer">
            <span>
              <ShieldCheck size={12} />
              {projectSaveError || mediaSaveError
                ? '本机保存失败，请查看帮助'
                : '图片与编辑已在本机暂存，刷新可继续'}
            </span>
            <span>
              MADE FOR YOUR PERSPECTIVE <span className="orange-dot">●</span>
            </span>
          </footer>
        </section>

        <aside
          className={`settings-panel ${mobilePanel === 'settings' ? 'mobile-open' : ''}`}
          aria-label="作品设置"
        >
          <button
            className="sheet-handle"
            aria-label={sheetExpanded ? '收起编辑面板' : '展开编辑面板'}
            onClick={() => setSheetExpanded((e) => !e)}
          >
            <span />
          </button>
          <div className="settings-heading">
            <div>
              <Settings2 size={17} />
              <h2>作品设置</h2>
            </div>
            <div>
              <IconButton
                title="重置样式"
                onClick={() => {
                  change(defaultSettings, true)
                  notify('已恢复默认样式')
                }}
              >
                <RotateCcw size={15} />
              </IconButton>
              <IconButton
                className="mobile-close"
                title="关闭设置面板"
                onClick={() => setMobilePanel(null)}
              >
                <X size={20} />
              </IconButton>
            </div>
          </div>
          <div className="settings-tabs">
            {(Object.keys(tabLabels) as (keyof typeof tabLabels)[]).map((t) => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                {t === 'frame' ? (
                  <Grid2X2 size={14} />
                ) : t === 'text' ? (
                  <Type size={15} />
                ) : (
                  <Crop size={15} />
                )}
                {tabLabels[t]}
              </button>
            ))}
          </div>
          <div className="settings-content">
            {(tab === 'frame' || tab === 'text') && (
              <section className="control-section">
                <div className="section-title">
                  <h3>相机与品牌</h3>
                  <span>CAMERA</span>
                </div>
                {active && (
                  <CameraIdentity
                    settings={cameraSettings}
                    metadata={active.metadata}
                    onBrandChange={selectCameraBrand}
                    onCameraChange={updateCamera}
                  />
                )}
                {tab === 'frame' && (
                  <>
                    <Toggle
                      label="显示品牌标记"
                      checked={settings.showBrand && supportsBrand}
                      disabled={!supportsBrand}
                      onChange={(v) => change({ showBrand: v }, true)}
                    />
                    {!supportsBrand && (
                      <p className="field-hint">
                        当前边框以文案为主。可切换经典签名、电影画幅等边框显示品牌标记。
                      </p>
                    )}
                    {settings.showBrand && supportsBrand && (
                      <div className="brand-controls">
                        <details className="logo-position-controls">
                          <summary>
                            <Expand size={13} />
                            Logo 位置与大小
                            <ChevronRight size={13} />
                          </summary>
                          <label className="field">
                            <span>放置位置</span>
                            <select
                              aria-label="Logo 放置位置"
                              value={settings.logoPosition}
                              onChange={(event) =>
                                change(
                                  {
                                    logoPosition: event.target.value as Settings['logoPosition'],
                                    logoX: 0,
                                    logoY: 0,
                                  },
                                  true,
                                )
                              }
                            >
                              {Object.entries({
                                auto: '模板默认位置',
                                'top-left': '左上',
                                'top-center': '上方居中',
                                'top-right': '右上',
                                'center-left': '左侧居中',
                                center: '画面居中',
                                'center-right': '右侧居中',
                                'bottom-left': '左下',
                                'bottom-center': '下方居中',
                                'bottom-right': '右下',
                              }).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Range
                            label="Logo 横向偏移"
                            value={settings.logoX}
                            min={-100}
                            max={100}
                            step={0.5}
                            unit="%"
                            onChange={(value) => change({ logoX: value })}
                          />
                          <Range
                            label="Logo 纵向偏移"
                            value={settings.logoY}
                            min={-100}
                            max={100}
                            step={0.5}
                            unit="%"
                            onChange={(value) => change({ logoY: value })}
                          />
                          <Range
                            label="Logo 大小"
                            value={settings.logoScale}
                            min={20}
                            max={400}
                            step={5}
                            unit="%"
                            onChange={(value) => change({ logoScale: value })}
                          />
                          <Range
                            label="Logo 旋转角度"
                            value={settings.logoRotation || 0}
                            min={-180}
                            max={180}
                            step={1}
                            unit="°"
                            onChange={(value) => change({ logoRotation: value })}
                          />
                          <button
                            className="text-button compact"
                            onClick={() => change(defaultLogoLayout, true)}
                          >
                            <RotateCcw size={12} />
                            恢复默认位置
                          </button>
                          <p className="field-hint">
                            点选文字或 Logo，拖动移动，控制点或双指缩放旋转。每种边框分别记住布局。
                          </p>
                        </details>

                        {!settings.logo && (
                          <>
                            {availableBrandLogos.length > 0 && (
                              <label className="field">
                                <span>品牌标记</span>
                                <select
                                  aria-label="品牌标记"
                                  value={settings.brandLogo === 'text' ? 'text' : 'auto'}
                                  onChange={(e) =>
                                    change(
                                      { brand: cameraSettings.brand, brandLogo: e.target.value },
                                      true,
                                    )
                                  }
                                >
                                  <option value="auto">内置 Logo</option>
                                  <option value="text">字体签名</option>
                                </select>
                              </label>
                            )}
                            {selectedBrandLogo ? (
                              <>
                                {availableBrandLogos.length > 1 && (
                                  <div
                                    className="brand-logo-options"
                                    role="group"
                                    aria-label="Logo 样式"
                                  >
                                    {availableBrandLogos.map((item) => (
                                      <button
                                        key={item.id}
                                        aria-label={`${item.brand} · ${item.name}`}
                                        aria-pressed={selectedBrandLogo.id === item.id}
                                        onClick={() =>
                                          change(
                                            { brand: cameraSettings.brand, brandLogo: item.id },
                                            true,
                                          )
                                        }
                                      >
                                        <LogoArtwork
                                          item={item}
                                          tint={item.monochrome ? '#425b32' : undefined}
                                        />
                                        <span>{item.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <label className="field">
                                  <span>Logo 配色</span>
                                  <select
                                    aria-label="Logo 配色"
                                    value={settings.brandLogoColor}
                                    onChange={(e) =>
                                      change(
                                        {
                                          brandLogoColor: e.target
                                            .value as Settings['brandLogoColor'],
                                        },
                                        true,
                                      )
                                    }
                                  >
                                    <option value="auto">自动适应边框</option>
                                    <option value="original">保留原色</option>
                                    <option value="text">跟随文字颜色</option>
                                  </select>
                                </label>
                              </>
                            ) : (
                              <>
                                <div className="brand-type-preview" aria-label="品牌字体预览">
                                  <span
                                    style={{
                                      fontFamily: `"${brandTypography.family}", sans-serif`,
                                      fontWeight: brandTypography.weight,
                                      fontStyle: brandTypography.style,
                                    }}
                                  >
                                    {brandTypography.label}
                                  </span>
                                  <small>
                                    {brandTypography.name.split(' · ')[0]} <i />{' '}
                                    {cameraSettings.brand === 'PHOTOSIDER'
                                      ? '工作室签名'
                                      : '开源近似'}
                                  </small>
                                </div>
                                <div className="field">
                                  <span>字标字体</span>
                                  <button
                                    className="font-library-trigger wordmark-font-trigger"
                                    aria-label="选择字标字体"
                                    onClick={() => setModal('wordmark-fonts')}
                                  >
                                    <span className="font-trigger-aa">Aa</span>
                                    <span>
                                      <strong>{brandTypography.name.split(' · ')[0]}</strong>
                                      <small>搜索 / 预览 · 单独设置字标</small>
                                    </span>
                                    <Search size={15} />
                                  </button>
                                </div>
                              </>
                            )}
                          </>
                        )}
                        <button
                          className="logo-upload"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          {settings.logo ? (
                            <img src={settings.logo} alt="自定义 Logo" />
                          ) : (
                            <Upload size={15} />
                          )}
                          <span>{settings.logo ? '更换自定义 Logo' : '上传自己的 Logo'}</span>
                          <Plus size={13} />
                        </button>
                        {settings.logo && (
                          <button
                            className="text-button compact"
                            onClick={() => change({ logo: '' }, true)}
                          >
                            移除自定义 Logo
                          </button>
                        )}
                        <p className="field-hint">
                          内置 26 款品牌 Logo，可切换字体签名或上传自己的透明 PNG。
                        </p>
                        <button
                          className="inline-link"
                          onClick={() => {
                            setTab('text')
                            change({ font: 'camera', canvasFont: 'auto', elementFonts: {} }, true)
                          }}
                        >
                          应用相机参数字体
                          <Type size={13} />
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
            {tab === 'frame' && (
              <>
                <section className="control-section">
                  <div className="section-title">
                    <h3>边框外观</h3>
                    <span>FRAME</span>
                  </div>
                  <div className="color-label">
                    <span>画纸颜色</span>
                    <span className="color-hex">{settings.color.toUpperCase()}</span>
                  </div>
                  <div className="swatches">
                    {['#faf9f6', '#ffffff', '#eee9df', '#d9dfd4', '#343a36', '#20231f'].map((c) => (
                      <button
                        key={c}
                        style={{ backgroundColor: c }}
                        className={settings.color === c ? 'active' : ''}
                        title={`画纸颜色 ${c}`}
                        aria-label={`画纸颜色 ${c}`}
                        onClick={() =>
                          change(
                            {
                              color: c,
                              textColor: ['#343a36', '#20231f'].includes(c) ? '#f6f5f0' : '#282b28',
                            },
                            true,
                          )
                        }
                      >
                        {settings.color === c && (
                          <Check
                            size={13}
                            color={['#343a36', '#20231f'].includes(c) ? '#fff' : '#343a36'}
                          />
                        )}
                      </button>
                    ))}
                    <label className="custom-color" title="自定义画纸颜色">
                      <Plus size={14} />
                      <input
                        type="color"
                        value={settings.color}
                        onChange={(e) => change({ color: e.target.value })}
                        aria-label="自定义画纸颜色"
                      />
                    </label>
                  </div>
                  <Range
                    label="留白边距"
                    value={settings.padding}
                    min={0}
                    max={15}
                    step={0.5}
                    unit="%"
                    onChange={(n) => change({ padding: n })}
                  />
                  <Range
                    label="照片圆角"
                    value={settings.radius}
                    min={0}
                    max={12}
                    unit="%"
                    onChange={(n) => change({ radius: n })}
                  />
                  <Range
                    label="投影深度"
                    value={settings.shadow}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(n) => change({ shadow: n })}
                  />
                </section>
                <section className="control-section">
                  <div className="section-title">
                    <h3>信息显示</h3>
                    <span>DETAILS</span>
                  </div>
                  <Toggle
                    label="拍摄参数"
                    checked={settings.showExif}
                    onChange={(v) => change({ showExif: v }, true)}
                  />
                  <Toggle
                    label="拍摄日期"
                    checked={settings.showDate}
                    onChange={(v) => change({ showDate: v }, true)}
                  />
                  <Toggle
                    label="拍摄地点"
                    checked={settings.showLocation}
                    onChange={(v) => change({ showLocation: v }, true)}
                  />
                  <button className="inline-link" onClick={() => setTab('text')}>
                    编辑拍摄信息
                    <Type size={13} />
                    <ArrowRight size={13} />
                  </button>
                </section>
              </>
            )}
            {tab === 'text' && (
              <>
                <section className="control-section">
                  <div className="section-title">
                    <h3>拍摄信息</h3>
                    <span>EXIF</span>
                  </div>
                  <div className={`exif-note ${active?.hasExif ? 'detected' : ''}`}>
                    {active?.hasExif ? <CheckCircle2 size={15} /> : <FileImage size={15} />}
                    <span>
                      {active?.hasExif
                        ? '已自动读取原图参数，可自由修改'
                        : active?.demo
                          ? '示例参数，导入原图后自动读取'
                          : '未读取到 EXIF，可手动补充信息'}
                    </span>
                  </div>
                  {active && (
                    <>
                      <Field
                        label="镜头名称"
                        value={active.metadata.lens}
                        onChange={(v) => updateMeta('lens', v)}
                        placeholder="例如 FE 24–70mm F2.8 GM II"
                      />
                      <div className="field-grid">
                        <Field
                          label="焦距 · mm"
                          value={active.metadata.focal}
                          onChange={(v) => updateMeta('focal', v)}
                          placeholder="35"
                        />
                        <Field
                          label="光圈 · f/"
                          value={active.metadata.aperture}
                          onChange={(v) => updateMeta('aperture', v)}
                          placeholder="2.8"
                        />
                        <Field
                          label="快门 · s"
                          value={active.metadata.shutter}
                          onChange={(v) => updateMeta('shutter', v)}
                          placeholder="1/250"
                        />
                        <Field
                          label="感光度 · ISO"
                          value={active.metadata.iso}
                          onChange={(v) => updateMeta('iso', v)}
                          placeholder="100"
                        />
                      </div>
                      <Field
                        label="拍摄日期"
                        value={active.metadata.date}
                        onChange={(v) => updateMeta('date', v)}
                        placeholder="2025.10.18"
                      />
                      <Field
                        label="地点 / 经纬度"
                        value={active.metadata.location}
                        onChange={(v) => updateMeta('location', v)}
                        placeholder="记录这一刻发生的地方"
                      />
                      <Field
                        label="作品文案"
                        value={active.metadata.caption}
                        onChange={(v) => updateMeta('caption', v)}
                        placeholder="为这一刻写一句话"
                      />
                      <p className="field-hint">文案显示在画廊、拍立得、邮票、杂志等边框中。</p>
                    </>
                  )}
                </section>
                <section className="control-section">
                  <div className="section-title">
                    <h3>文字样式</h3>
                    <span>TYPOGRAPHY</span>
                  </div>
                  <button className="font-library-trigger" onClick={() => setModal('fonts')}>
                    <span className="font-trigger-aa">Aa</span>
                    <span>
                      <strong>
                        {findLibraryFont(settings.canvasFont)?.name || '选择整体字体'}
                      </strong>
                      <small>中文 / 西文 · 搜索与预览</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                  <p className="field-hint">点选画布上的任意文字，可单独选择字体。</p>
                  <div className="font-options">
                    {(['sans', 'serif', 'mono', 'camera'] as const).map((f) => (
                      <button
                        key={f}
                        className={
                          settings.font === f && settings.canvasFont === 'auto' ? 'active' : ''
                        }
                        onClick={() =>
                          change({ font: f, canvasFont: 'auto', elementFonts: {} }, true)
                        }
                      >
                        <span
                          style={{
                            fontFamily:
                              f === 'camera'
                                ? `"${cameraTypography.family}", sans-serif`
                                : f === 'serif'
                                  ? 'Georgia, serif'
                                  : f === 'mono'
                                    ? 'monospace'
                                    : 'sans-serif',
                          }}
                        >
                          Aa
                        </span>
                        <small>
                          {f === 'sans'
                            ? '现代'
                            : f === 'serif'
                              ? '人文'
                              : f === 'camera'
                                ? '相机'
                                : '等宽'}
                        </small>
                      </button>
                    ))}
                  </div>
                  {settings.font === 'camera' && (
                    <p className="field-hint camera-font-note">
                      当前：{cameraTypography.name.split(' · ')[0]}
                      。按品牌匹配相机参数风格，使用内置开源字体。
                    </p>
                  )}
                  <Range
                    label="文字大小"
                    value={settings.textSize}
                    min={70}
                    max={140}
                    step={5}
                    unit="%"
                    onChange={(n) => change({ textSize: n })}
                  />
                  <label className="color-label text-color-label">
                    <span>文字颜色</span>
                    <span>
                      {settings.textColor.toUpperCase()}
                      <input
                        type="color"
                        value={settings.textColor}
                        aria-label="文字颜色"
                        onChange={(e) => change({ textColor: e.target.value })}
                      />
                    </span>
                  </label>
                </section>
              </>
            )}
            {tab === 'adjust' && (
              <>
                <section className="control-section">
                  <div className="section-title">
                    <h3>画面构图</h3>
                    <span>COMPOSITION</span>
                  </div>
                  <p className="section-intro">调整照片在画布内的取景。原始文件始终保留。</p>
                  <Range
                    label="画面缩放"
                    value={settings.zoom}
                    min={1}
                    max={3}
                    step={0.05}
                    unit="×"
                    onChange={(n) => change({ zoom: n })}
                  />
                  <Range
                    label="水平位置"
                    value={settings.offsetX}
                    min={-100}
                    max={100}
                    unit="%"
                    onChange={(n) => change({ offsetX: n })}
                  />
                  <Range
                    label="垂直位置"
                    value={settings.offsetY}
                    min={-100}
                    max={100}
                    unit="%"
                    onChange={(n) => change({ offsetY: n })}
                  />
                  <div className="rotate-buttons">
                    <button
                      onClick={() => change({ rotation: (settings.rotation + 270) % 360 }, true)}
                    >
                      <RotateCcw size={15} />
                      向左旋转
                    </button>
                    <button
                      onClick={() => change({ rotation: (settings.rotation + 90) % 360 }, true)}
                    >
                      <RotateCw size={15} />
                      向右旋转
                    </button>
                  </div>
                  <button
                    className="inline-link"
                    onClick={() => change({ zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 }, true)}
                  >
                    还原构图
                    <RotateCcw size={13} />
                  </button>
                </section>
                <section className="control-section">
                  <div className="section-title">
                    <h3>画布尺寸</h3>
                    <span>CANVAS</span>
                  </div>
                  <label className="field">
                    <span>画布比例</span>
                    <select
                      value={settings.ratio}
                      onChange={(e) => change({ ratio: e.target.value }, true)}
                    >
                      {[...ratios, 'custom'].map((r) => (
                        <option key={r} value={r}>
                          {r === 'original'
                            ? '原图比例 · 保留全部画面'
                            : r === 'custom'
                              ? '自定义比例'
                              : r}
                        </option>
                      ))}
                    </select>
                  </label>
                  {settings.ratio === 'custom' && (
                    <>
                      <div className="field-grid">
                        <label className="field">
                          <span>宽度比例</span>
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            value={settings.customWidth}
                            onChange={(e) =>
                              change({ customWidth: clamp(Number(e.target.value), 1, 10000) })
                            }
                          />
                        </label>
                        <label className="field">
                          <span>高度比例</span>
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            value={settings.customHeight}
                            onChange={(e) =>
                              change({ customHeight: clamp(Number(e.target.value), 1, 10000) })
                            }
                          />
                        </label>
                      </div>
                      <p className="field-hint">最终画布比例限制在 1:5 至 5:1。</p>
                    </>
                  )}
                  {output && (
                    <div className="dimension-card">
                      <span>预计导出尺寸</span>
                      <strong>
                        {output.width} <span>×</span> {output.height}
                        <small>PX</small>
                      </strong>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
          <div className="settings-bottom">
            <button className="save-preset" onClick={() => setModal('preset')}>
              <Bookmark size={15} />
              保存为我的预设
              <Plus size={14} />
            </button>
            <span>
              <span className="orange-dot">●</span>风格留给你，回忆留在本地。
            </span>
          </div>
        </aside>
      </main>

      <nav className="mobile-toolbar" aria-label="移动端编辑工具">
        <button
          className={mobilePanel === 'templates' ? 'active' : ''}
          onClick={() => {
            setLibrary('templates')
            setMobilePanel(mobilePanel === 'templates' ? null : 'templates')
          }}
        >
          <Grid2X2 size={20} />
          <span>边框</span>
        </button>
        <button
          className={mobilePanel === 'settings' && tab === 'text' ? 'active' : ''}
          onClick={() => selectPanelTab('text')}
        >
          <Type size={21} />
          <span>文字</span>
        </button>
        <button
          className={mobilePanel === 'settings' && tab === 'adjust' ? 'active' : ''}
          onClick={() => selectPanelTab('adjust')}
        >
          <Crop size={20} />
          <span>构图</span>
        </button>
        <button
          className={mobilePanel === 'settings' && tab === 'frame' ? 'active' : ''}
          onClick={() => selectPanelTab('frame')}
        >
          <SlidersHorizontal size={20} />
          <span>设置</span>
        </button>
      </nav>
      {mobilePanel && (
        <button
          className="panel-scrim"
          aria-label="关闭侧边面板"
          onClick={() => setMobilePanel(null)}
        />
      )}
      {hydrating && (
        <div className="project-restoring" role="status">
          <Aperture size={28} />
          <strong>正在恢复上次创作…</strong>
          <span>照片与编辑内容都保存在本机</span>
        </div>
      )}
      {dragging && (
        <div className="drop-overlay">
          <div>
            <ImagePlus size={42} strokeWidth={1.3} />
            <h2>把你的视角，放进来。</h2>
            <p>松开鼠标，导入照片或视频</p>
            <span>
              <LockKeyhole size={13} />
              文件始终留在你的设备
            </span>
          </div>
        </div>
      )}
      {notice && (
        <div className={`toast ${notice.type === 'error' ? 'error' : ''}`} role="status">
          {notice.type === 'error' ? <CircleHelp size={18} /> : <CheckCircle2 size={18} />}
          <span>{notice.text}</span>
          <button aria-label="关闭提示" onClick={() => setNotice(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {modal === 'wordmark-fonts' && (
        <FontPicker
          value={wordmarkFontId(settings)}
          inheritedId={getBrandTypography({ ...cameraSettings, brandFont: 'auto' }).id}
          autoLabel="自动匹配品牌风格"
          applyLabel="应用到字标"
          sample={brandTypography.label}
          target={`${brandTypography.label} · 仅修改品牌字标字体`}
          onClose={() => setModal(null)}
          onApply={(id) => change(wordmarkFontPatch(settings, id), true)}
        />
      )}
      {modal === 'fonts' && (
        <FontPicker
          value={settings.canvasFont || 'auto'}
          sample={active?.metadata.caption || '把这一刻，留在画框里 · 2026'}
          target="全部画布文字 · 将替换单独设置的字体"
          onClose={() => setModal(null)}
          onApply={(id) => change({ canvasFont: id, elementFonts: {} }, true)}
        />
      )}
      {modal === 'preset' && (
        <Modal
          title="收藏这一份风格"
          subtitle="保存当前边框与样式设置，下次创作一键应用。"
          onClose={closeModal}
        >
          <div className="modal-body">
            <Field
              label="预设名称"
              value={presetName}
              onChange={setPresetName}
              placeholder="为你的风格取个名字"
            />
            <div className="preset-summary">
              <span style={{ background: settings.color }}>
                <Crop size={24} color={settings.textColor} />
              </span>
              <div>
                <strong>{templates.find((t) => t.id === settings.template)?.name}</strong>
                <small>边框 · 画布 · 字体 · 品牌 · 构图</small>
              </div>
              <Check size={18} />
            </div>
            <p className="field-hint">预设保存在当前浏览器中，不包含你的原始照片。</p>
          </div>
          <div className="modal-actions">
            <button className="button button-light" onClick={closeModal}>
              取消
            </button>
            <button
              className="button button-dark"
              disabled={!presetName.trim()}
              onClick={savePreset}
            >
              <Bookmark size={15} />
              保存预设
            </button>
          </div>
        </Modal>
      )}

      {modal === 'clear' && (
        <Modal title="清空本机项目？" subtitle="只移除这个浏览器中暂存的项目" onClose={closeModal}>
          <div className="modal-body">
            <p>暂存照片、视频和当前编辑进度将被移除。我的预设、原始文件与已下载的作品会保留。</p>
          </div>
          <div className="modal-actions">
            <button className="button button-light" onClick={() => setModal('help')}>
              保留项目
            </button>
            <button className="button button-dark" onClick={() => void clearLocalProject()}>
              清空项目
            </button>
          </div>
        </Modal>
      )}
      {modal === 'export' && (
        <Modal
          title="把这一刻，带走。"
          subtitle={
            exportTarget === 'print'
              ? active?.kind === 'video' && !exportOptions.all
                ? '打印当前视频画面，完整保留照片边框。'
                : '把装裱好的作品，留在纸上。'
              : active?.kind === 'video' && !exportOptions.all
                ? '视频在本地合成，完成后直接下载。'
                : '精心装裱的作品，值得高清保存。'
          }
          onClose={closeModal}
          busy={exporting}
        >
          <div className="modal-body export-body">
            <div className="export-targets" role="group" aria-label="输出方式">
              <button
                aria-pressed={exportTarget === 'download'}
                disabled={exporting}
                onClick={() => setExportTarget('download')}
              >
                <Download size={15} />
                下载文件
              </button>
              <button
                aria-pressed={exportTarget === 'print'}
                disabled={exporting}
                onClick={() => setExportTarget('print')}
              >
                <Printer size={15} />
                打印
              </button>
            </div>
            {active && (
              <div className="export-preview">
                <div>
                  <Crop size={23} />
                </div>
                <span>
                  <strong>
                    {exportOptions.all
                      ? `${items.filter((i) => i.kind === 'image').length} 张照片 · 批量${exportTarget === 'print' ? '打印' : '导出'}`
                      : `${active.name}${exportTarget === 'print' && active.kind === 'video' ? ` · 当前画面 ${formatTime(videoTime)}` : ''}`}
                  </strong>
                  <small>
                    {output?.width} × {output?.height} px ·{' '}
                    {templates.find((t) => t.id === settings.template)?.name}
                  </small>
                </span>
                <span className="export-local">
                  <LockKeyhole size={12} />
                  本地
                </span>
              </div>
            )}
            {exportTarget === 'download' && (active?.kind === 'image' || exportOptions.all) && (
              <>
                <div className="section-title">
                  <h3>文件格式</h3>
                </div>
                <div className="export-format">
                  {(['jpeg', 'png'] as const).map((f) => (
                    <button
                      disabled={exporting}
                      className={exportOptions.format === f ? 'active' : ''}
                      key={f}
                      onClick={() => setExportOptions((o) => ({ ...o, format: f }))}
                    >
                      <strong>{f === 'jpeg' ? 'JPG' : 'PNG'}</strong>
                      <span>{f === 'jpeg' ? '高画质，更轻巧' : '无损编码，适合印刷'}</span>
                      {exportOptions.format === f && <CheckCircle2 size={17} />}
                    </button>
                  ))}
                </div>
              </>
            )}
            {exportTarget === 'print' && (
              <div className="print-options">
                <label className="field print-paper">
                  <span>打印纸张</span>
                  <select
                    value={printOptions.paper}
                    disabled={exporting}
                    onChange={(e) =>
                      setPrintOptions((current) => ({
                        ...current,
                        paper: e.target.value as PrintOptions['paper'],
                      }))
                    }
                  >
                    {Object.entries(printPapers).map(([id, paper]) => (
                      <option key={id} value={id}>
                        {paper.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>纸张方向</span>
                  <select
                    value={printOptions.orientation}
                    disabled={exporting}
                    onChange={(e) =>
                      setPrintOptions((current) => ({
                        ...current,
                        orientation: e.target.value as PrintOptions['orientation'],
                      }))
                    }
                  >
                    <option value="auto">自动匹配画面</option>
                    <option value="portrait">纵向</option>
                    <option value="landscape">横向</option>
                  </select>
                </label>
                <label className="field">
                  <span>打印边距</span>
                  <select
                    value={printOptions.margin}
                    disabled={exporting}
                    onChange={(e) =>
                      setPrintOptions((current) => ({ ...current, margin: Number(e.target.value) }))
                    }
                  >
                    <option value={0}>0 mm · 无边距</option>
                    <option value={5}>5 mm</option>
                    <option value={8}>8 mm · 推荐</option>
                    <option value={12}>12 mm</option>
                  </select>
                </label>
              </div>
            )}
            <label className="field">
              <span>{exportTarget === 'print' ? '打印清晰度 · 最长边' : '导出尺寸 · 最长边'}</span>
              <select
                disabled={exporting}
                value={exportOptions.size}
                onChange={(e) => setExportOptions((o) => ({ ...o, size: Number(e.target.value) }))}
              >
                <option value={1600}>1600 px · 轻巧分享</option>
                <option value={2400}>2400 px · 高清推荐</option>
                {(active?.kind !== 'video' || exportTarget === 'print') && (
                  <>
                    <option value={4096}>4096 px · 精细作品</option>
                    <option value={0}>原图长边 · 最高 8192 px</option>
                  </>
                )}
              </select>
            </label>
            {exportTarget === 'download' &&
              exportOptions.format === 'jpeg' &&
              active?.kind !== 'video' && (
                <Range
                  label="JPG 品质"
                  value={exportOptions.quality}
                  min={60}
                  max={100}
                  unit="%"
                  onChange={(n) => {
                    if (!exporting) setExportOptions((o) => ({ ...o, quality: n }))
                  }}
                />
              )}
            {exportTarget === 'print' ? (
              <>
                {items.some((item) => item.kind === 'image') && (
                  <Toggle
                    label="批量打印全部照片"
                    hint="每张一页，使用当前边框和各自的拍摄信息"
                    checked={exportOptions.all}
                    onChange={(all) => {
                      if (!exporting) setExportOptions((current) => ({ ...current, all }))
                    }}
                  />
                )}
                <p className="export-note">
                  每张作品独占一页，保持比例，完整保留边框。可在系统打印窗口选择打印机或保存为 PDF。
                  {printOptions.margin === 0 && '无边距打印需要打印机支持。'}
                </p>
              </>
            ) : active?.kind === 'video' && !exportOptions.all ? (
              <>
                <Toggle
                  label="保留视频声音"
                  checked={exportOptions.audio}
                  onChange={(v) => {
                    if (!exporting) setExportOptions((o) => ({ ...o, audio: v }))
                  }}
                />
                <p className="export-note">
                  视频按实际时长处理，请保持页面在前台。导出最长边最高 1920
                  px，格式由浏览器支持情况决定（MP4 / WebM）。
                </p>
              </>
            ) : (
              <>
                <Toggle
                  label="批量导出全部照片"
                  hint="统一使用当前边框，每张照片保留各自拍摄信息"
                  checked={exportOptions.all}
                  onChange={(v) => {
                    if (!exporting) setExportOptions((o) => ({ ...o, all: v }))
                  }}
                />
                <p className="export-note">
                  多张作品将打包为 ZIP。导出包含照片及边框，不保留原图的 EXIF 数据。
                </p>
              </>
            )}
            {exporting && (
              <div className="export-progress">
                <div>
                  <span>
                    {exportTarget === 'print'
                      ? '正在准备打印…'
                      : active?.kind === 'video' && !exportOptions.all
                        ? '正在合成视频…'
                        : '正在装裱你的作品…'}
                  </span>
                  <strong>{progress}%</strong>
                </div>
                <progress max={100} value={progress} />
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button
              className="button button-light"
              onClick={() => {
                if (exporting) cancelExport.current = true
                else closeModal()
              }}
            >
              {exporting ? '取消处理' : '再调整一下'}
            </button>
            <button
              className="button button-dark"
              disabled={
                exporting ||
                !active ||
                (exportOptions.all && !items.some((i) => i.kind === 'image')) ||
                (exportTarget === 'print' &&
                  active?.kind === 'video' &&
                  !exportOptions.all &&
                  !source)
              }
              onClick={() => {
                if (exportTarget === 'print') void printWorks()
                else if (active?.kind === 'video' && !exportOptions.all) void exportVideo()
                else void exportImages()
              }}
            >
              {exportTarget === 'print' ? <Printer size={16} /> : <Download size={16} />}
              {exporting
                ? exportTarget === 'print'
                  ? '正在准备…'
                  : '正在导出…'
                : exportTarget === 'print'
                  ? exportOptions.all
                    ? '打印全部照片'
                    : active?.kind === 'video'
                      ? '打印当前画面'
                      : '打印作品'
                  : exportOptions.all
                    ? '导出全部照片'
                    : '下载作品'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'camera' && (
        <Modal
          title="此刻，就很好。"
          subtitle="带着喜欢的边框，记录眼前这一帧。"
          onClose={closeModal}
          wide
        >
          <div className="camera-view">
            <video
              ref={cameraVideo}
              autoPlay
              muted
              playsInline
              className={cameraLiveFrame ? 'camera-source-hidden' : ''}
            />
            <canvas ref={cameraCanvas} className={cameraLiveFrame ? '' : 'hidden'} />
            {!cameraReady && !cameraError && (
              <div className="camera-message">
                <Camera size={30} />
                <p>正在连接摄像头…</p>
              </div>
            )}
            {cameraError && (
              <div className="camera-message">
                <Camera size={30} />
                <p>{cameraError}</p>
                <button
                  className="button button-light"
                  onClick={() => {
                    setModal(null)
                    inputRef.current?.click()
                  }}
                >
                  <ImagePlus size={15} />
                  导入照片
                </button>
              </div>
            )}
          </div>
          <div className="camera-bottom">
            <button className="text-button" onClick={() => setCameraLiveFrame((v) => !v)}>
              <Grid2X2 size={16} />
              {cameraLiveFrame ? '边框预览' : '原始画面'}
            </button>
            <button
              className="shutter-button"
              aria-label="拍摄照片"
              disabled={!cameraReady || importing}
              onClick={() => void takePhoto()}
            >
              <span />
            </button>
            <IconButton
              title="切换前后摄像头"
              onClick={() => setCameraFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            >
              <RotateCw size={20} />
            </IconButton>
          </div>
        </Modal>
      )}

      {modal === 'help' && (
        <Modal
          title="从一张照片开始。"
          subtitle="一个安静的地方，装裱你的视角。"
          onClose={closeModal}
        >
          <div className="modal-body help-content">
            <ol>
              <li>
                <span>01</span>
                <div>
                  <strong>把照片放进来</strong>
                  <p>点击导入，或把文件拖进页面。支持多张照片，也可以添加视频。</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>找到你的风格</strong>
                  <p>选一个边框，调整留白、品牌、拍摄参数与构图。所有变化实时预览。</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>让这一刻被珍藏</strong>
                  <p>下载高清作品，或把全部照片打包带走。喜欢的样式可以保存为预设。</p>
                </div>
              </li>
            </ol>
            <div className="help-shortcuts">
              <span>
                导入文件<kbd>⌘ / Ctrl + O</kbd>
              </span>
              <span>
                撤销样式<kbd>⌘ / Ctrl + Z</kbd>
              </span>
              <span>
                切换照片<kbd>← / →</kbd>
              </span>
            </div>
            <div className="local-project-info">
              <strong>刷新后，继续上次创作。</strong>
              <p>
                照片、视频、相机信息与编辑参数自动保存在当前浏览器，原始文件不会上传。我的预设也会保留。
              </p>
              <small>
                清除网站数据、无痕模式或浏览器回收空间可能移除暂存，请及时导出重要作品。
              </small>
              {(projectSaveError || mediaSaveError) && (
                <p className="local-save-error">{projectSaveError || mediaSaveError}</p>
              )}
              {(projectSaveError || mediaSaveError) && (
                <button
                  className="button button-light"
                  disabled={savingMedia || !canSave}
                  onClick={() => void retryMediaSave()}
                >
                  重试本机保存
                </button>
              )}
              <button className="text-button" onClick={() => setModal('clear')}>
                清空本机项目 <Trash2 size={13} />
              </button>
            </div>
            <p className="privacy-help">
              <ShieldCheck size={17} />
              原始文件不上传。示例照片来自 Unsplash，所有处理都在浏览器本地完成。
            </p>
          </div>
          <div className="modal-actions">
            <button className="button button-dark" onClick={closeModal}>
              开始创作
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
