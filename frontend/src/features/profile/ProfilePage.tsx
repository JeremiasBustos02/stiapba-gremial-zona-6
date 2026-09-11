import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { changePassword, type AuthUser } from "@/features/auth/authApi";

function PageIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="max-w-2xl">
       <p className="typo-eyebrow text-blue-700">Cuenta personal</p>
       <h1 className="typo-display-xl mt-2 uppercase">
        {title}
      </h1>
       <p className="typo-body-sm mt-3 text-slate-600">{description}</p>
    </header>
  );
}

export function ProfilePage({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (result) => {
      setError("");
      setSuccess(result.message);
    },
    onError: (requestError) =>
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No pudimos actualizar la contraseña. Intentá nuevamente.",
      ),
  });
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const currentPassword = String(data.get("currentPassword"));
    const newPassword = String(data.get("newPassword"));
    const confirmPassword = String(data.get("confirmPassword"));
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    mutation.mutate({ currentPassword, newPassword, confirmPassword });
  };
  return (
    <>
      <PageIntro
        title="Mi perfil"
        description="Consultá la información de tu cuenta."
      />
      <section className="mt-8 max-w-xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-surface)]">
        <div className="flex items-center gap-4">
          <span className="border border-blue-200 bg-blue-50 p-4 text-blue-700">
            <UserRound size={28} />
          </span>
          <div>
            <h2 className="typo-heading-3">
              {user.nombre} {user.apellido}
            </h2>
            <p className="typo-meta text-slate-600">DNI {user.dni}</p>
          </div>
        </div>
        <dl className="mt-7 divide-y divide-slate-100 border-y border-slate-100">
          <div className="flex justify-between py-4">
            <dt className="typo-meta text-slate-600">Rol</dt>
            <dd className="typo-label">{user.role}</dd>
          </div>
          <div className="flex justify-between py-4">
            <dt className="typo-meta text-slate-600">Estado</dt>
            <dd className="typo-label text-emerald-700">Activo</dd>
          </div>
        </dl>
        <form onSubmit={submit} className="mt-7 border-t border-slate-100 pt-6">
           <h2 className="typo-heading-3 flex items-center gap-2">
            <LockKeyhole size={18} /> Cambiar contraseña
          </h2>
          {success && (
            <p
              role="status"
               className="typo-body-sm mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-800"
            >
              {success}
            </p>
          )}
          {error && (
            <p
              role="alert"
               className="typo-body-sm mt-4 rounded-xl bg-rose-50 p-3 text-rose-800"
            >
              {error}
            </p>
          )}
           <label className="typo-label mt-4 block">
            Contraseña actual
            <input
              required
              name="currentPassword"
              type="password"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </label>
           <label className="typo-label mt-4 block">
            Nueva contraseña
            <input
              required
              minLength={10}
              name="newPassword"
              type="password"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </label>
           <label className="typo-label mt-4 block">
            Repetir nueva contraseña
            <input
              required
              minLength={10}
              name="confirmPassword"
              type="password"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            disabled={mutation.isPending}
             className="typo-control mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 hover:bg-slate-50 disabled:opacity-60"
          >
            {mutation.isPending && (
              <LoaderCircle className="animate-spin" size={18} />
            )}{" "}
            Guardar cambios
          </button>
        </form>
        <button
          onClick={onLogout}
           className="typo-control mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-rose-700 hover:bg-rose-50"
        >
          Cerrar sesión <LogOut size={18} />
        </button>
      </section>
    </>
  );
}
