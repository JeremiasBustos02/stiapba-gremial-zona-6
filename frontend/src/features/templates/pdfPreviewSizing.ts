export type PreviewSize = { width: number; height: number }

export function responsivePreviewWidth(availableWidth: number, maximumWidth = 900) {
  return Math.max(0, Math.min(Math.floor(availableWidth), maximumWidth))
}

export function previewSizeForWidth(previewWidth: number, pdfWidth: number, pdfHeight: number): PreviewSize {
  if (!previewWidth || !pdfWidth || !pdfHeight) return { width: 0, height: 0 }
  return { width: previewWidth, height: previewWidth * pdfHeight / pdfWidth }
}
