import { Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <Header />
      <div className="flex min-w-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Si una vista revienta, el header y el menú siguen usables y al
              navegar a otra ruta el boundary se limpia solo. */}
          <ErrorBoundary scope="panel" resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <Footer />
    </div>
  );
}