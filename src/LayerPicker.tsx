import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check, Image as ImageIcon, Layers, Search, Type, X } from 'lucide-react'
import type { CanvasElement } from './render'

export function LayerPicker({
  elements,
  selectedId,
  anchorRef,
  onSelect,
  onClose,
  brand,
}: {
  elements: CanvasElement[]
  selectedId: string | null
  anchorRef: RefObject<HTMLButtonElement | null>
  onSelect: (id: string | null) => void
  onClose: () => void
  brand: string
}) {
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState({ left: 12, top: 80, maxHeight: 440 })
  const dialogRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const visible = [...elements]
    .reverse()
    .filter((element) =>
      `${element.label} ${element.text || ''} ${element.id} ${element.kind === 'logo' ? brand : ''}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
    )
  useLayoutEffect(() => {
    const place = () => {
      const box = anchorRef.current?.getBoundingClientRect()
      if (!box) return
      const top = Math.min(box.bottom + 9, Math.max(12, innerHeight - 260))
      setPosition({
        left: Math.max(12, Math.min(box.left, innerWidth - 332)),
        top,
        maxHeight: Math.min(480, innerHeight - top - 12),
      })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [anchorRef])
  useEffect(() => {
    const app = document.querySelector<HTMLElement>('.app')
    const previous = document.activeElement as HTMLElement | null
    const wasInert = app?.inert || false
    if (app) app.inert = true
    if (matchMedia('(min-width: 761px)').matches) searchRef.current?.focus()
    else dialogRef.current?.focus()
    return () => {
      if (app) app.inert = wasInert
      previous?.focus({ preventScroll: true })
    }
  }, [])
  return createPortal(
    <div
      className="layer-picker-backdrop"
      onPointerDown={(event) => {
        event.stopPropagation()
        if (event.currentTarget === event.target) onClose()
      }}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
        const controls = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input') || [],
        )
        if (event.key === 'Tab') {
          if (
            event.shiftKey &&
            (document.activeElement === controls[0] || document.activeElement === dialogRef.current)
          ) {
            event.preventDefault()
            controls.at(-1)?.focus()
          } else if (
            !event.shiftKey &&
            (document.activeElement === controls.at(-1) ||
              document.activeElement === dialogRef.current)
          ) {
            event.preventDefault()
            controls[0]?.focus()
          }
        }
        if (
          ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) &&
          (event.target as HTMLElement).tagName !== 'INPUT'
        ) {
          event.preventDefault()
          const options = Array.from(
            dialogRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || [],
          )
          const index = options.indexOf(document.activeElement as HTMLButtonElement)
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? options.length - 1
                : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
          options[next]?.focus()
        } else if (event.key === 'ArrowDown' && event.target === searchRef.current) {
          event.preventDefault()
          dialogRef.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="layer-picker"
        style={position}
      >
        <header className="layer-picker-header">
          <span className="layer-header-icon">
            <Layers size={18} />
          </span>
          <div>
            <h2 id={titleId}>
              画布图层 <span>{elements.length.toString().padStart(2, '0')}</span>
            </h2>
            <p>选中文字或 Logo，继续调整</p>
          </div>
          <button aria-label="关闭图层选择" onClick={onClose}>
            <X size={17} />
          </button>
        </header>
        <label className="layer-search">
          <Search size={15} />
          <input
            ref={searchRef}
            aria-label="搜索图层"
            placeholder="搜索图层名称或文字内容"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              aria-label="清空图层搜索"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <div className="layer-list" role="listbox" aria-label="画布图层">
          {visible.map((element) => (
            <button
              key={element.id}
              role="option"
              aria-selected={selectedId === element.id}
              data-layer-id={element.id}
              className="layer-option"
              onClick={() => onSelect(element.id)}
            >
              <span className={`layer-symbol ${element.kind === 'logo' ? 'is-logo' : ''}`}>
                {element.text !== undefined ? <Type size={19} /> : <ImageIcon size={19} />}
              </span>
              <span className="layer-copy">
                <strong>{element.label}</strong>
                <small>{element.text || `${brand} · 品牌图片标记`}</small>
              </span>
              {selectedId === element.id ? (
                <Check size={17} className="layer-selected-check" />
              ) : (
                <span className="layer-kind">{element.kind === 'logo' ? 'LOGO' : '文字'}</span>
              )}
            </button>
          ))}
          {!visible.length && (
            <div className="layer-empty">
              <Search size={23} />
              <p>没有找到相关图层</p>
              <small>试试相机型号、日期或文字内容</small>
            </div>
          )}
        </div>
        <footer className="layer-picker-footer">
          <span>点选后可拖动、缩放和旋转</span>
          <button disabled={!selectedId} onClick={() => onSelect(null)}>
            取消选择
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
