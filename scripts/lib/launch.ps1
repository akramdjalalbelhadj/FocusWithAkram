<#
.SYNOPSIS
  Outils communs aux lanceurs : arret d'un lancement precedent de FocusWithAkram, choix des ports, version de la base.

.DESCRIPTION
  Regle des lanceurs :
  - un processus reste d'un lancement precedent de FocusWithAkram est arrete : backend (classe principale
    com.focusflow.FocusFlowApplication), serveur de developpement du frontend lance depuis ce depot, PostgreSQL embarque
    de backend/data/postgres (arret propre par pg_ctl) ;
  - un port tenu par une autre application, ou reserve par Windows (plages Hyper-V, WSL, Docker), n'est jamais libere
    de force : le premier port libre qui suit est utilise a la place.

  - Charge par ". scripts/lib/launch.ps1" : definit les fonctions sans rien faire d'autre.
  - En ligne de commande (lanceurs Bash sous Windows) :
      -Action StopPrevious                                 arrete un lancement precedent
      -Action SelectPort -Port 4200 -Label frontend [-Exclude 8080]
                                                           derniere ligne de sortie : le port retenu
      -Action StopOnPorts -Port "4200,8080"                arrete le backend et le frontend de FocusWithAkram qui
                                                           ecoutent sur ces ports (fin d'un lancement Bash)
      -Action StopPostgres -PostmasterPid 1234             arrete ce PostgreSQL s'il tient encore backend/data/postgres
      -Action CheckDataVersion                             echoue si la base locale doit d'abord etre migree
#>
[CmdletBinding()]
param(
  [ValidateSet('', 'StopPrevious', 'SelectPort', 'StopOnPorts', 'StopPostgres', 'CheckDataVersion')]
  [string]$Action = '',
  [string]$Port = '',
  [string]$Label = 'application',
  [string]$Exclude = '',
  [int]$PostmasterPid = 0
)

$script:FfRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:FfDataDir = Join-Path $script:FfRoot 'backend\data\postgres'

function ConvertTo-FfComparable([string]$Text) {
  ($Text -replace '\\', '/').ToLowerInvariant()
}

function Wait-FfProcessExit([int[]]$Ids, [int]$Seconds = 20) {
  for ($i = 0; $i -lt ($Seconds * 2); $i++) {
    $alive = @($Ids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
    if ($alive.Count -eq 0) { return $true }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

# Backend et frontend de FocusWithAkram en cours d'execution, reconnus a leur ligne de commande.
function Get-FfAppProcesses {
  $root = (ConvertTo-FfComparable $script:FfRoot).TrimEnd('/')
  foreach ($p in @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)) {
    if ($p.ProcessId -eq $PID) { continue }
    $cmd = ConvertTo-FfComparable ([string]$p.CommandLine)
    if (-not $cmd) { continue }
    $kind = $null
    if ($p.Name -match '^javaw?\.exe$' -and $cmd.Contains('com.focusflow.focusflowapplication')) { $kind = 'backend' }
    elseif ($p.Name -ieq 'node.exe' -and $cmd.Contains($root) -and $cmd -match 'ng\.js"?\s+serve|vite/bin/vite\.js') { $kind = 'frontend' }
    if ($kind) { [pscustomobject]@{ Kind = $kind; Id = [int]$p.ProcessId; Name = $p.Name } }
  }
}

# PID inscrit dans backend/data/postgres/postmaster.pid (0 si absent).
function Get-FfPostmasterPid {
  $file = Join-Path $script:FfDataDir 'postmaster.pid'
  if (-not (Test-Path $file)) { return 0 }
  $first = Get-Content $file -TotalCount 1 -ErrorAction SilentlyContinue
  if ($first -match '^\s*(\d+)') { return [int]$Matches[1] }
  return 0
}

# Serveur PostgreSQL (postmaster) qui tient backend/data/postgres, ou $null.
function Get-FfRunningPostmaster {
  $ids = @()
  $fromFile = Get-FfPostmasterPid
  if ($fromFile -gt 0) { $ids += $fromFile }
  $data = (ConvertTo-FfComparable $script:FfDataDir).TrimEnd('/')
  foreach ($p in @(Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" -ErrorAction SilentlyContinue)) {
    $cmd = ConvertTo-FfComparable ([string]$p.CommandLine)
    if ($cmd.Contains($data) -and -not $cmd.Contains('forkchild')) { $ids += [int]$p.ProcessId }
  }
  foreach ($id in ($ids | Select-Object -Unique)) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$id" -ErrorAction SilentlyContinue
    if ($p -and $p.Name -ieq 'postgres.exe') { return $p }
  }
  return $null
}

# Arret propre (pg_ctl stop -m fast, pg_ctl se trouve a cote de postgres.exe), sinon arret force.
function Stop-FfPostmaster($Process, [string]$Reason = "lancement precedent") {
  Write-Host "    PostgreSQL embarque ($Reason, PID $($Process.ProcessId)) : arret propre." -ForegroundColor Yellow
  $stopped = $false
  if ($Process.ExecutablePath) {
    $pgCtl = Join-Path (Split-Path $Process.ExecutablePath) 'pg_ctl.exe'
    if (Test-Path $pgCtl) {
      $out = [System.IO.Path]::GetTempFileName()
      $err = [System.IO.Path]::GetTempFileName()
      try {
        $p = Start-Process -FilePath $pgCtl -ArgumentList ('stop -D "' + $script:FfDataDir + '" -m fast -w -t 30') `
          -NoNewWindow -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
        $null = $p.Handle
        $p.WaitForExit()
        $stopped = ($p.ExitCode -eq 0)
      } finally { Remove-Item $out, $err -ErrorAction SilentlyContinue }
    }
  }
  if (-not $stopped) { cmd /c "taskkill /PID $($Process.ProcessId) /T /F >nul 2>&1" | Out-Null }
  if (-not (Wait-FfProcessExit @([int]$Process.ProcessId) 30)) {
    throw "PostgreSQL (PID $($Process.ProcessId)) ne s'arrete pas : arretez-le depuis le gestionnaire des taches."
  }
}

# Arrete un lancement precedent : backend, frontend, puis PostgreSQL embarque (qui verrouille le dossier de donnees).
function Stop-FfPreviousInstance {
  $apps = @(Get-FfAppProcesses)
  foreach ($a in $apps) {
    Write-Host "    Lancement precedent : $($a.Kind) ($($a.Name), PID $($a.Id)) arrete." -ForegroundColor Yellow
    cmd /c "taskkill /PID $($a.Id) /T /F >nul 2>&1" | Out-Null
  }
  if ($apps.Count -gt 0 -and -not (Wait-FfProcessExit @($apps | ForEach-Object { $_.Id }))) {
    throw "Un processus d'un lancement precedent ne s'arrete pas (PID $(@($apps | ForEach-Object { $_.Id }) -join ', '))."
  }
  $postmaster = Get-FfRunningPostmaster
  if ($postmaster) { Stop-FfPostmaster $postmaster }
}

# Arrete le backend et le frontend de FocusWithAkram qui ecoutent sur ces ports (jamais une autre application).
function Stop-FfAppOnPorts([int[]]$Ports) {
  $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $Ports -contains $_.LocalPort } | Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($a in @(Get-FfAppProcesses | Where-Object { $listeners -contains $_.Id })) {
    cmd /c "taskkill /PID $($a.Id) /T /F >nul 2>&1" | Out-Null
  }
}

# Fin d'un lancement : arrete le PostgreSQL demarre par ce lancement, s'il tient encore le dossier de donnees.
# Avec $StartedAfter, a defaut de PID connu : seulement un serveur demarre apres cet instant.
function Stop-FfOwnPostgres([int]$PostmasterPid = 0, [datetime]$StartedAfter = [datetime]::MaxValue) {
  $current = Get-FfPostmasterPid
  if ($current -le 0) { return }
  if ($PostmasterPid -gt 0 -and $current -ne $PostmasterPid) { return }
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$current" -ErrorAction SilentlyContinue
  if (-not $p -or $p.Name -ine 'postgres.exe') { return }
  if ($PostmasterPid -le 0 -and $p.CreationDate -lt $StartedAfter) { return }
  Stop-FfPostmaster $p 'fin du lancement'
}

# Ports TCP en ecoute, toutes adresses (lecture rapide, sans Get-NetTCPConnection qui prend une seconde par appel).
function Get-FfListeningPorts {
  @([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
    ForEach-Object { $_.Port } | Select-Object -Unique)
}

# Vrai si rien n'ecoute sur ce port et qu'il peut etre ouvert (un port reserve par Windows ne le peut pas).
function Test-FfPortFree([int]$Number, [int[]]$Listening = $null) {
  if ($null -eq $Listening) { $Listening = Get-FfListeningPorts }
  if ($Listening -contains $Number) { return $false }
  $listener = $null
  try {
    $listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback, $Number)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) { $listener.Stop() }
  }
}

function Get-FfPortOwnerText([int]$Number) {
  $ids = @(Get-NetTCPConnection -LocalPort $Number -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique)
  if ($ids.Count -eq 0) { return 'est reserve par Windows (Hyper-V, WSL ou Docker)' }
  $names = foreach ($id in $ids) {
    $p = Get-Process -Id $id -ErrorAction SilentlyContinue
    if ($p) { "$($p.ProcessName) (PID $id)" } else { "PID $id" }
  }
  return 'est occupe par ' + ($names -join ', ')
}

# Port souhaite s'il est libre, sinon le premier port libre qui suit (jamais un port de $Exclude).
function Select-FfPort([int]$Preferred, [string]$Label, [int[]]$Exclude = @()) {
  $listening = Get-FfListeningPorts
  if (($Exclude -notcontains $Preferred) -and (Test-FfPortFree $Preferred $listening)) { return $Preferred }
  $reason = if ($Exclude -contains $Preferred) { 'est deja retenu pour un autre service' } else { Get-FfPortOwnerText $Preferred }
  $last = [Math]::Min(65535, $Preferred + 200)
  $chosen = 0
  for ($n = $Preferred + 1; $n -le $last -and $chosen -eq 0; $n++) {
    if (($Exclude -notcontains $n) -and (Test-FfPortFree $n $listening)) { $chosen = $n }
  }
  # Plages reservees contigues (Windows en reserve souvent plusieurs centaines d'affilee) : port attribue par le systeme.
  for ($try = 0; $try -lt 5 -and $chosen -eq 0; $try++) {
    $listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback, 0)
    try { $listener.Start(); $n = $listener.LocalEndpoint.Port } finally { $listener.Stop() }
    if ($Exclude -notcontains $n) { $chosen = $n }
  }
  if ($chosen -eq 0) { throw "Aucun port libre pour le $Label." }
  Write-Host "    Port $Preferred ($Label) $reason : le port $chosen est utilise a la place." -ForegroundColor Yellow
  return $chosen
}

# Version majeure de PostgreSQL embarquee par l'application (propriete du pom.xml), 0 si illisible.
function Get-FfExpectedPostgresMajor {
  $pom = Join-Path $script:FfRoot 'backend\pom.xml'
  if ((Test-Path $pom) -and ((Get-Content $pom -Raw) -match '<embedded-postgres-binaries\.version>(\d+)\.')) { return [int]$Matches[1] }
  return 0
}

# Version majeure de la base locale (fichier PG_VERSION), 0 si aucune base.
function Get-FfDataPostgresMajor([string]$DataDir = $script:FfDataDir) {
  $file = Join-Path $DataDir 'PG_VERSION'
  if (-not (Test-Path $file)) { return 0 }
  $text = (Get-Content $file -TotalCount 1).Trim()
  if ($text -match '^(\d+)') { return [int]$Matches[1] }
  return 0
}

# Echoue avec un message explicite si la base locale n'a pas la version de PostgreSQL de l'application.
function Assert-FfDataVersion {
  $expected = Get-FfExpectedPostgresMajor
  $actual = Get-FfDataPostgresMajor
  if ($expected -le 0 -or $actual -le 0 -or $expected -eq $actual) { return }
  if ($actual -lt $expected) {
    throw ("Votre base locale (backend\data\postgres) est au format PostgreSQL $actual ; l'application utilise " +
      "PostgreSQL $expected. Migrez-la une fois avec : .\scripts\migrate_postgres.ps1 (l'ancienne base est conservee).")
  }
  throw ("Votre base locale (backend\data\postgres) est au format PostgreSQL $actual, plus recent que celui de " +
    "l'application (PostgreSQL $expected). Revenez a une version de l'application qui utilise PostgreSQL $actual.")
}

# ---- Ligne de commande ------------------------------------------------------------------------
function ConvertTo-FfPortList([string]$Text) {
  @($Text -split '[,\s]+' | Where-Object { $_ } | ForEach-Object { [int]$_ })
}

if ($Action) {
  try {
    switch ($Action) {
      'StopPrevious' { Stop-FfPreviousInstance }
      'SelectPort' { Select-FfPort -Preferred ([int]$Port) -Label $Label -Exclude (ConvertTo-FfPortList $Exclude) }
      'StopOnPorts' { Stop-FfAppOnPorts (ConvertTo-FfPortList $Port) }
      'StopPostgres' { Stop-FfOwnPostgres -PostmasterPid $PostmasterPid }
      'CheckDataVersion' { Assert-FfDataVersion }
    }
  } catch {
    Write-Host "ERREUR : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}
