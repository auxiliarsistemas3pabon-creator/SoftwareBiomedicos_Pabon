import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Appearance } from "react-native";
import { colorScheme as nwColorScheme } from "nativewind";
import { asyncStorage } from "@/lib/storage";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  // Tokens semánticos resueltos para usar en lugares donde no se puede aplicar
  // className (ej. props como `barStyle` del StatusBar, sombras, etc.).
  colors: ThemeColors;
}

interface ThemeColors {
  bg: string;
  bgMuted: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
}

const lightColors: ThemeColors = {
  bg: "#ffffff",
  bgMuted: "#f9fafb",
  surface: "#ffffff",
  border: "#e5e7eb",
  text: "#111827",
  textMuted: "#6b7280",
  primary: "#d71920",
  primaryDark: "#b2141a",
};

const darkColors: ThemeColors = {
  bg: "#0b0f17",
  bgMuted: "#111827",
  surface: "#131a26",
  border: "#1f2937",
  text: "#f3f4f6",
  textMuted: "#9ca3af",
  primary: "#d71920",
  primaryDark: "#b2141a",
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const sys = Appearance.getColorScheme();
    return sys === "dark" ? "dark" : "light";
  });

  // Hidratación: si el usuario eligió un tema explícito en una sesión
  // anterior, lo respetamos sobre el tema del sistema.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await asyncStorage.get(STORAGE_KEY);
      if (!cancelled && (stored === "light" || stored === "dark")) {
        setThemeState(stored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sincroniza con NativeWind (la clase `dark:*` necesita esto para reaccionar).
  useEffect(() => {
    nwColorScheme.set(theme);
    asyncStorage.set(STORAGE_KEY, theme).catch(() => undefined);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () =>
    setThemeState((t) => (t === "light" ? "dark" : "light"));

  const colors = theme === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
