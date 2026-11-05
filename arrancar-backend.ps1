# Arranca el backend (backend) tras el reinicio que instaló WSL2.
# Uso:  powershell -ExecutionPolicy Bypass -File .\arrancar-backend.ps1

$root = Split-Path $MyInvocation.MyCommand.Path

# PATH fresco (Node/pnpm/git ya quedan en el PATH del sistema tras el reinicio)
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")

Write-Host "==> Esperando a que Docker Desktop levante el daemon..." -ForegroundColor Cyan
$dd = "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
if (Test-Path $dd) { Start-Process $dd }

$ok = $false
for ($i = 0; $i -lt 60; $i++) {
    try { $v = & docker version --format '{{.Server.Version}}' 2>$null } catch { $v = $null }
    if ($LASTEXITCODE -eq 0 -and $v) { $ok = $true; break }
    Start-Sleep 5
}
if (-not $ok) { Write-Error "El daemon de Docker no respondio tras 5 min. Abre Docker Desktop, acepta la licencia y reintenta."; exit 1 }
Write-Host "    Docker OK" -ForegroundColor Green

Set-Location "$root\backend"
Write-Host "==> docker compose --profile autoheal up -d --build" -ForegroundColor Cyan
docker compose --profile autoheal up -d --build

Write-Host "==> Estado de los contenedores:" -ForegroundColor Cyan
docker compose ps

Write-Host ""
Write-Host "Backend arriba:" -ForegroundColor Green
Write-Host "  API      http://localhost:8010"
Write-Host "  Swagger  http://localhost:8010/api/docs/"
Write-Host "  Flower   http://localhost:5555"
Write-Host "  Mailpit  http://localhost:8025"
Write-Host ""
Write-Host "Crea tu usuario admin (no hay datos semilla):" -ForegroundColor Yellow
Write-Host "  docker compose exec web python manage.py createsuperuser"
Write-Host ""
Write-Host "Frontend web:  cd ..\frontend ; pnpm dev   -> http://127.0.0.1:5173"
Write-Host "App movil:     cd ..\EbMobile ; npm start"
