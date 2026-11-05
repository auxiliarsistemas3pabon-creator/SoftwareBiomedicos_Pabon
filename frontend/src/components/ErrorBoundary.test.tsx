import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom({ crash }: { crash: boolean }): React.ReactElement {
  if (crash) throw new Error("boom");
  return <p>contenido ok</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React vuelca el error a consola aunque el boundary lo capture.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>contenido ok</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("contenido ok")).toBeInTheDocument();
  });

  it("shows a recoverable message instead of a blank screen when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom crash />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole("heading", { name: /algo salió mal/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Recargar la página" }),
    ).toBeInTheDocument();
  });

  it("retries the render when the user clicks 'Reintentar' after the cause is gone", async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Boom crash />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: /algo salió mal/i })).toBeInTheDocument();

    // La causa desaparece (ej. el backend ya responde), pero el boundary
    // sigue mostrando el fallback hasta que el usuario reintenta.
    rerender(
      <ErrorBoundary>
        <Boom crash={false} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("contenido ok")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByText("contenido ok")).toBeInTheDocument();
  });

  it("clears the error on its own when resetKey changes (route navigation)", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/admin/equipos">
        <Boom crash />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: /algo salió mal/i })).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="/admin/fallas">
        <Boom crash={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("contenido ok")).toBeInTheDocument();
  });
});
