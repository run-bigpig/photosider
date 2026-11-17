import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Layers, Minus, Plus, RotateCw, RotateCcw, X, Maximize2 } from 'lucide-react'
import {
  clamp,
  defaultElementTransform,
  defaultLogoLayout,
  type ElementTransform,
  type Settings,
} from './model'
import { getBrandMarkBounds, type CanvasElement } from './render'
import { FontPicker } from './FontPicker'
import { LayerPicker } from './LayerPicker'
import { getBrandTypography, wordmarkFontId, wordmarkFontPatch } from './typography'

type Point = { x: number; y: number }
type Gesture = {
  id: string
  mode: 'drag' | 'scale' | 'rotate' | 'pinch'
  start: Point
  center: Point
  distance: number
  angle: number
  transform: ElementTransform
  started: boolean
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const angle = (a: Point, b: Point) => Math.atan2(a.y - b.y, a.x - b.x)
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const degrees = (value: number) =>
  Math.round((((((value + 180) % 360) + 360) % 360) - 180) * 10) / 10

export function CanvasEditor({
  canvasRef,
  elements,
  settings,
  mediaId,
  onChange,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  elements: CanvasElement[]
  settings: Settings
  mediaId: string
  onChange: (patch: Partial<Settings>, separate?: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fontPickerOpen, setFontPickerOpen] = useState(false)
  const [layerPickerOpen, setLayerPickerOpen] = useState(false)
  const layerTriggerRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<Gesture | null>(null)
  const touchCandidate = useRef<string | null | undefined>(undefined)
  const latest = useRef(settings)
  latest.current = settings
  const selected = elements.find((element) => element.id === selectedId)
  useEffect(() => {
    setSelectedId(null)
    setFontPickerOpen(false)
    setLayerPickerOpen(false)
    pointers.current.clear()
    gesture.current = null
  }, [settings.template, mediaId])
  const transformFor = (id: string): ElementTransform =>
    id === 'logo'
      ? {
          x: latest.current.logoX,
          y: latest.current.logoY,
          scale: latest.current.logoScale / 100,
          rotation: latest.current.logoRotation || 0,
        }
      : {
          ...defaultElementTransform,
          ...latest.current.elementLayouts?.[latest.current.template]?.[id],
        }
  const commit = (
    id: string,
    transform: ElementTransform,
    separate = false,
    desiredCenter?: Point,
  ) => {
    const current = latest.current
    if (id === 'logo') {
      const canvas = canvasRef.current,
        actual = canvas && getBrandMarkBounds(canvas)
      const nextScale = Math.round(clamp(transform.scale * 100, 20, 400))
      let x = transform.x,
        y = transform.y
      if (canvas && actual) {
        const ratio = nextScale / current.logoScale
        const position = current.logoPosition
        const centered = ['gallery', 'postcard', 'instant', 'stamp'].includes(current.template)
        const directionX =
          position === 'auto'
            ? centered
              ? 0
              : current.template === 'editorial'
                ? -1
                : 1
            : position.includes('left')
              ? 1
              : position.includes('right')
                ? -1
                : 0
        const directionY = position.startsWith('top') ? 1 : position.startsWith('bottom') ? -1 : 0
        const baseX =
          actual.x +
          actual.width / 2 -
          (actual.offsetX / 100) * canvas.width +
          (directionX * actual.width * (ratio - 1)) / 2
        const baseY =
          actual.y +
          actual.height / 2 -
          (actual.offsetY / 100) * canvas.height +
          (directionY * actual.height * (ratio - 1)) / 2
        const center = desiredCenter || {
          x: actual.x + actual.width / 2 + ((transform.x - current.logoX) / 100) * canvas.width,
          y: actual.y + actual.height / 2 + ((transform.y - current.logoY) / 100) * canvas.height,
        }
        x = ((center.x - baseX) / canvas.width) * 100
        y = ((center.y - baseY) / canvas.height) * 100
      }
      onChange(
        {
          logoX: Math.round(x * 10) / 10,
          logoY: Math.round(y * 10) / 10,
          logoScale: nextScale,
          logoRotation: degrees(transform.rotation),
        },
        separate,
      )
    } else
      onChange(
        {
          elementLayouts: {
            ...current.elementLayouts,
            [current.template]: {
              ...current.elementLayouts?.[current.template],
              [id]: {
                x: Math.round(transform.x * 100) / 100,
                y: Math.round(transform.y * 100) / 100,
                scale: Math.round(clamp(transform.scale, 0.15, 6) * 1000) / 1000,
                rotation: degrees(transform.rotation),
              },
            },
          },
        },
        separate,
      )
  }
  const begin = (id: string, mode: Gesture['mode'], point: Point, started = false) => {
    const element = elements.find((item) => item.id === id),
      canvas = canvasRef.current
    if (!element || !canvas) return
    const box = canvas.getBoundingClientRect()
    const center = {
      x: box.left + (element.x / canvas.width) * box.width,
      y: box.top + (element.y / canvas.height) * box.height,
    }
    const transform = transformFor(id)
    if (id === 'logo') {
      const actual = getBrandMarkBounds(canvas)
      if (actual) {
        transform.x = actual.offsetX
        transform.y = actual.offsetY
      }
    }
    const points = [...pointers.current.values()]
    gesture.current = {
      id,
      mode,
      start: mode === 'pinch' ? midpoint(points[0], points[1]) : point,
      center,
      distance: Math.max(
        1,
        mode === 'pinch' ? distance(points[0], points[1]) : distance(point, center),
      ),
      angle: mode === 'pinch' ? angle(points[0], points[1]) : angle(center, point),
      transform,
      started,
    }
  }
  const hitTest = (point: Point, touch: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const box = canvas.getBoundingClientRect(),
      scale = canvas.width / box.width
    const x = (point.x - box.left) * scale,
      y = ((point.y - box.top) * canvas.height) / box.height
    const targets = elements
      .map((item, order) => {
        const radians = (-item.rotation * Math.PI) / 180,
          dx = x - item.x,
          dy = y - item.y
        const localX = dx * Math.cos(radians) - dy * Math.sin(radians),
          localY = dx * Math.sin(radians) + dy * Math.cos(radians)
        const extra = (touch ? 15 : 5) * scale
        return {
          item,
          order,
          inside:
            Math.abs(localX) <= Math.max(item.width / 2 + extra, touch ? 22 * scale : 8 * scale) &&
            Math.abs(localY) <= Math.max(item.height / 2 + extra, touch ? 22 * scale : 8 * scale),
          score: Math.hypot(dx, dy),
        }
      })
      .filter((target) => target.inside)
      .sort((a, b) => a.score - b.score || b.order - a.order)
    return targets[0]?.item
  }
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const point = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, point)
    const activeGestureId = selected?.id || gesture.current?.id
    if (pointers.current.size >= 2 && activeGestureId) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      touchCandidate.current = undefined
      begin(activeGestureId, 'pinch', point, gesture.current?.started || false)
      return
    }
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-object-id]')
    const item = target
      ? elements.find((item) => item.id === target.dataset.objectId)
      : hitTest(point, event.pointerType !== 'mouse')
    if (event.pointerType !== 'mouse' && selected && !target?.dataset.action) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      touchCandidate.current = item?.id || null
      begin(selected.id, 'drag', point)
      return
    }
    touchCandidate.current = undefined
    if (!item) {
      setSelectedId(null)
      pointers.current.delete(event.pointerId)
      return
    }
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedId(item.id)
    begin(item.id, (target?.dataset.action as Gesture['mode']) || 'drag', point)
  }
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    let current = gesture.current
    const canvas = canvasRef.current
    if (!current || !canvas) return
    if (!current.started && current.mode === 'drag' && pointers.current.size === 1) {
      if (distance({ x: event.clientX, y: event.clientY }, current.start) < 4) return
      if (touchCandidate.current && touchCandidate.current !== current.id) {
        const candidate = touchCandidate.current
        begin(candidate, 'drag', current.start)
        setSelectedId(candidate)
        current = gesture.current!
      }
      touchCandidate.current = undefined
    }
    event.preventDefault()
    const box = canvas.getBoundingClientRect(),
      points = [...pointers.current.values()]
    const point = { x: event.clientX, y: event.clientY }
    let scale = 1,
      rotation = 0,
      delta = { x: 0, y: 0 }
    if (current.mode === 'pinch' && points.length >= 2) {
      const center = midpoint(points[0], points[1])
      delta = { x: center.x - current.start.x, y: center.y - current.start.y }
      scale = distance(points[0], points[1]) / current.distance
      rotation = ((angle(points[0], points[1]) - current.angle) * 180) / Math.PI
    } else if (current.mode === 'drag')
      delta = { x: point.x - current.start.x, y: point.y - current.start.y }
    else if (current.mode === 'scale') scale = distance(point, current.center) / current.distance
    else if (current.mode === 'rotate')
      rotation = ((angle(current.center, point) - current.angle) * 180) / Math.PI
    else return
    const next = {
      x: clamp(current.transform.x + (delta.x / box.width) * 100, -100, 100),
      y: clamp(current.transform.y + (delta.y / box.height) * 100, -100, 100),
      scale: current.transform.scale * scale,
      rotation: current.transform.rotation + rotation,
    }
    // Gently snap rotation to right angles without forcing the rest of the gesture.
    const snapped = Math.round(next.rotation / 90) * 90
    if (Math.abs(next.rotation - snapped) < 2.5) next.rotation = snapped
    commit(
      current.id,
      next,
      !current.started,
      current.id === 'logo'
        ? {
            x: ((current.center.x + delta.x - box.left) / box.width) * canvas.width,
            y: ((current.center.y + delta.y - box.top) / box.height) * canvas.height,
          }
        : undefined,
    )
    current.started = true
  }
  const pointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      pointers.current.size === 1 &&
      !gesture.current?.started &&
      touchCandidate.current !== undefined
    )
      setSelectedId(touchCandidate.current)
    touchCandidate.current = undefined
    pointers.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    if (pointers.current.size === 1 && gesture.current)
      begin(gesture.current.id, 'drag', [...pointers.current.values()][0], gesture.current.started)
    else if (!pointers.current.size) gesture.current = null
  }
  const reset = () => {
    if (!selected) return
    if (selected.id === 'logo') onChange(defaultLogoLayout, true)
    else commit(selected.id, defaultElementTransform, true)
  }
  const toolbarTarget = document.getElementById('canvas-edit-toolbar')
  const currentTransform = selected ? transformFor(selected.id) : null
  const handleGap = canvasRef.current
    ? (20 * canvasRef.current.width) / Math.max(1, canvasRef.current.getBoundingClientRect().width)
    : 0
  const handleSide =
    selected && canvasRef.current && selected.y > canvasRef.current.height / 2 ? -1 : 1
  const handlePosition = (x: number, y: number) => {
    if (!selected || !canvasRef.current) return {}
    const radians = (selected.rotation * Math.PI) / 180
    const px = selected.x + x * Math.cos(radians) - y * Math.sin(radians)
    const py = selected.y + x * Math.sin(radians) + y * Math.cos(radians)
    return {
      left: `clamp(21px, ${(px / canvasRef.current.width) * 100}%, calc(100% - 21px))`,
      top: `clamp(21px, ${(py / canvasRef.current.height) * 100}%, calc(100% - 21px))`,
    }
  }
  return (
    <div
      ref={rootRef}
      className="direct-canvas-editor"
      data-canvas-editor
      tabIndex={0}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerEnd}
      onPointerCancel={(event) => {
        pointers.current.clear()
        gesture.current = null
        touchCandidate.current = undefined
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setSelectedId(null)
          event.stopPropagation()
          return
        }
        if (selected && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault()
          event.stopPropagation()
          const transform = transformFor(selected.id),
            step = event.shiftKey ? 1 : 0.2
          commit(selected.id, {
            ...transform,
            x:
              transform.x +
              (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
            y:
              transform.y +
              (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
          })
        }
      }}
    >
      <canvas ref={canvasRef} aria-label="当前照片的边框效果预览" />
      {selected && canvasRef.current && (
        <div className="canvas-selection" aria-label={`已选中 ${selected.label}`}>
          <div
            className="canvas-selection-box"
            data-object-id={selected.id}
            style={{
              left: `${(selected.x / canvasRef.current.width) * 100}%`,
              top: `${(selected.y / canvasRef.current.height) * 100}%`,
              width: `${(selected.width / canvasRef.current.width) * 100}%`,
              height: `${(selected.height / canvasRef.current.height) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${selected.rotation}deg)`,
            }}
          />
          <button
            className="canvas-transform-handle scale-handle"
            aria-label="拖动缩放选中元素"
            data-action="scale"
            data-object-id={selected.id}
            style={handlePosition(
              selected.width / 2 + handleGap,
              handleSide * (selected.height / 2 + handleGap),
            )}
          >
            <Maximize2 size={15} />
          </button>
          <button
            className="canvas-transform-handle rotate-handle"
            aria-label="拖动旋转选中元素"
            data-action="rotate"
            data-object-id={selected.id}
            style={handlePosition(
              -selected.width / 2 - handleGap,
              -selected.height / 2 - handleGap,
            )}
          >
            <RotateCw size={15} />
          </button>
        </div>
      )}
      {toolbarTarget &&
        createPortal(
          <div
            className="object-toolbar"
            data-selected={Boolean(selected)}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <button
              ref={layerTriggerRef}
              className="canvas-layer-picker"
              aria-label="选择画布元素"
              aria-haspopup="dialog"
              aria-expanded={layerPickerOpen}
              disabled={!elements.length}
              title="选择图层"
              onClick={() => setLayerPickerOpen(true)}
            >
              <Layers size={16} />
              <span className="layer-trigger-label">图层</span>
              <span className="layer-trigger-count">{elements.length}</span>
            </button>
            {selected && currentTransform && (
              <>
                <span className="object-selected-label">
                  {selected.label}
                  <small>
                    {Math.round(currentTransform.scale * 100)}% ·{' '}
                    {Math.round(currentTransform.rotation)}°
                  </small>
                </span>
                {selected.text !== undefined && (
                  <button
                    className="object-font-button"
                    aria-label="选择当前文字字体"
                    title="字体"
                    onClick={() => setFontPickerOpen(true)}
                  >
                    Aa
                  </button>
                )}
                <button
                  aria-label="缩小选中元素"
                  title="缩小"
                  onClick={() =>
                    commit(
                      selected.id,
                      { ...currentTransform, scale: currentTransform.scale / 1.1 },
                      true,
                    )
                  }
                >
                  <Minus size={17} />
                </button>
                <button
                  aria-label="放大选中元素"
                  title="放大"
                  onClick={() =>
                    commit(
                      selected.id,
                      { ...currentTransform, scale: currentTransform.scale * 1.1 },
                      true,
                    )
                  }
                >
                  <Plus size={17} />
                </button>
                <button
                  aria-label="旋转选中元素 90 度"
                  title="旋转 90°"
                  onClick={() =>
                    commit(
                      selected.id,
                      { ...currentTransform, rotation: currentTransform.rotation + 90 },
                      true,
                    )
                  }
                >
                  <RotateCw size={16} />
                </button>
                <button aria-label="恢复选中元素" title="恢复默认" onClick={reset}>
                  <RotateCcw size={16} />
                </button>
                <button aria-label="取消选中" title="取消选择" onClick={() => setSelectedId(null)}>
                  <X size={17} />
                </button>
              </>
            )}
          </div>,
          toolbarTarget,
        )}
      {fontPickerOpen && selected?.text !== undefined && (
        <FontPicker
          value={
            selected.id === 'logo'
              ? wordmarkFontId(settings)
              : settings.elementFonts?.[settings.template]?.[selected.id] || 'auto'
          }
          inheritedId={
            selected.id === 'logo'
              ? getBrandTypography({ ...settings, brandFont: 'auto' }).id
              : settings.canvasFont
          }
          autoLabel={selected.id === 'logo' ? '自动匹配品牌风格' : undefined}
          sample={selected.text}
          target={selected.label}
          onClose={() => setFontPickerOpen(false)}
          onApply={(id) => {
            if (selected.id === 'logo') {
              onChange(wordmarkFontPatch(latest.current, id), true)
              return
            }
            const fonts = { ...latest.current.elementFonts?.[latest.current.template] }
            if (id === 'auto') delete fonts[selected.id]
            else fonts[selected.id] = id
            onChange(
              {
                elementFonts: { ...latest.current.elementFonts, [latest.current.template]: fonts },
              },
              true,
            )
          }}
          onApplyAll={(id) => onChange({ canvasFont: id, elementFonts: {} }, true)}
        />
      )}
      {layerPickerOpen && (
        <LayerPicker
          brand={settings.brand}
          elements={elements}
          selectedId={selectedId}
          anchorRef={layerTriggerRef}
          onClose={() => setLayerPickerOpen(false)}
          onSelect={(id) => {
            setSelectedId(id)
            setLayerPickerOpen(false)
            requestAnimationFrame(() => rootRef.current?.focus({ preventScroll: true }))
          }}
        />
      )}
    </div>
  )
}
