/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Identidad visual de Clínica Pabón (réplica del web)
        primary: {
          DEFAULT: "#d71920",
          dark: "#b2141a",
          darker: "#7a0d12",
        },
        secondary: "#111827",
        // Tokens semánticos light/dark (resueltos manualmente con `theme`
        // del contexto, ya que NativeWind no expone variables CSS dinámicas
        // como en el web).
        app: {
          bg: "#ffffff",
          "bg-muted": "#f9fafb",
          surface: "#ffffff",
          border: "#e5e7eb",
          text: "#111827",
          "text-muted": "#6b7280",
        },
        "app-dark": {
          bg: "#0b0f17",
          "bg-muted": "#111827",
          surface: "#131a26",
          border: "#1f2937",
          text: "#f3f4f6",
          "text-muted": "#9ca3af",
        },
      },
      fontFamily: {
        sans: ["Inter", "System"],
      },
    },
  },
  plugins: [],
};
