import { Construction } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-screen-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-app-muted">{description}</p>
        )}
      </div>

      <Card padding="lg">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Construction size={26} />
          </div>
          <h2 className="text-base font-semibold text-app">Vista en construcción</h2>
          <p className="max-w-md text-sm text-app-muted">
            Esta sección se conectará al backend cuando esté disponible. Por
            ahora se muestra como vista mock.
          </p>
        </div>
      </Card>
    </div>
  );
}
