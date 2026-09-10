import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  Home,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Printer,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useMatch, useNavigate } from "react-router";
import { UserManagementPage } from "@/features/users/UserManagementPage";
import { CatalogManagementPage } from "@/features/catalog/CatalogManagementPage";
import {
  createAgreement,
  getAgreements,
  setAgreementActive,
  updateAgreement,
} from "@/features/catalog/agreementsApi";
import {
  createCompany,
  getCompanies,
  setCompanyActive,
  updateCompany,
} from "@/features/catalog/companiesApi";
import type {
  Agreement,
  AgreementForm,
  Company,
  CompanyForm,
} from "@/features/catalog/types";
import { TemplateManagementPage } from "@/features/templates/TemplateManagementPage";
import { PositionedFieldEditor } from "@/features/templates/PositionedFieldEditor";
import { getVariants } from "@/features/templates/templatesApi";
import {
  DocumentTemplateSelection,
  DocumentVariantSelection,
  initialDocumentForm,
  PdfPreview,
  PermisoGremialForm,
  type DocumentFormValues,
} from "@/features/documents/DocumentFlow";
import { getDocumentVariants } from "@/features/documents/documentsApi";
import {
  clearDocumentDraft,
  readDocumentDraft,
  saveDocumentDraft,
} from "@/features/documents/documentDraft";
import {
  shouldShowStartupLoading,
  StartupLoadingScreen,
} from "@/components/StartupLoadingScreen";
import { ApiError, setUnauthorizedHandler } from "@/lib/api";
import { isAdminPath, routeForScreen, screenForPath, type Screen } from "@/navigation";
import {
  changeFirstLoginPassword,
  changePassword,
  getCurrentUser,
  login,
  logout,
  type AuthUser,
} from "@/features/auth/authApi";

const queryClient = new QueryClient({
  defaultOptions: { mutations: { gcTime: 0 } },
});

type FormData = {
  province: string;
  issueDate: string;
  company: string;
  delegate: string;
  permitDay: string;
  agreement: string;
  variant: string;
};

const initialForm: FormData = {
  province: "",
  issueDate: "2026-08-18",
  company: "",
  delegate: "hernan",
  permitDay: "",
  agreement: "",
  variant: "bruna",
};
const delegates = [
  { value: "hernan", name: "Hernan Echevarria", dni: "44.267.021" },
  { value: "mariana", name: "Mariana Lopez", dni: "39.884.117" },
];

function documentTemplateId(pathname: string) {
  return pathname.match(/^\/documentos\/nuevo\/([^/]+)\/(?:variante|formulario|vista-previa)$/)?.[1] ?? null;
}

function App() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [draft] = useState(readDocumentDraft);
  const screen = screenForPath(location.pathname);
  const templateId = documentTemplateId(location.pathname);
  const [documentForm, setDocumentForm] = useState<DocumentFormValues>(
    draft?.templateId === templateId ? draft.form : initialDocumentForm,
  );
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [startupComplete, setStartupComplete] = useState(false);
  const sessionQuery = useQuery({ queryKey: ["auth", "me"], queryFn: getCurrentUser, retry: false });
  const clearSession = (expired = false) => { queryClient.clear(); clearDocumentDraft(); setDocumentForm(initialDocumentForm); setGeneratedPdf(null); setSessionExpired(expired); navigate("/", { replace: true }); };
  const loginMutation = useMutation({ mutationFn: ({ dni, password }: { dni: string; password: string }) => login(dni, password), onSuccess: ({ user }) => { queryClient.setQueryData(["auth", "me"], user); setSessionExpired(false); navigate("/"); } });
  const logoutMutation = useMutation({ mutationFn: logout, onSuccess: () => clearSession() });
  useEffect(() => { setUnauthorizedHandler(() => clearSession(true)); return () => setUnauthorizedHandler(); }, [queryClient]);
  const go = (next: Screen) => navigate(routeForScreen(next, templateId ?? draft?.templateId ?? null));
  const currentUser = sessionQuery.data;
  const documentVariantsQuery = useQuery({
    queryKey: ["documents", "variants", templateId],
    queryFn: () => getDocumentVariants(templateId!),
    enabled: Boolean(currentUser && templateId && ["form", "preview"].includes(screen)),
  });
  if (shouldShowStartupLoading({ isPending: sessionQuery.isPending, isSuccess: sessionQuery.isSuccess, startupComplete })) return <StartupLoadingScreen completed={sessionQuery.isSuccess} onComplete={() => setStartupComplete(true)} />;
  if (!currentUser) return <LoginPage error={loginMutation.error} pending={loginMutation.isPending} sessionExpired={sessionExpired} onSubmit={(dni, password) => loginMutation.mutate({ dni, password })} />;
  if (currentUser.firstLogin) return <FirstLoginPage onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ["auth", "me"] }); navigate("/"); }} />;
  if (currentUser.role !== "ADMIN" && isAdminPath(location.pathname)) return <Navigate to="/" replace />;
  if ((screen === "form" || screen === "preview") && templateId && documentVariantsQuery.isSuccess && !documentVariantsQuery.data.some((variant) => variant.id === documentForm.variantId)) return <Navigate to={`/documentos/nuevo/${templateId}/variante`} replace />;
  if (screen === "preview" && !generatedPdf) return <Navigate to={routeForScreen("form", templateId)} replace />;
  const saveDraft = (nextTemplateId: string, form: DocumentFormValues) => { setDocumentForm(form); saveDocumentDraft({ templateId: nextTemplateId, form }); };
  const adminContent = screen === "users" ? <UserManagementPage /> : screen === "companies" ? <CatalogManagementPage<Company, CompanyForm> kind="companies" title="Empresas" description="Administrá las empresas disponibles para completar documentos." emptyForm={{ nombre: "", agreementId: "" }} getItems={getCompanies} createItem={createCompany} updateItem={updateCompany} setActive={setCompanyActive} /> : screen === "agreements" ? <CatalogManagementPage<Agreement, AgreementForm> kind="agreements" title="Convenios" description="Administrá los convenios disponibles para completar documentos." emptyForm={{ codigo: "", descripcion: "" }} getItems={getAgreements} createItem={createAgreement} updateItem={updateAgreement} setActive={setAgreementActive} /> : screen === "positioned-editor" ? <FieldEditorRoute /> : <TemplateManagementPage initialTemplateId={location.pathname.match(/^\/admin\/plantillas\/([^/]+)$/)?.[1]} onTemplateSelected={(id) => navigate(`/admin/plantillas/${id}`)} onDetailBack={() => navigate("/admin/plantillas")} onConfigureFields={(id, variant) => navigate(`/admin/plantillas/${id}/variantes/${variant.id}/campos`)} />;
  return <AppLayout screen={screen} role={currentUser.role} onNavigate={go} onLogout={() => logoutMutation.mutate()}>
    {screen !== "positioned-editor" && <SecondaryNavigation screen={screen} onNavigate={go} />}
    {["admin", "users", "companies", "agreements", "templates"].includes(screen) && <AdminModuleNavigation screen={screen} onNavigate={go} />}
    {screen === "home" && <HomePage user={currentUser} onNavigate={go} />}
    {screen === "new-document" && <DocumentTemplateSelection onBack={() => navigate("/")} onSelect={(id) => { const form = { ...documentForm, variantId: "", manualValues: {} }; saveDraft(id, form); navigate(`/documentos/nuevo/${id}/variante`); }} />}
    {screen === "variants" && <DocumentVariantSelection templateId={templateId} onBack={() => navigate("/documentos/nuevo")} onSelect={(variantId) => { if (!templateId) return; const form = { ...documentForm, variantId, manualValues: {} }; saveDraft(templateId, form); navigate(`/documentos/nuevo/${templateId}/formulario`); }} />}
    {screen === "form" && templateId && <PermisoGremialForm value={documentForm} onChange={(form) => saveDraft(templateId, form)} onBack={() => navigate(`/documentos/nuevo/${templateId}/variante`)} onGenerated={(pdf) => { setGeneratedPdf(pdf); navigate(`/documentos/nuevo/${templateId}/vista-previa`); }} />}
    {screen === "preview" && <PdfPreview pdf={generatedPdf} onEdit={() => navigate(routeForScreen("form", templateId))} onHome={() => { clearDocumentDraft(); navigate("/"); }} />}
    {screen === "profile" && <ProfilePage user={currentUser} onLogout={() => logoutMutation.mutate()} />}
    {screen === "admin" && <AdminPage onNavigate={go} />}
    {["users", "companies", "agreements", "templates", "positioned-editor"].includes(screen) && adminContent}
  </AppLayout>;
}

function FieldEditorRoute() {
  const match = useMatch("/admin/plantillas/:templateId/variantes/:variantId/campos");
  const templateId = match?.params.templateId;
  const variantId = match?.params.variantId;
  const navigate = useNavigate();
  const variantsQuery = useQuery({ queryKey: ["template-variants", templateId], queryFn: () => getVariants(templateId!), enabled: Boolean(templateId) });
  if (!templateId || !variantId) return <Navigate to="/admin/plantillas" replace />;
  if (variantsQuery.isPending) return <p className="py-10 text-center text-sm text-slate-500">Cargando variante...</p>;
  const variant = variantsQuery.data?.find((item) => item.id === variantId);
  if (!variant) return <Navigate to={`/admin/plantillas/${templateId}`} replace />;
  return <PositionedFieldEditor templateId={templateId} variant={variant} onBack={() => navigate(`/admin/plantillas/${templateId}`)} />;
}

const screenParents: Partial<Record<Screen, Screen>> = {
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

const screenLabels: Partial<Record<Screen, string>> = {
  home: "Inicio",
  profile: "Mi perfil",
  admin: "Administración",
  users: "Usuarios",
  companies: "Empresas",
  agreements: "Convenios",
  templates: "Plantillas",
  "new-document": "Nuevo documento",
  variants: "Versión del documento",
  form: "Permiso Gremial",
  preview: "Vista previa",
};

function SecondaryNavigation({
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
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 sm:px-3"
      >
        <ArrowLeft size={20} className="shrink-0" />
        <span>Volver</span>
      </button>
    </nav>
  );
}

function AdminModuleNavigation({
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
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold ${screen === module.screen ? "border-blue-700 text-blue-700" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"}`}
          >
            {module.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function LoginPage({
  onSubmit,
  error,
  pending,
  sessionExpired,
}: {
  onSubmit: (dni: string, password: string) => void;
  error: Error | null;
  pending: boolean;
  sessionExpired: boolean;
}) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit(String(data.get("dni")), String(data.get("password")));
  };
  const message =
    error instanceof ApiError
      ? error.message
      : error
        ? "No pudimos iniciar sesión. Intentá nuevamente."
        : "";
  return (
    <main className="flex min-h-screen flex-col bg-slate-50 px-5 py-10 sm:px-10">
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-10 text-center">
          <BrandMark />
          <p className="mt-5 text-sm font-semibold uppercase tracking-[.16em] text-blue-700">
            STIA PBA Zona 6
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Ingresá a tu cuenta
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Accedé a tus documentos de forma segura.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {sessionExpired && (
            <p
              role="status"
              className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              Tu sesión expiró. Volvé a iniciar sesión.
            </p>
          )}
          {message && (
            <p
              role="alert"
              className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              {message}
            </p>
          )}
          <label className="block text-sm font-semibold text-slate-900">
            DNI
            <input
              required
              name="dni"
              inputMode="numeric"
              placeholder="Ingresá tu DNI"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <PasswordInput
            name="password"
            label="Contraseña"
            placeholder="Ingresá tu contraseña"
            className="mt-5"
          />
          <button
            disabled={pending}
            className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" size={20} /> Iniciando
                sesión...
              </>
            ) : (
              <>
                Iniciar sesión <ChevronRight size={20} />
              </>
            )}
          </button>
        </form>
      </section>
      <footer className="pt-8 text-center text-xs font-medium text-slate-500">
        StiaPba Gremial Zona 6
      </footer>
    </main>
  );
}

function FirstLoginPage({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: changeFirstLoginPassword,
    onSuccess: onSaved,
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
    const newPassword = String(data.get("password"));
    const confirmPassword = String(data.get("confirm"));
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    mutation.mutate({ newPassword, confirmPassword });
  };
  return (
    <main className="flex min-h-screen items-center bg-slate-50 px-5 py-10">
      <form
        onSubmit={submit}
        className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <BrandMark />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[.16em] text-blue-700">
          Primer ingreso
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Creá una nueva contraseña
        </h1>
        <p className="mt-3 text-slate-600">
          Por seguridad, antes de continuar necesitás crear una nueva
          contraseña.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"
          >
            {error}
          </p>
        )}
        <PasswordFields />
        <button
          disabled={mutation.isPending}
          className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60"
        >
          {mutation.isPending && (
            <LoaderCircle className="animate-spin" size={18} />
          )}{" "}
          Guardar contraseña
        </button>
      </form>
    </main>
  );
}

function PasswordFields() {
  return (
    <div className="mt-6 space-y-4">
      <PasswordInput name="password" label="Nueva contraseña" minLength={10} />
      <PasswordInput name="confirm" label="Repetir contraseña" minLength={10} />
      <p className="text-xs text-slate-500">Entre 10 y 72 caracteres.</p>
    </div>
  );
}
function PasswordInput({
  name,
  label,
  placeholder,
  minLength,
  className = "",
}: {
  name: string;
  label: string;
  placeholder?: string;
  minLength?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label
      className={`block text-sm font-semibold text-slate-900 ${className}`}
    >
      {label}
      <div className="relative mt-2">
        <input
          required
          name={name}
          minLength={minLength}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-slate-500 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
          aria-label={
            visible
              ? `Ocultar ${label.toLowerCase()}`
              : `Mostrar ${label.toLowerCase()}`
          }
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </label>
  );
}

function AppLayout({
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

function HomePage({
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

function PageIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="max-w-2xl">
      <p className="text-sm font-semibold text-blue-700">Nuevo documento</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 leading-relaxed text-slate-600">{description}</p>
    </header>
  );
}
function TemplateSelection({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: () => void;
}) {
  const [status, setStatus] = useState<"success" | "empty" | "error">(
    "success",
  );
  return (
    <>
      <PageIntro
        title="Seleccionar documento"
        description="Elegí el tipo de documento que necesitás generar."
      />
      <div className="mt-6 flex gap-2 text-xs">
        <button onClick={() => setStatus("success")} className="underline">
          Datos
        </button>
        <button onClick={() => setStatus("empty")} className="underline">
          Vacío
        </button>
        <button onClick={() => setStatus("error")} className="underline">
          Error
        </button>
      </div>
      <section className="mt-4 max-w-3xl">
        {status === "success" && (
          <button
            onClick={onSelect}
            className="flex w-full items-center gap-4 rounded-2xl border border-blue-200 bg-white p-5 text-left shadow-sm hover:border-blue-500"
          >
            <span className="rounded-xl bg-blue-700 p-3 text-white">
              <FileText />
            </span>
            <span className="flex-1">
              <strong className="text-lg">Permiso Gremial</strong>
              <span className="mt-1 block text-sm text-slate-600">
                Autorización para actividades sindicales fuera del trabajo.
              </span>
            </span>
            <ChevronRight className="text-blue-700" />
          </button>
        )}
        {status === "empty" && (
          <EmptyState
            title="No hay documentos disponibles"
            text="Todavía no hay tipos de documento activos para utilizar."
          />
        )}
        {status === "error" && (
          <ErrorState
            text="No pudimos cargar los documentos. Intentá nuevamente."
            onRetry={() => setStatus("success")}
          />
        )}
      </section>
      <button
        onClick={onBack}
        className="mt-8 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        Cancelar
      </button>
    </>
  );
}
function VariantSelection({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <>
      <PageIntro
        title="Versión del documento"
        description="Elegí la firma que se utilizará en el Permiso Gremial."
      />
      <section className="mt-8 max-w-3xl space-y-3">
        <button
          onClick={() => onSelect("bruna")}
          className="flex w-full items-center gap-4 rounded-2xl border border-blue-200 bg-white p-5 text-left shadow-sm hover:border-blue-500"
        >
          <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
            <Pencil />
          </span>
          <span className="flex-1">
            <strong className="text-lg">Bruna</strong>
            <span className="mt-1 block text-sm text-slate-600">
              Versión activa del documento.
            </span>
          </span>
          <ChevronRight className="text-blue-700" />
        </button>
      </section>
      <button
        onClick={onBack}
        className="mt-8 text-sm font-semibold text-slate-600"
      >
        Volver
      </button>
    </>
  );
}

function PermitForm({
  form,
  onChange,
  onBack,
  onPreview,
}: {
  form: FormData;
  onChange: (form: FormData) => void;
  onBack: () => void;
  onPreview: () => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const delegate = delegates.find((item) => item.value === form.delegate)!;
  const set = (key: keyof FormData, value: string) =>
    onChange({ ...form, [key]: value });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const missing = Object.entries(form)
      .filter(([key, value]) => key !== "variant" && !value)
      .map(([key]) => key);
    setErrors(missing);
    if (!missing.length) onPreview();
  };
  return (
    <>
      <PageIntro
        title="Permiso Gremial"
        description="Completá los datos necesarios para generar la vista previa."
      />
      <form onSubmit={submit} className="mt-8 max-w-3xl space-y-5">
        <FormSection title="Contexto institucional">
          <SelectField
            label="Provincia"
            value={form.province}
            onChange={(value) => set("province", value)}
            options={[
              ["", "Seleccioná una provincia"],
              ["buenos-aires", "Buenos Aires"],
              ["cordoba", "Córdoba"],
            ]}
            error={
              errors.includes("province")
                ? "Seleccioná una provincia."
                : undefined
            }
          />
          <SelectField
            label="Empresa"
            value={form.company}
            onChange={(value) => set("company", value)}
            options={[
              ["", "Buscar o seleccionar empresa"],
              ["alimentos-sur", "Alimentos del Sur S.A."],
              ["frigorifico", "Frigorífico Regional S.A."],
            ]}
            error={
              errors.includes("company") ? "Seleccioná una empresa." : undefined
            }
          />
        </FormSection>
        <FormSection title="Información del delegado">
          <SelectField
            label="Delegado"
            value={form.delegate}
            onChange={(value) => set("delegate", value)}
            options={delegates.map((item) => [item.value, item.name])}
          />
          <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              DNI del delegado
            </p>
            <p className="mt-1 font-medium text-slate-800">{delegate.dni}</p>
          </div>
        </FormSection>
        <FormSection title="Datos del permiso">
          <label className="block text-sm font-semibold">
            Fecha de emisión
            <input
              required
              type="date"
              value={form.issueDate}
              onChange={(event) => set("issueDate", event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Día del permiso
            <input
              required
              min="1"
              max="31"
              inputMode="numeric"
              type="number"
              value={form.permitDay}
              onChange={(event) => set("permitDay", event.target.value)}
              placeholder="Ej. 18"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            {errors.includes("permitDay") && (
              <span className="mt-1 block text-sm text-rose-700">
                Indicá el día del permiso.
              </span>
            )}
          </label>
          <SelectField
            label="Convenio"
            value={form.agreement}
            onChange={(value) => set("agreement", value)}
            options={[
              ["", "Buscar o seleccionar convenio"],
              ["cct-244", "CCT-244 - Industria de la alimentación"],
              ["cct-329", "CCT-329 - Actividad frigorífica"],
            ]}
            error={
              errors.includes("agreement")
                ? "Seleccioná un convenio."
                : undefined
            }
          />
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Versión seleccionada
            </p>
            <p className="mt-1 font-medium text-slate-900">Bruna</p>
          </div>
        </FormSection>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Volver
          </button>
          <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800">
            <Eye size={19} /> Generar vista previa
          </button>
        </div>
      </form>
    </>
  );
}
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
  error?: string;
}) {
  return (
    <label className="mt-4 block text-sm font-semibold first:mt-0">
      {label}
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
      >
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
      {error && (
        <span className="mt-1 block text-sm text-rose-700">{error}</span>
      )}
    </label>
  );
}

function PreviewPage({
  onEdit,
  onHome,
}: {
  onEdit: () => void;
  onHome: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const action = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 700);
  };
  return (
    <>
      <PageIntro
        title="Vista previa"
        description="Revisá el documento antes de descargarlo o imprimirlo."
      />
      <section className="mt-7 rounded-2xl bg-slate-300 p-4 sm:p-8">
        <article className="mx-auto min-h-[540px] max-w-[680px] bg-white p-8 shadow-lg sm:p-14">
          <p className="text-sm leading-relaxed text-slate-600">
            Central: Garay N° 431 Quilmes (CP 1878)
            <br />
            Delegación: Balcarce 3.102 Mar del Plata (7600)
          </p>
          <hr className="my-9 border-slate-300" />
          <p className="text-right text-slate-600">
            Mar del Plata, 18 de agosto de 2026
          </p>
          <h2 className="mt-10 text-xl font-bold">
            De nuestra mayor consideración:
          </h2>
          <p className="mt-7 max-w-prose leading-8">
            Por intermedio de la presente, le comunicamos que el compañero
            delegado obrero de vuestro establecimiento no concurrirá a cumplir
            con sus tareas normales y habituales el día 18 del corriente mes,
            por encontrarse al servicio de nuestra Organización Gremial, en un
            todo de acuerdo a lo dispuesto por la Convención Colectiva de
            Trabajo.
          </p>
          <p className="mt-8">Sin otro particular, saludamos atte.</p>
          <div className="mt-20 border-t border-slate-300 pt-5 text-center">
            <strong>DIEGO BRUNA</strong>
            <p className="text-slate-600">Sindicato de Alimentación</p>
          </div>
        </article>
      </section>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          onClick={onEdit}
          className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-white"
        >
          Volver y editar
        </button>
        <button
          onClick={action}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
        >
          <Download size={19} /> Descargar PDF
        </button>
        <button
          onClick={action}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle className="animate-spin" size={19} />
          ) : (
            <Printer size={19} />
          )}{" "}
          Imprimir
        </button>
      </div>
      <button
        onClick={onHome}
        className="mt-6 text-sm font-semibold text-slate-600"
      >
        Volver al inicio
      </button>
    </>
  );
}

function ProfilePage({
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
      <section className="mt-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-blue-100 p-4 text-blue-700">
            <UserRound size={28} />
          </span>
          <div>
            <h2 className="text-xl font-bold">
              {user.nombre} {user.apellido}
            </h2>
            <p className="text-sm text-slate-600">DNI {user.dni}</p>
          </div>
        </div>
        <dl className="mt-7 divide-y divide-slate-100 border-y border-slate-100">
          <div className="flex justify-between py-4">
            <dt className="text-slate-600">Rol</dt>
            <dd className="font-semibold">{user.role}</dd>
          </div>
          <div className="flex justify-between py-4">
            <dt className="text-slate-600">Estado</dt>
            <dd className="font-semibold text-emerald-700">Activo</dd>
          </div>
        </dl>
        <form onSubmit={submit} className="mt-7 border-t border-slate-100 pt-6">
          <h2 className="flex items-center gap-2 font-bold">
            <LockKeyhole size={18} /> Cambiar contraseña
          </h2>
          {success && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {success}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"
            >
              {error}
            </p>
          )}
          <label className="mt-4 block text-sm font-semibold">
            Contraseña actual
            <input
              required
              name="currentPassword"
              type="password"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Nueva contraseña
            <input
              required
              minLength={10}
              name="newPassword"
              type="password"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
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
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            {mutation.isPending && (
              <LoaderCircle className="animate-spin" size={18} />
            )}{" "}
            Guardar cambios
          </button>
        </form>
        <button
          onClick={onLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-rose-700 hover:bg-rose-50"
        >
          Cerrar sesión <LogOut size={18} />
        </button>
      </section>
    </>
  );
}
function AdminPage({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const modules: {
    title: string;
    description: string;
    icon: typeof Users;
    screen: Screen;
  }[] = [
    {
      title: "Usuarios",
      description: "Personas, roles y accesos.",
      icon: Users,
      screen: "users",
    },
    {
      title: "Empresas",
      description: "Empresas disponibles para los documentos.",
      icon: Landmark,
      screen: "companies",
    },
    {
      title: "Convenios",
      description: "Códigos y descripciones vigentes.",
      icon: FileText,
      screen: "agreements",
    },
    {
      title: "Plantillas",
      description: "Tipos de documento y sus variantes PDF.",
      icon: FileText,
      screen: "templates",
    },
  ];
  return (
    <section className="max-w-5xl">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          Administración
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Gestioná el sistema
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Seleccioná un módulo para administrar los datos disponibles.
        </p>
      </header>
      <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 sm:border-y-0">
        {modules.map(({ title, description, icon: Icon, screen }) => (
          <button
            key={title}
            type="button"
            onClick={() => onNavigate(screen)}
            className="flex min-h-20 w-full items-center gap-3 py-4 text-left hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 sm:border-b sm:border-slate-200 sm:px-2"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block">{title}</strong>
              <span className="mt-0.5 block text-sm text-slate-600">
                {description}
              </span>
            </span>
            <ChevronRight className="shrink-0 text-slate-400" size={19} />
          </button>
        ))}
      </div>
    </section>
  );
}
function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <FileText className="mx-auto text-slate-400" />
      <h2 className="mt-4 font-bold">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </div>
  );
}
function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-6"
    >
      <p className="font-semibold text-rose-900">{text}</p>
      <button
        onClick={onRetry}
        className="mt-3 text-sm font-bold text-rose-800 underline"
      >
        Reintentar
      </button>
    </div>
  );
}
function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-blue-700 text-white ${small ? "h-8 w-8 rounded-lg" : "h-16 w-16"}`}
    >
      <FileText size={small ? 18 : 32} />
    </span>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
