import {
  defaultSettings,
  demos,
  emptyMetadata,
  templates,
  type MediaItem,
  type Settings,
} from './model'

const PROJECT_KEY = 'photosider.project.v1'
const DATABASE_NAME = 'photosider.local-media'
export type SavedMedia = Omit<MediaItem, 'url' | 'poster'> & { url?: string }
export type LocalProject = {
  version: 1
  settings: Settings
  items: SavedMedia[]
  activeId: string
  dark: boolean
}
export type MediaFile = { id: string; blob: Blob; poster?: Blob }

export function readLocalProject(): { project: LocalProject | null; error: string } {
  try {
    const raw = localStorage.getItem(PROJECT_KEY)
    if (!raw) return { project: null, error: '' }
    const parsed = JSON.parse(raw)
    if (
      parsed?.version !== 1 ||
      !Array.isArray(parsed.items) ||
      !parsed.settings ||
      !templates.some((t) => t.id === parsed.settings.template)
    )
      throw new Error('项目数据格式不完整')
    const items: SavedMedia[] = parsed.items
      .filter(
        (item: SavedMedia) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          ['image', 'video'].includes(item.kind) &&
          Number.isFinite(item.width) &&
          item.width > 0 &&
          Number.isFinite(item.height) &&
          item.height > 0 &&
          item.metadata &&
          (!item.demo || demos.some((demo) => demo.id === item.id)),
      )
      .map((item: SavedMedia) => ({ ...item, metadata: { ...emptyMetadata, ...item.metadata } }))
    return {
      project: {
        version: 1,
        settings: { ...defaultSettings, ...parsed.settings },
        items,
        activeId: typeof parsed.activeId === 'string' ? parsed.activeId : '',
        dark: Boolean(parsed.dark),
      },
      error: '',
    }
  } catch {
    return {
      project: null,
      error: '无法读取上次项目，请检查浏览器的本机存储设置。现有暂存不会被覆盖。',
    }
  }
}
export function writeLocalProject(
  items: MediaItem[],
  settings: Settings,
  activeId: string,
  dark: boolean,
) {
  const project: LocalProject = {
    version: 1,
    settings,
    activeId,
    dark,
    items: items.map(({ url, poster: _poster, ...item }) => (item.demo ? { ...item, url } : item)),
  }
  localStorage.setItem(PROJECT_KEY, JSON.stringify(project))
}

let pendingDatabase: Promise<IDBDatabase> | undefined
function database() {
  if (!pendingDatabase)
    pendingDatabase = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('media'))
          request.result.createObjectStore('media', { keyPath: 'id' })
      }
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => {
          db.close()
          pendingDatabase = undefined
        }
        resolve(db)
      }
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('另一个页面正在使用本机相册，请关闭后重试'))
    }).catch((error) => {
      pendingDatabase = undefined
      throw error
    })
  return pendingDatabase
}
async function mutateMedia(action: (store: IDBObjectStore) => void) {
  const db = await database()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('media', 'readwrite')
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error || new Error('本机存储写入失败'))
    transaction.onerror = () => {
      /* The transaction abort event carries the final error. */
    }
    try {
      action(transaction.objectStore('media'))
    } catch (error) {
      transaction.abort()
      reject(error)
    }
  })
}
export function putMediaFiles(files: MediaFile[]) {
  if (!files.length) return Promise.resolve()
  return mutateMedia((store) => files.forEach((file) => store.put(file)))
}
export function deleteMediaFile(id: string) {
  return mutateMedia((store) => store.delete(id))
}
export function putMediaPoster(id: string, poster: Blob) {
  return mutateMedia((store) => {
    const request = store.get(id)
    request.onsuccess = () => {
      if (request.result?.blob instanceof Blob) store.put({ ...request.result, poster })
    }
  })
}
export function clearMediaFiles() {
  return mutateMedia((store) => store.clear())
}
export async function restoreMedia(items: SavedMedia[]) {
  const originals = new Map<string, MediaFile>()
  const local = items.filter((item) => !item.demo)
  if (local.length) {
    const db = await database()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('media', 'readonly')
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error || new Error('本机照片读取失败'))
      for (const item of local) {
        const request = transaction.objectStore('media').get(item.id)
        request.onsuccess = () => {
          const blob = request.result?.blob
          if (blob instanceof Blob) originals.set(item.id, request.result)
        }
      }
    })
  }
  const restored: MediaItem[] = [],
    missing: string[] = []
  for (const item of items) {
    if (item.demo) {
      const demo = demos.find((demo) => demo.id === item.id)
      if (demo) restored.push({ ...item, url: demo.url })
    } else {
      const original = originals.get(item.id)
      if (original)
        restored.push({
          ...item,
          url: URL.createObjectURL(original.blob),
          ...(original.poster instanceof Blob
            ? { poster: URL.createObjectURL(original.poster) }
            : {}),
        })
      else missing.push(item.name)
    }
  }
  return { items: restored, missing }
}
