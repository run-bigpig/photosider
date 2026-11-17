import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Check, Search, Type, X, LoaderCircle } from 'lucide-react'
import {
  findLibraryFont,
  libraryFonts,
  libraryFontFamily,
  loadLibraryFont,
  type LibraryFont,
} from './typography'

const fontStyle = (face?: LibraryFont): CSSProperties =>
  face
    ? { fontFamily: libraryFontFamily(face), fontWeight: face.weight, fontStyle: face.style }
    : {}

function FontRow({
  face,
  selected,
  sample,
  onSelect,
}: {
  face: LibraryFont
  selected: boolean
  sample: string
  onSelect: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let stopped = false
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        void loadLibraryFont(face.id)
          .then(() => {
            if (!stopped) setLoaded(true)
          })
          .catch(() => {})
      },
      { rootMargin: '80px' },
    )
    if (ref.current) observer.observe(ref.current)
    return () => {
      stopped = true
      observer.disconnect()
    }
  }, [face.id])
  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      className={`font-library-row ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <span className="font-row-heading">
        <strong>{face.name}</strong>
        <small>
          {face.language} · {face.category}
        </small>
      </span>
      <span className="font-row-sample" style={loaded ? fontStyle(face) : {}}>
        {face.language === '中文'
          ? sample
          : /[a-z0-9]/i.test(sample)
            ? sample
            : 'A moment to remember · 2026'}
      </span>
      <small className="font-row-usage">{face.usage}</small>
      {selected && <Check className="font-row-check" size={17} />}
    </button>
  )
}

export function FontPicker({
  value,
  inheritedId,
  sample,
  target,
  onApply,
  onApplyAll,
  onClose,
  autoLabel,
  applyLabel,
}: {
  value: string
  inheritedId?: string
  sample: string
  target: string
  onApply: (id: string) => void
  onApplyAll?: (id: string) => void
  onClose: () => void
  autoLabel?: string
  applyLabel?: string
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [draft, setDraft] = useState(value)
  const [all, setAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const face = findLibraryFont(draft === 'auto' ? (all ? 'auto' : inheritedId) : draft)
  const visible = libraryFonts.filter((font) => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    const searchable =
      `${font.name} ${font.id} ${font.keywords} ${font.usage} ${font.language} ${font.category}`.toLocaleLowerCase()
    return (
      (category === '全部' || font.category === category || font.language === category) &&
      words.every((word) => searchable.includes(word))
    )
  })
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const app = document.querySelector<HTMLElement>('.app')
    const wasInert = app?.inert || false
    if (app) app.inert = true
    if (matchMedia('(min-width: 761px)').matches) searchRef.current?.focus()
    else dialogRef.current?.focus()
    return () => {
      if (app) app.inert = wasInert
      previous?.focus({ preventScroll: true })
    }
  }, [])
  useEffect(() => {
    let stopped = false
    setLoading(true)
    setError('')
    void loadLibraryFont(face?.id || 'auto')
      .then(() => {
        if (!stopped) setLoading(false)
      })
      .catch(() => {
        if (!stopped) {
          setLoading(false)
          setError('字体暂时无法读取，请重试后再应用。')
        }
      })
    return () => {
      stopped = true
    }
  }, [face?.id, attempt])
  return createPortal(
    <div
      className="font-picker-backdrop"
      onPointerDown={(event) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) onClose()
      }}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
        if (event.key === 'Tab') {
          const controls = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), a[href]',
            ) || [],
          )
          const first = controls[0],
            last = controls[controls.length - 1]
          if (
            event.shiftKey &&
            (document.activeElement === first || document.activeElement === dialogRef.current)
          ) {
            event.preventDefault()
            last?.focus()
          } else if (
            !event.shiftKey &&
            (document.activeElement === last || document.activeElement === dialogRef.current)
          ) {
            event.preventDefault()
            first?.focus()
          }
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="font-picker"
      >
        <header className="font-picker-header">
          <div>
            <span className="eyebrow">TYPE LIBRARY / {libraryFonts.length}</span>
            <h2 id={titleId}>为这一刻选字</h2>
            <p>{all ? '全部画布文字' : target}</p>
          </div>
          <button aria-label="关闭字体选择器" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="font-picker-search">
          <Search size={17} />
          <input
            ref={searchRef}
            aria-label="搜索字体"
            placeholder="搜索字体名称、拼音、风格…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              aria-label="清空字体搜索"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <nav className="font-categories" aria-label="字体分类">
          {['全部', '中文', '西文', '无衬线', '衬线', '手写', '艺术', '等宽'].map((item) => (
            <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </nav>
        <div className="font-live-preview" aria-live="polite" aria-busy={loading}>
          <span>
            {draft === 'auto' && autoLabel && !all
              ? autoLabel
              : face?.name || (onApplyAll && !all ? '跟随整体字体' : '模板原配')}{' '}
            {loading && <LoaderCircle size={12} className="font-loading" />}
          </span>
          <p style={!loading && !error ? fontStyle(face) : {}}>{sample}</p>
        </div>
        <div
          className="font-library-list"
          role="listbox"
          aria-label="可选字体"
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const options = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'),
            )
            const index = options.indexOf(document.activeElement as HTMLButtonElement)
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? options.length - 1
                  : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
            options[next]?.focus()
          }}
        >
          {!query && category === '全部' && (
            <button
              role="option"
              aria-selected={draft === 'auto'}
              className={`font-auto-row ${draft === 'auto' ? 'selected' : ''}`}
              onClick={() => setDraft('auto')}
            >
              <Type size={20} />
              <span>
                <strong>
                  {!all && autoLabel ? autoLabel : onApplyAll && !all ? '跟随整体字体' : '模板原配'}
                </strong>
                <small>
                  {!all && autoLabel ? '按当前相机品牌匹配字标风格' : '保留模板的排版气质'}
                </small>
              </span>
              {draft === 'auto' && <Check size={17} />}
            </button>
          )}
          {visible.map((font) => (
            <FontRow
              key={font.id}
              face={font}
              selected={draft === font.id}
              sample={sample}
              onSelect={() => setDraft(font.id)}
            />
          ))}
          {!visible.length && (
            <div className="font-no-results">
              <Search size={24} />
              <p>没有找到「{query || category}」相关字体</p>
              <button
                onClick={() => {
                  setQuery('')
                  setCategory('全部')
                }}
              >
                查看全部字体
              </button>
            </div>
          )}
        </div>
        <footer className="font-picker-footer">
          {error ? (
            <div className="font-picker-error" role="alert">
              {error}
              <button onClick={() => setAttempt((n) => n + 1)}>重新加载</button>
            </div>
          ) : (
            <p>已内置 · 可离线使用 · OFL 开源许可</p>
          )}
          {onApplyAll && (
            <label className="font-apply-all">
              <input
                type="checkbox"
                checked={all}
                onChange={(event) => setAll(event.target.checked)}
              />
              应用到全部画布文字
            </label>
          )}
          <div>
            <button className="font-cancel" onClick={onClose}>
              取消
            </button>
            <button
              className="font-apply"
              disabled={loading || Boolean(error)}
              onClick={() => {
                ;(all && onApplyAll ? onApplyAll : onApply)(draft)
                onClose()
              }}
            >
              {loading
                ? '正在准备字体…'
                : all
                  ? '应用到全部文字'
                  : applyLabel || (!onApplyAll ? '应用到全部文字' : '应用到当前文字')}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
