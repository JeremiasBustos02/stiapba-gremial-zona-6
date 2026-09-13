import { useQuery } from "@tanstack/react-query";
import { Download, Eye, LoaderCircle, Search } from "lucide-react";
import {
  cloneElement,
  isValidElement,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadDocument } from "./documentActions";
import { agreementForCompany } from "./companyAgreement";
import {
  downloadPermisoGremialBatch,
  generateDocumentBatch,
  getDelegates,
  getDocumentAgreements,
  getDocumentCompanies,
  getDocumentTemplates,
  getDocumentVariants,
  getGenerationFields,
  getProvinces,
  regenerateDocument,
  type BatchDocumentResult,
  type GenerationField,
} from "./documentsApi";
import type { DocumentType } from "@/features/templates/types";
import { filenameFromHeaders } from "./documentsApi";
import {
  ManualFieldInput,
  PdfPreview,
} from "./DocumentFlow";

export function BulkDocumentPage({ onBack }: { onBack: () => void }) {
  const [templateId, setTemplateId] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [variantId, setVariantId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [agreementId, setAgreementId] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [permitDay, setPermitDay] = useState("");
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});
  const [delegateIds, setDelegateIds] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<BatchDocumentResult | null>(null);
  const [viewing, setViewing] = useState<{
    blob: Blob;
    filename: string;
    publicNumber: string;
  } | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const generationInFlight = useRef(false);
  const downloadInFlight = useRef(false);
  const templates = useQuery({
    queryKey: ["documents", "templates"],
    queryFn: getDocumentTemplates,
  });
  const variants = useQuery({
    queryKey: ["documents", "bulk-variants", templateId],
    queryFn: () => getDocumentVariants(templateId),
    enabled: Boolean(templateId),
  });
  const generationFields = useQuery({
    queryKey: ["documents", "bulk-generation-fields", documentType, variantId],
    queryFn: () => getGenerationFields(documentType!, variantId),
    enabled: Boolean(documentType && variantId),
  });
  const provinces = useQuery({
    queryKey: ["documents", "provinces"],
    queryFn: getProvinces,
  });
  const companies = useQuery({
    queryKey: ["documents", "companies"],
    queryFn: getDocumentCompanies,
  });
  const agreements = useQuery({
    queryKey: ["documents", "agreements"],
    queryFn: getDocumentAgreements,
  });
  const delegates = useQuery({
    queryKey: ["documents", "delegates"],
    queryFn: getDelegates,
  });
  const loading = [
    templates,
    provinces,
    companies,
    agreements,
    delegates,
    ...(templateId ? [variants] : []),
  ].some((query) => query.isPending);
  const failed = [
    templates,
    provinces,
    companies,
    agreements,
    delegates,
    ...(templateId ? [variants] : []),
    ...(variantId ? [generationFields] : []),
  ].some((query) => query.isError);
  const commonValues: Record<string, string> = { provinceId, companyId, agreementId, issueDate, permitDay };
  const visibleFields = (generationFields.data ?? []).filter((field, index, fields) => field.sourceType !== "DELEGATE" && fields.findIndex((candidate) => candidate.inputKey === field.inputKey) === index);
  const baseFieldsComplete = visibleFields.every((field) => field.sourceType === "MANUAL" ? !field.required || Boolean(manualValues[field.id]?.trim()) : !field.required || Boolean(commonValues[field.inputKey.replace("baseValues.", "")]?.trim()));
  const valid = Boolean(
    documentType &&
    variantId &&
    baseFieldsComplete &&
    delegateIds.length > 0 &&
    !generationFields.isPending &&
    !generationFields.isError,
  );
  const setCommonValue = (key: string, next: string) => {
    if (key === "companyId") {
      setCompanyId(next);
      setAgreementId(agreementForCompany(companies.data ?? [], next, agreementId));
      return;
    }
    if (key === "provinceId") setProvinceId(next);
    if (key === "agreementId") setAgreementId(next);
    if (key === "issueDate") setIssueDate(next);
    if (key === "permitDay") setPermitDay(next);
  };
  const renderCommonField = (field: GenerationField) => {
    if (field.sourceType === "MANUAL") return <ManualFieldInput field={field} value={manualValues[field.id] ?? ""} error={manualErrors[`manual-${field.id}`]} onChange={(next) => setManualValues((values) => ({ ...values, [field.id]: next }))} />;
    const key = field.inputKey.replace("baseValues.", "");
    const fieldValue = commonValues[key] ?? "";
    if (["PROVINCE", "COMPANY", "AGREEMENT"].includes(field.sourceType)) {
      const options = field.sourceType === "PROVINCE" ? (provinces.data ?? []).map((item) => [item.id, item.name]) : field.sourceType === "COMPANY" ? (companies.data ?? []).map((item) => [item.id, item.nombre]) : (agreements.data ?? []).map((item) => [item.id, `${item.codigo} - ${item.descripcion}`]);
      return <Field label={field.label}><select value={fieldValue} onChange={(event) => setCommonValue(key, event.target.value)}><option value="">{`Seleccioná ${field.label.toLowerCase()}`}</option>{options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>;
    }
    return <Field label={field.label}><Input type={key === "issueDate" ? "date" : field.type === "NUMBER" ? "number" : "text"} min={key === "permitDay" ? "1" : undefined} max={key === "permitDay" ? "31" : undefined} value={fieldValue} onChange={(event) => setCommonValue(key, event.target.value)} /></Field>;
  };
  const toggle = (id: string) =>
    setDelegateIds((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  const generate = async () => {
    if (generationInFlight.current) return;
    const nextManualErrors = Object.fromEntries((generationFields.data ?? []).filter((field) => field.sourceType === "MANUAL" && field.required && !manualValues[field.id]?.trim()).map((field) => [`manual-${field.id}`, `${field.label} es obligatorio.`]));
    if (Object.keys(nextManualErrors).length) {
      setManualErrors(nextManualErrors);
      setConfirming(false);
      return;
    }
    generationInFlight.current = true;
    setPending(true);
    setError("");
    try {
      setResult(
        await generateDocumentBatch({
          documentType: documentType!,
          variantId,
          baseValues: Object.fromEntries((generationFields.data ?? []).filter((field) => field.sourceType !== "MANUAL" && field.sourceType !== "DELEGATE").map((field) => [field.inputKey.replace("baseValues.", ""), commonValues[field.inputKey.replace("baseValues.", "")] ?? ""])),
          manualValues,
          delegateIds,
        }),
      );
      setConfirming(false);
    } catch {
      setError(
        "No pudimos generar los permisos. Revisá los datos e intentá nuevamente.",
      );
    } finally {
      generationInFlight.current = false;
      setPending(false);
    }
  };
  const downloadOne = async (id: string) => {
    if (downloadInFlight.current) return;
    downloadInFlight.current = true;
    try {
      const file = await regenerateDocument(id);
      downloadDocument(
        file.blob,
        filenameFromHeaders(file.headers) || "permiso-gremial.pdf",
      );
    } catch {
      setError("No pudimos descargar el permiso.");
    } finally {
      downloadInFlight.current = false;
    }
  };
  const viewOne = async (id: string) => {
    setViewingId(id);
    setError("");
    try {
      const file = await regenerateDocument(id);
      const item = result?.items.find((entry) => entry.documentId === id);
      setViewing({
        blob: file.blob,
        filename:
          filenameFromHeaders(file.headers) ||
          item?.filename ||
          "permiso-gremial.pdf",
        publicNumber: item?.publicNumber || "",
      });
    } catch {
      setError("No pudimos abrir el permiso.");
    } finally {
      setViewingId(null);
    }
  };
  const downloadAll = async () => {
    if (downloadInFlight.current) return;
    downloadInFlight.current = true;
    const ids =
      result?.items.flatMap((item) =>
        item.status === "SUCCESS" && item.documentId ? [item.documentId] : [],
      ) ?? [];
    try {
      const archive = await downloadPermisoGremialBatch(ids);
      downloadDocument(
        archive.blob,
        filenameFromHeaders(archive.headers) || "permisos.zip",
      );
    } catch {
      setError("No pudimos preparar el archivo ZIP.");
    } finally {
      downloadInFlight.current = false;
    }
  };
  const visibleDelegates =
    delegates.data?.filter((delegate) =>
      `${delegate.nombre} ${delegate.apellido} ${delegate.dni}`
        .toLowerCase()
        .includes(filter.toLowerCase()),
    ) ?? [];
  if (viewing)
    return (
      <div className="preview-action-flow">
        <p className="typo-display-lg max-w-3xl tabular-nums text-blue-900">
          {viewing.publicNumber}
        </p>
        <PdfPreview
          pdf={viewing.blob}
          filename={viewing.filename}
          onEdit={() => setViewing(null)}
          onHome={onBack}
        />
      </div>
    );
  if (result)
    return (
      <BulkResult
        result={result}
        onBack={onBack}
        onDownloadOne={downloadOne}
        onViewOne={viewOne}
        viewingId={viewingId}
        onDownloadAll={() => void downloadAll()}
        error={error}
      />
    );
  return (
    <section className="max-w-5xl">
      <header className="border-b border-slate-200 pb-6">
        <p className="typo-eyebrow text-blue-700">PERMISOS GREMIALES</p>
        <h1 className="typo-display-xl mt-2 uppercase">
          Generar varios permisos
        </h1>
        <p className="typo-body-sm mt-3 max-w-xl text-slate-600">
          Completá los datos comunes y seleccioná los delegados para generar un
          Permiso Gremial para cada uno.
        </p>
      </header>
      {loading ? (
        <p className="mt-8 text-sm text-slate-600">
          <LoaderCircle className="mr-2 inline animate-spin" size={17} />
          Cargando datos...
        </p>
      ) : failed ? (
        <p
          role="alert"
          className="mt-8 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          No pudimos cargar los datos necesarios.
        </p>
      ) : (
        <>
          <fieldset
            disabled={pending}
            aria-busy={pending}
            className="mt-8 space-y-8"
          >
            <FormSection title="Datos comunes">
              <Field label="Plantilla">
                <select
                  value={templateId}
                  onChange={(event) => {
                    setTemplateId(event.target.value);
                    setDocumentType(templates.data?.find((template) => template.id === event.target.value)?.documentType ?? null);
                    setVariantId("");
                    setProvinceId("");
                    setCompanyId("");
                    setAgreementId("");
                    setPermitDay("");
                    setManualValues({});
                    setManualErrors({});
                  }}
                >
                  <option value="">Seleccioná una plantilla</option>
                  {templates.data?.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.nombre}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Variante">
                <select
                  value={variantId}
                  disabled={!templateId}
                  onChange={(event) => {
                    setVariantId(event.target.value);
                    setProvinceId("");
                    setCompanyId("");
                    setAgreementId("");
                    setPermitDay("");
                    setManualValues({});
                    setManualErrors({});
                  }}
                >
                  <option value="">Seleccioná una variante</option>
                  {variants.data?.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              {visibleFields.map((field) => <div key={field.inputKey}>{renderCommonField(field)}</div>)}
            </FormSection>
            <FormSection
              title={`Delegados (${delegateIds.length} seleccionados)`}
            >
              <Label htmlFor="bulk-delegate-filter">Buscar delegado</Label>
              <div className="relative mt-2">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={17}
                  aria-hidden="true"
                />
                <Input
                  id="bulk-delegate-filter"
                  className="pl-10"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Nombre o DNI"
                />
              </div>
              <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                {visibleDelegates.map((delegate) => (
                  <label
                    key={delegate.id}
                    className="flex min-h-14 cursor-pointer items-center gap-3 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={delegateIds.includes(delegate.id)}
                      onChange={() => toggle(delegate.id)}
                      className="size-5 accent-blue-800"
                    />
                    <span>
                      <strong className="block">
                        {delegate.nombre} {delegate.apellido}
                      </strong>
                      <span className="text-sm text-slate-600">
                        DNI {delegate.dni}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {delegateIds.length === 0 && (
                <p className="mt-3 text-sm text-rose-700">
                  Seleccioná al menos un delegado.
                </p>
              )}
            </FormSection>
          </fieldset>
          {error && (
            <p
              role="alert"
              className="mt-6 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              {error}
            </p>
          )}
          {confirming ? (
            <section className="mt-8 border-y border-blue-200 bg-blue-50/60 py-6">
              <p className="typo-eyebrow text-blue-700">Confirmación</p>
              <h2 className="typo-heading-2 mt-2">
                Generar {delegateIds.length} permisos
              </h2>
              <p className="mt-3 text-sm text-slate-700">
                Los permisos se crearán como documentos independientes.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" onClick={() => setConfirming(false)}>
                  Volver
                </Button>
                <Button onClick={() => void generate()}>
                  {pending ? (
                    <>
                      <LoaderCircle className="animate-spin" size={17} />{" "}
                      Generando permisos...
                    </>
                  ) : (
                    `Generar ${delegateIds.length} permisos`
                  )}
                </Button>
              </div>
            </section>
          ) : (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={onBack}>
                Cancelar
              </Button>
              <Button disabled={!valid} onClick={() => setConfirming(true)}>
                Continuar
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
// Compatibility export while navigation still uses the existing route/component name.
export const BulkPermisoPage = BulkDocumentPage;
function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = `bulk-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-2 [&_select]:min-h-12 [&_select]:w-full [&_select]:border [&_select]:border-slate-300 [&_select]:bg-white [&_select]:px-3 [&_select]:text-slate-900 [&_select]:focus:border-blue-700">
        {isValidElement(children)
          ? cloneElement(children as ReactElement<{ id?: string }>, { id })
          : children}
      </div>
    </div>
  );
}
function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-slate-200 bg-white px-4 py-5 sm:px-6">
      <h2 className="typo-heading-2 border-b border-slate-200 pb-3">{title}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}
function BulkResult({
  result,
  onBack,
  onDownloadOne,
  onViewOne,
  viewingId,
  onDownloadAll,
  error,
}: {
  result: BatchDocumentResult;
  onBack: () => void;
  onDownloadOne: (id: string) => Promise<void>;
  onViewOne: (id: string) => Promise<void>;
  viewingId: string | null;
  onDownloadAll: () => void;
  error: string;
}) {
  return (
    <section className="max-w-5xl">
      <header className="border-b border-slate-200 pb-6">
        <p className="typo-eyebrow text-blue-700">Generación masiva</p>
        <h1 className="typo-display-xl mt-2 uppercase">
          {result.requested} permisos procesados
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {result.successful} generados correctamente · {result.failed} no
          pudieron generarse
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="mt-6 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
        {result.items.map((item) => (
          <div key={item.delegateId} className="py-4">
            <strong>{item.delegateName}</strong>
            {item.status === "SUCCESS" && item.documentId ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-600">
                  {item.publicNumber}
                </span>
                <Button
                  variant="outline"
                  disabled={viewingId === item.documentId}
                  onClick={() => void onViewOne(item.documentId!)}
                >
                  {viewingId === item.documentId ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <Eye size={17} />
                  )}{" "}
                  Ver
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void onDownloadOne(item.documentId!)}
                >
                  <Download size={17} /> Descargar
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-rose-700">
                {item.message || "No generado"}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {result.successful > 0 && (
          <Button onClick={onDownloadAll}>
            <Download size={17} /> Descargar todos
          </Button>
        )}
        <Button variant="outline" onClick={onBack}>
          Finalizar
        </Button>
      </div>
    </section>
  );
}
