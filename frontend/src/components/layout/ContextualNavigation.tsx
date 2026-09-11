import { ArrowLeft } from "lucide-react";
import type { Screen } from "@/navigation";

const screenParents: Partial<Record<Screen, Screen>> = {
  history: "home",
  profile: "home",
  admin: "home",
  users: "admin",
  companies: "admin",
  agreements: "admin",
  templates: "admin",
  "new-document": "home",
  variants: "new-document",
  form: "variants",
  preview: "form",
};

export function SecondaryNavigation({
  screen,
  onNavigate,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const parent = screenParents[screen];
  if (!parent) return null;
  return (
    <nav
      aria-label="Navegación secundaria"
      className="mb-3 flex min-h-11 items-center sm:mb-5"
    >
      <button
        type="button"
        onClick={() => onNavigate(parent)}
        className="typo-control flex min-h-11 items-center gap-2 rounded-lg px-2 text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 sm:px-3"
      >
        <ArrowLeft size={20} className="shrink-0" />
        <span>Volver</span>
      </button>
    </nav>
  );
}

export function AdminModuleNavigation({
  screen,
  onNavigate,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const modules: { label: string; screen: Screen }[] = [
    { label: "Resumen", screen: "admin" },
    { label: "Usuarios", screen: "users" },
    { label: "Empresas", screen: "companies" },
    { label: "Convenios", screen: "agreements" },
    { label: "Plantillas", screen: "templates" },
  ];
  return (
    <nav
      aria-label="Módulos de administración"
      className="mb-5 hidden border-b border-slate-200 sm:block"
    >
      <div className="flex gap-1 overflow-x-auto">
        {modules.map((module) => (
          <button
            key={module.screen}
            type="button"
            onClick={() => onNavigate(module.screen)}
            aria-current={screen === module.screen ? "page" : undefined}
            className={`typo-control min-h-11 shrink-0 border-b-2 px-3 ${screen === module.screen ? "border-blue-700 text-blue-700" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"}`}
          >
            {module.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
