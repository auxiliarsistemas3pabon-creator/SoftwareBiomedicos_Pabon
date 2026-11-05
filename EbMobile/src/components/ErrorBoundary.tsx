import { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";
import { TriangleAlert } from "lucide-react-native";
import { Button } from "./ui/Button";

interface Props {
  children: ReactNode;
  /** Etiqueta para el log de consola (ej. "app"). */
  scope?: string;
}

interface State {
  error: Error | null;
}

/**
 * Captura los errores de render de la app y muestra un mensaje recuperable
 * en vez de dejarla en un estado roto/en blanco (sin esto, una excepción de
 * render sin capturar no tiene ninguna UI de recuperación en producción).
 *
 * Tiene que ser un componente de clase: `getDerivedStateFromError` /
 * `componentDidCatch` no tienen equivalente en hooks.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const tag = this.props.scope ? `ErrorBoundary · ${this.props.scope}` : "ErrorBoundary";
    console.warn(`[${tag}]`, error, info.componentStack);
  }

  private handleRetry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center gap-4 bg-app-bg px-6 dark:bg-app-dark-bg">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/50">
          <TriangleAlert size={26} color="#dc2626" />
        </View>
        <Text className="text-center text-xl font-bold text-app-text dark:text-app-dark-text">
          Algo salió mal
        </Text>
        <Text className="text-center text-sm text-app-text-muted dark:text-app-dark-text-muted">
          No pudimos mostrar esta pantalla. Tu sesión sigue activa: puedes
          reintentar.
        </Text>
        <Button onPress={this.handleRetry}>Reintentar</Button>
      </View>
    );
  }
}
