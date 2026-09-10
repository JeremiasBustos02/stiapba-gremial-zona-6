import type { PdfRect } from './positionedCoordinates'

export function canCreatePositionedField(rect: PdfRect, minimumSize: number) {
  return rect.width >= minimumSize && rect.height >= minimumSize
}

export function canSaveFieldConfiguration(isDirty: boolean, isSaving: boolean) {
  return isDirty && !isSaving
}

export function canStartFieldMove(isSelected: boolean, drawingMode: boolean) {
  return isSelected && !drawingMode
}

export function hasUnsavedChanges(currentSnapshot: string, savedSnapshot: string) {
  return currentSnapshot !== savedSnapshot
}

export function overlayLabel(label: string | undefined) {
  return label || 'Sin asignar'
}
