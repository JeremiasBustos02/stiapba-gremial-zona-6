import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Download,
  FileText,
  LoaderCircle,
  Pencil,
  Printer,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { motion, useReducedMotion } from "motion/react";
import { ApiError } from "@/lib/api";
import { agreementAfterCompanyChange } from "./companyAgreement";
import {
  generateDocument,
  getDelegates,
  getDocumentAgreements,
  getDocumentCompanies,
  getDocumentSuggestions,
  getDocumentTemplates,
  getDocumentVariants,
  getGenerationFields,
  getProvinces,
  type Delegate,
  type DocumentSuggestionCategory,
  type GeneratedDocument,
  type GenerationField,
  type ManualField,
} from "./documentsApi";
import type { DocumentType } from "@/features/templates/types";
import { downloadDocument, printDocument } from "./documentActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ActionGroup, ActionGroupItem } from "@/components/ui/action-group";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type DocumentFormValues = {
  provinceId: string;
  issueDate: string;
  companyId: string;
  delegateId: string;
  permitDay: string;
  agreementId: string;
  variantId: string;
  manualValues: Record<string, string>;
  documentType?: DocumentType;
};
type GenerationStage = "idle" | "submitting" | "revealing";
export const initialDocumentForm: DocumentFormValues = {
  provinceId: "",
  issueDate: new Date().toISOString().slice(0, 10),
  companyId: "",
  delegateId: "",
  permitDay: "",
  agreementId: "",
  variantId: "",
  manualValues: {},
};

function PageIntro({
  title,
  description,
  context = "Nuevo documento",
  step,
}: {
  title: string;
  description: string;
  context?: string;
  step?: string;
}) {
  const currentStep = step ? Number(step.match(/\d+/)?.[0]) : 0;
  const stepName =
    currentStep === 1 ? "Plantilla" : currentStep === 2 ? "Variante" : "Datos";
  return (
    <header className="max-w-3xl border-l-4 border-blue-700 pl-4 sm:pl-5">
      <div className="flex items-center justify-between gap-3">
        <p className="typo-eyebrow text-blue-700">{context}</p>
        {step && (
          <>
            <span className="sr-only">{step}</span>
            <span
              aria-hidden="true"
              className="typo-caption hidden border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 sm:inline"
            >
              {step}
            </span>
          </>
        )}
      </div>
      {step && (
        <div className="mt-3 sm:hidden">
          <div aria-hidden="true" className="flex items-center">
            <i className="h-2.5 w-2.5 rounded-full bg-blue-700" />
            <span
              className={`h-0.5 flex-1 ${currentStep >= 2 ? "bg-blue-700" : "bg-slate-300"}`}
            />
            <i
              className={`h-2.5 w-2.5 rounded-full ${currentStep >= 2 ? "bg-blue-700" : "bg-slate-300"}`}
            />
            <span
              className={`h-0.5 flex-1 ${currentStep >= 3 ? "bg-blue-700" : "bg-slate-300"}`}
            />
            <i
              className={`h-2.5 w-2.5 rounded-full ${currentStep >= 3 ? "bg-blue-700" : "bg-slate-300"}`}
            />
          </div>
          <p className="typo-meta mt-2 text-slate-600">
            Paso {currentStep} de 3 · {stepName}
          </p>
        </div>
      )}
      <h1 className="typo-heading-1 mt-1.5 sm:mt-2">{title}</h1>
      <p className="typo-body-sm mt-2 max-w-2xl text-slate-600 sm:mt-3">
        {description}
      </p>
    </header>
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function QueryState({
  query,
  emptyText,
  children,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  emptyText: string;
  children: React.ReactNode;
}) {
  if (query.isPending)
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        <LoaderCircle className="mr-2 inline animate-spin" size={16} />
        Cargando datos...
      </p>
    );
  if (query.isError)
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
      >
        {errorMessage(
          query.error,
          "No pudimos cargar los datos. Intentá nuevamente.",
        )}
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-3 min-h-11 font-semibold underline"
        >
          Reintentar
        </button>
      </div>
    );
  return (
    children ?? (
      <p className="rounded-xl bg-slate-100 px-4 py-10 text-center text-sm text-slate-600">
        {emptyText}
      </p>
    )
  );
}

function SelectionRow({
  icon: Icon,
  title,
  description,
  onSelect,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600 sm:min-h-20 sm:px-5"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="typo-heading-3 block">{title}</strong>
        {description && (
          <span className="typo-body-sm mt-0.5 block text-slate-600">
            {description}
          </span>
        )}
      </span>
      <ChevronRight className="shrink-0 text-blue-700" size={20} />
    </button>
  );
}

export function DocumentTemplateSelection({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (templateId: string, documentType: DocumentType) => void;
}) {
  const query = useQuery({
    queryKey: ["documents", "templates"],
    queryFn: getDocumentTemplates,
  });
  const templates = query.data ?? [];

  return (
    <>
      <PageIntro
        title="Elegí un documento"
        description="Seleccioná el tipo de documento que necesitás generar."
        step="Paso 1 de 3"
      />
      <section className="mt-6 max-w-3xl space-y-2 sm:mt-8">
        <QueryState
          query={query}
          emptyText="Todavía no hay tipos de documento activos para utilizar."
        >
          {templates.length
            ? templates.map((template) => (
                <SelectionRow
                  key={template.id}
                  icon={FileText}
                  title={template.nombre}
                  description={template.descripcion}
                  onSelect={() => onSelect(template.id, template.documentType)}
                />
              ))
            : null}
        </QueryState>
      </section>
      <button
        type="button"
        onClick={onBack}
        className="mt-5 min-h-11 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:mt-8"
      >
        Cancelar
      </button>
    </>
  );
}

export function DocumentVariantSelection({
  templateId,
  onBack,
  onSelect,
}: {
  templateId: string | null;
  onBack: () => void;
  onSelect: (variantId: string) => void;
}) {
  const query = useQuery({
    queryKey: ["documents", "variants", templateId],
    queryFn: () => getDocumentVariants(templateId!),
    enabled: Boolean(templateId),
  });
  const variants = query.data ?? [];
  if (!templateId)
    return (
      <>
        <PageIntro
          title="Elegí una versión"
          description="Primero seleccioná un tipo de documento."
          step="Paso 2 de 3"
        />
        <button
          type="button"
          onClick={onBack}
          className="mt-5 min-h-11 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:mt-8"
        >
          Volver
        </button>
      </>
    );

  return (
    <>
      <PageIntro
        title="Elegí una versión"
        description="Seleccioná la firma que se utilizará en el documento."
        step="Paso 2 de 3"
      />
      <section className="mt-6 max-w-3xl space-y-2 sm:mt-8">
        <QueryState
          query={query}
          emptyText="No hay versiones activas disponibles para este documento."
        >
          {variants.length
            ? variants.map((variant) => (
                <SelectionRow
                  key={variant.id}
                  icon={Pencil}
                  title={variant.nombre}
                  description="Versión activa del documento."
                  onSelect={() => onSelect(variant.id)}
                />
              ))
            : null}
        </QueryState>
      </section>
      <button
        type="button"
        onClick={onBack}
        className="mt-5 min-h-11 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:mt-8"
      >
        Volver
      </button>
    </>
  );
}

export function DocumentForm({
  value,
  onChange,
  onBack,
  onGenerated,
  editing = false,
  title = editing ? "Editar documento" : "Completar datos",
  description = editing
    ? "Modificá los datos y actualizá la vista previa."
    : "Completá los datos necesarios para generar la vista previa.",
  submitLabel = editing ? "Actualizar documento" : "Generar vista previa",
}: {
  value: DocumentFormValues;
  onChange: (value: DocumentFormValues) => void;
  onBack: () => void;
  onGenerated: (document: GeneratedDocument) => void;
  editing?: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
}) {
  const provincesQuery = useQuery({
    queryKey: ["documents", "provinces"],
    queryFn: getProvinces,
  });
  const companiesQuery = useQuery({
    queryKey: ["documents", "companies"],
    queryFn: getDocumentCompanies,
  });
  const delegatesQuery = useQuery({
    queryKey: ["documents", "delegates"],
    queryFn: getDelegates,
  });
  const agreementsQuery = useQuery({
    queryKey: ["documents", "agreements"],
    queryFn: getDocumentAgreements,
  });
  const documentType = value.documentType ?? "PERMISO_GREMIAL";
  const generationFieldsQuery = useQuery({
    queryKey: ["documents", "generation-fields", documentType, value.variantId],
    queryFn: () => getGenerationFields(documentType, value.variantId),
    enabled: Boolean(value.variantId),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generationStage, setGenerationStage] =
    useState<GenerationStage>("idle");
  const [slowGeneration, setSlowGeneration] = useState(false);
  const previousCompanyId = useRef(value.companyId);
  const generationInFlight = useRef(false);
  const revealTimer = useRef<number | null>(null);
  const slowTimer = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const mutation = useMutation({
    mutationFn: generateDocument,
    onSuccess: (document) => {
      generationInFlight.current = false;
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
      setSlowGeneration(false);
      setGenerationStage("revealing");
      revealTimer.current = window.setTimeout(
        () => onGenerated(document),
        reduceMotion ? 0 : 320,
      );
    },
    onError: () => {
      generationInFlight.current = false;
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
      setSlowGeneration(false);
      setGenerationStage("idle");
    },
  });
  const delegate = delegatesQuery.data?.find(
    (item: Delegate) => item.id === value.delegateId,
  );
  const queries = [
    provincesQuery,
    companiesQuery,
    delegatesQuery,
    agreementsQuery,
    generationFieldsQuery,
  ];
  const loading = queries.some((query) => query.isPending);
  const catalogError = queries.find((query) => query.isError);
  const catalogsEmpty =
    !loading &&
    !catalogError &&
    [
      provincesQuery.data,
      companiesQuery.data,
      delegatesQuery.data,
      agreementsQuery.data,
    ].some((items) => !items?.length);
  const disabled =
    loading || Boolean(catalogError) || catalogsEmpty || mutation.isPending;
  const set = (
    field: Exclude<keyof DocumentFormValues, "manualValues">,
    next: string,
  ) => onChange({ ...value, [field]: next });

  useEffect(() => {
    const previousId = previousCompanyId.current;
    previousCompanyId.current = value.companyId;
    const agreementId = agreementAfterCompanyChange(
      companiesQuery.data ?? [],
      previousId,
      value.companyId,
      value.agreementId,
    );
    if (agreementId !== value.agreementId) onChange({ ...value, agreementId });
  }, [companiesQuery.data, onChange, value]);
  useEffect(
    () => () => {
      if (revealTimer.current) window.clearTimeout(revealTimer.current);
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
    },
    [],
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = generationFieldsQuery.data ?? [];
    const baseErrors = requiredGenerationFieldErrors(fields, value);
    if (Object.keys(baseErrors).length) {
      setErrors(baseErrors);
      return;
    }
    if (generationInFlight.current || generationStage !== "idle") return;
    generationInFlight.current = true;
    setErrors({});
    setGenerationStage("submitting");
    setSlowGeneration(false);
    slowTimer.current = window.setTimeout(() => setSlowGeneration(true), 2_500);
    mutation.mutate({
      documentType,
      variantId: value.variantId,
      baseValues: Object.fromEntries(fields.filter((field) => field.sourceType !== "MANUAL").map((field) => [field.inputKey.replace("baseValues.", ""), String(value[field.inputKey.replace("baseValues.", "") as keyof DocumentFormValues] ?? "")])),
      manualValues: value.manualValues,
    });
  };

  const generationMessage =
    mutation.error instanceof ApiError &&
    mutation.error.code === "TEMPLATE_FIELDS_NOT_CONFIGURED"
      ? "Esta variante todavía no está configurada para generar documentos."
      : errorMessage(
          mutation.error,
          "No pudimos generar el documento. Intentá nuevamente.",
        );

  const visibleFields = (generationFieldsQuery.data ?? []).filter((field, index, fields) => fields.findIndex((candidate) => candidate.inputKey === field.inputKey) === index);
  const renderGenerationField = (field: GenerationField) => {
    if (field.sourceType === "MANUAL") return <ManualFieldInput field={field} value={value.manualValues[field.id] ?? ""} error={errors[`manual-${field.id}`]} onChange={(next) => onChange({ ...value, manualValues: { ...value.manualValues, [field.id]: next } })} />;
    const key = field.inputKey.replace("baseValues.", "") as Exclude<keyof DocumentFormValues, "manualValues">;
    const change = (next: string) => set(key, next);
    const fieldValue = value[key] as string;
    if (field.sourceType === "PROVINCE" || field.sourceType === "COMPANY" || field.sourceType === "DELEGATE" || field.sourceType === "AGREEMENT") {
      const options = field.sourceType === "PROVINCE" ? (provincesQuery.data ?? []).map((item) => [item.id, item.name]) : field.sourceType === "COMPANY" ? (companiesQuery.data ?? []).map((item) => [item.id, item.nombre]) : field.sourceType === "DELEGATE" ? (delegatesQuery.data ?? []).map((item) => [item.id, `${item.nombre} ${item.apellido}`]) : (agreementsQuery.data ?? []).map((item) => [item.id, `${item.codigo ? `${item.codigo} — ` : ""}${item.descripcion}`]);
      return <><SelectField label={field.label} value={fieldValue} onChange={change} options={options} placeholder={`Seleccioná ${field.label.toLowerCase()}`} error={errors[key]} />{field.sourceType === "DELEGATE" && <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3"><p className="typo-caption font-semibold uppercase tracking-wide text-slate-500">DNI del delegado</p><p className="mt-1 font-medium text-slate-800">{delegate?.dni ?? "Se completa al seleccionar un delegado"}</p></div>}</>;
    }
    const inputType = field.inputKey.endsWith("issueDate") ? "date" : field.type === "NUMBER" ? "number" : "text";
    return <label className="mt-4 block text-sm font-semibold">{field.label}<input required={field.required} type={inputType} min={key === "permitDay" ? "1" : undefined} max={key === "permitDay" ? "31" : undefined} value={fieldValue} onChange={(event) => change(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />{errors[key] && <span className="mt-1 block text-sm text-rose-700">{errors[key]}</span>}</label>;
  };

  if (generationStage !== "idle") {
    return (
      <>
        <PageIntro
          context={editing ? "Editar documento" : "Nuevo documento"}
          title={title}
          description={description}
          step={editing ? undefined : "Paso 3 de 3"}
        />
        <GenerationState
          stage={generationStage}
          publicNumber={mutation.data?.publicNumber ?? ""}
          slow={slowGeneration}
          reduceMotion={Boolean(reduceMotion)}
        />
      </>
    );
  }

  return (
    <>
      <PageIntro
        context={editing ? "Editar documento" : "Nuevo documento"}
        title={title}
        description={description}
        step={editing ? undefined : "Paso 3 de 3"}
      />
      {mutation.isPending && (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 flex max-w-3xl items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900"
        >
          <LoaderCircle className="animate-spin" size={20} />
          Preparando documento...
        </div>
      )}
      {catalogError && (
        <div
          role="alert"
          className="mt-5 max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {errorMessage(
            catalogError.error,
            "No pudimos cargar los datos del formulario.",
          )}
          <button
            type="button"
            onClick={() => queries.forEach((query) => void query.refetch())}
            className="mt-3 min-h-11 font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      )}
      {catalogsEmpty && (
        <div className="mt-5 max-w-3xl rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-600">
          Faltan datos activos para completar el formulario. Contactá a un
          administrador.
        </div>
      )}
      <form onSubmit={submit} className="mt-6 max-w-3xl">
        <fieldset disabled={disabled} className="disabled:opacity-60">
          <FormSection title="Datos del documento">{visibleFields.map((field) => <div key={field.inputKey}>{renderGenerationField(field)}</div>)}</FormSection>
        </fieldset>
        {mutation.error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {generationMessage}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onBack}
            disabled={mutation.isPending}
            className="min-h-12 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {editing ? "Cancelar edición" : "Volver"}
          </button>
          <button
            type="submit"
            disabled={disabled}
            className="min-h-12 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
          >
            {mutation.isPending && (
              <LoaderCircle className="animate-spin" size={19} />
            )}
            {mutation.isPending ? "Preparando documento..." : submitLabel}
          </button>
        </div>
      </form>
    </>
  );
}

// Compatibility export for callers still naming the current concrete document type.
export const PermisoGremialForm = DocumentForm;

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-slate-200 bg-white px-4 py-5 first:mt-0 sm:px-6">
      <h2 className="typo-eyebrow border-b border-slate-200 pb-3 text-slate-600">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function GenerationState({
  stage,
  publicNumber,
  slow,
  reduceMotion,
}: {
  stage: GenerationStage;
  publicNumber: string;
  slow: boolean;
  reduceMotion: boolean;
}) {
  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 };
  return (
    <motion.section
      initial={hidden}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0.12 : 0.2,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="mt-6 max-w-3xl border border-blue-200 border-l-4 border-l-blue-700 bg-blue-50/70 px-5 py-8 sm:mt-8 sm:px-8 sm:py-10"
      aria-busy={stage === "submitting"}
      aria-labelledby="generation-status-title"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="grid h-12 w-10 shrink-0 place-items-center border border-blue-200 bg-white text-blue-700"
        >
          <FileText size={21} />
        </span>
        <div>
          <p className="typo-eyebrow text-blue-700">Permiso gremial</p>
          {stage === "submitting" ? (
            <>
              <h2
                id="generation-status-title"
                role="status"
                aria-live="polite"
                className="typo-heading-2 mt-2"
              >
                Generando documento
              </h2>
              <p className="typo-body-sm mt-2 text-slate-600">
                Estamos preparando tu permiso con la información ingresada.
              </p>
              {slow && (
                <p className="typo-body-sm mt-4 text-slate-600">
                  Esto puede tardar unos segundos.
                </p>
              )}
            </>
          ) : (
            <>
              <p role="status" aria-live="polite" className="sr-only">
                Documento {publicNumber} generado correctamente.
              </p>
              <h2 id="generation-status-title" className="typo-heading-2 mt-2">
                Documento generado
              </h2>
              <motion.p
                initial={
                  reduceMotion
                    ? { opacity: 1 }
                    : { opacity: 0, y: 6, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: reduceMotion ? 0.12 : 0.32,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="typo-display-lg mt-3 tabular-nums text-blue-900"
              >
                {publicNumber}
              </motion.p>
              <p className="typo-body-sm mt-2 text-slate-600">
                Abriendo la vista previa.
              </p>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}
function FieldMessage({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="typo-body-sm mt-1.5 text-rose-700">
      {message}
    </p>
  ) : null;
}
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
  placeholder: string;
  error?: string;
}) {
  const suggestionsQuery = useQuery({
    queryKey: ["documents", "suggestions"],
    queryFn: getDocumentSuggestions,
    retry: false,
  });
  const category =
    label === "Empresa"
      ? suggestionsQuery.data?.companies
      : label === "Delegado"
        ? suggestionsQuery.data?.delegates
        : label === "Convenio"
          ? suggestionsQuery.data?.agreements
          : undefined;
  const id = `document-${label.toLowerCase().replaceAll(" ", "-")}`;
  const errorId = `${id}-error`;
  return (
    <div className="mt-4 first:mt-0">
      <Label htmlFor={id}>{label}</Label>
      <SuggestionQuickAccess
        category={category}
        options={options}
        onSelect={onChange}
      />
      <Select
        id={id}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="mt-2"
      >
        <option value="">{placeholder}</option>
        {options.map(([optionId, text]) => (
          <option key={optionId} value={optionId}>
            {text}
          </option>
        ))}
      </Select>
      <FieldMessage id={errorId} message={error} />
    </div>
  );
}

function SuggestionQuickAccess({
  category,
  options,
  onSelect,
}: {
  category?: DocumentSuggestionCategory;
  options: string[][];
  onSelect: (id: string) => void;
}) {
  if (!category) return null;
  const available = new Set(options.map(([id]) => id));
  const recent = category.recent.filter((item) => available.has(item.id));
  const frequent = category.frequent.filter((item) => available.has(item.id));
  if (!recent.length && !frequent.length) return null;
  return (
    <div className="mt-3 space-y-2" aria-label="Accesos rápidos">
      <p className="typo-caption text-slate-500">
        {recent.length ? "Usados recientemente" : "Usados con frecuencia"}
      </p>
      <div className="flex flex-wrap gap-2">
        {recent.map((item) => (
          <button
            key={item.id}
            type="button"
            className="min-h-11 rounded-lg border border-blue-200 bg-blue-50 px-3 text-left text-sm font-semibold text-blue-800 hover:border-blue-400"
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
        {!recent.length &&
          frequent.map((item) => (
            <button
              key={item.id}
              type="button"
              className="min-h-11 rounded-lg border border-blue-200 bg-blue-50 px-3 text-left text-sm font-semibold text-blue-800 hover:border-blue-400"
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </button>
          ))}
      </div>
    </div>
  );
}
export function requiredManualFieldErrors(
  fields: ManualField[],
  values: Record<string, string>,
) {
  return Object.fromEntries(
    fields
      .filter((field) => field.required && !values[field.id]?.trim())
      .map((field) => [`manual-${field.id}`, `${field.label} es obligatorio.`]),
  );
}

export function requiredGenerationFieldErrors(fields: GenerationField[], values: DocumentFormValues) {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    if (field.sourceType === 'MANUAL') {
      if (field.required && !values.manualValues[field.id]?.trim()) errors[`manual-${field.id}`] = `${field.label} es obligatorio.`
      continue
    }
    const key = field.inputKey.replace('baseValues.', '') as keyof DocumentFormValues
    const fieldValue = values[key]
    if (field.required && (!fieldValue || typeof fieldValue !== 'string' || !fieldValue.trim())) errors[key] = `${field.label} es obligatorio.`
    if (key === 'permitDay' && fieldValue && (Number(fieldValue) < 1 || Number(fieldValue) > 31 || !Number.isInteger(Number(fieldValue)))) errors[key] = 'El día debe estar entre 1 y 31.'
  }
  if (!values.variantId) errors.variantId = 'Seleccioná una versión del documento.'
  return errors
}

export function requiredBaseFieldErrors(
  fields: readonly {
    key: keyof DocumentFormValues;
    label: string;
    input: string;
    required: boolean;
  }[],
  values: DocumentFormValues,
) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.key];
    if (
      field.required &&
      (!value || typeof value !== "string" || !value.trim())
    )
      errors[field.key] = `${field.label} es obligatorio.`;
    if (
      field.key === "issueDate" &&
      value &&
      typeof value === "string" &&
      Number.isNaN(Date.parse(value))
    )
      errors[field.key] = "La fecha de emisión no es válida.";
    if (
      field.key === "permitDay" &&
      value &&
      (Number(value) < 1 ||
        Number(value) > 31 ||
        !Number.isInteger(Number(value)))
    )
      errors[field.key] = "El día debe estar entre 1 y 31.";
  }
  if (!values.variantId)
    errors.variantId = "Seleccioná una versión del documento.";
  return errors;
}

export function ManualFieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: ManualField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = `manual-${field.id}`;
  const errorId = `${id}-error`;
  const type =
    field.type === "NUMBER"
      ? "number"
      : field.type === "DATE"
        ? "date"
        : "text";
  return (
    <div className="mt-4 first:mt-0">
      <Label htmlFor={id}>{field.label}</Label>
      <Input
        id={id}
        required={field.required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="mt-2"
      />
      <FieldMessage id={errorId} message={error} />
    </div>
  );
}

export function PdfPreview({
  pdf,
  filename = "",
  onEdit,
  onHome,
  postGenerationAction,
}: {
  pdf: Blob | null;
  filename?: string;
  onEdit: () => void;
  onHome: () => void;
  postGenerationAction?: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const printCleanup = useRef<(() => void) | null>(null);
  const [fitWidth, setFitWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const updateWidth = () =>
      setFitWidth(Math.max(0, Math.floor(element.clientWidth - 16)));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setZoom(1);
    setPageCount(0);
    setPreviewError("");
  }, [pdf]);
  useEffect(() => () => printCleanup.current?.(), []);

  const pageWidth = Math.floor(fitWidth * zoom);
  const changeZoom = (amount: number) =>
    setZoom((current) =>
      Math.min(2.5, Math.max(0.5, Number((current + amount).toFixed(2)))),
    );
  const download = () => {
    if (pdf && filename) downloadDocument(pdf, filename);
  };
  const print = () => {
    if (pdf) {
      printCleanup.current?.();
      printCleanup.current = printDocument(pdf);
    }
  };

  return (
    <>
      <PageIntro
        context="Documento generado"
        title="Vista previa"
        description="Revisá el documento antes de finalizar."
      />
      {previewError ? (
        <p
          role="alert"
          className="mt-5 max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {previewError}
        </p>
      ) : (
        <section
          ref={host}
          className="mt-5 max-w-3xl min-w-0 overflow-auto overscroll-contain rounded-2xl border border-slate-300 bg-slate-200 p-2 sm:mt-7 sm:p-4"
          style={{ maxHeight: "min(62dvh, 720px)", touchAction: "pan-x pan-y" }}
        >
          <div className="mx-auto w-max">
            <Document
              file={pdf}
              loading={
                <p className="p-8 text-center text-sm text-slate-600">
                  Cargando vista previa...
                </p>
              }
              error={
                <p className="p-8 text-center text-sm text-rose-800">
                  No pudimos visualizar el PDF generado.
                </p>
              }
              onLoadSuccess={({ numPages }) => {
                setPageCount(numPages);
                setPreviewError("");
              }}
              onLoadError={() =>
                setPreviewError("No pudimos visualizar el PDF generado.")
              }
            >
              {Array.from({ length: pageCount }, (_, index) => (
                <Page
                  key={index + 1}
                  pageNumber={index + 1}
                  width={pageWidth || undefined}
                  renderTextLayer={false}
                  className="mb-3 last:mb-0 shadow-lg"
                />
              ))}
            </Document>
          </div>
        </section>
      )}
      <section className="mt-3 max-w-3xl rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeZoom(-0.25)}
              disabled={zoom <= 0.5}
              aria-label="Alejar"
              className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <ZoomOut size={19} />
            </button>
            <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => changeZoom(0.25)}
              disabled={zoom >= 2.5}
              aria-label="Acercar"
              className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <ZoomIn size={19} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              disabled={zoom === 1}
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Ajustar
            </button>
          </div>
          <span className="px-2 typo-caption text-slate-500">
            {pageCount
              ? `${pageCount} ${pageCount === 1 ? "página" : "páginas"}`
              : "Preparando vista previa..."}
          </span>
        </div>
        <ActionGroup aria-label="Acciones del documento" className="mt-3">
          <ActionGroupItem>
            <button
              type="button"
              onClick={download}
              disabled={!pdf}
              className="flex min-h-12 w-full items-center justify-center gap-2 bg-blue-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={19} /> Descargar PDF
            </button>
          </ActionGroupItem>
          <ActionGroupItem>
            <button
              type="button"
              onClick={print}
              disabled={!pdf}
              className="flex min-h-12 w-full items-center justify-center gap-2 px-5 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={19} /> Imprimir
            </button>
          </ActionGroupItem>
          <ActionGroupItem>
            <button
              type="button"
              onClick={onEdit}
              className="min-h-12 w-full px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Editar documento
            </button>
          </ActionGroupItem>
          <ActionGroupItem>
            <button
              type="button"
              onClick={onHome}
              className="min-h-12 w-full px-5 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              Finalizar y volver al inicio
            </button>
          </ActionGroupItem>
          {postGenerationAction && (
            <ActionGroupItem>{postGenerationAction}</ActionGroupItem>
          )}
        </ActionGroup>
      </section>
    </>
  );
}
