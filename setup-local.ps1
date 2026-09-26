# Vanilla Activepieces local Docker setup
# Run once: .\setup-local.ps1

$ErrorActionPreference = "Stop"

# Generate secrets
$encKey = -join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jwtBytes = New-Object byte[] 32; $rng.GetBytes($jwtBytes); $jwtSecret = [Convert]::ToBase64String($jwtBytes)
$apiBytes = New-Object byte[] 24; $rng.GetBytes($apiBytes); $apiKey = [Convert]::ToBase64String($apiBytes)
$pgPass = -join ((1..24) | ForEach-Object { [char](Get-Random -Min 65 -Max 90) })

$env_content = @"
AP_ENGINE_EXECUTABLE_PATH=dist/packages/engine/main.js

AP_API_KEY=$apiKey

AP_ENCRYPTION_KEY=$encKey

AP_JWT_SECRET=$jwtSecret

AP_ENVIRONMENT=prod
AP_FRONTEND_URL=http://localhost:8080
AP_WEBHOOK_TIMEOUT_SECONDS=30
AP_TRIGGER_DEFAULT_POLL_INTERVAL=5

AP_POSTGRES_DATABASE=activepieces
AP_POSTGRES_HOST=postgres
AP_POSTGRES_PORT=5432
AP_POSTGRES_USERNAME=postgres
AP_POSTGRES_PASSWORD=$pgPass

AP_EXECUTION_MODE=UNSANDBOXED

AP_REDIS_HOST=redis
AP_REDIS_PORT=6379

AP_FLOW_TIMEOUT_SECONDS=600
AP_TELEMETRY_ENABLED=false
AP_TEMPLATES_SOURCE_URL="https://cloud.activepieces.com/api/v1/flow-templates"

AP_TOOL_SEARCH_ENABLED=false
AP_OPENAI_API_KEY=
"@

if (Test-Path ".env") {
    Write-Host "[SKIP] .env already exists, not overwriting." -ForegroundColor Yellow
} else {
    $env_content | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
    Write-Host "[OK] .env created" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting containers..." -ForegroundColor Cyan
docker compose up -d

Write-Host ""
Write-Host "Done! Open http://localhost:8080" -ForegroundColor Green
Write-Host "To watch logs: docker compose logs -f app"
