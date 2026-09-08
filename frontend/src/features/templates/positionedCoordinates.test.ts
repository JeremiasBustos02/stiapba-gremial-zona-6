import { describe, expect, it } from 'vitest'
import { pdfToPreview, previewToPdf } from './positionedCoordinates'

describe('positioned coordinates', () => {
  it('converts preview coordinates to PDF coordinates with inverted Y', () => {
    expect(previewToPdf({ x: 80, y: 100, width: 160, height: 40 }, 800, 1100, 400, 550)).toEqual({ x: 40, y: 480, width: 80, height: 20 })
  })
  it('round trips coordinates across different page sizes', () => {
    const pdf = { x: 35, y: 120, width: 90, height: 25 }
    expect(previewToPdf(pdfToPreview(pdf, 720, 1000, 612, 792), 720, 1000, 612, 792)).toEqual(pdf)
  })
})
