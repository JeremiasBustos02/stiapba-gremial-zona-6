import { describe, expect, it } from 'vitest'
import { isAdminPath, routeForScreen, screenForPath } from './navigation'

describe('URL navigation', () => {
  it('restores semantic application locations from their paths', () => {
    expect(screenForPath('/admin/plantillas/template-id')).toBe('templates')
    expect(screenForPath('/admin/plantillas/template-id/variantes/variant-id/campos')).toBe('positioned-editor')
    expect(screenForPath('/documentos/nuevo/template-id/formulario')).toBe('form')
    expect(routeForScreen('variants', 'template-id')).toBe('/documentos/nuevo/template-id/variante')
  })

  it('recognizes administration paths for role protection', () => {
    expect(isAdminPath('/admin/usuarios')).toBe(true)
    expect(isAdminPath('/perfil')).toBe(false)
  })
})
