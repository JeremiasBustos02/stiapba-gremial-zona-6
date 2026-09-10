import { describe, expect, it } from 'vitest'
import { canCreatePositionedField, canSaveFieldConfiguration, canStartFieldMove, hasUnsavedChanges, overlayLabel } from './fieldEditorState'

describe('field editor state', () => {
  it('only enables a save when local changes are not already being saved', () => {
    expect(canSaveFieldConfiguration(false, false)).toBe(false)
    expect(canSaveFieldConfiguration(true, true)).toBe(false)
    expect(canSaveFieldConfiguration(true, false)).toBe(true)
  })

  it('uses a friendly fallback for unassigned overlays', () => {
    expect(overlayLabel(undefined)).toBe('Sin asignar')
    expect(overlayLabel('Dirección')).toBe('Dirección')
  })

  it('rejects drawings that are too small', () => {
    expect(canCreatePositionedField({ x: 0, y: 0, width: 7, height: 12 }, 8)).toBe(false)
    expect(canCreatePositionedField({ x: 0, y: 0, width: 12, height: 8 }, 8)).toBe(true)
  })

  it('requires selecting a field before moving it and never moves while drawing', () => {
    expect(canStartFieldMove(false, false)).toBe(false)
    expect(canStartFieldMove(true, true)).toBe(false)
    expect(canStartFieldMove(true, false)).toBe(true)
  })

  it('detects changes before leaving the editor', () => {
    expect(hasUnsavedChanges('[]', '[]')).toBe(false)
    expect(hasUnsavedChanges('[{"field":"actual"}]', '[{"field":"guardado"}]')).toBe(true)
  })

})
