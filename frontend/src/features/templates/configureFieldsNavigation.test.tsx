// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

vi.mock("react-pdf", async () => {
  const { createElement } = await import("react");
  return {
    Document: ({ children }: { children: React.ReactNode }) =>
      createElement("div", null, children),
    Page: () => createElement("div"),
    pdfjs: { GlobalWorkerOptions: {} },
  };
});

vi.mock("@/features/templates/PositionedFieldEditor", async () => {
  const { createElement } = await import("react");
  return {
    PositionedFieldEditor: ({
      templateId,
      variant,
    }: {
      templateId: string;
      variant: { id: string };
    }) =>
      createElement("div", {
        "data-testid": "positioned-field-editor",
        "data-template-id": templateId,
        "data-variant-id": variant.id,
      }),
  };
});

const template = {
  id: "template-1",
  nombre: "Permiso gremial",
  descripcion: "",
  documentType: "PERMISO_GREMIAL",
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const variant = {
  id: "variant-1",
  templateId: template.id,
  nombre: "Firma A",
  active: true,
  legacyPositioned: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

let root: Root;
let container: HTMLDivElement;
let observedPathname = "";
let observedPathnames: string[] = [];

function LocationObserver() {
  observedPathname = useLocation().pathname;
  observedPathnames.push(observedPathname);
  return null;
}

function response(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function waitFor(assertion: () => void) {
  const deadline = Date.now() + 2_000;
  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 20));
      });
    }
  }
}

describe("Configurar campos navigation", () => {
  beforeEach(() => {
    observedPathname = "";
    observedPathnames = [];
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
    URL.createObjectURL = vi.fn(() => "blob:variant-pdf");
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const path = new URL(
          typeof input === "string" ? input : input.toString(),
          "http://localhost",
        ).pathname;
        if (path === "/api/v1/auth/me") {
          return response({
            id: "admin-1",
            nombre: "Admin",
            apellido: "STIA",
            dni: "12345678",
            role: "ADMIN",
            firstLogin: false,
          });
        }
        if (path === "/api/v1/templates") return response([template]);
        if (path === "/api/v1/templates/template-1/variants") {
          return response([variant]);
        }
        if (path.endsWith("/fields") || path.endsWith("/fields/acroform")) {
          return response([]);
        }
        if (path.endsWith("/file")) {
          return new Response(new Blob(["pdf"]), { status: 200 });
        }
        throw new Error(`Unexpected request: ${path}`);
      }),
    );
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("navigates from the real variant button to the positioned editor", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
      root = createRoot(container);
      root.render(
        <MemoryRouter initialEntries={["/admin/plantillas/template-1"]}>
          <QueryClientProvider client={client}>
            <LocationObserver />
            <App />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(container.querySelector("button")?.textContent).toBeDefined();
      expect([...container.querySelectorAll("button")].some((button) => button.textContent === "Configurar campos")).toBe(true);
    });

    const configureButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Configurar campos",
    );
    expect(configureButton).toBeDefined();
    await act(async () => configureButton!.click());

    await waitFor(() => {
      expect(observedPathname).toBe(
        "/admin/plantillas/template-1/variantes/variant-1/campos",
      );
      expect(observedPathnames).toContain(
        "/admin/plantillas/template-1/variantes/variant-1/campos",
      );
      const editor = container.querySelector("[data-testid='positioned-field-editor']");
      expect(editor?.getAttribute("data-template-id")).toBe("template-1");
      expect(editor?.getAttribute("data-variant-id")).toBe("variant-1");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/templates/template-1/variants?",
      expect.any(Object),
    );
  });
});
