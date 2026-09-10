import { Home, LogOut, Menu, Plus, UserRound, FileText } from "lucide-react";
import type { Screen } from "@/navigation";

export function AppLayout({
  children,
  screen,
  role,
  onNavigate,
  onLogout,
}: {
  children: React.ReactNode;
  screen: Screen;
  role: "ADMIN" | "DELEGADO";
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}) {
  const editor = screen === "positioned-editor";
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <button
            type="button"
            aria-label="Ir al inicio"
            onClick={() => onNavigate("home")}
            className="flex shrink-0 items-center gap-2 font-bold focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <BrandMark small />
            <span className="hidden lg:inline">STIA PBA Zona 6</span>
          </button>
          <DesktopNavigation
            role={role}
            screen={screen}
            onNavigate={onNavigate}
          />
          <button
            type="button"
            aria-label="Cerrar sesión"
            onClick={onLogout}
            className="ml-auto flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 sm:gap-2 sm:px-3 sm:text-sm"
          >
            <span>Cerrar sesión</span> <LogOut size={17} />
          </button>
        </div>
      </header>
      <main
        className={`mx-auto max-w-7xl ${editor ? "" : "px-4 py-7 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-10 sm:pb-10"}`}
      >
        {children}
      </main>
      {!editor && (
        <BottomNav role={role} screen={screen} onNavigate={onNavigate} />
      )}
    </div>
  );
}

function navigationItems(role: "ADMIN" | "DELEGADO") {
  return [
    { label: "Inicio", icon: Home, screen: "home" as Screen },
    { label: "Nuevo documento", icon: Plus, screen: "new-document" as Screen },
    ...(role === "ADMIN"
      ? [{ label: "Administración", icon: Menu, screen: "admin" as Screen }]
      : []),
    { label: "Perfil", icon: UserRound, screen: "profile" as Screen },
  ];
}

function navigationActive(screen: Screen, target: Screen) {
  return target === "admin"
    ? [
        "admin",
        "users",
        "companies",
        "agreements",
        "templates",
        "positioned-editor",
      ].includes(screen)
    : screen === target;
}

function DesktopNavigation({
  role,
  screen,
  onNavigate,
}: {
  role: "ADMIN" | "DELEGADO";
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <nav
      aria-label="Navegación principal"
      className="hidden min-w-0 flex-1 items-center justify-center gap-1 sm:flex"
    >
      {navigationItems(role).map(({ label, icon: Icon, screen: target }) => {
        const active = navigationActive(screen, target);
        return (
          <button
            key={target}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(target)}
            className={`flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 lg:px-3 lg:text-sm ${active ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
          >
            <Icon size={18} strokeWidth={active ? 2.5 : 2} />
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function BottomNav({
  role,
  screen,
  onNavigate,
}: {
  role: "ADMIN" | "DELEGADO";
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <nav
      aria-label="Navegación principal"
      className="app-bottom-nav fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white sm:hidden"
    >
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
        {navigationItems(role).map(({ label, icon: Icon, screen: target }) => {
          const active = navigationActive(screen, target);
          return (
            <button
              key={target}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(target)}
              className={`flex min-h-11 min-w-16 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium focus-visible:ring-2 focus-visible:ring-blue-600 ${active ? "text-blue-700" : "text-slate-600"}`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {target === "new-document" ? "Nuevo" : label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-blue-700 text-white ${small ? "h-8 w-8 rounded-lg" : "h-16 w-16"}`}
    >
      <FileText size={small ? 18 : 32} />
    </span>
  );
}
