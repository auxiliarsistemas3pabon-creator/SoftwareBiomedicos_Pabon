module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 + Expo SDK 54: babel-preset-expo ya registra el plugin de
    // worklets automáticamente. Añadirlo aquí causa "Exception in HostFunction".
  };
};
