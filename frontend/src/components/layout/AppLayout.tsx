import { FileText, History, Home, LogOut, Menu, Plus, UserRound } from "lucide-react";
import type { Screen } from "@/navigation";
import { PageTransition } from "@/components/ui/page-transition";
import { GlobalSearch } from "@/features/search/GlobalSearch";
import type { DocumentHistoryRecord } from "@/features/documents/documentsApi";

export function AppLayout({ children, screen, role, onNavigate, onLogout, onOpenDocument, onPrefill }: {
  children: React.ReactNode;
  screen: Screen;
  role: "ADMIN" | "DELEGADO";
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  onOpenDocument: (document: DocumentHistoryRecord) => void;
  onPrefill: (kind: 'company' | 'delegate' | 'agreement', id: string) => void;
}) {
  const editor = screen === "positioned-editor";
  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button type="button" aria-label="Ir al inicio" onClick={() => onNavigate("home")} className="flex min-h-11 shrink-0 items-center gap-2 text-left focus-visible:ring-2 focus-visible:ring-blue-600">
            <BrandMark small />
            <span className="hidden lg:block"><strong className="typo-brand block uppercase">STIA PBA</strong><span className="typo-eyebrow text-slate-500">ZONA 6</span></span>
          </button>
           <DesktopNavigation role={role} screen={screen} onNavigate={onNavigate} />
           <GlobalSearch role={role} onNavigate={onNavigate} onOpenDocument={onOpenDocument} onPrefill={onPrefill} />
           <button type="button" aria-label="Cerrar sesión" onClick={onLogout} className="typo-control ml-auto flex min-h-11 shrink-0 items-center gap-2 px-2 text-slate-600 transition hover:bg-rose-50 hover:text-rose-800 focus-visible:ring-2 focus-visible:ring-blue-600 sm:px-3">
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
  return target === "admin" ? ["admin", "users", "companies", "agreements", "templates", "reports", "positioned-editor"].includes(screen) : screen === target;
}

function DesktopNavigation({ role, screen, onNavigate }: { role: "ADMIN" | "DELEGADO"; screen: Screen; onNavigate: (screen: Screen) => void }) {
  return <nav aria-label="Navegación principal" className="hidden min-w-0 flex-1 items-center justify-center gap-1 sm:flex">
    {navigationItems(role).map(({ label, icon: Icon, screen: target }) => {
      const active = navigationActive(screen, target);
       return <button key={target} type="button" aria-current={active ? "page" : undefined} onClick={() => onNavigate(target)} className={`typo-control flex min-h-11 items-center gap-2 border-b-2 px-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 lg:px-3 ${active ? "border-[var(--color-action)] bg-blue-50 text-blue-800" : "border-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"}`}>
        <Icon size={18} strokeWidth={active ? 2.5 : 2} aria-hidden="true" /><span className="hidden md:inline">{label}</span>
      </button>;
    })}
  </nav>;
}

function BottomNav({ role, screen, onNavigate }: { role: "ADMIN" | "DELEGADO"; screen: Screen; onNavigate: (screen: Screen) => void }) {
  return <nav aria-label="Navegación principal" className="app-bottom-nav fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white sm:hidden">
    <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
      {navigationItems(role).map(({ label, icon: Icon, screen: target }) => {
        const active = navigationActive(screen, target);
        return <button key={target} type="button" aria-current={active ? "page" : undefined} onClick={() => onNavigate(target)} className={`typo-caption flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 ${active ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50"}`}>
          <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />{target === "new-document" ? "Nuevo" : label}
        </button>;
      })}
    </div>
  </nav>;
}

export function BrandMark({ small = false, compactOnMobile = false }: { small?: boolean; compactOnMobile?: boolean }) {
  return <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center bg-blue-800 text-white after:absolute after:inset-1 after:border after:border-white/35 ${small ? "h-9 w-9" : compactOnMobile ? "h-12 w-12 sm:h-16 sm:w-16" : "h-16 w-16"}`}><FileText size={small ? 19 : 32} className={compactOnMobile && !small ? "h-[26px] w-[26px] sm:h-8 sm:w-8" : undefined} /></span>;
}
