import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Document, Page, pdfjs } from "react-pdf";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminConfirmation } from "@/features/admin/AdminOverlay";
import { ApiError } from "@/lib/api";
import {
  createFieldDefinition,
  getAcroformFields,
  getFieldDefinitions,
  getTemplateFields,
  getVariantPdf,
  replaceTemplateFields,
} from "./templatesApi";
import {
  canCreatePositionedField,
  canSaveFieldConfiguration,
  canStartFieldMove,
  hasUnsavedChanges,
  overlayLabel,
} from "./fieldEditorState";
import { fieldConfigurationExperience } from "./fieldConfigurationExperience";
import {
  pdfToPreview,
  previewToPdf,
  type PdfRect,
} from "./positionedCoordinates";
import {
  previewSizeForWidth,
  responsivePreviewWidth,
} from "./pdfPreviewSizing";
import type {
  AcroformField,
  FieldConfiguration,
  FieldDefinition,
  FieldDefinitionInput,
  TemplateField,
  TemplateVariant,
} from "./types";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type EditableField = FieldConfiguration & { clientId: string };
type Interaction = {
  kind: "create" | "move" | "resize";
  fieldId?: string;
  start: { x: number; y: number };
  rect: PdfRect;
} | null;

const minimumSize = 8;

function fieldFromResponse(field: TemplateField): EditableField {
  return { ...field, clientId: field.id };
}

function blankPositionedField(pageNumber: number): EditableField {
  return {
    clientId: crypto.randomUUID(),
    fieldDefinitionId: "",
    mode: "POSITIONED",
    acroFieldName: null,
    required: true,
    displayOrder: 0,
    pageNumber,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fontSize: 12,
    minFontSize: 7,
    maxFontSize: 12,
    alignment: "LEFT",
    multiline: false,
  };
}

function snapshot(fields: EditableField[]) {
  return JSON.stringify(fields.map(({ clientId, ...field }) => field));
}

export function PositionedFieldEditor({
  templateId,
  variant,
  onBack,
}: {
  templateId: string;
  variant: TemplateVariant;
  onBack: () => void;
}) {
  const client = useQueryClient();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [previewWidth, setPreviewWidth] = useState(0);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot([]));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDocumentField, setSelectedDocumentField] = useState<
    string | null
  >(null);
  const [interaction, setInteraction] = useState<Interaction>(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingRect, setDrawingRect] = useState<PdfRect | null>(null);
  const [newDataFor, setNewDataFor] = useState<{
    clientId: string;
    acroFieldName?: string;
  } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [mobileConfigOpen, setMobileConfigOpen] = useState(true);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const previewHost = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const pdfQuery = useQuery({
    queryKey: ["variant-pdf", variant.id],
    queryFn: () => getVariantPdf(templateId, variant.id),
  });
  const fieldsQuery = useQuery({
    queryKey: ["template-fields", variant.id],
    queryFn: () => getTemplateFields(templateId, variant.id),
  });
  const definitionsQuery = useQuery({
    queryKey: ["field-definitions"],
    queryFn: getFieldDefinitions,
  });
  const discoveredQuery = useQuery({
    queryKey: ["acroform-fields", variant.id],
    queryFn: () => getAcroformFields(templateId, variant.id),
  });
  const blobUrl = useMemo(
    () => (pdfQuery.data ? URL.createObjectURL(pdfQuery.data) : null),
    [pdfQuery.data],
  );
  const hasDetectedFields =
    fieldConfigurationExperience(discoveredQuery.data?.length ?? 0) ===
    "FORM_FIELDS";
  const selected =
    fields.find((field) => field.clientId === selectedId) ?? null;
  const mobileSheetOpen =
    mobileConfigOpen && (Boolean(selected) || Boolean(selectedDocumentField));
  const dirty = hasUnsavedChanges(snapshot(fields), savedSnapshot);
  const previewSize = previewSizeForWidth(
    previewWidth,
    pageSize.width,
    pageSize.height,
  );

  useEffect(
    () => () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    },
    [blobUrl],
  );
  useEffect(() => {
    const host = previewHost.current;
    if (!host) return;

    const updateWidth = () =>
      setPreviewWidth(responsivePreviewWidth(host.clientWidth));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!fieldsQuery.data || dirty) return;
    const next = fieldsQuery.data.map(fieldFromResponse);
    setFields(next);
    setSavedSnapshot(snapshot(next));
  }, [dirty, fieldsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!dirty) return Promise.resolve([]);
      if (fields.some((field) => !field.fieldDefinitionId))
        throw new Error("Asigná un dato a cada campo antes de guardar.");
      return replaceTemplateFields(
        templateId,
        variant.id,
        fields.map(({ clientId, ...field }, index) => ({
          ...field,
          displayOrder: index,
        })),
      );
    },
    onSuccess: () => {
      setSavedSnapshot(snapshot(fields));
      setSaveFeedback("Campos guardados correctamente");
      void client.invalidateQueries({
        queryKey: ["template-fields", variant.id],
      });
      void client.invalidateQueries({
        queryKey: ["documents", "manual-fields", variant.id],
      });
    },
    onError: () => setSaveFeedback(""),
  });
  const createDefinitionMutation = useMutation({
    mutationFn: createFieldDefinition,
    onSuccess: (definition) => {
      setFields((current) => {
        if (!newDataFor) return current;
        const existing = current.find(
          (field) => field.clientId === newDataFor.clientId,
        );
        if (existing)
          return current.map((field) =>
            field.clientId === newDataFor.clientId
              ? {
                  ...field,
                  fieldDefinitionId: definition.id,
                  required: definition.required,
                }
              : field,
          );
        return [
          ...current,
          {
            clientId: newDataFor.clientId,
            fieldDefinitionId: definition.id,
            mode: "ACROFORM",
            acroFieldName: newDataFor.acroFieldName ?? null,
            required: definition.required,
            displayOrder: current.length,
            pageNumber: null,
            x: null,
            y: null,
            width: null,
            height: null,
            fontSize: null,
            minFontSize: null,
            maxFontSize: null,
            alignment: null,
            multiline: null,
          },
        ];
      });
      setNewDataFor(null);
      void client.invalidateQueries({ queryKey: ["field-definitions"] });
    },
  });

  function updateField(clientId: string, patch: Partial<EditableField>) {
    setSaveFeedback("");
    setFields((current) =>
      current.map((field) =>
        field.clientId === clientId ? { ...field, ...patch } : field,
      ),
    );
  }
  function upsertField(next: EditableField) {
    setSaveFeedback("");
    setFields((current) =>
      current.some((field) => field.clientId === next.clientId)
        ? current.map((field) =>
            field.clientId === next.clientId ? next : field,
          )
        : [...current, next],
    );
  }
  function removeField(clientId: string) {
    setSaveFeedback("");
    setFields((current) =>
      current.filter((field) => field.clientId !== clientId),
    );
    setSelectedId(null);
  }
  function selectPositionedField(
    event: React.PointerEvent<HTMLButtonElement>,
    field: EditableField,
    rect: PdfRect,
  ) {
    const isSelected = selectedId === field.clientId;
    setSelectedId(field.clientId);
    setSelectedDocumentField(null);
    setMobileConfigOpen(true);
    if (canStartFieldMove(isSelected, drawingMode))
      begin(event, "move", rect, field.clientId);
  }
  function previewRect(field: EditableField) {
    return pdfToPreview(
      {
        x: field.x ?? 0,
        y: field.y ?? 0,
        width: field.width ?? 0,
        height: field.height ?? 0,
      },
      previewSize.width,
      previewSize.height,
      pageSize.width,
      pageSize.height,
    );
  }
  function point(event: React.PointerEvent<HTMLElement>) {
    const rect = container.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(event.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(event.clientY - rect.top, rect.height)),
    };
  }
  function begin(
    event: React.PointerEvent<HTMLElement>,
    kind: NonNullable<Interaction>["kind"],
    rect: PdfRect,
    fieldId?: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteraction({ kind, fieldId, start: point(event), rect });
  }
  function startDrawing(event: React.PointerEvent<HTMLDivElement>) {
    const start = point(event);
    begin(event, "create", { x: start.x, y: start.y, width: 0, height: 0 });
    setDrawingRect({ x: start.x, y: start.y, width: 0, height: 0 });
  }
  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!interaction || !container.current) return;
    const current = point(event);
    const { rect, start } = interaction;
    const { width, height } = previewSize;
    if (interaction.kind === "create") {
      setDrawingRect({
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        width: Math.abs(current.x - start.x),
        height: Math.abs(current.y - start.y),
      });
      return;
    }
    if (!interaction.fieldId) return;
    const next =
      interaction.kind === "move"
        ? {
            x: Math.max(
              0,
              Math.min(width - rect.width, rect.x + current.x - start.x),
            ),
            y: Math.max(
              0,
              Math.min(height - rect.height, rect.y + current.y - start.y),
            ),
            width: rect.width,
            height: rect.height,
          }
        : {
            x: rect.x,
            y: rect.y,
            width: Math.max(
              minimumSize,
              Math.min(width - rect.x, rect.width + current.x - start.x),
            ),
            height: Math.max(
              minimumSize,
              Math.min(height - rect.y, rect.height + current.y - start.y),
            ),
          };
    updateField(
      interaction.fieldId,
      previewToPdf(next, width, height, pageSize.width, pageSize.height),
    );
  }
  function finishInteraction() {
    if (interaction?.kind === "create" && drawingRect && container.current) {
      if (canCreatePositionedField(drawingRect, minimumSize)) {
        const field = blankPositionedField(pageNumber);
        setFields((current) => [
          ...current,
          {
            ...field,
            ...previewToPdf(
              drawingRect,
              previewSize.width,
              previewSize.height,
              pageSize.width,
              pageSize.height,
            ),
          },
        ]);
        setSelectedId(field.clientId);
        setMobileConfigOpen(true);
      }
      setDrawingMode(false);
      setDrawingRect(null);
    }
    setInteraction(null);
  }
  function labelFor(id: string) {
    return overlayLabel(
      definitionsQuery.data?.find((definition) => definition.id === id)?.label,
    );
  }

  const positioned = fields.filter(
    (field) => field.mode === "POSITIONED" && field.pageNumber === pageNumber,
  );
  const discovered = discoveredQuery.data ?? [];
  const saveError =
    saveMutation.error instanceof Error
      ? saveMutation.error.message
      : saveMutation.error
        ? "No pudimos guardar los cambios. Intentá nuevamente."
        : "";
  const leaveEditor = () => {
    if (dirty) setDiscardPromptOpen(true);
    else onBack();
  };
  const saveStatus = saveMutation.isPending
    ? "Guardando..."
    : dirty
      ? "Sin guardar"
      : "Guardado";

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 pb-[calc(9rem+env(safe-area-inset-bottom))] text-slate-900 lg:pb-8">
      <header className="border-b border-slate-200 bg-slate-100/95 px-3 py-1.5 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2">
          <button
            type="button"
            onClick={leaveEditor}
            className="min-h-10 shrink-0 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            ← Volver
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-bold sm:text-base">
            {variant.nombre}
          </h1>
          <span
            className={`typo-meta shrink-0 rounded-full px-2 py-1 ${saveMutation.isPending ? "bg-blue-50 text-blue-700" : dirty ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}
          >
            {saveStatus}
          </span>
        </div>
      </header>
      <div className="px-3 pt-4 sm:px-6">
        <>
          {saveFeedback && (
            <p
              role="status"
              aria-live="polite"
              className="mx-auto mb-4 max-w-[1500px] rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
            >
              {saveFeedback}
            </p>
          )}
          {saveError && (
            <p
              role="alert"
              className="mx-auto mb-4 max-w-[1500px] rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
            >
              {saveError}
            </p>
          )}
        </>
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
          <section className="min-w-0 rounded-xl bg-slate-300 p-3 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 p-2">
              {hasDetectedFields ? (
                <p className="text-sm text-slate-700">
                  Encontramos {discovered.length} campos rellenables en este
                  documento.
                </p>
              ) : (
                <p className="max-w-lg text-sm text-slate-700">
                  Este PDF no tiene campos rellenables. Marcá sobre el documento
                  las zonas donde querés que el sistema complete información.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (drawingMode) {
                    setDrawingMode(false);
                    setDrawingRect(null);
                    setInteraction(null);
                  } else setDrawingMode(true);
                  setSaveFeedback("");
                }}
                className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold ${drawingMode ? "border border-blue-700 bg-white text-blue-700" : "bg-blue-700 text-white"}`}
              >
                {drawingMode ? "Cancelar agregar" : "+ Agregar campo"}
              </button>
            </div>
            {drawingMode && (
              <p
                role="status"
                className="mb-3 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-800"
              >
                Modo agregar campo activo. Dibujá un rectángulo sobre el
                documento.
              </p>
            )}
            {pdfQuery.isPending && (
              <p className="p-12 text-center">Cargando PDF...</p>
            )}
            {pdfQuery.isError && (
              <p role="alert" className="rounded bg-rose-50 p-4 text-rose-800">
                No pudimos cargar el PDF de la variante.
              </p>
            )}
            <div
              ref={previewHost}
              className="max-h-[68dvh] w-full min-w-0 overflow-auto overscroll-contain"
            >
              {blobUrl && previewWidth > 0 && (
                <div
                  className={`w-max min-w-full p-1 ${mobileSheetOpen ? "pb-[65dvh] xl:pb-1" : ""}`}
                >
                  <div
                    ref={container}
                    onPointerMove={move}
                    onPointerUp={finishInteraction}
                    onPointerCancel={finishInteraction}
                    style={{ width: previewSize.width }}
                    className="relative mx-auto bg-white shadow-xl"
                  >
                    <Document
                      file={blobUrl}
                      loading="Cargando PDF..."
                      error="No pudimos mostrar el PDF."
                      onLoadSuccess={({ numPages }) => {
                        setPageCount(numPages);
                        setPageNumber((value) => Math.min(value, numPages));
                      }}
                    >
                      <Page
                        pageNumber={pageNumber}
                        width={previewWidth}
                        renderTextLayer={false}
                        onLoadSuccess={(page) => {
                          const viewport = page.getViewport({ scale: 1 });
                          setPageSize({
                            width: viewport.width,
                            height: viewport.height,
                          });
                        }}
                      />
                    </Document>
                    {hasDetectedFields &&
                      discovered
                        .filter(
                          (field) =>
                            field.pageNumber === pageNumber &&
                            field.x !== null &&
                            field.y !== null &&
                            field.width !== null &&
                            field.height !== null,
                        )
                        .map((field) => {
                          const configured = fields.find(
                            (value) =>
                              value.mode === "ACROFORM" &&
                              value.acroFieldName === field.acroFieldName,
                          );
                          const rect = pdfToPreview(
                            {
                              x: field.x!,
                              y: field.y!,
                              width: field.width!,
                              height: field.height!,
                            },
                            previewSize.width,
                            previewSize.height,
                            pageSize.width,
                            pageSize.height,
                          );
                          const active =
                            selectedDocumentField === field.acroFieldName;
                          const unassigned = !configured?.fieldDefinitionId;
                          return (
                            <button
                              key={field.acroFieldName}
                              type="button"
                              onClick={() => {
                                setSelectedId(null);
                                setSelectedDocumentField(field.acroFieldName);
                                setMobileConfigOpen(true);
                              }}
                              style={{
                                left: rect.x,
                                top: rect.y,
                                width: rect.width,
                                height: rect.height,
                              }}
                              className={`absolute z-20 border-2 ${active ? "border-blue-800 bg-blue-500/35 ring-2 ring-blue-300" : unassigned ? "border-amber-600 border-dashed bg-amber-300/20" : "border-blue-600 bg-blue-500/15"}`}
                              aria-label={`${field.displayName || "Campo"}: ${labelFor(configured?.fieldDefinitionId ?? "")}`}
                            >
                              {/* Canvas-only field marker: it scales with the PDF overlay, not the application UI. */}
                              <span
                                aria-hidden="true"
                                className={`absolute left-0 top-0 grid h-4 min-w-4 place-items-center text-[9px] font-bold ${unassigned ? "bg-amber-600 text-white" : "bg-blue-700 text-white"}`}
                              >
                                {discovered.indexOf(field) + 1}
                              </span>
                            </button>
                          );
                        })}
                    {positioned.map((field, index) => {
                      const rect = previewRect(field);
                      const selectedField = selectedId === field.clientId;
                      const unassigned = !field.fieldDefinitionId;
                      return (
                        <button
                          key={field.clientId}
                          type="button"
                          onPointerDown={(event) =>
                            selectPositionedField(event, field, rect)
                          }
                          style={{
                            left: rect.x,
                            top: rect.y,
                            width: rect.width,
                            height: rect.height,
                            touchAction: selectedField ? "none" : "auto",
                          }}
                          className={`absolute z-20 border-2 ${selectedField ? "border-blue-800 bg-blue-500/30 ring-2 ring-blue-300" : unassigned ? "border-amber-600 border-dashed bg-amber-300/20" : "border-blue-600 bg-blue-500/15"}`}
                          aria-label={`Campo ${index + 1}: ${labelFor(field.fieldDefinitionId)}. ${selectedField ? "Seleccionado" : "Tocá para seleccionar"}`}
                        >
                          {/* Canvas-only field marker: it scales with the PDF overlay, not the application UI. */}
                          <span
                            aria-hidden="true"
                            className={`absolute left-0 top-0 grid h-4 min-w-4 place-items-center text-[9px] font-bold ${unassigned ? "bg-amber-600 text-white" : "bg-blue-700 text-white"}`}
                          >
                            {index + 1}
                          </span>
                        </button>
                      );
                    })}
                    {selected?.mode === "POSITIONED" &&
                      !drawingMode &&
                      (() => {
                        const rect = previewRect(selected);
                        return (
                          <button
                            type="button"
                            aria-label="Redimensionar campo"
                            onPointerDown={(event) =>
                              begin(event, "resize", rect, selected.clientId)
                            }
                            style={{
                              left: rect.x + rect.width - 22,
                              top: rect.y + rect.height - 22,
                              touchAction: "none",
                            }}
                            className="absolute z-30 grid h-11 w-11 place-items-center"
                          >
                            <span className="h-4 w-4 rounded-sm border-2 border-white bg-blue-700 shadow" />
                          </button>
                        );
                      })()}
                    {drawingRect && (
                      <div
                        aria-hidden="true"
                        style={{
                          left: drawingRect.x,
                          top: drawingRect.y,
                          width: drawingRect.width,
                          height: drawingRect.height,
                        }}
                        className="pointer-events-none absolute z-30 border-2 border-dashed border-blue-800 bg-blue-400/25"
                      />
                    )}
                    {drawingMode && (
                      <div
                        aria-label="Área para dibujar un campo"
                        onPointerDown={startDrawing}
                        className="absolute inset-0 z-40 cursor-crosshair touch-none"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(pageNumber - 1)}
                className="min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-center text-sm text-slate-600">
                Página {pageNumber} de {pageCount || "-"}
              </span>
              <button
                type="button"
                disabled={pageNumber >= pageCount}
                onClick={() => setPageNumber(pageNumber + 1)}
                className="min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </section>
          <aside className="hidden w-full self-start rounded-xl bg-white p-4 shadow-sm lg:sticky lg:top-36 lg:block lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto sm:p-5">
            {selected?.mode === "POSITIONED" ? (
              <>
                <h2 className="text-lg font-bold">Campo seleccionado</h2>
                <PositionedConfiguration
                  field={selected}
                  definitions={definitionsQuery.data ?? []}
                  onChange={updateField}
                  onCreate={(clientId) => setNewDataFor({ clientId })}
                  onDelete={() => removeField(selected.clientId)}
                />
              </>
            ) : hasDetectedFields && selectedDocumentField ? (
              <AcroformConfiguration
                names={discovered.filter(
                  (field) => field.acroFieldName === selectedDocumentField,
                )}
                fields={fields}
                definitions={definitionsQuery.data ?? []}
                selectedName={selectedDocumentField}
                onSelect={setSelectedDocumentField}
                onUpsert={upsertField}
                onRemove={removeField}
                onCreate={(clientId, acroFieldName) =>
                  setNewDataFor({ clientId, acroFieldName })
                }
              />
            ) : (
              <>
                <h2 className="text-lg font-bold">Campos del documento</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Seleccioná un campo del PDF para configurarlo.
                </p>
              </>
            )}
          </aside>
        </div>
      </div>
      <MobileConfigurationSheet
        open={mobileSheetOpen}
        selected={selected}
        selectedDocumentField={selectedDocumentField}
        hasDetectedFields={hasDetectedFields}
        names={discovered}
        fields={fields}
        definitions={definitionsQuery.data ?? []}
        onClose={() => setMobileConfigOpen(false)}
        onChange={updateField}
        onCreate={(clientId, acroFieldName) =>
          setNewDataFor({ clientId, acroFieldName })
        }
        onDelete={() => selected && removeField(selected.clientId)}
        onSelect={setSelectedDocumentField}
        onUpsert={upsertField}
        onRemove={removeField}
      />
      <div className="sticky bottom-0 z-30 mx-auto mt-5 grid max-w-[1500px] grid-cols-2 gap-3 border-t border-slate-200 bg-white/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:flex lg:justify-end lg:px-0 lg:pb-3">
        <button
          type="button"
          onClick={leaveEditor}
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canSaveFieldConfiguration(dirty, saveMutation.isPending)}
          onClick={() => saveMutation.mutate()}
          className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
      {newDataFor && (
        <NewDataDialog
          pending={createDefinitionMutation.isPending}
          error={createDefinitionMutation.error}
          onCancel={() => setNewDataFor(null)}
          onCreate={(input) => createDefinitionMutation.mutate(input)}
        />
      )}
      {discardPromptOpen && (
        <AdminConfirmation
          title="¿Descartar cambios?"
          message="Los cambios realizados en los campos no se guardarán."
          actionLabel="Descartar cambios"
          destructive
          pending={false}
          onCancel={() => setDiscardPromptOpen(false)}
          onConfirm={onBack}
          cancelLabel="Seguir editando"
        />
      )}
    </main>
  );
}

function DataSelector({
  value,
  definitions,
  onChange,
  onCreate,
}: {
  value: string;
  definitions: FieldDefinition[];
  onChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
      >
        <option value="">Sin asignar</option>
        {definitions.map((definition) => (
          <option key={definition.id} value={definition.id}>
            {definition.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onCreate}
        className="mt-2 min-h-11 text-sm font-semibold text-blue-700"
      >
        + Crear nuevo dato
      </button>
    </div>
  );
}

function PositionedConfiguration({
  field,
  definitions,
  onChange,
  onCreate,
  onDelete,
}: {
  field: EditableField;
  definitions: FieldDefinition[];
  onChange: (id: string, patch: Partial<EditableField>) => void;
  onCreate: (id: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-4 space-y-5">
      <section>
        <p className="typo-eyebrow text-slate-500">
          Contenido
        </p>
        <label className="mt-3 block text-sm font-semibold">
          Dato a completar
          <DataSelector
            value={field.fieldDefinitionId}
            definitions={definitions}
            onChange={(fieldDefinitionId) => {
              const definition = definitions.find(
                (item) => item.id === fieldDefinitionId,
              );
              onChange(field.clientId, {
                fieldDefinitionId,
                required: definition?.required ?? field.required,
              });
            }}
            onCreate={() => onCreate(field.clientId)}
          />
        </label>
      </section>
      <section className="border-t border-slate-200 pt-4">
        <p className="typo-eyebrow text-slate-500">
          Posición y tamaño
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Tocá y arrastrá el campo en el PDF. Usá el control de la esquina para
          cambiar su tamaño.
        </p>
      </section>
      <section className="border-t border-slate-200 pt-4">
        <p className="typo-eyebrow text-slate-500">
          Apariencia
        </p>
        <p className="mt-3 text-sm font-semibold">Alineación</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["LEFT", "CENTER", "RIGHT"] as const).map((alignment) => (
            <button
              key={alignment}
              type="button"
              onClick={() => onChange(field.clientId, { alignment })}
              className={`typo-control min-h-11 rounded-lg border px-2 py-2 ${field.alignment === alignment ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-300"}`}
            >
              {alignment === "LEFT"
                ? "Izquierda"
                : alignment === "CENTER"
                  ? "Centro"
                  : "Derecha"}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-600">Tamaño: automático</p>
      </section>
      <section className="border-t border-slate-200 pt-4">
        <p className="typo-eyebrow text-slate-500">
          Opciones
        </p>
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) =>
              onChange(field.clientId, { required: event.target.checked })
            }
          />{" "}
          Obligatorio
        </label>
        <button
          type="button"
          onClick={onDelete}
          className="mt-2 min-h-11 text-sm font-semibold text-rose-700"
        >
          Eliminar campo
        </button>
      </section>
    </div>
  );
}

function MobileConfigurationSheet({
  open,
  selected,
  selectedDocumentField,
  hasDetectedFields,
  names,
  fields,
  definitions,
  onClose,
  onChange,
  onCreate,
  onDelete,
  onSelect,
  onUpsert,
  onRemove,
}: {
  open: boolean;
  selected: EditableField | null;
  selectedDocumentField: string | null;
  hasDetectedFields: boolean;
  names: AcroformField[];
  fields: EditableField[];
  definitions: FieldDefinition[];
  onClose: () => void;
  onChange: (id: string, patch: Partial<EditableField>) => void;
  onCreate: (id: string, acroFieldName?: string) => void;
  onDelete: () => void;
  onSelect: (name: string) => void;
  onUpsert: (field: EditableField) => void;
  onRemove: (id: string) => void;
}) {
  if (!open) return null;
  const selectedName =
    names.find((field) => field.acroFieldName === selectedDocumentField)
      ?.displayName || "Campo seleccionado";
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="field-configuration-title"
      className="fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl lg:hidden"
    >
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="field-configuration-title" className="text-lg font-bold">
            {selected
              ? overlayLabel(
                  selected.fieldDefinitionId &&
                    definitions.find(
                      (definition) =>
                        definition.id === selected.fieldDefinitionId,
                    )?.label,
                )
              : selectedName}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {selected
              ? "Tocá y arrastrá el campo seleccionado para moverlo."
              : "Configurá el dato de este campo."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl text-slate-600 hover:bg-slate-100"
          aria-label="Cerrar configuración"
        >
          ×
        </button>
      </div>
      {selected ? (
        <PositionedConfiguration
          field={selected}
          definitions={definitions}
          onChange={onChange}
          onCreate={(clientId) => onCreate(clientId)}
          onDelete={onDelete}
        />
      ) : (
        hasDetectedFields && (
          <AcroformConfiguration
            names={names.filter(
              (field) => field.acroFieldName === selectedDocumentField,
            )}
            fields={fields}
            definitions={definitions}
            selectedName={selectedDocumentField}
            onSelect={onSelect}
            onUpsert={onUpsert}
            onRemove={onRemove}
            onCreate={onCreate}
          />
        )
      )}
    </section>
  );
}

function AcroformConfiguration({
  names,
  fields,
  definitions,
  selectedName,
  onSelect,
  onUpsert,
  onRemove,
  onCreate,
}: {
  names: AcroformField[];
  fields: EditableField[];
  definitions: FieldDefinition[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  onUpsert: (field: EditableField) => void;
  onRemove: (id: string) => void;
  onCreate: (id: string, acroFieldName: string) => void;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold">Campos del documento</h2>
      <p className="mt-1 text-sm text-slate-600">
        Elegí el dato que se completará en cada campo.
      </p>
      <div className="mt-5 space-y-3">
        {names.map((field, index) => {
          const existing = fields.find(
            (value) =>
              value.mode === "ACROFORM" &&
              value.acroFieldName === field.acroFieldName,
          );
          const clientId = existing?.clientId ?? `acro-${field.acroFieldName}`;
          const base = existing ?? {
            clientId,
            mode: "ACROFORM" as const,
            acroFieldName: field.acroFieldName,
            displayOrder: index,
            pageNumber: null,
            x: null,
            y: null,
            width: null,
            height: null,
            fontSize: null,
            minFontSize: null,
            maxFontSize: null,
            alignment: null,
            multiline: null,
          };
          return (
            <div
              key={field.acroFieldName}
              className={`rounded-lg border p-3 ${selectedName === field.acroFieldName ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
            >
              <button
                type="button"
                onClick={() => onSelect(field.acroFieldName)}
                className="min-h-11 w-full text-left text-sm font-semibold"
              >
                {field.displayName || `Campo ${index + 1}`}
              </button>
              <section className="mt-3 border-t border-slate-200 pt-3">
                <p className="typo-eyebrow text-slate-500">
                  Contenido
                </p>
                <DataSelector
                  value={existing?.fieldDefinitionId ?? ""}
                  definitions={definitions}
                  onChange={(fieldDefinitionId) => {
                    if (!fieldDefinitionId && existing)
                      onRemove(existing.clientId);
                    else if (fieldDefinitionId)
                      onUpsert({
                        ...base,
                        fieldDefinitionId,
                        required:
                          definitions.find(
                            (definition) => definition.id === fieldDefinitionId,
                          )?.required ??
                          existing?.required ??
                          true,
                      });
                  }}
                  onCreate={() => onCreate(clientId, field.acroFieldName)}
                />
              </section>
              {existing && (
                <>
                  <section className="mt-3 border-t border-slate-200 pt-3">
                    <p className="typo-eyebrow text-slate-500">
                      Apariencia
                    </p>
                    <p className="mt-3 text-sm font-semibold">Alineación</p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["LEFT", "CENTER", "RIGHT"] as const).map((alignment) => (
                        <button
                          key={alignment}
                          type="button"
                          onClick={() => onUpsert({ ...existing, alignment })}
                          className={`typo-control min-h-11 rounded-lg border px-2 py-2 ${(existing.alignment ?? "CENTER") === alignment ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-300"}`}
                        >
                          {alignment === "LEFT"
                            ? "Izquierda"
                            : alignment === "CENTER"
                              ? "Centro"
                              : "Derecha"}
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="mt-3 border-t border-slate-200 pt-3">
                    <p className="typo-eyebrow text-slate-500">
                      Opciones
                    </p>
                    <label className="mt-2 flex min-h-11 items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={existing.required}
                        onChange={(event) =>
                          onUpsert({
                            ...existing,
                            required: event.target.checked,
                          })
                        }
                      />{" "}
                      Obligatorio
                    </label>
                    <button
                      type="button"
                      onClick={() => onRemove(existing.clientId)}
                      className="mt-2 min-h-11 text-sm font-semibold text-rose-700"
                    >
                      Eliminar campo
                    </button>
                  </section>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NewDataDialog({
  pending,
  error,
  onCancel,
  onCreate,
}: {
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onCreate: (input: FieldDefinitionInput) => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldDefinitionInput["type"]>("TEXT");
  const [required, setRequired] = useState(true);
  const message =
    error instanceof ApiError
      ? error.message
      : error
        ? "No pudimos crear el dato."
        : "";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-data-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onCreate({ label, type, sourceType: "MANUAL", required });
        }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="new-data-title" className="text-xl font-bold">
          Crear nuevo dato
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Se completará manualmente al generar el documento.
        </p>
        {message && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
          >
            {message}
          </p>
        )}
        <label className="mt-5 block text-sm font-semibold">
          Nombre
          <input
            autoFocus
            required
            maxLength={200}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Tipo
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as FieldDefinitionInput["type"])
            }
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3"
          >
            <option value="TEXT">Texto</option>
            <option value="DATE">Fecha</option>
            <option value="NUMBER">Número</option>
          </select>
        </label>
        <p className="mt-4 text-sm font-semibold">Origen</p>
        <p className="mt-1 text-sm text-slate-600">Lo completa el usuario</p>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />{" "}
          Requerido
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            disabled={pending}
            className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Creando..." : "Crear dato"}
          </button>
        </div>
      </form>
    </div>
  );
}
