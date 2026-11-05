import { Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function MainLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <Header />
      <main className="flex-1">
        <ErrorBoundary scope="público" resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
