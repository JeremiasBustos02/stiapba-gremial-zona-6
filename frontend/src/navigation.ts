export type Screen = 'home' | 'new-document' | 'variants' | 'form' | 'preview' | 'history' | 'profile' | 'admin' | 'users' | 'companies' | 'agreements' | 'templates' | 'positioned-editor'

export function screenForPath(pathname: string): Screen {
  if (/^\/admin\/plantillas\/[^/]+\/variantes\/[^/]+\/campos$/.test(pathname)) return 'positioned-editor'
  if (/^\/admin\/plantillas(?:\/[^/]+)?$/.test(pathname)) return 'templates'
  if (pathname === '/admin/usuarios') return 'users'
  if (pathname === '/admin/empresas') return 'companies'
  if (pathname === '/admin/convenios') return 'agreements'
  if (pathname === '/admin') return 'admin'
  if (pathname === '/perfil') return 'profile'
  if (pathname === '/historial') return 'history'
  if (/^\/documentos\/nuevo\/[^/]+\/vista-previa$/.test(pathname)) return 'preview'
  if (/^\/documentos\/nuevo\/[^/]+\/formulario$/.test(pathname)) return 'form'
  if (/^\/documentos\/nuevo\/[^/]+\/variante$/.test(pathname)) return 'variants'
  return pathname === '/documentos/nuevo' ? 'new-document' : 'home'
}

export function routeForScreen(screen: Screen, templateId: string | null) {
  if (screen === 'home') return '/'
  if (screen === 'new-document') return '/documentos/nuevo'
  if (screen === 'variants') return templateId ? `/documentos/nuevo/${templateId}/variante` : '/documentos/nuevo'
  if (screen === 'form') return templateId ? `/documentos/nuevo/${templateId}/formulario` : '/documentos/nuevo'
  if (screen === 'preview') return templateId ? `/documentos/nuevo/${templateId}/vista-previa` : '/documentos/nuevo'
  if (screen === 'profile') return '/perfil'
  if (screen === 'history') return '/historial'
  if (screen === 'admin') return '/admin'
  if (screen === 'users') return '/admin/usuarios'
  if (screen === 'companies') return '/admin/empresas'
  if (screen === 'agreements') return '/admin/convenios'
  return '/admin/plantillas'
}

export function isAdminPath(pathname: string) {
  return pathname.startsWith('/admin')
}
