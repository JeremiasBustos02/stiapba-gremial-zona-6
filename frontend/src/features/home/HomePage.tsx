import { ChevronRight, Plus, ShieldCheck, UserRound } from "lucide-react";
import type { AuthUser } from "@/features/auth/authApi";
import type { Screen } from "@/navigation";

export function HomePage({
  user,
  onNavigate,
}: {
  user: AuthUser;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <>
      <section className="max-w-3xl">
        <p className="text-sm font-semibold text-blue-700">Zona 6</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Hola, {user.nombre}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Generá un nuevo permiso gremial o consultá la información de tu
          cuenta.
        </p>
      </section>
      <section className="mt-7 max-w-3xl sm:mt-9">
        <button
          type="button"
          onClick={() => onNavigate("new-document")}
          className="group flex min-h-44 w-full flex-col justify-between rounded-2xl bg-blue-700 p-5 text-left text-white shadow-sm transition hover:bg-blue-800 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-600 sm:min-h-48 sm:p-7"
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/15">
            <Plus size={25} />
          </span>
          <span>
            <span className="flex items-center justify-between gap-4">
              <strong className="text-xl sm:text-2xl">Nuevo documento</strong>
              <ChevronRight
                className="transition-transform group-hover:translate-x-1"
                size={22}
              />
            </span>
            <span className="mt-2 block text-sm text-blue-100 sm:text-base">
              Generá un nuevo Permiso Gremial.
            </span>
          </span>
        </button>
        <div
          className={`mt-3 grid gap-3 ${user.role === "ADMIN" ? "sm:grid-cols-2" : "max-w-md"}`}
        >
          <ActionCard
            icon={UserRound}
            title="Mi perfil"
            description="Consultá tus datos y contraseña."
            onClick={() => onNavigate("profile")}
          />
          {user.role === "ADMIN" && (
            <ActionCard
              icon={ShieldCheck}
              title="Administración"
              description="Gestioná usuarios y catálogos."
              onClick={() => onNavigate("admin")}
            />
          )}
        </div>
      </section>
    </>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Plus;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block">{title}</strong>
        <span className="mt-0.5 block text-sm text-slate-600">
          {description}
        </span>
      </span>
      <ChevronRight className="shrink-0 text-slate-400" size={19} />
    </button>
  );
}
