import { FileText, History, Home, LogOut, Menu, Plus, UserRound } from "lucide-react";
import type { Screen } from "@/navigation";
import { PageTransition } from "@/components/ui/page-transition";

export function AppLayout({ children, screen, role, onNavigate, onLogout }: {
  children: React.ReactNode;
  screen: Screen;
  role: "ADMIN" | "DELEGADO";
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}) {
  const editor = screen === "positioned-editor";
  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button type="button" aria-label="Ir al inicio" onClick={() => onNavigate("home")} className="flex shrink-0 items-center gap-2 text-left">
            <BrandMark small />
            <span className="hidden lg:block"><strong className="typo-brand block uppercase">STIA PBA</strong><span className="typo-eyebrow text-slate-500">ZONA 6</span></span>
          </button>
          <DesktopNavigation role={role} screen={screen} onNavigate={onNavigate} />
          <button type="button" aria-label="Cerrar sesión" onClick={onLogout} className="typo-control ml-auto flex min-h-11 shrink-0 items-center gap-2 rounded-md px-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:px-3">
            <span className="hidden sm:inline">Cerrar sesión</span><LogOut size={17} aria-hidden="true" />
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={`mx-auto max-w-[90rem] ${editor ? "" : "px-4 py-7 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-10 sm:pb-10 lg:px-8"}`}>
        <PageTransition transitionKey={screen}>{children}</PageTransition>
      </main>
      {!editor && <BottomNav role={role} screen={screen} onNavigate={onNavigate} />}
    </div>
  );
}

function navigationItems(role: "ADMIN" | "DELEGADO") {
  return [
    { label: "Inicio", icon: Home, screen: "home" as Screen },
    { label: "Nuevo documento", icon: Plus, screen: "new-document" as Screen },
    { label: "Historial", icon: History, screen: "history" as Screen },
    ...(role === "ADMIN" ? [{ label: "Administración", icon: Menu, screen: "admin" as Screen }] : []),
    { label: "Perfil", icon: UserRound, screen: "profile" as Screen },
  ];
}

function navigationActive(screen: Screen, target: Screen) {
  return target === "admin" ? ["admin", "users", "companies", "agreements", "templates", "positioned-editor"].includes(screen) : screen === target;
}

function DesktopNavigation({ role, screen, onNavigate }: { role: "ADMIN" | "DELEGADO"; screen: Screen; onNavigate: (screen: Screen) => void }) {
  return <nav aria-label="Navegación principal" className="hidden min-w-0 flex-1 items-center justify-center gap-1 sm:flex">
    {navigationItems(role).map(({ label, icon: Icon, screen: target }) => {
      const active = navigationActive(screen, target);
      return <button key={target} type="button" aria-current={active ? "page" : undefined} onClick={() => onNavigate(target)} className={`typo-control flex min-h-11 items-center gap-2 border-b-2 px-2.5 transition-colors lg:px-3 ${active ? "border-[var(--color-action)] text-blue-800" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"}`}>
        <Icon size={18} strokeWidth={active ? 2.5 : 2} aria-hidden="true" /><span className="hidden md:inline">{label}</span>
      </button>;
    })}
  </nav>;
}

function BottomNav({ role, screen, onNavigate }: { role: "ADMIN" | "DELEGADO"; screen: Screen; onNavigate: (screen: Screen) => void }) {
  return <nav aria-label="Navegación principal" className="app-bottom-nav fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/98 shadow-[0_-8px_20px_rgb(21_94_194_/_0.08)] sm:hidden">
    <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
      {navigationItems(role).map(({ label, icon: Icon, screen: target }) => {
        const active = navigationActive(screen, target);
        return <button key={target} type="button" aria-current={active ? "page" : undefined} onClick={() => onNavigate(target)} className={`typo-caption flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 font-semibold transition-colors ${active ? "bg-blue-50 text-blue-800" : "text-slate-600"}`}>
          <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />{target === "new-document" ? "Nuevo" : label}
        </button>;
      })}
    </div>
  </nav>;
}

export function BrandMark({ small = false }: { small?: boolean }) {
  return <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center bg-blue-800 text-white after:absolute after:inset-1 after:border after:border-white/35 ${small ? "h-9 w-9" : "h-16 w-16"}`}><FileText size={small ? 19 : 32} /></span>;
}
