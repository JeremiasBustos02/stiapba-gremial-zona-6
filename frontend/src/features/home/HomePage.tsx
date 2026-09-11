import { ArrowUpRight, FilePlus2, History, ShieldCheck, UserRound } from "lucide-react";
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
      <section className="motion-reveal max-w-4xl border-b border-slate-200 pb-8 sm:pb-10">
        <p className="typo-eyebrow text-blue-700">STIA PBA · Zona 6</p>
        <h1 className="typo-display-xl mt-2 uppercase">Hola, {user.nombre}</h1>
        <p className="typo-body mt-4 max-w-xl text-slate-600">Prepará un Permiso Gremial con los datos ya disponibles y revisalo antes de descargarlo.</p>
      </section>
      <section className="mt-7 max-w-5xl sm:mt-10">
        <button
          type="button"
          onClick={() => onNavigate("new-document")}
          className="motion-reveal group relative flex min-h-52 w-full flex-col justify-between overflow-hidden bg-blue-800 p-6 text-left text-white transition-[transform,background-color] duration-200 [animation-delay:60ms] hover:bg-blue-900 active:translate-y-px sm:min-h-56 sm:p-8"
        >
          <span className="typo-decorative absolute -right-5 -top-8 text-white/[.07]">06</span>
          <span className="relative grid h-12 w-12 place-items-center border border-white/30 bg-white/10"><FilePlus2 size={25} aria-hidden="true" /></span>
          <span>
            <span className="flex items-center justify-between gap-4">
              <strong className="typo-display-lg uppercase">Nuevo documento</strong>
              <ArrowUpRight className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" size={24} aria-hidden="true" />
            </span>
            <span className="typo-body-sm mt-2 block text-blue-100">Iniciá un Permiso Gremial y completá los datos necesarios.</span>
          </span>
        </button>
        <div className={`motion-reveal mt-3 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 [animation-delay:120ms] ${user.role === "ADMIN" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <ActionCard icon={History} title="Historial" description="Consultá documentos generados." onClick={() => onNavigate("history")} />
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
  icon: typeof FilePlus2;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-28 items-center gap-4 bg-white p-5 text-left transition hover:bg-blue-50"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center border border-blue-200 bg-blue-50 text-blue-700">
        <Icon size={21} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block">{title}</strong>
        <span className="typo-body-sm mt-0.5 block text-slate-600">
          {description}
        </span>
      </span>
      <ArrowUpRight className="shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={19} aria-hidden="true" />
    </button>
  );
}
