// Se carga una vez antes de toda la suite (ver `test.setupFiles` en
// vite.config.ts). Registra los matchers de jest-dom (toBeInTheDocument,
// toHaveClass, etc.) sobre `expect` de Vitest.
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// @testing-library/react solo registra su propio afterEach(cleanup) cuando
// detecta un `afterEach` global (test.globals: true en la config). Como acá
// no usamos globals (imports explícitos de "vitest" en cada test), sin esto
// el DOM montado por `render()` se acumula entre tests del mismo archivo.
afterEach(() => {
  cleanup();
});
