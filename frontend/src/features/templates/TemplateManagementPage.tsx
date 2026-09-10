import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AdminConfirmation,
  AdminEmptyState,
  AdminHeader,
  AdminNotice,
  AdminOverlay,
} from "@/features/admin/AdminOverlay";
import { ApiError } from "@/lib/api";
import {
  createTemplate,
  createVariant,
  getTemplateFields,
  getTemplates,
  getVariants,
  replaceVariantFile,
  setTemplateActive,
  setVariantActive,
  updateTemplate,
  updateVariant,
} from "./templatesApi";
import type {
  Template,
  TemplateForm,
  TemplateVariant,
  VariantForm,
} from "./types";

const emptyTemplate: TemplateForm = {
  nombre: "",
  descripcion: "",
  documentType: "PERMISO_GREMIAL",
};
const emptyVariant: VariantForm = { nombre: "", archivoPdf: null };
export const configureFieldsLabel = "Configurar campos";
const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "No pudimos completar la operacion. Intenta nuevamente.";

export function variantConfigurationStatus(
  variant: TemplateVariant,
  fieldCount: number | undefined,
) {
  if (variant.legacyPositioned) return "Configuración heredada";
  if (fieldCount && fieldCount > 0) return "Campos configurados";
  return "Campos sin configurar";
}

type Confirmation = {
  title: string;
  message: string;
  actionLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function TemplateManagementPage({
  onConfigureFields,
  initialTemplateId,
}: {
  onConfigureFields: (templateId: string, variant: TemplateVariant) => void;
  initialTemplateId?: string;
}) {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Template | null>(null);
  const [templateEditor, setTemplateEditor] = useState<
    "create" | "edit" | null
  >(null);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplate);
  const [variantEditor, setVariantEditor] = useState<
    "create" | TemplateVariant | null
  >(null);
  const [variantForm, setVariantForm] = useState<VariantForm>(emptyVariant);
  const [templateActions, setTemplateActions] = useState(false);
  const [variantActions, setVariantActions] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [configurationPrompt, setConfigurationPrompt] =
    useState<TemplateVariant | null>(null);
  const [feedback, setFeedback] = useState("");
  const appliedInitial = useRef(false);
  const templatesQuery = useQuery({
    queryKey: ["templates", search],
    queryFn: () => getTemplates(search),
  });
  const variantsQuery = useQuery({
    queryKey: ["template-variants", selected?.id],
    queryFn: () => getVariants(selected!.id),
    enabled: Boolean(selected),
  });
  const refreshTemplates = () =>
    void client.invalidateQueries({ queryKey: ["templates"] });
  const refreshVariants = () =>
    void client.invalidateQueries({
      queryKey: ["template-variants", selected?.id],
    });

  useEffect(() => {
    if (!appliedInitial.current && initialTemplateId && templatesQuery.data) {
      const initial = templatesQuery.data.find(
        (template) => template.id === initialTemplateId,
      );
      if (initial) setSelected(initial);
      appliedInitial.current = true;
    }
  }, [initialTemplateId, templatesQuery.data]);

  const templateMutation = useMutation({
    mutationFn: () =>
      templateEditor === "edit" && selected
        ? updateTemplate(selected.id, templateForm)
        : createTemplate(templateForm),
    onSuccess: (template) => {
      setFeedback(
        templateEditor === "edit"
          ? "Plantilla actualizada correctamente."
          : "Plantilla creada correctamente.",
      );
      setSelected(template);
      setTemplateForm(emptyTemplate);
      setTemplateEditor(null);
      refreshTemplates();
    },
  });
  const templateActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setTemplateActive(id, active),
    onSuccess: (_, values) => {
      if (selected?.id === values.id)
        setSelected({ ...selected, active: values.active });
      setConfirmation(null);
      setFeedback(
        values.active
          ? "Plantilla activada correctamente."
          : "Plantilla desactivada correctamente.",
      );
      refreshTemplates();
    },
  });
  const variantMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No hay una plantilla seleccionada.");
      if (variantEditor && variantEditor !== "create")
        return updateVariant(selected.id, variantEditor.id, variantForm.nombre);
      if (!variantForm.archivoPdf)
        throw new Error("Selecciona un archivo PDF.");
      return createVariant(
        selected.id,
        variantForm.nombre,
        variantForm.archivoPdf,
      );
    },
    onSuccess: (variant) => {
      const created = variantEditor === "create";
      setFeedback(
        created
          ? "PDF cargado correctamente."
          : "Variante actualizada correctamente.",
      );
      setVariantForm(emptyVariant);
      setVariantEditor(null);
      refreshVariants();
      if (created) setConfigurationPrompt(variant);
    },
  });
  const replaceMutation = useMutation({
    mutationFn: ({ variantId, file }: { variantId: string; file: File }) =>
      replaceVariantFile(selected!.id, variantId, file),
    onSuccess: (variant) => {
      setConfirmation(null);
      setFeedback(
        "PDF reemplazado correctamente. Configura nuevamente sus campos.",
      );
      refreshVariants();
      setConfigurationPrompt(variant);
    },
  });
  const variantActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setVariantActive(selected!.id, id, active),
    onSuccess: (_, values) => {
      setConfirmation(null);
      setFeedback(
        values.active
          ? "Variante activada correctamente."
          : "Variante desactivada correctamente.",
      );
      refreshVariants();
    },
  });
  const mutationError =
    templateMutation.error ??
    templateActiveMutation.error ??
    variantMutation.error ??
    replaceMutation.error ??
    variantActiveMutation.error;
  const pendingConfirmation =
    templateActiveMutation.isPending ||
    variantActiveMutation.isPending ||
    replaceMutation.isPending;
  const chooseTemplate = (template: Template) => {
    setSelected(template);
    setTemplateActions(false);
    setVariantActions(null);
  };
  const openTemplateEditor = (mode: "create" | "edit") => {
    setTemplateForm(
      mode === "edit" && selected
        ? {
            nombre: selected.nombre,
            descripcion: selected.descripcion,
            documentType: selected.documentType,
          }
        : emptyTemplate,
    );
    setTemplateActions(false);
    setTemplateEditor(mode);
  };
  const openVariantEditor = (variant: "create" | TemplateVariant) => {
    setVariantActions(null);
    setVariantForm(
      variant === "create"
        ? emptyVariant
        : { nombre: variant.nombre, archivoPdf: null },
    );
    setVariantEditor(variant);
  };
  const requestReplace = (variant: TemplateVariant, file: File | null) => {
    if (!file || replaceMutation.isPending) return;
    setVariantActions(null);
    setConfirmation({
      title: "Reemplazar PDF",
      message: `El PDF de ${variant.nombre} sera reemplazado y deberas configurar nuevamente sus campos.`,
      actionLabel: "Reemplazar PDF",
      onConfirm: () => replaceMutation.mutate({ variantId: variant.id, file }),
    });
  };

  return (
    <section className="max-w-6xl">
      <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-8">
        <section className={selected ? "hidden lg:block" : ""}>
          <AdminHeader
            title="Plantillas"
            description="Selecciona un tipo de documento para gestionar sus plantillas."
            newLabel="Nueva plantilla"
            onCreate={() => openTemplateEditor("create")}
          />
          <TemplateList
            search={search}
            onSearch={setSearch}
            query={templatesQuery}
            selectedId={selected?.id}
            onSelect={chooseTemplate}
            onCreate={() => openTemplateEditor("create")}
          />
        </section>
        <section
          className={`mt-5 lg:mt-0 ${selected ? "" : "hidden lg:block"}`}
        >
          {selected ? (
            <TemplateDetail
              template={selected}
              variantsQuery={variantsQuery}
              templateActions={templateActions}
              variantActions={variantActions}
              onBack={() => setSelected(null)}
              onToggleTemplate={() =>
                setConfirmation({
                  title: `${selected.active ? "Desactivar" : "Activar"} plantilla`,
                  message: `Quieres ${selected.active ? "desactivar" : "activar"} la plantilla ${selected.nombre}?`,
                  actionLabel: selected.active
                    ? "Desactivar plantilla"
                    : "Activar plantilla",
                  destructive: selected.active,
                  onConfirm: () =>
                    templateActiveMutation.mutate({
                      id: selected.id,
                      active: !selected.active,
                    }),
                })
              }
              onToggleTemplateActions={() =>
                setTemplateActions(!templateActions)
              }
              onEditTemplate={() => openTemplateEditor("edit")}
              onCreateVariant={() => openVariantEditor("create")}
              onConfigure={(variant) => onConfigureFields(selected.id, variant)}
              onVariantActions={setVariantActions}
              onEditVariant={openVariantEditor}
              onToggleVariant={(variant) =>
                setConfirmation({
                  title: `${variant.active ? "Desactivar" : "Activar"} variante`,
                  message: `Quieres ${variant.active ? "desactivar" : "activar"} la variante ${variant.nombre}?`,
                  actionLabel: variant.active
                    ? "Desactivar variante"
                    : "Activar variante",
                  destructive: variant.active,
                  onConfirm: () =>
                    variantActiveMutation.mutate({
                      id: variant.id,
                      active: !variant.active,
                    }),
                })
              }
              onReplace={requestReplace}
            />
          ) : (
            <div className="hidden lg:block pt-24 text-center text-sm text-slate-500">
              Selecciona un tipo de documento para ver sus plantillas.
            </div>
          )}
        </section>
      </div>
      {feedback && <AdminNotice kind="success">{feedback}</AdminNotice>}
      {mutationError && (
        <AdminNotice kind="error">{errorMessage(mutationError)}</AdminNotice>
      )}
      {templateEditor && (
        <TemplateEditor
          mode={templateEditor}
          value={templateForm}
          pending={templateMutation.isPending}
          onChange={setTemplateForm}
          onClose={() => setTemplateEditor(null)}
          onSubmit={() => templateMutation.mutate()}
        />
      )}
      {variantEditor && (
        <VariantEditor
          variant={variantEditor}
          value={variantForm}
          pending={variantMutation.isPending}
          onChange={setVariantForm}
          onClose={() => setVariantEditor(null)}
          onSubmit={() => variantMutation.mutate()}
        />
      )}
      {configurationPrompt && (
        <AdminConfirmation
          title="Configurar campos"
          message={`El PDF de ${configurationPrompt.nombre} ya esta cargado. Configura los campos antes de usarlo.`}
          actionLabel="Configurar campos"
          pending={false}
          onCancel={() => setConfigurationPrompt(null)}
          onConfirm={() => {
            const variant = configurationPrompt;
            setConfigurationPrompt(null);
            onConfigureFields(selected!.id, variant);
          }}
        />
      )}
      {confirmation && (
        <AdminConfirmation
          {...confirmation}
          pending={pendingConfirmation}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </section>
  );
}

function TemplateList({
  search,
  onSearch,
  query,
  selectedId,
  onSelect,
  onCreate,
}: {
  search: string;
  onSearch: (value: string) => void;
  query: ReturnType<typeof useQuery<Template[]>>;
  selectedId?: string;
  onSelect: (template: Template) => void;
  onCreate: () => void;
}) {
  return (
    <section className="mt-5 lg:mt-0">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        <div>
          <div>
            <h2 className="font-semibold">Tipos de documento</h2>
            <p className="mt-1 text-sm text-slate-500">
              {query.data?.length ?? 0} tipos
            </p>
          </div>
        </div>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar tipo"
          aria-label="Buscar tipo"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      {query.isLoading && (
        <p className="py-10 text-center text-sm text-slate-500">
          Cargando plantillas...
        </p>
      )}
      {query.isError && (
        <AdminNotice kind="error">
          {errorMessage(query.error)}{" "}
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="font-semibold underline"
          >
            Reintentar
          </button>
        </AdminNotice>
      )}
      {!query.isLoading && query.data?.length === 0 && (
        <AdminEmptyState actionLabel="Crear plantilla" onAction={onCreate}>
          Todavia no hay plantillas.
        </AdminEmptyState>
      )}
      <div className="divide-y divide-slate-200">
        {query.data?.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={`flex min-h-20 w-full items-center gap-3 py-4 text-left ${selectedId === template.id ? "bg-blue-50 px-3 text-blue-950" : "hover:bg-slate-100"}`}
          >
            <span className="min-w-0 flex-1">
              <strong className="block truncate">{template.nombre}</strong>
              <span className="mt-1 block truncate text-sm text-slate-600">
                {template.descripcion}
              </span>
            </span>
            <ChevronRight className="shrink-0 text-slate-400" size={20} />
          </button>
        ))}
      </div>
    </section>
  );
}

function TemplateDetail({
  template,
  variantsQuery,
  templateActions,
  variantActions,
  onBack,
  onToggleTemplate,
  onToggleTemplateActions,
  onEditTemplate,
  onCreateVariant,
  onConfigure,
  onVariantActions,
  onEditVariant,
  onToggleVariant,
  onReplace,
}: {
  template: Template;
  variantsQuery: ReturnType<typeof useQuery<TemplateVariant[]>>;
  templateActions: boolean;
  variantActions: string | null;
  onBack: () => void;
  onToggleTemplate: () => void;
  onToggleTemplateActions: () => void;
  onEditTemplate: () => void;
  onCreateVariant: () => void;
  onConfigure: (variant: TemplateVariant) => void;
  onVariantActions: (id: string | null) => void;
  onEditVariant: (variant: TemplateVariant) => void;
  onToggleVariant: (variant: TemplateVariant) => void;
  onReplace: (variant: TemplateVariant, file: File | null) => void;
}) {
  return (
    <>
      <header className="border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 min-h-11 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 lg:hidden"
        >
          Volver a plantillas
        </button>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          Detalle de plantilla
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {template.nombre}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {template.documentType === "PERMISO_GREMIAL"
                ? "Permiso Gremial"
                : template.documentType}
            </p>
          </div>
          <Status active={template.active} />
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleTemplateActions}
            className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50"
          >
            Acciones
          </button>
          <button
            type="button"
            onClick={onCreateVariant}
            className="min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + Nueva variante
          </button>
          {templateActions && (
            <div className="absolute left-0 top-11 z-10 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <button
                type="button"
                onClick={onEditTemplate}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-100"
              >
                Editar plantilla
              </button>
              <button
                type="button"
                onClick={onToggleTemplate}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-100 ${template.active ? "text-rose-700" : "text-emerald-700"}`}
              >
                {template.active ? "Desactivar plantilla" : "Activar plantilla"}
              </button>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          PDFs disponibles para esta plantilla.
        </p>
      </header>
      <section className="mt-5">
        <h2 className="text-lg font-semibold">Variantes</h2>
        {variantsQuery.isLoading && (
          <p className="py-10 text-center text-sm text-slate-500">
            Cargando variantes...
          </p>
        )}
        {variantsQuery.isError && (
          <AdminNotice kind="error">
            {errorMessage(variantsQuery.error)}{" "}
            <button
              type="button"
              onClick={() => void variantsQuery.refetch()}
              className="font-semibold underline"
            >
              Reintentar
            </button>
          </AdminNotice>
        )}
        {!variantsQuery.isLoading && variantsQuery.data?.length === 0 && (
          <AdminEmptyState
            actionLabel="Nueva variante"
            onAction={onCreateVariant}
          >
            Todavia no hay PDFs para esta plantilla.
          </AdminEmptyState>
        )}
        <div className="divide-y divide-slate-200">
          {variantsQuery.data?.map((variant) => (
            <VariantRow
              key={variant.id}
              templateId={template.id}
              variant={variant}
              actionsOpen={variantActions === variant.id}
              onConfigure={() => onConfigure(variant)}
              onActions={() =>
                onVariantActions(
                  variantActions === variant.id ? null : variant.id,
                )
              }
              onEdit={() => onEditVariant(variant)}
              onToggle={() => onToggleVariant(variant)}
              onReplace={onReplace}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function VariantRow({
  templateId,
  variant,
  actionsOpen,
  onConfigure,
  onActions,
  onEdit,
  onToggle,
  onReplace,
}: {
  templateId: string;
  variant: TemplateVariant;
  actionsOpen: boolean;
  onConfigure: () => void;
  onActions: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onReplace: (variant: TemplateVariant, file: File | null) => void;
}) {
  const fieldsQuery = useQuery({
    queryKey: ["template-fields", variant.id],
    queryFn: () => getTemplateFields(templateId, variant.id),
  });
  const status = fieldsQuery.isError
    ? "No se pudo verificar la configuracion"
    : fieldsQuery.isPending
      ? "Verificando configuracion..."
      : variantConfigurationStatus(variant, fieldsQuery.data?.length);
  return (
    <article className="relative py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{variant.nombre}</h3>
          <p
            className={`mt-1 text-sm ${status === "Campos sin configurar" || fieldsQuery.isError ? "text-amber-800" : "text-slate-600"}`}
          >
            {status}
          </p>
          {fieldsQuery.isError && (
            <button
              type="button"
              onClick={() => void fieldsQuery.refetch()}
              className="mt-1 text-sm font-semibold text-blue-700 underline"
            >
              Reintentar
            </button>
          )}
          <Status active={variant.active} />
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onConfigure}
            className="min-h-11 rounded-xl bg-blue-700 px-3 text-sm font-semibold text-white"
          >
            {configureFieldsLabel}
          </button>
          <button
            type="button"
            onClick={onActions}
            aria-label={`Acciones para ${variant.nombre}`}
            className="grid h-11 w-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>
      {actionsOpen && (
        <div className="absolute right-0 top-16 z-10 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={onEdit}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-100"
          >
            Editar variante
          </button>
          <label className="block cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-slate-100">
            Reemplazar PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) =>
                onReplace(variant, event.target.files?.[0] ?? null)
              }
            />
          </label>
          <button
            type="button"
            onClick={onToggle}
            className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-100 ${variant.active ? "text-rose-700" : "text-emerald-700"}`}
          >
            {variant.active ? "Desactivar variante" : "Activar variante"}
          </button>
        </div>
      )}
    </article>
  );
}

function TemplateEditor({
  mode,
  value,
  pending,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  value: TemplateForm;
  pending: boolean;
  onChange: (value: TemplateForm) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <AdminOverlay
      title={mode === "create" ? "Nueva plantilla" : "Editar plantilla"}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mt-5 space-y-4"
      >
        <label className="block text-sm font-semibold">
          Nombre
          <input
            required
            maxLength={200}
            value={value.nombre}
            onChange={(event) =>
              onChange({ ...value, nombre: event.target.value })
            }
            className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block text-sm font-semibold">
          Descripcion
          <textarea
            required
            maxLength={1000}
            value={value.descripcion}
            onChange={(event) =>
              onChange({ ...value, descripcion: event.target.value })
            }
            className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Tipo de documento: Permiso Gremial
        </p>
        <FormActions pending={pending} onClose={onClose} />
      </form>
    </AdminOverlay>
  );
}
function VariantEditor({
  variant,
  value,
  pending,
  onChange,
  onClose,
  onSubmit,
}: {
  variant: "create" | TemplateVariant;
  value: VariantForm;
  pending: boolean;
  onChange: (value: VariantForm) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const creating = variant === "create";
  return (
    <AdminOverlay
      title={creating ? "Nueva variante" : "Editar variante"}
      description={
        creating ? "Carga un PDF para crear una nueva variante." : undefined
      }
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mt-5 space-y-4"
      >
        <label className="block text-sm font-semibold">
          Nombre
          <input
            required
            maxLength={200}
            value={value.nombre}
            onChange={(event) =>
              onChange({ ...value, nombre: event.target.value })
            }
            className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {creating && (
          <label className="block text-sm font-semibold">
            Archivo PDF
            <input
              required
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) =>
                onChange({
                  ...value,
                  archivoPdf: event.target.files?.[0] ?? null,
                })
              }
              className="mt-2 block w-full text-sm"
            />
          </label>
        )}
        <FormActions pending={pending} onClose={onClose} />
      </form>
    </AdminOverlay>
  );
}
function FormActions({
  pending,
  onClose,
}: {
  pending: boolean;
  onClose: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
      >
        Cancelar
      </button>
      <button
        disabled={pending}
        className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}
function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`mt-2 inline-block shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
    >
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}
