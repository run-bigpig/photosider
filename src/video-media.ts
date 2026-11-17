export async function videoPoster(video: HTMLVideoElement): Promise<Blob> {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight)
    throw new Error('视频首帧尚未准备好')
  const scale = Math.min(1, 320 / Math.max(video.videoWidth, video.videoHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('无法生成视频首帧'))),
      'image/jpeg',
      0.8,
    ),
  )
}

export async function readVideoMedia(url: string) {
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    await new Promise<void>((resolve, reject) => {
      let seekingFirstFrame = false
      timeout = setTimeout(() => reject(new Error('视频读取超时')), 15000)
      video.onloadeddata = () => {
        if (seekingFirstFrame || video.readyState < 2 || !video.videoWidth || !video.videoHeight)
          return
        seekingFirstFrame = true
        video.onseeked = () => resolve()
        video.currentTime = 0
        if (!video.seeking) resolve()
      }
      video.onerror = () => reject(new Error('无法读取视频'))
      video.src = url
      video.load()
    })
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('视频时长无效')
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
      poster: await videoPoster(video),
    }
  } finally {
    clearTimeout(timeout)
    video.onloadeddata = null
    video.onseeked = null
    video.onerror = null
    video.removeAttribute('src')
    video.load()
  }
}
