export type PdfRect = { x: number; y: number; width: number; height: number }

export function previewToPdf(rect: PdfRect, previewWidth: number, previewHeight: number, pdfWidth: number, pdfHeight: number): PdfRect {
  const scaleX = previewWidth / pdfWidth
  const scaleY = previewHeight / pdfHeight
  return { x: rect.x / scaleX, y: pdfHeight - (rect.y + rect.height) / scaleY, width: rect.width / scaleX, height: rect.height / scaleY }
}

export function pdfToPreview(rect: PdfRect, previewWidth: number, previewHeight: number, pdfWidth: number, pdfHeight: number): PdfRect {
  const scaleX = previewWidth / pdfWidth
  const scaleY = previewHeight / pdfHeight
  return { x: rect.x * scaleX, y: previewHeight - (rect.y + rect.height) * scaleY, width: rect.width * scaleX, height: rect.height * scaleY }
}
