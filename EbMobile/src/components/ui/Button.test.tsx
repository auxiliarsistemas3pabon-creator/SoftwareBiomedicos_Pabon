import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { Button } from "./Button";

// @testing-library/react-native v14: `render()` y `fireEvent.*` son ahora
// async (devuelven Promise) para calzar con el act() de React 19 — de ahí
// el await en cada test.
describe("Button", () => {
  it("renders its children text", async () => {
    const { getByText } = await render(<Button>Guardar</Button>);
    expect(getByText("Guardar")).toBeTruthy();
  });

  it("calls onPress when pressed", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button onPress={onPress}>Guardar</Button>);

    await fireEvent.press(getByText("Guardar"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress while loading", async () => {
    const onPress = jest.fn();
    const { root } = await render(
      <Button onPress={onPress} loading>
        Guardar
      </Button>,
    );

    // Con loading=true no se pinta el texto (se muestra el ActivityIndicator
    // en su lugar): la única forma de llegar al Pressable es por el nodo
    // raíz, ya que UNSAFE_getByType ya no existe en esta versión de RNTL.
    await fireEvent.press(root!);

    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not call onPress when disabled", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <Button onPress={onPress} disabled>
        Guardar
      </Button>,
    );

    await fireEvent.press(getByText("Guardar"));

    expect(onPress).not.toHaveBeenCalled();
  });

  it("renders a leftIcon when provided and not loading", async () => {
    const { getByText } = await render(
      <Button leftIcon={<Text>icono</Text>}>
        <Text>Guardar</Text>
      </Button>,
    );
    expect(getByText("icono")).toBeTruthy();
  });
});
