import { describe, expect, it } from 'vitest'
import { fieldConfigurationExperience } from './fieldConfigurationExperience'
import { configureFieldsLabel, variantConfigurationStatus } from './TemplateManagementPage'
import type { TemplateVariant } from './types'

const variant: TemplateVariant = {
  id: 'variant-1',
  templateId: 'template-1',
  nombre: 'Firma A',
  active: true,
  legacyPositioned: false,
  createdAt: '',
  updatedAt: '',
}

describe('template configuration access', () => {
  it('exposes the visible configuration action without technical wording', () => {
    expect(configureFieldsLabel).toBe('Configurar campos')
    expect(configureFieldsLabel).not.toMatch(/mapping|acroform|positioned|fielddefinition/i)
  })

  it('marks a new variant as needing field configuration', () => {
    expect(variantConfigurationStatus(variant, 0)).toBe('Campos sin configurar')
  })

  it('recognizes configured and legacy variants without exposing technical labels', () => {
    expect(variantConfigurationStatus(variant, 1)).toBe('Campos configurados')
    expect(variantConfigurationStatus({ ...variant, legacyPositioned: true }, 0)).toBe('Configuración heredada')
  })

  it('uses detected form fields or the visual editor according to the PDF', () => {
    expect(fieldConfigurationExperience(9)).toBe('FORM_FIELDS')
    expect(fieldConfigurationExperience(0)).toBe('VISUAL_EDITOR')
  })
})
