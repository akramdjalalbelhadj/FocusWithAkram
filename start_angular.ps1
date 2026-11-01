<#
.SYNOPSIS
  Lance FocusWithAkram en local (backend Spring Boot + frontend Angular) sans Docker.

.DESCRIPTION
  - Backend : profil "local" avec PostgreSQL embarque (donnees conservees dans backend/data/postgres).
  - Frontend : serveur de developpement Angular avec proxy /api vers le backend.
  - Ctrl+C arrete proprement les deux processus.

.PARAMETER NodeHome
  Dossier d'un Node.js portable (>= 22.22.3 ou >= 24.15) si le Node du PATH est trop ancien.
  Peut aussi etre fourni par la variable d'environnement FOCUSFLOW_NODE_HOME.

.PARAMETER SkipInstall
  Ne lance pas "npm install" meme si node_modules est absent.

.EXAMPLE
  .\start_angular.ps1
  .\start_angular.ps1 -NodeHome C:\Users\moi\tools\node-v24.22.2-win-x64
#>
[CmdletBinding()]
param(
  [string]$NodeHome = $(if ($env:FOCUSFLOW_NODE_HOME) { $env:FOCUSFLOW_NODE_HOME } else { (Join-Path $PSScriptRoot '.tools/node_modules/node/bin') }),
  [int]$BackendPort = 8080,
  [int]$FrontendPort = 4200,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$LogDir = Join-Path $Root 'logs/angular'
New-Item -ItemType Directory -Force $LogDir | Out-Null

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "ERREUR : $msg" -ForegroundColor Red; exit 1 }

# ---- Pre-requis -------------------------------------------------------------------------------
Write-Step 'Verification des pre-requis'

if (-not (Get-Command java -ErrorAction SilentlyContinue)) { Fail 'Java 25 est requis (commande "java" introuvable).' }
# "java -version" ecrit sur stderr : on passe par cmd pour eviter l'erreur PowerShell 5.1 en mode Stop.
$javaVersion = (cmd /c 'java -version 2>&1' | Select-Object -First 1).ToString()
if ($javaVersion -notmatch '"(\d+)') { Fail "Version Java illisible : $javaVersion" }
if ([int]$Matches[1] -lt 25) { Fail "Java 25 ou superieur requis (detecte : $($Matches[1]))." }

if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) { Fail 'Maven 3.9+ est requis (commande "mvn" introuvable).' }

# Node 24 portable par defaut (modifiable via -NodeHome ou FOCUSFLOW_NODE_HOME). S'il est absent,
# on retombe sur le Node du PATH, verifie plus bas.
if ($NodeHome -and (Test-Path (Join-Path $NodeHome 'node.exe'))) {
  $env:Path = "$NodeHome;$env:Path"
} elseif ($PSBoundParameters.ContainsKey('NodeHome')) {
  Fail "node.exe introuvable dans $NodeHome"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node.js est requis (>= 22.22.3 ou >= 24.15).' }
$nodeVersion = [version]((& node -v).TrimStart('v'))
$nodeOk = ($nodeVersion.Major -ge 26) -or ($nodeVersion.Major -eq 24 -and $nodeVersion.Minor -ge 15) -or
          ($nodeVersion.Major -eq 22 -and ($nodeVersion.Minor -gt 22 -or ($nodeVersion.Minor -eq 22 -and $nodeVersion.Build -ge 3))) -or
          ($nodeVersion.Major -gt 24 -and $nodeVersion.Major -lt 26)
if (-not $nodeOk) { Fail "Node $nodeVersion est trop ancien pour les frontends. Utilisez -NodeHome vers un Node >= 22.22.3 / 24.15." }

foreach ($port in @($BackendPort, $FrontendPort)) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    Fail "Le port $port est deja utilise. Arretez l'application qui l'occupe ou changez -BackendPort / -FrontendPort."
  }
}

# ---- Dependances frontend ---------------------------------------------------------------------
$Frontend = Join-Path $Root 'frontend-angular'
if (-not $SkipInstall -and -not (Test-Path (Join-Path $Frontend 'node_modules'))) {
  Write-Step 'Installation des dependances frontend (premier lancement)'
  Push-Location $Frontend
  try { & npm install; if ($LASTEXITCODE -ne 0) { Fail 'npm install a echoue.' } } finally { Pop-Location }
}

# ---- Demarrage --------------------------------------------------------------------------------
$previousPort = $env:PORT
$previousApiUrl = $env:FOCUS_API_URL
$procs = @()
function Stop-All {
  foreach ($p in $script:procs) {
    if ($p -and -not $p.HasExited) { & taskkill /PID $p.Id /T /F 2>&1 | Out-Null }
  }
}

try {
  Write-Step "Demarrage du backend (port $BackendPort) - le premier lancement telecharge PostgreSQL embarque"
  $backendLog = Join-Path $LogDir 'backend.log'
  $env:PORT = $BackendPort
  $backend = Start-Process -FilePath 'mvn.cmd' -WorkingDirectory (Join-Path $Root 'backend') `
    -ArgumentList '-q', 'spring-boot:run', '-Dspring-boot.run.profiles=local' `
    -RedirectStandardOutput $backendLog -RedirectStandardError (Join-Path $LogDir 'backend.err.log') -PassThru -WindowStyle Hidden
  $procs += $backend

  $deadline = (Get-Date).AddMinutes(5)
  $up = $false
  while ((Get-Date) -lt $deadline) {
    if ($backend.HasExited) { Fail "Le backend s'est arrete. Consultez $backendLog" }
    try {
      if ((Invoke-RestMethod "http://127.0.0.1:$BackendPort/actuator/health" -TimeoutSec 2).status -eq 'UP') { $up = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
  }
  if (-not $up) { Fail "Le backend n'a pas demarre en 5 minutes. Consultez $backendLog" }
  Write-Host '    Backend pret.' -ForegroundColor Green

  # PORT ne doit pas fuiter vers "ng serve", qui le lit aussi.
  Remove-Item Env:PORT -ErrorAction SilentlyContinue
  Write-Step "Demarrage du frontend (port $FrontendPort)"
  $proxyPath = Join-Path $LogDir 'proxy.conf.json'
  @{ '/api' = @{ target = "http://127.0.0.1:$BackendPort"; secure = $false; changeOrigin = $true } } |
    ConvertTo-Json -Depth 3 | Set-Content -Encoding ASCII $proxyPath
  $frontendArgs = @('node_modules/@angular/cli/bin/ng.js', 'serve', '--host', '127.0.0.1', '--port', $FrontendPort, '--proxy-config', ('"' + $proxyPath + '"'))
  $node = (Get-Command node).Source
  $frontend = Start-Process -FilePath $node -WorkingDirectory $Frontend `
    -ArgumentList $frontendArgs `
    -RedirectStandardOutput (Join-Path $LogDir 'frontend.log') -RedirectStandardError (Join-Path $LogDir 'frontend.err.log') -PassThru -WindowStyle Hidden
  $procs += $frontend

  $deadline = (Get-Date).AddMinutes(3)
  $ready = $false
  while ((Get-Date) -lt $deadline) {
    if ($frontend.HasExited) { Fail "Le frontend s'est arrete. Consultez $(Join-Path $LogDir 'frontend.log')" }
    try { Invoke-WebRequest "http://127.0.0.1:$FrontendPort" -UseBasicParsing -TimeoutSec 2 | Out-Null; $ready = $true; break } catch { }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) { Fail "Le frontend n'a pas demarre a temps." }

  Write-Host ''
  Write-Host '  FocusWithAkram est pret' -ForegroundColor Green
  Write-Host "    Application : http://127.0.0.1:$FrontendPort"
  Write-Host "    API / Swagger : http://localhost:$BackendPort/swagger-ui.html"
  Write-Host "    Journaux : $LogDir"
  Write-Host '    Ctrl+C pour arreter.'
  Start-Process "http://127.0.0.1:$FrontendPort" | Out-Null

  while (-not $backend.HasExited -and -not $frontend.HasExited) { Start-Sleep -Seconds 2 }
  Write-Host "Un des processus s'est arrete : consultez les journaux dans $LogDir" -ForegroundColor Yellow
}
finally {
  Write-Step 'Arret de FocusWithAkram'
  Stop-All
  $env:PORT = $previousPort
  $env:FOCUS_API_URL = $previousApiUrl
}
