import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
  /**
   * Cuando cambia (normalmente la ruta actual), el boundary se limpia solo:
   * así, si una vista revienta, navegar a otra desde el menú vuelve a
   * funcionar sin recargar la página.
   */
  resetKey?: string;
  /** Etiqueta para el log de consola (ej. "panel", "público"). */
  scope?: string;
}

interface State {
  error: Error | null;
}

/**
 * Captura los errores de render de cualquier vista hija y muestra un
 * mensaje recuperable en vez de dejar la pantalla en blanco (React desmonta
 * todo el árbol cuando una excepción sube sin capturar).
 *
 * Tiene que ser un componente de clase: `getDerivedStateFromError` /
 * `componentDidCatch` no tienen equivalente en hooks.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    // Al cambiar de ruta limpiamos el error para reintentar el render.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En v1 no hay servicio de telemetría; al menos dejamos rastro para
    // depurar desde la consola del navegador.
    const tag = this.props.scope ? `ErrorBoundary · ${this.props.scope}` : "ErrorBoundary";
    console.error(`[${tag}]`, error, info.componentStack);
  }

  private handleRetry = () => this.setState({ error: null });

  private handleReload = () => window.location.reload();

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300">
          <AlertTriangle size={26} />
        </div>
        <h1 className="text-xl font-bold text-app sm:text-2xl">
          Algo salió mal en esta pantalla
        </h1>
        <p className="text-sm text-app-muted">
          No pudimos mostrar el contenido. Tu sesión sigue activa: puedes
          reintentar, ir al panel o recargar la página.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={this.handleRetry}>
            Reintentar
          </Button>
          <Button onClick={this.handleReload}>Recargar la página</Button>
        </div>
      </div>
    );
  }
}
