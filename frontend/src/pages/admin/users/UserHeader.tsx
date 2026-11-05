export function UserHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-app">Usuarios</h1>
        <p className="text-sm text-app-muted">
          Administra los usuarios del sistema y sus roles.
        </p>
      </div>
    </div>
  );
}
