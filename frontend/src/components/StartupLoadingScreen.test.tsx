import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { shouldShowStartupLoading, StartupLoadingScreen, startupMessage, startupProgress } from './StartupLoadingScreen'

describe('StartupLoadingScreen', () => {
  it('starts with the initial message and estimated progress', () => {
    expect(startupMessage(0)).toBe('Verificando sesión...')
    expect(startupProgress(0)).toBe(8)
  })

  it('renders an accessible progressbar in the pending state', () => {
    const markup = renderToStaticMarkup(<StartupLoadingScreen />)
    expect(markup).toContain('Verificando sesión...')
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="8"')
  })

  it('changes the message as the wait gets longer', () => {
    expect(startupMessage(3_000)).toBe('Conectando con el servidor...')
    expect(startupMessage(10_000)).toBe('Iniciando el servicio...')
  })

  it('never reaches 100% while the session request is pending', () => {
    expect(startupProgress(120_000)).toBeLessThan(100)
    expect(startupProgress(600_000)).toBe(93)
  })

  it('completes at 100% when the session request resolves', () => {
    expect(startupProgress(500, true)).toBe(100)
  })

  it('renders the completed state at 100%', () => {
    const markup = renderToStaticMarkup(<StartupLoadingScreen completed />)
    expect(markup).toContain('Listo')
    expect(markup).toContain('aria-valuenow="100"')
  })

  it('stops showing the loading screen when the request errors', () => {
    expect(shouldShowStartupLoading({ isPending: false, isSuccess: false, startupComplete: false })).toBe(false)
  })

  it('keeps the loading screen until a successful response is completed', () => {
    expect(shouldShowStartupLoading({ isPending: true, isSuccess: false, startupComplete: false })).toBe(true)
    expect(shouldShowStartupLoading({ isPending: false, isSuccess: true, startupComplete: false })).toBe(true)
    expect(shouldShowStartupLoading({ isPending: false, isSuccess: true, startupComplete: true })).toBe(false)
  })
})
