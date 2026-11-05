import { Pressable } from "react-native";
import { Moon, Sun } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme, colors } = useTheme();
  return (
    <Pressable
      onPress={toggleTheme}
      hitSlop={8}
      accessibilityLabel="Cambiar tema"
      className="h-9 w-9 items-center justify-center rounded-full bg-app-bg-muted dark:bg-app-dark-bg-muted"
    >
      {theme === "dark" ? (
        <Sun size={18} color={colors.text} />
      ) : (
        <Moon size={18} color={colors.text} />
      )}
    </Pressable>
  );
}
