import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { getApiErrorMessage, getApiFieldErrors } from "./api";

function axiosErrorWithData(data: unknown, status = 400): AxiosError {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    {
      status,
      statusText: "Bad Request",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data,
    },
  );
}

describe("getApiErrorMessage", () => {
  it("returns the string body verbatim", () => {
    expect(getApiErrorMessage(axiosErrorWithData("Credenciales inválidas"))).toBe(
      "Credenciales inválidas",
    );
  });

  it("ignores Django HTML/CSS 500 dumps and uses the fallback", () => {
    const html = axiosErrorWithData("<!DOCTYPE html><html><body>Traceback</body></html>", 500);
    html.response!.headers = { "content-type": "text/html; charset=utf-8" };
    expect(getApiErrorMessage(html, "Error al guardar")).toBe("Error al guardar");

    const css = axiosErrorWithData("h1 { font-weight:normal; }\nh2 { margin-bottom:.8em; }", 500);
    expect(getApiErrorMessage(css, "Error al guardar")).toBe("Error al guardar");
  });

  it("prefers DRF's `detail` field when present", () => {
    const error = axiosErrorWithData({ detail: "No autorizado." });
    expect(getApiErrorMessage(error)).toBe("No autorizado.");
  });

  it("falls back to the first field error array (DRF validation shape)", () => {
    const error = axiosErrorWithData({
      email: ["Este campo es obligatorio."],
    });
    expect(getApiErrorMessage(error)).toBe("Este campo es obligatorio.");
  });

  it("falls back to the provided default for a non-axios error", () => {
    expect(getApiErrorMessage(new Error("boom"))).toBe("boom");
    expect(getApiErrorMessage("algo raro", "Ocurrió un error")).toBe(
      "Ocurrió un error",
    );
  });

  it("uses the custom fallback message when nothing else matches", () => {
    const error = axiosErrorWithData({});
    expect(getApiErrorMessage(error, "Fallback")).toBe("Request failed");
  });
});

describe("getApiFieldErrors", () => {
  it("maps a DRF 400 validation body to a flat { field: message } object", () => {
    const error = axiosErrorWithData({
      phone: ["Este campo es requerido."],
      name: ["Ya existe una sede con este nombre."],
    });
    expect(getApiFieldErrors(error)).toEqual({
      phone: "Este campo es requerido.",
      name: "Ya existe una sede con este nombre.",
    });
  });

  it("puts non_field_errors and detail under the empty key", () => {
    expect(getApiFieldErrors(axiosErrorWithData({ non_field_errors: ["Conflicto."] }))).toEqual({
      "": "Conflicto.",
    });
    expect(getApiFieldErrors(axiosErrorWithData({ detail: "No autorizado." }))).toEqual({
      "": "No autorizado.",
    });
  });

  it("returns {} for non-400 responses and non-axios errors", () => {
    expect(getApiFieldErrors(axiosErrorWithData({ phone: ["x"] }, 500))).toEqual({});
    expect(getApiFieldErrors(new Error("boom"))).toEqual({});
    expect(getApiFieldErrors(axiosErrorWithData("texto plano"))).toEqual({});
  });
});
