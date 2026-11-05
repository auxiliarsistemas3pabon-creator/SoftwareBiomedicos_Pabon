// jest-expo trae el preset correcto para RN/Expo (transform de Babel, mocks
// de módulos nativos, extensiones de assets, etc.) — ver
// https://docs.expo.dev/develop/unit-testing/
module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    // Mismo alias "@/*" -> "src/*" que tsconfig.json y babel/metro ya usan.
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // No pisamos transformIgnorePatterns: el preset de jest-expo ya trae uno
  // curado para RN/Expo/react-navigation/etc.; declarar el nuestro lo
  // REEMPLAZA en vez de extenderlo, y perderíamos esas exclusiones.
};
