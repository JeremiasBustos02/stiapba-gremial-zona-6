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
import { ReportsPage } from "@/features/reports/ReportsPage";
import type { DocumentFormValues } from "@/features/documents/DocumentFlow";
import {
  getDocumentVariants,
  type DocumentHistoryDetail,
  type GeneratedDocument,
} from "@/features/documents/documentsApi";
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
import {
  isAdminPath,
  routeForScreen,
  screenForPath,
  type Screen,
} from "@/navigation";
import {
  changeFirstLoginPassword,
  getCurrentUser,
  login,
  logout,
} from "@/features/auth/authApi";

const PositionedFieldEditor = lazy(() =>
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
const BulkPermisoPage = lazy(() =>
  import("@/features/documents/BulkPermisoPage").then((module) => ({
    default: module.BulkPermisoPage,
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
  return (
    pathname.match(
      /^\/documentos\/nuevo\/([^/]+)\/(?:variante|formulario|vista-previa)$/,
    )?.[1] ?? null
  );
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
  const [generatedDocument, setGeneratedDocument] =
    useState<GeneratedDocument | null>(null);
  const [documentPrefill, setDocumentPrefill] = useState<
    Partial<
      Pick<DocumentFormValues, "companyId" | "delegateId" | "agreementId">
    >
  >({});
  const [searchDocument, setSearchDocument] = useState<{ id: string } | null>(
    null,
  );
  const [emailFeedback, setEmailFeedback] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [startupComplete, setStartupComplete] = useState(false);
  const sessionQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    retry: false,
  });
  const clearSession = (expired = false) => {
    queryClient.clear();
    clearDocumentDraft();
    setDocumentForm(initialDocumentForm);
    setGeneratedDocument(null);
    setDocumentPrefill({});
    setSearchDocument(null);
    setSessionExpired(expired);
    navigate("/", { replace: true });
  };
  const loginMutation = useMutation({
    mutationFn: ({ dni, password }: { dni: string; password: string }) =>
      login(dni, password),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(["auth", "me"], user);
      setSessionExpired(false);
      navigate("/");
    },
  });
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => clearSession(),
  });
  useEffect(() => {
    setUnauthorizedHandler(() => clearSession(true));
    return () => setUnauthorizedHandler();
  }, [queryClient]);
  const go = (next: Screen) =>
    navigate(routeForScreen(next, templateId ?? draft?.templateId ?? null));
  const currentUser = sessionQuery.data;
  const documentVariantsQuery = useQuery({
    queryKey: ["documents", "variants", templateId],
    queryFn: () => getDocumentVariants(templateId!),
    enabled: Boolean(
      currentUser && templateId && ["form", "preview"].includes(screen),
    ),
  });
  if (
    shouldShowStartupLoading({
      isPending: sessionQuery.isPending,
      isSuccess: sessionQuery.isSuccess,
      startupComplete,
    })
  )
    return (
      <StartupLoadingScreen
        completed={sessionQuery.isSuccess}
        onComplete={() => setStartupComplete(true)}
      />
    );
  if (!currentUser)
    return (
      <LoginPage
        error={loginMutation.error}
        pending={loginMutation.isPending}
        sessionExpired={sessionExpired}
        onSubmit={(dni, password) => loginMutation.mutate({ dni, password })}
      />
    );
  if (currentUser.firstLogin)
    return (
      <FirstLoginPage
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
          navigate("/");
        }}
      />
    );
  if (currentUser.role !== "ADMIN" && isAdminPath(location.pathname))
    return <Navigate to="/" replace />;
  if (
    (screen === "form" || screen === "preview") &&
    templateId &&
    documentVariantsQuery.isSuccess &&
    !documentVariantsQuery.data.some(
      (variant) => variant.id === documentForm.variantId,
    )
  )
    return <Navigate to={`/documentos/nuevo/${templateId}/variante`} replace />;
  if (screen === "preview" && !generatedDocument)
    return <Navigate to={routeForScreen("form", templateId)} replace />;
  const saveDraft = (nextTemplateId: string, form: DocumentFormValues) => {
    setDocumentForm(form);
    saveDocumentDraft({ templateId: nextTemplateId, form });
  };
  const useHistoryAsBase = (detail: DocumentHistoryDetail) => {
    const form: DocumentFormValues = {
      provinceId: detail.provinceId ?? "",
      issueDate: detail.issueDate ?? new Date().toISOString().slice(0, 10),
      companyId: detail.companyId ?? "",
      delegateId: detail.delegateId ?? "",
      permitDay: detail.permitDay == null ? "" : String(detail.permitDay),
      agreementId: detail.agreementId ?? "",
      variantId: detail.variantId,
      manualValues: detail.manualValues ?? {},
    };
    saveDraft(detail.templateId, form);
    navigate(`/documentos/nuevo/${detail.templateId}/formulario`);
  };
  const adminContent =
    screen === "reports" ? (
      <ReportsPage />
    ) : screen === "users" ? (
      <UserManagementPage currentUserId={currentUser.id} />
    ) : screen === "companies" ? (
      <CatalogManagementPage<Company, CompanyForm>
        kind="companies"
        title="Empresas"
        description="Administrá las empresas disponibles para completar documentos."
        emptyForm={{ nombre: "", agreementId: "" }}
        getItems={getCompanies}
        createItem={createCompany}
        updateItem={updateCompany}
        setActive={setCompanyActive}
      />
    ) : screen === "agreements" ? (
      <CatalogManagementPage<Agreement, AgreementForm>
        kind="agreements"
        title="Convenios"
        description="Administrá los convenios disponibles para completar documentos."
        emptyForm={{ codigo: "", descripcion: "" }}
        getItems={getAgreements}
        createItem={createAgreement}
        updateItem={updateAgreement}
        setActive={setAgreementActive}
      />
    ) : screen === "positioned-editor" ? (
      <FieldEditorRoute />
    ) : (
      <TemplateManagementPage
        initialTemplateId={
          location.pathname.match(/^\/admin\/plantillas\/([^/]+)$/)?.[1]
        }
        onTemplateSelected={(id) => navigate(`/admin/plantillas/${id}`)}
        onDetailBack={() => navigate("/admin/plantillas")}
        onConfigureFields={(id, variant) =>
          navigate(`/admin/plantillas/${id}/variantes/${variant.id}/campos`)
        }
      />
    );
  const openSearchDocument = (
    document: DocumentHistoryDetail | { id: string },
  ) => {
    setSearchDocument({ id: document.id });
    navigate("/historial");
  };
  const prefillFromSearch = (
    kind: "company" | "delegate" | "agreement",
    id: string,
  ) => {
    const field =
      kind === "company"
        ? "companyId"
        : kind === "delegate"
          ? "delegateId"
          : "agreementId";
    setDocumentPrefill({ [field]: id });
    navigate("/documentos/nuevo");
  };
  const finishDocument = () => {
    clearDocumentDraft();
    setDocumentForm(initialDocumentForm);
    setGeneratedDocument(null);
    setDocumentPrefill({});
    setEmailFeedback("");
    navigate(routeForScreen("home", null));
  };
  return (
    <AppLayout
      screen={screen}
      role={currentUser.role}
      onNavigate={go}
      onLogout={() => logoutMutation.mutate()}
      onOpenDocument={openSearchDocument}
      onPrefill={prefillFromSearch}
    >
      {screen !== "positioned-editor" && (
        <SecondaryNavigation screen={screen} onNavigate={go} />
      )}
      {[
        "admin",
        "users",
        "companies",
        "agreements",
        "templates",
        "reports",
      ].includes(screen) && (
        <AdminModuleNavigation screen={screen} onNavigate={go} />
      )}
      {screen === "home" && <HomePage user={currentUser} onNavigate={go} />}
      {screen === "new-document" && (
        <Suspense fallback={<LazyLoadingState />}>
          <DocumentTemplateSelection
            onBack={() => navigate(routeForScreen("home", null))}
            onSelect={(id) => {
              const form = {
                ...documentForm,
                ...documentPrefill,
                variantId: "",
                manualValues: {},
              };
              setDocumentPrefill({});
              saveDraft(id, form);
              navigate(`/documentos/nuevo/${id}/variante`);
            }}
          />
        </Suspense>
      )}
      {screen === "bulk-document" && (
        <Suspense fallback={<LazyLoadingState />}>
          <BulkPermisoPage onBack={finishDocument} />
        </Suspense>
      )}
      {screen === "variants" && (
        <Suspense fallback={<LazyLoadingState />}>
          <DocumentVariantSelection
            templateId={templateId}
            onBack={() => navigate("/documentos/nuevo")}
            onSelect={(variantId) => {
              if (!templateId) return;
              const form = { ...documentForm, variantId, manualValues: {} };
              saveDraft(templateId, form);
              navigate(`/documentos/nuevo/${templateId}/formulario`);
            }}
          />
        </Suspense>
      )}
      {screen === "form" && templateId && (
        <Suspense fallback={<LazyLoadingState />}>
          <PermisoGremialForm
            value={documentForm}
            onChange={(form) => saveDraft(templateId, form)}
            onBack={() => navigate(`/documentos/nuevo/${templateId}/variante`)}
            onGenerated={(document) => {
              setEmailFeedback("");
              setGeneratedDocument(document);
              navigate(`/documentos/nuevo/${templateId}/vista-previa`);
            }}
          />
        </Suspense>
      )}
      {screen === "preview" && generatedDocument && (
        <Suspense fallback={<LazyLoadingState />}>
          <div className="preview-action-flow">
            <p className="typo-display-lg max-w-3xl tabular-nums text-blue-900">
              {generatedDocument.publicNumber}
            </p>
            <PdfPreview
              pdf={generatedDocument.blob}
              filename={generatedDocument.filename}
              onEdit={() => {
                setGeneratedDocument(null);
                navigate(routeForScreen("form", templateId));
              }}
              onHome={finishDocument}
              postGenerationAction={
                <PostGenerationActions document={generatedDocument} inline />
              }
            />
            {emailFeedback && (
              <p
                role="status"
                className="mt-3 max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
              >
                {emailFeedback}
              </p>
            )}
          </div>
        </Suspense>
      )}
      {screen === "profile" && (
        <ProfilePage
          user={currentUser}
          onLogout={() => logoutMutation.mutate()}
        />
      )}
      {screen === "history" && (
        <HistoryPage
          role={currentUser.role}
          onUseAsBase={useHistoryAsBase}
          openDocumentId={searchDocument?.id}
          onDocumentOpened={() => setSearchDocument(null)}
        />
      )}
      {screen === "admin" && <AdminPage onNavigate={go} />}
      {[
        "users",
        "companies",
        "agreements",
        "templates",
        "reports",
        "positioned-editor",
      ].includes(screen) && adminContent}
    </AppLayout>
  );
}

function FieldEditorRoute() {
  const match = useMatch(
    "/admin/plantillas/:templateId/variantes/:variantId/campos",
  );
  const templateId = match?.params.templateId;
  const variantId = match?.params.variantId;
  const navigate = useNavigate();
  const variantsQuery = useQuery({
    queryKey: ["template-variants", templateId],
    queryFn: () => getVariants(templateId!),
    enabled: Boolean(templateId),
  });
  if (!templateId || !variantId)
    return <Navigate to="/admin/plantillas" replace />;
  if (variantsQuery.isPending)
    return (
      <p className="typo-body-sm py-10 text-center text-slate-500">
        Cargando variante...
      </p>
    );
  const variant = variantsQuery.data?.find((item) => item.id === variantId);
  if (!variant)
    return <Navigate to={`/admin/plantillas/${templateId}`} replace />;
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
    <p className="typo-body-sm flex items-center justify-center gap-2 py-10 text-slate-500">
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
    <main className="flex min-h-[100dvh] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <section className="mx-auto flex w-full max-w-md items-center sm:hidden">
        <div className="w-full border border-slate-200 border-t-4 border-t-blue-700 bg-white px-5 py-8">
          <div className="flex flex-col items-center text-center">
            <BrandMark compactOnMobile />
            <p className="typo-eyebrow mt-4 text-blue-800">STIA PBA · Zona 6</p>
            <h1 className="typo-display-lg mt-5 uppercase text-slate-950">
              Ingresar
            </h1>
          </div>
          <LoginFormContent
            onSubmit={submit}
            error={message}
            pending={pending}
            sessionExpired={sessionExpired}
            compact
          />
        </div>
      </section>
      <section className="mx-auto hidden w-full max-w-6xl overflow-hidden border border-slate-200 bg-white sm:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,.85fr)]">
        <div className="flex flex-col justify-between border-b-4 border-blue-700 bg-blue-50/70 p-8 lg:min-h-[38rem] lg:border-b-0 lg:border-r-4 lg:p-12">
          <div>
            <BrandMark />
            <p className="typo-eyebrow mt-6 text-blue-800">STIA PBA · Zona 6</p>
            <h1 className="typo-display-xl mt-2 max-w-md uppercase text-slate-950">
              Gestión documental gremial
            </h1>
            <p className="typo-body mt-4 max-w-md text-slate-700">
              Accedé a tus documentos y tareas de gestión desde un solo lugar.
            </p>
          </div>
          <div
            aria-hidden="true"
            className="mt-10 hidden border-t border-blue-200 pt-4 lg:flex lg:items-end lg:justify-between"
          >
            <span className="typo-meta text-blue-800">Zona 6</span>
            <span className="typo-display-lg leading-none text-blue-200">
              06
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-center p-8 lg:p-12">
          <div className="mb-7 border-l-4 border-blue-700 pl-4">
            <p className="typo-eyebrow text-blue-700">Acceso seguro</p>
            <h2 className="typo-display-lg mt-1 uppercase text-slate-950">
              Ingresá a tu cuenta
            </h2>
            <p className="typo-body-sm mt-3 text-slate-600">
              Usá tu DNI y contraseña para continuar.
            </p>
          </div>
          <LoginFormContent
            onSubmit={submit}
            error={message}
            pending={pending}
            sessionExpired={sessionExpired}
          />
        </div>
      </section>
    </main>
  );
}

function LoginFormContent({
  onSubmit,
  error,
  pending,
  sessionExpired,
  compact = false,
}: {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  error: string;
  pending: boolean;
  sessionExpired: boolean;
  compact?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`border-t border-slate-200 ${compact ? "mt-7 pt-6" : "pt-6"}`}
    >
      {sessionExpired && (
        <p
          role="status"
          className="typo-body-sm mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"
        >
          Tu sesión expiró. Volvé a iniciar sesión.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="typo-body-sm mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800"
        >
          {error}
        </p>
      )}
      <label className="typo-label block text-slate-900">
        DNI
        <input
          required
          name="dni"
          inputMode="numeric"
          placeholder="Ingresá tu DNI"
          className="mt-2 h-12 w-full border border-slate-300 bg-white px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <PasswordInput
        name="password"
        label="Contraseña"
        placeholder="Ingresá tu contraseña"
        className="mt-5"
      />
      <details className="typo-body-sm mt-5 text-slate-600">
        <summary className="cursor-pointer font-semibold text-blue-700">
          ¿Olvidaste tu contraseña?
        </summary>
        <p className="mt-2">
          Comunicate con administración para restablecer el acceso.
        </p>
      </details>
      <button
        disabled={pending}
        className="typo-control mt-7 flex min-h-12 w-full items-center justify-center gap-2 bg-[var(--color-action)] px-4 py-3 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
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
    <main className="flex min-h-[100dvh] items-center bg-slate-50 px-5 py-10">
      <form
        onSubmit={submit}
        className="mx-auto w-full max-w-md border border-slate-200 bg-white p-6 shadow-[var(--shadow-surface)] sm:p-8"
      >
        <BrandMark />
        <p className="typo-eyebrow mt-6 text-blue-700">Primer ingreso</p>
        <h1 className="typo-display-xl mt-2 uppercase">
          Creá una nueva contraseña
        </h1>
        <p className="typo-body-sm mt-3 text-slate-600">
          Por seguridad, antes de continuar necesitás crear una nueva
          contraseña.
        </p>
        {error && (
          <p
            role="alert"
            className="typo-body-sm mt-5 rounded-xl bg-rose-50 p-3 text-rose-800"
          >
            {error}
          </p>
        )}
        <PasswordFields />
        <button
          disabled={mutation.isPending}
          className="typo-control mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-action)] px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-60"
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
      <p className="typo-caption text-slate-500">Entre 10 y 72 caracteres.</p>
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
    <label className={`typo-label block text-slate-900 ${className}`}>
      {label}
      <div className="relative mt-2">
        <input
          required
          name={name}
          minLength={minLength}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 pr-12 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
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
    {
      title: "Reportes y exportaciones",
      description: "Actividad por período y datos administrativos.",
      icon: FileText,
      screen: "reports",
    },
  ];
  return (
    <section className="max-w-6xl">
      <header className="border-l-4 border-blue-700 pl-4 sm:pl-5">
        <p className="typo-eyebrow text-blue-700">Administración</p>
        <h1 className="typo-display-xl mt-1 uppercase">Gestioná el sistema</h1>
        <p className="typo-body-sm mt-3 max-w-xl text-slate-600">
          Seleccioná un módulo para administrar los datos disponibles.
        </p>
      </header>
      <div className="mt-8 divide-y divide-slate-200 border border-slate-200 bg-white sm:grid sm:grid-cols-2 sm:gap-x-0 sm:divide-y-0">
        {modules.map(({ title, description, icon: Icon, screen }) => (
          <button
            key={title}
            type="button"
            onClick={() => onNavigate(screen)}
            className="flex min-h-20 w-full items-center gap-3 px-4 py-4 text-left hover:bg-blue-50/70 focus-visible:ring-2 focus-visible:ring-blue-600 sm:border-b sm:border-slate-200 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center border border-blue-100 bg-blue-50 text-blue-700">
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
