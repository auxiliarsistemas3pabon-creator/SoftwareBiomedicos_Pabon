import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom({ crash }: { crash: boolean }) {
  if (crash) throw new Error("boom");
  return <Text>contenido ok</Text>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React vuelca el error a consola aunque el boundary lo capture.
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders its children when nothing throws", async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <Text>contenido ok</Text>
      </ErrorBoundary>,
    );
    expect(getByText("contenido ok")).toBeTruthy();
  });

  it("shows a recoverable message instead of a blank/broken screen when a child throws", async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <Boom crash />
      </ErrorBoundary>,
    );
    expect(getByText("Algo salió mal")).toBeTruthy();
    expect(getByText("Reintentar")).toBeTruthy();
  });

  it("retries the render when the user presses 'Reintentar' after the cause is gone", async () => {
    const { getByText, rerender } = await render(
      <ErrorBoundary>
        <Boom crash />
      </ErrorBoundary>,
    );
    expect(getByText("Algo salió mal")).toBeTruthy();

    // La causa desaparece (ej. el backend ya responde), pero el boundary
    // sigue mostrando el fallback hasta que el usuario reintenta.
    await rerender(
      <ErrorBoundary>
        <Boom crash={false} />
      </ErrorBoundary>,
    );
    expect(getByText("Algo salió mal")).toBeTruthy();

    await fireEvent.press(getByText("Reintentar"));
    expect(getByText("contenido ok")).toBeTruthy();
  });
});
