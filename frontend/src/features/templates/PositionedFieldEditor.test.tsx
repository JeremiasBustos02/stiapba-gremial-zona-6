// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-pdf", async () => {
  const { createElement, useEffect } = await import("react");
  return {
    Document: ({ children, onLoadSuccess }: { children: React.ReactNode; onLoadSuccess: (value: { numPages: number }) => void }) => {
      useEffect(() => onLoadSuccess({ numPages: 1 }), []);
      return createElement("div", null, children);
    },
     Page: ({ width, onLoadSuccess }: { width: number; onLoadSuccess: (page: { getViewport: (options: { scale: number }) => { width: number; height: number } }) => void }) => {
       useEffect(() => onLoadSuccess({ getViewport: () => ({ width: 400, height: 600 }) }), []);
       return createElement("div", { "data-pdf-page-width": width });
    },
    pdfjs: { GlobalWorkerOptions: {} },
  };
});

vi.mock("./templatesApi", () => ({
  getVariantPdf: () => Promise.resolve(new Blob(["pdf"])),
  getTemplateFields: () => Promise.resolve([{ id: "field-1", fieldDefinitionId: "definition-1", mode: "POSITIONED", acroFieldName: null, required: true, displayOrder: 0, pageNumber: 1, x: 10, y: 570, width: 100, height: 20, fontSize: 12, minFontSize: 7, maxFontSize: 12, alignment: "LEFT", multiline: false }]),
  getFieldDefinitions: () => Promise.resolve([{ id: "definition-1", label: "Motivo", type: "TEXT", sourceType: "MANUAL", required: true }]),
  getAcroformFields: () => Promise.resolve([]),
  replaceTemplateFields: vi.fn(),
  createFieldDefinition: vi.fn(),
}));

import { PositionedFieldEditor } from "./PositionedFieldEditor";

let root: Root;
let container: HTMLDivElement;
const wait = () => new Promise((resolve) => window.setTimeout(resolve, 0));
const field = () => container.querySelector<HTMLButtonElement>('button[aria-label^="Campo 1: Motivo"]')!;
const key = (element: HTMLElement, value: string, shiftKey = false) => element.dispatchEvent(new KeyboardEvent("keydown", { key: value, shiftKey, bubbles: true }));
const pointer = (type: string, pointerId: number, clientX: number, clientY: number) => {
  const event = new MouseEvent(type, { bubbles: true, clientX, clientY });
  Object.defineProperty(event, "pointerId", { value: pointerId });
  return event;
};
const positionedFields = () => [...container.querySelectorAll<HTMLButtonElement>("button[data-positioned-field-id]")];
const addField = () => [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Agregar campo"))!;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver = class { observe() {}; disconnect() {}; unobserve() {} };
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", { configurable: true, value: vi.fn(() => false) });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", { configurable: true, value: vi.fn() });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:preview") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 400 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 400, height: 600 } as DOMRect);
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });

async function render() {
  await act(async () => root.render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PositionedFieldEditor templateId="template-1" variant={{ id: "variant-1", templateId: "template-1", nombre: "Firma A", active: true, legacyPositioned: false, createdAt: "", updatedAt: "" }} onBack={vi.fn()} /></QueryClientProvider>));
  await act(async () => wait()); await act(async () => wait());
}

describe("PositionedFieldEditor accessibility", () => {
  it("focuses and selects a field with Enter or Space while preserving pointer selection", async () => {
    await render(); field().focus(); expect(document.activeElement).toBe(field());
    await act(async () => key(field(), "Enter")); expect(field().getAttribute("aria-label")).toContain("Seleccionado"); expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); expect(document.activeElement).toBe(field());
    await act(async () => field().click()); expect(field().getAttribute("aria-label")).toContain("Seleccionado");
  });

  it("moves selected fields with arrows, uses Shift for a larger step, and respects bounds", async () => {
    await render(); field().focus(); await act(async () => key(field(), " ")); await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const initial = field().style.left; await act(async () => key(field(), "ArrowRight")); expect(field().style.left).not.toBe(initial);
    await act(async () => key(field(), "ArrowRight", true)); expect(Number.parseFloat(field().style.left)).toBeGreaterThan(Number.parseFloat(initial) + 1);
    await act(async () => key(field(), "ArrowLeft", true)); await act(async () => key(field(), "ArrowLeft", true)); await act(async () => key(field(), "ArrowLeft", true)); expect(Number.parseFloat(field().style.left)).toBe(0);
  });

  it("resizes from the keyboard and traps, closes, and returns focus from the mobile sheet", async () => {
    await render(); field().focus(); await act(async () => key(field(), "Enter"));
    const sheet = container.querySelector<HTMLElement>('[role="dialog"]')!; const controls = [...sheet.querySelectorAll<HTMLButtonElement>("button:not([disabled])")]; controls.at(-1)!.focus(); await act(async () => key(controls.at(-1)!, "Tab")); expect(document.activeElement).toBe(controls[0]);
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); expect(document.activeElement).toBe(field());
    const handle = container.querySelector<HTMLButtonElement>('button[aria-label="Redimensionar campo"]')!; const width = field().style.width; handle.focus(); await act(async () => key(handle, "ArrowRight", true)); expect(Number.parseFloat(field().style.width)).toBeGreaterThan(Number.parseFloat(width));
  });

  it("returns focus to the PDF preview after deleting the selected field", async () => {
    await render(); field().focus(); await act(async () => key(field(), "Enter"));
    const remove = [...container.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent === "Eliminar campo")!; await act(async () => remove.click()); await act(async () => wait());
    expect(document.activeElement).toBe(container.querySelector('[aria-label="Vista previa del PDF"]'));
  });

  it("keeps the mobile sheet open when Escape closes its nested new-data dialog", async () => {
    await render(); field().focus(); await act(async () => key(field(), "Enter"));
    const create = [...container.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent === "+ Crear nuevo dato")!; await act(async () => create.click());
    expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(2);
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(1); expect(container.textContent).toContain("Campo seleccionado");
  });

  it("creates a centered valid field with Enter and keeps its keyboard configuration flow available", async () => {
    await render(); addField().focus(); await act(async () => key(addField(), "Enter")); await act(async () => wait());
    const created = positionedFields()[1]; expect(positionedFields()).toHaveLength(2); expect(created.getAttribute("aria-label")).toContain("Seleccionado");
    expect(Number.parseFloat(created.style.left)).toBeGreaterThanOrEqual(0); expect(Number.parseFloat(created.style.top)).toBeGreaterThanOrEqual(0); expect(Number.parseFloat(created.style.width)).toBeGreaterThanOrEqual(8); expect(Number.parseFloat(created.style.height)).toBeGreaterThanOrEqual(8);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull(); await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); expect(document.activeElement).toBe(created);
    const left = created.style.left; await act(async () => key(created, "ArrowRight")); expect(created.style.left).not.toBe(left);
    const handle = container.querySelector<HTMLButtonElement>('button[aria-label="Redimensionar campo"]')!; const width = created.style.width; handle.focus(); await act(async () => key(handle, "ArrowRight")); expect(created.style.width).not.toBe(width);
  });

  it("keeps pointer drawing available after adding keyboard creation", async () => {
    await render(); vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 400, height: 600 } as DOMRect);
    await act(async () => addField().click()); const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!; const drawingLayer = container.querySelector<HTMLElement>('[aria-label="Área para dibujar un campo"]')!;
    await act(async () => drawingLayer.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 20, clientY: 20 }))); await act(async () => canvas.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 140, clientY: 80 }))); await act(async () => canvas.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 140, clientY: 80 })));
    expect(positionedFields()).toHaveLength(2);
  });

  it("creates a field without opening mobile configuration, then opens it on tap", async () => {
    await render();
    await act(async () => addField().click());
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    const drawingLayer = container.querySelector<HTMLElement>('[aria-label="Área para dibujar un campo"]')!;
    await act(async () => drawingLayer.dispatchEvent(pointer("pointerdown", 1, 20, 20)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 1, 140, 80)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 1, 140, 80)));
    expect(positionedFields()).toHaveLength(2);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => positionedFields()[1].click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("opens configuration on a real tap", async () => {
    await render();
    await act(async () => field().click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("moves a field after the threshold without opening configuration", async () => {
    await render();
    field().focus();
    await act(async () => key(field(), "Enter"));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    const initialLeft = field().style.left;
    await act(async () => field().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })));
    await act(async () => canvas.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 120, clientY: 120 })));
    await act(async () => canvas.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 120, clientY: 120 })));
    await act(async () => field().click());
    expect(field().style.left).not.toBe(initialLeft);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps a movement below the threshold as a tap", async () => {
    await render();
    field().focus();
    await act(async () => key(field(), "Enter"));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    const initialLeft = field().style.left;
    await act(async () => field().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })));
    await act(async () => canvas.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 105, clientY: 105 })));
    await act(async () => canvas.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 105, clientY: 105 })));
    await act(async () => field().click());
    expect(field().style.left).toBe(initialLeft);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("does not open configuration after resizing", async () => {
    await render();
    field().focus();
    await act(async () => key(field(), "Enter"));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const handle = container.querySelector<HTMLButtonElement>('button[aria-label="Redimensionar campo"]')!;
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    const initialWidth = field().style.width;
    await act(async () => handle.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 200, clientY: 200 })));
    await act(async () => canvas.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 220, clientY: 220 })));
    await act(async () => canvas.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 220, clientY: 220 })));
    expect(field().style.width).not.toBe(initialWidth);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("cleans the gesture on pointercancel", async () => {
    await render();
    field().focus();
    await act(async () => key(field(), "Enter"));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    await act(async () => field().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })));
    await act(async () => canvas.dispatchEvent(new MouseEvent("pointercancel", { bubbles: true, clientX: 120, clientY: 120 })));
    await act(async () => field().click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("keeps mouse dragging working", async () => {
    await render();
    field().focus();
    await act(async () => key(field(), "Enter"));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    const initialTop = field().style.top;
    await act(async () => field().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })));
    await act(async () => canvas.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 100, clientY: 140 })));
    await act(async () => canvas.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 100, clientY: 140 })));
    expect(field().style.top).not.toBe(initialTop);
  });

  it("does not zoom during a one-pointer field drag", async () => {
    await render();
    field().focus();
    await act(async () => key(field(), "Enter"));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    await act(async () => field().dispatchEvent(pointer("pointerdown", 1, 100, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 1, 140, 140)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 1, 140, 140)));
    expect(container.textContent).toContain("Zoom 100%");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("cancels a field drag when a second pointer starts a pinch", async () => {
    await render();
    field().focus();
    await act(async () => key(field(), "Enter"));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    const initialLeft = field().style.left;
    await act(async () => field().dispatchEvent(pointer("pointerdown", 1, 100, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 1, 120, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointerdown", 2, 200, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 2, 260, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 2, 260, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 1, 180, 180)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 1, 180, 180)));
    expect(container.textContent).toContain("Zoom 175%");
    expect(Number.parseFloat(field().style.left)).toBeCloseTo(Number.parseFloat(initialLeft) * 1.75);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("cancels creation when a second pointer starts a pinch", async () => {
    await render();
    await act(async () => addField().click());
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    const drawingLayer = container.querySelector<HTMLElement>('[aria-label="Área para dibujar un campo"]')!;
    await act(async () => drawingLayer.dispatchEvent(pointer("pointerdown", 1, 20, 20)));
    await act(async () => canvas.dispatchEvent(pointer("pointerdown", 2, 200, 20)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 2, 260, 20)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 2, 260, 20)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 1, 140, 80)));
    expect(positionedFields()).toHaveLength(1);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("requires a new pointerdown after pinch before dragging again", async () => {
    await render();
    field().focus();
    await act(async () => key(field(), "Enter"));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    await act(async () => field().dispatchEvent(pointer("pointerdown", 1, 100, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointerdown", 2, 200, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 2, 260, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 2, 260, 100)));
    const afterPinch = field().style.left;
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 1, 180, 180)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 1, 180, 180)));
    expect(field().style.left).toBe(afterPinch);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => field().dispatchEvent(pointer("pointerdown", 3, 100, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 3, 140, 140)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 3, 140, 140)));
    expect(field().style.left).not.toBe(afterPinch);
  });

  it("closes the mobile sheet when its handle is dragged down", async () => {
    await render();
    await act(async () => field().click());
    const handle = container.querySelector<HTMLButtonElement>('button[aria-label="Expandir configuración"]')!;
    expect(container.querySelector<HTMLButtonElement>('button[aria-label="Cerrar configuración"]')?.className).toContain("h-12");
    await act(async () => handle.dispatchEvent(pointer("pointerdown", 1, 200, 100)));
    await act(async () => handle.dispatchEvent(pointer("pointermove", 1, 200, 170)));
    await act(async () => handle.dispatchEvent(pointer("pointerup", 1, 200, 170)));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("expands the mobile sheet when its handle is dragged up", async () => {
    await render();
    await act(async () => field().click());
    const handle = container.querySelector<HTMLButtonElement>('button[aria-label="Expandir configuración"]')!;
    await act(async () => handle.dispatchEvent(pointer("pointerdown", 1, 200, 170)));
    await act(async () => handle.dispatchEvent(pointer("pointermove", 1, 200, 100)));
    await act(async () => handle.dispatchEvent(pointer("pointerup", 1, 200, 100)));
    expect(container.querySelector('[role="dialog"]')?.className).toContain("max-h-[90dvh]");
  });

  it("updates zoom with visible controls and respects its limits", async () => {
    await render();
    const decrease = () => container.querySelector<HTMLButtonElement>('button[aria-label="Reducir zoom"]')!;
    const increase = () => container.querySelector<HTMLButtonElement>('button[aria-label="Aumentar zoom"]')!;
    expect(container.textContent).toContain("Zoom 100%");
    await act(async () => increase().click());
    expect(container.textContent).toContain("Zoom 125%");
    await act(async () => Array.from({ length: 10 }, () => increase().click()));
    expect(container.textContent).toContain("Zoom 250%");
    expect(increase().disabled).toBe(true);
    await act(async () => Array.from({ length: 10 }, () => decrease().click()));
    expect(container.textContent).toContain("Zoom 75%");
    expect(decrease().disabled).toBe(true);
  });

  it("scales the PDF page and field overlay with the same viewport", async () => {
    await render();
    const page = () => container.querySelector<HTMLElement>("[data-pdf-page-width]")!;
    const positioned = () => positionedFields()[0];
    expect(page().dataset.pdfPageWidth).toBe("400");
    expect(Number.parseFloat(positioned().style.width)).toBe(100);
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Aumentar zoom"]')!.click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Aumentar zoom"]')!.click());
    expect(page().dataset.pdfPageWidth).toBe("600");
    expect(Number.parseFloat(positioned().style.width)).toBe(150);
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Aumentar zoom"]')!.click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Aumentar zoom"]')!.click());
    expect(page().dataset.pdfPageWidth).toBe("800");
    expect(Number.parseFloat(positioned().style.left)).toBe(20);
    expect(Number.parseFloat(positioned().style.width)).toBe(200);
  });

  it("does not change field coordinates just by zooming", async () => {
    await render();
    const initial = {
      left: field().style.left,
      top: field().style.top,
      width: field().style.width,
      height: field().style.height,
    };
    const increase = () => container.querySelector<HTMLButtonElement>('button[aria-label="Aumentar zoom"]')!;
    const decrease = () => container.querySelector<HTMLButtonElement>('button[aria-label="Reducir zoom"]')!;
    await act(async () => Array.from({ length: 4 }, () => increase().click()));
    await act(async () => Array.from({ length: 4 }, () => decrease().click()));
    expect({ left: field().style.left, top: field().style.top, width: field().style.width, height: field().style.height }).toEqual(initial);
    const save = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Guardar cambios"));
    expect(save?.disabled).toBe(true);
  });

  it("pinches to zoom without moving or configuring a field", async () => {
    await render();
    field().focus();
    await act(async () => key(field(), "Enter"));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    const initialLeft = field().style.left;
    await act(async () => field().dispatchEvent(pointer("pointerdown", 1, 100, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointerdown", 2, 200, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 2, 260, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 2, 260, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 1, 100, 100)));
    expect(container.textContent).toContain("Zoom 160%");
    expect(Number.parseFloat(field().style.left)).toBeCloseTo(Number.parseFloat(initialLeft) * 1.6);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps field drag and resize aligned when zoomed", async () => {
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Aumentar zoom"]')!.click());
    field().focus();
    await act(async () => key(field(), "Enter"));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    const canvas = container.querySelector<HTMLElement>('[aria-label="Vista previa del PDF"]')!;
    const initialLeft = Number.parseFloat(field().style.left);
    const initialWidth = Number.parseFloat(field().style.width);
    await act(async () => field().dispatchEvent(pointer("pointerdown", 1, 100, 100)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 1, 125, 125)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 1, 125, 125)));
    expect(Number.parseFloat(field().style.left)).toBeCloseTo(initialLeft + 25);
    const handle = container.querySelector<HTMLButtonElement>('button[aria-label="Redimensionar campo"]')!;
    await act(async () => handle.dispatchEvent(pointer("pointerdown", 2, 200, 200)));
    await act(async () => canvas.dispatchEvent(pointer("pointermove", 2, 225, 225)));
    await act(async () => canvas.dispatchEvent(pointer("pointerup", 2, 225, 225)));
    expect(Number.parseFloat(field().style.width)).toBeCloseTo(initialWidth + 25);
  });
});
