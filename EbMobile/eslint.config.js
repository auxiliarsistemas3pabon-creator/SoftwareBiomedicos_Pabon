// Config plana (flat config) usando el preset oficial de Expo, que ya trae
// reglas de TypeScript + React + React Native/Expo y los globals correctos
// (__DEV__, fetch, etc.) — ver node_modules/eslint-config-expo/README.md.
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");
const { defineConfig, globalIgnores } = require("eslint/config");

module.exports = defineConfig([
  globalIgnores([".expo", "dist", "android", "ios"]),
  expoConfig,
  // Va al final: apaga cualquier regla de estilo de ESLint que choque con
  // Prettier, para que el formato lo decida solo Prettier.
  prettierConfig,
]);
