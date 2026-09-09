import { describe, expect, it } from 'vitest'
import { pdfToPreview, previewToPdf } from './positionedCoordinates'
import { previewSizeForWidth, responsivePreviewWidth } from './pdfPreviewSizing'

describe('responsive PDF preview sizing', () => {
  it('uses the available width without exceeding the desktop maximum', () => {
    expect(responsivePreviewWidth(320)).toBe(320)
    expect(responsivePreviewWidth(600)).toBe(600)
    expect(responsivePreviewWidth(960)).toBe(900)
  })

  it('preserves the PDF aspect ratio', () => {
    expect(previewSizeForWidth(320, 612, 792)).toEqual({ width: 320, height: 320 * 792 / 612 })
  })

  it.each([320, 600, 900])('keeps overlays aligned at %ipx', (previewWidth) => {
    const pdfSize = { width: 612, height: 792 }
    const previewSize = previewSizeForWidth(previewWidth, pdfSize.width, pdfSize.height)
    const pdfRect = { x: 35, y: 120, width: 90, height: 25 }
    const previewRect = pdfToPreview(pdfRect, previewSize.width, previewSize.height, pdfSize.width, pdfSize.height)

    expect(previewRect.width).toBeCloseTo(pdfRect.width * previewSize.width / pdfSize.width)
    expect(previewRect.height).toBeCloseTo(pdfRect.height * previewSize.width / pdfSize.width)
    const roundTripped = previewToPdf(previewRect, previewSize.width, previewSize.height, pdfSize.width, pdfSize.height)
    expect(roundTripped.x).toBeCloseTo(pdfRect.x)
    expect(roundTripped.y).toBeCloseTo(pdfRect.y)
    expect(roundTripped.width).toBeCloseTo(pdfRect.width)
    expect(roundTripped.height).toBeCloseTo(pdfRect.height)
  })
})
