export function downloadDocument(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function printDocument(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  let timeout: number | undefined
  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    if (timeout !== undefined) window.clearTimeout(timeout)
    frame.onload = null
    frame.onerror = null
    frame.contentWindow?.removeEventListener('afterprint', cleanup)
    frame.remove()
    URL.revokeObjectURL(url)
  }
  frame.style.display = 'none'
  frame.onload = () => {
    frame.contentWindow?.addEventListener('afterprint', cleanup, { once: true })
    frame.contentWindow?.print()
    timeout = window.setTimeout(cleanup, 1_000)
  }
  frame.onerror = cleanup
  frame.src = url
  document.body.appendChild(frame)
  return cleanup
}
