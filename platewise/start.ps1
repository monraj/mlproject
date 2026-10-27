# PlateWise for Windows: install everything, ask for an AI key once, then start the server and the app.
# Easiest: double-click start.bat in this folder.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Need($cmd, $what, $url) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Write-Host "Please install $what first: $url"; Read-Host 'Press Enter to close'; exit 1 }
}
Need 'python' 'Python 3.12 or newer (tick "Add python.exe to PATH" when installing)' 'https://www.python.org/downloads/'
Need 'node' 'Node.js 20 or newer' 'https://nodejs.org'
& python -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)"
if ($LASTEXITCODE -ne 0) { Write-Host 'Python 3.12 or newer is needed.'; Read-Host 'Press Enter to close'; exit 1 }

$envFile = 'backend\.env'
if (-not (Test-Path $envFile)) { Copy-Item 'backend\.env.example' $envFile }
$content = Get-Content $envFile -Raw
if ($content -notmatch '(?m)^(GEMINI|OPENAI|ANTHROPIC)_API_KEY=.+') {
  Write-Host ''
  Write-Host 'Paste your Gemini API key and press Enter.'
  Write-Host "(Nothing shows while you paste; that's normal. Press Enter with nothing to use demo mode.)"
  $secure = Read-Host -AsSecureString
  $key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)).Trim()
  if ($key) {
    $content = [regex]::Replace($content, '(?m)^GEMINI_API_KEY=.*$', { param($m) "GEMINI_API_KEY=$key" })
    Set-Content -Path $envFile -Value $content -NoNewline
    Write-Host "Saved your key to platewise\$envFile (this file is never uploaded to GitHub)."
  } else {
    Write-Host 'No key: starting in demo mode. Run this again to add one.'
  }
}

Write-Host ''
Write-Host 'Installing the server (first time takes a minute)...'
if (-not (Test-Path 'backend\.venv\Scripts\python.exe')) { & python -m venv backend\.venv }
& backend\.venv\Scripts\python.exe -m pip install -q --upgrade pip | Out-Null
& backend\.venv\Scripts\python.exe -m pip install -q -r backend\requirements.txt

Write-Host 'Installing the app (first time takes a few minutes)...'
if (-not (Test-Path 'mobile\node_modules')) { Push-Location mobile; & npm install --no-audit --no-fund; Pop-Location }

Write-Host 'Starting the server on port 8000...'
$server = Start-Process -FilePath "$PSScriptRoot\backend\.venv\Scripts\python.exe" -ArgumentList '-m','uvicorn','app.main:app','--host','0.0.0.0','--port','8000' -WorkingDirectory "$PSScriptRoot\backend" -PassThru -NoNewWindow
try {
  $health = $null
  for ($i = 0; $i -lt 30 -and -not $health; $i++) {
    try { $health = Invoke-RestMethod 'http://localhost:8000/health' } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $health) { Write-Host "The server didn't start. Scroll up for the error."; Read-Host 'Press Enter to close'; exit 1 }
  if ($health.demo) { Write-Host 'Server running in DEMO mode (no AI key found).' } else { Write-Host "Server running with real AI: $($health.ai)" }

  Write-Host ''
  Write-Host 'Starting the app. Scan the QR code with Expo Go (Android) or the Camera app (iPhone).'
  Write-Host 'Your phone must be on the same Wi-Fi as this computer. Press Ctrl+C to stop everything.'
  Write-Host 'If Windows asks about network access for Python or Node, click Allow (private networks).'
  Push-Location mobile
  & npx expo start
  Pop-Location
} finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
