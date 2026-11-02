<#
.SYNOPSIS
  Libere des ports TCP en arretant le processus qui les ecoute (et ses processus fils).

.DESCRIPTION
  Utilise par les scripts de lancement (PowerShell, et Bash sous Windows). Le serveur PostgreSQL embarque est arrete
  proprement avec "pg_ctl stop -m fast" (pg_ctl se trouve a cote de postgres.exe) ; les autres processus sont arretes
  avec "taskkill /T /F". Un port tenu par Windows lui-meme (processus System) n'est jamais touche.

  - Charge par ". scripts/lib/free-port.ps1" : definit Clear-Port sans rien faire d'autre.
  - Lance avec -Port : libere les ports indiques (code de sortie 1 en cas d'echec).

.EXAMPLE
  powershell -File scripts/lib/free-port.ps1 -Port 4200,8080 -Label "FocusWithAkram"
#>
[CmdletBinding()]
param(
  # Liste de ports ; « 4200,8080 » est accepte (avec -File, PowerShell transmet la liste comme un seul texte).
  [string[]]$Port = @(),
  [string]$Label = 'application'
)

function Get-PortOwner([int]$Number) {
  @(Get-NetTCPConnection -LocalPort $Number -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 })
}

# Arret propre du PostgreSQL embarque (donnees coherentes, sans recuperation au prochain demarrage).
function Stop-EmbeddedPostgres($Process) {
  if (-not $Process.ExecutablePath) { return $false }
  $pgCtl = Join-Path (Split-Path $Process.ExecutablePath) 'pg_ctl.exe'
  if (-not (Test-Path $pgCtl)) { return $false }
  $cmd = [string]$Process.CommandLine
  if ($cmd -match '-D"?\s+"([^"]+)"') { $dataDir = $Matches[1] }
  elseif ($cmd -match '-D"?\s+(\S+)') { $dataDir = $Matches[1] }
  else { return $false }
  $stop = Start-Process -FilePath $pgCtl -ArgumentList 'stop', '-D', ('"' + $dataDir + '"'), '-m', 'fast', '-w', '-t', '30' `
    -NoNewWindow -PassThru -Wait
  return $stop.ExitCode -eq 0
}

function Clear-Port {
  param([Parameter(Mandatory)][int]$Number, [string]$Label = 'application')
  $owners = Get-PortOwner $Number
  if ($owners.Count -eq 0) { return }
  foreach ($procId in $owners) {
    if ($procId -eq 4) { throw "Le port $Number est tenu par Windows (processus System) : choisissez un autre port." }
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.Name } else { 'processus inconnu' }
    Write-Host "    Port $Number ($Label) occupe par $name (PID $procId) : arret." -ForegroundColor Yellow
    if ($proc -and $proc.Name -ieq 'postgres.exe' -and (Stop-EmbeddedPostgres $proc)) { continue }
    # cmd /c : PowerShell 5.1 transformerait la sortie d'erreur de taskkill en exception (mode Stop).
    cmd /c "taskkill /PID $procId /T /F >nul 2>&1" | Out-Null
  }
  for ($i = 0; $i -lt 40; $i++) {
    if ((Get-PortOwner $Number).Count -eq 0) { return }
    Start-Sleep -Milliseconds 500
  }
  throw "Le port $Number est toujours occupe apres l'arret de son processus."
}

$numbers = @($Port | ForEach-Object { $_ -split '[,\s]+' } | Where-Object { $_ } | ForEach-Object { [int]$_ })
if ($numbers.Count -gt 0) {
  try {
    foreach ($p in $numbers) { Clear-Port -Number $p -Label $Label }
  } catch {
    Write-Host "ERREUR : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}
