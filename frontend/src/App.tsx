import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  LoaderCircle,
  Users,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
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
import { getVariants } from "@/features/templates/templatesApi";
import { HomePage } from "@/features/home/HomePage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { HistoryPage } from "@/features/history/HistoryPage";
import type { DocumentFormValues } from "@/features/documents/DocumentFlow";
import { getDocumentVariants, type GeneratedDocument } from "@/features/documents/documentsApi";
import { PostGenerationActions } from "@/features/documents/PostGenerationActions";
import {
  clearDocumentDraft,
  readDocumentDraft,
  saveDocumentDraft,
} from "@/features/documents/documentDraft";
import {
  shouldShowStartupLoading,
  StartupLoadingScreen,
} from "@/components/StartupLoadingScreen";
import { AppLayout, BrandMark } from "@/components/layout/AppLayout";
import {
  AdminModuleNavigation,
  SecondaryNavigation,
} from "@/components/layout/ContextualNavigation";
import { ApiError, setUnauthorizedHandler } from "@/lib/api";
import { isAdminPath, routeForScreen, screenForPath, type Screen } from "@/navigation";
import {
  changeFirstLoginPassword,
  getCurrentUser,
  login,
  logout,
} from "@/features/auth/authApi";

const PositionedFieldEditor = lazy(
  () =>
    import("@/features/templates/PositionedFieldEditor").then((module) => ({
      default: module.PositionedFieldEditor,
    })),
);
const DocumentTemplateSelection = lazy(() =>
  import("@/features/documents/DocumentFlow").then((module) => ({
    default: module.DocumentTemplateSelection,
  })),
);
const DocumentVariantSelection = lazy(() =>
  import("@/features/documents/DocumentFlow").then((module) => ({
    default: module.DocumentVariantSelection,
  })),
);
const PermisoGremialForm = lazy(() =>
  import("@/features/documents/DocumentFlow").then((module) => ({
    default: module.PermisoGremialForm,
  })),
);
const PdfPreview = lazy(() =>
  import("@/features/documents/DocumentFlow").then((module) => ({
    default: module.PdfPreview,
  })),
);

const initialDocumentForm: DocumentFormValues = {
  provinceId: "",
  issueDate: new Date().toISOString().slice(0, 10),
  companyId: "",
  delegateId: "",
  permitDay: "",
  agreementId: "",
  variantId: "",
  manualValues: {},
};

const queryClient = new QueryClient({
  defaultOptions: { mutations: { gcTime: 0 } },
});

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
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [emailFeedback, setEmailFeedback] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [startupComplete, setStartupComplete] = useState(false);
  const sessionQuery = useQuery({ queryKey: ["auth", "me"], queryFn: getCurrentUser, retry: false });
  const clearSession = (expired = false) => { queryClient.clear(); clearDocumentDraft(); setDocumentForm(initialDocumentForm); setGeneratedDocument(null); setSessionExpired(expired); navigate("/", { replace: true }); };
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
  if (screen === "preview" && !generatedDocument) return <Navigate to={routeForScreen("form", templateId)} replace />;
  const saveDraft = (nextTemplateId: string, form: DocumentFormValues) => { setDocumentForm(form); saveDocumentDraft({ templateId: nextTemplateId, form }); };
  const adminContent = screen === "users" ? <UserManagementPage /> : screen === "companies" ? <CatalogManagementPage<Company, CompanyForm> kind="companies" title="Empresas" description="Administrá las empresas disponibles para completar documentos." emptyForm={{ nombre: "", agreementId: "" }} getItems={getCompanies} createItem={createCompany} updateItem={updateCompany} setActive={setCompanyActive} /> : screen === "agreements" ? <CatalogManagementPage<Agreement, AgreementForm> kind="agreements" title="Convenios" description="Administrá los convenios disponibles para completar documentos." emptyForm={{ codigo: "", descripcion: "" }} getItems={getAgreements} createItem={createAgreement} updateItem={updateAgreement} setActive={setAgreementActive} /> : screen === "positioned-editor" ? <FieldEditorRoute /> : <TemplateManagementPage initialTemplateId={location.pathname.match(/^\/admin\/plantillas\/([^/]+)$/)?.[1]} onTemplateSelected={(id) => navigate(`/admin/plantillas/${id}`)} onDetailBack={() => navigate("/admin/plantillas")} onConfigureFields={(id, variant) => navigate(`/admin/plantillas/${id}/variantes/${variant.id}/campos`)} />;
  return <AppLayout screen={screen} role={currentUser.role} onNavigate={go} onLogout={() => logoutMutation.mutate()}>
    {screen !== "positioned-editor" && <SecondaryNavigation screen={screen} onNavigate={go} />}
    {["admin", "users", "companies", "agreements", "templates"].includes(screen) && <AdminModuleNavigation screen={screen} onNavigate={go} />}
    {screen === "home" && <HomePage user={currentUser} onNavigate={go} />}
     {screen === "new-document" && <Suspense fallback={<LazyLoadingState />}><DocumentTemplateSelection onBack={() => navigate("/")} onSelect={(id) => { const form = { ...documentForm, variantId: "", manualValues: {} }; saveDraft(id, form); navigate(`/documentos/nuevo/${id}/variante`); }} /></Suspense>}
     {screen === "variants" && <Suspense fallback={<LazyLoadingState />}><DocumentVariantSelection templateId={templateId} onBack={() => navigate("/documentos/nuevo")} onSelect={(variantId) => { if (!templateId) return; const form = { ...documentForm, variantId, manualValues: {} }; saveDraft(templateId, form); navigate(`/documentos/nuevo/${templateId}/formulario`); }} /></Suspense>}
       {screen === "form" && templateId && <Suspense fallback={<LazyLoadingState />}><PermisoGremialForm value={documentForm} onChange={(form) => saveDraft(templateId, form)} onBack={() => navigate(`/documentos/nuevo/${templateId}/variante`)} onGenerated={(document) => { setEmailFeedback(''); setGeneratedDocument(document); navigate(`/documentos/nuevo/${templateId}/vista-previa`); }} /></Suspense>}
       {screen === "preview" && generatedDocument && <Suspense fallback={<LazyLoadingState />}><PdfPreview pdf={generatedDocument.blob} filename={generatedDocument.filename} onEdit={() => { setGeneratedDocument(null); navigate(routeForScreen("form", templateId)); }} onHome={() => { clearDocumentDraft(); setGeneratedDocument(null); navigate("/"); }} /><PostGenerationActions document={generatedDocument} onSuccess={setEmailFeedback} />{emailFeedback && <p role="status" className="mt-3 max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{emailFeedback}</p>}</Suspense>}
     {screen === "profile" && <ProfilePage user={currentUser} onLogout={() => logoutMutation.mutate()} />}
     {screen === "history" && <HistoryPage role={currentUser.role} />}
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
  return (
    <Suspense fallback={<LazyLoadingState />}>
      <PositionedFieldEditor
        templateId={templateId}
        variant={variant}
        onBack={() => navigate(`/admin/plantillas/${templateId}`)}
      />
    </Suspense>
  );
}

function LazyLoadingState() {
  return (
    <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <LoaderCircle className="animate-spin" size={18} /> Cargando...
    </p>
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
export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
