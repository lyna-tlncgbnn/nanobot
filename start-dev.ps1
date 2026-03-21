$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$uiRoot = Join-Path $repoRoot "ui"
$apiBase = "http://127.0.0.1:8000"
$apiPort = 8000
$gatewayPort = 18790

function Get-NanobotLaunchCommand {
    if (Get-Command nanobot -ErrorAction SilentlyContinue) {
        return "nanobot"
    }

    if (Get-Command python -ErrorAction SilentlyContinue) {
        return "python -m nanobot"
    }

    throw "Neither 'nanobot' nor 'python' was found in PATH."
}

$nanobot = Get-NanobotLaunchCommand

$apiCommand = @"
Set-Location '$repoRoot'
$nanobot api --host 127.0.0.1 --port $apiPort
"@

$gatewayCommand = @"
Set-Location '$repoRoot'
$nanobot gateway -p $gatewayPort
"@

$uiCommand = @"
`$env:NEXT_PUBLIC_NANOBOT_API_BASE='$apiBase'
Set-Location '$uiRoot'
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCommand | Out-Null
Start-Process powershell -ArgumentList "-NoExit", "-Command", $gatewayCommand | Out-Null
Start-Process powershell -ArgumentList "-NoExit", "-Command", $uiCommand | Out-Null

Write-Host "Started nanobot dev stack:"
Write-Host "  API:     $apiBase"
Write-Host "  Gateway: http://127.0.0.1:$gatewayPort"
Write-Host "  UI:      http://localhost:3000"
