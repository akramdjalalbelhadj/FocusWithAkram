<#
.SYNOPSIS
  Migre la base locale (backend/data/postgres) vers la version de PostgreSQL embarquee par l'application.

.DESCRIPTION
  A lancer une fois, quand les lanceurs le demandent apres une montee de version de PostgreSQL (propriete
  embedded-postgres-binaries.version de backend/pom.xml). Windows (binaires windows-amd64), Java 25 et Maven.

  1. Arrete un lancement de FocusWithAkram en cours (backend, frontend, PostgreSQL embarque).
  2. Recupere par Maven les binaires PostgreSQL de la base actuelle et ceux de l'application (les binaires embarques
     ne contiennent ni pg_dump ni pg_upgrade).
  3. Cree une base neuve (initdb, memes options que le profil local) et demarre les deux bases sur des ports libres.
  4. scripts/lib/PgCopy.java : schema par les migrations Flyway de l'application (jusqu'a la version de la base
     actuelle), copie de toutes les tables par COPY, puis verification de chaque table (nombre de lignes et empreinte
     du contenu) et de chaque sequence : le moindre ecart annule la migration.
  5. Remplace le dossier : l'ancienne base est conservee a cote, sous postgres-<version>-sauvegarde-<date>.

  Rien n'est supprime. En cas d'echec, la base d'origine reste en place, intacte. Le dossier de travail
  (migration-<date> : releves et journaux) est conserve a cote de la base.

.PARAMETER SourceBinariesVersion
  Version des binaires de la base actuelle (defaut : la plus recente de sa version majeure dans le depot Maven local ;
  14.22.0 pour PostgreSQL 14, version utilisee par l'application jusqu'en novembre 2026).

.PARAMETER DataDir
  Dossier de la base a migrer (defaut : backend/data/postgres). Sert aux essais sur une copie.

.EXAMPLE
  .\scripts\migrate_postgres.ps1
#>
[CmdletBinding()]
param(
  [string]$SourceBinariesVersion = '',
  [string]$DataDir = ''
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'lib/launch.ps1')

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "ERREUR : $msg" -ForegroundColor Red; exit 1 }

# Binaires deja utilises par l'application avant chaque montee de version (defaut de -SourceBinariesVersion).
$KnownVersions = @{ 14 = '14.22.0' }
$Artifact = 'io.zonky.test.postgres:embedded-postgres-binaries-windows-amd64'
$Backend = Join-Path $Root 'backend'

# ---- Verifications ----------------------------------------------------------------------------
Write-Step 'Verifications'
if (-not (Get-Command mvn.cmd -ErrorAction SilentlyContinue)) { Fail 'Maven est requis pour recuperer les binaires PostgreSQL.' }
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { Fail 'Java 25 est requis.' }
$Java = (Get-Command java).Source

$usesDefaultDir = -not $DataDir
if ($usesDefaultDir) { $DataDir = $script:FfDataDir }
if (-not (Test-Path (Join-Path $DataDir 'PG_VERSION'))) { Fail "Aucune base PostgreSQL dans $DataDir." }
$DataDir = (Resolve-Path $DataDir).Path

$pom = Get-Content (Join-Path $Backend 'pom.xml') -Raw
if ($pom -notmatch '<embedded-postgres-binaries\.version>([^<]+)<') { Fail 'Propriete embedded-postgres-binaries.version absente du pom.xml.' }
$TargetVersion = $Matches[1].Trim()
$targetMajor = [int]($TargetVersion -split '\.')[0]
$sourceMajor = Get-FfDataPostgresMajor $DataDir

if ($sourceMajor -eq $targetMajor) { Write-Host "    La base est deja au format PostgreSQL $targetMajor : rien a migrer." -ForegroundColor Green; exit 0 }
if ($sourceMajor -gt $targetMajor) { Fail "La base (PostgreSQL $sourceMajor) est plus recente que celle de l'application (PostgreSQL $targetMajor)." }

if (-not $SourceBinariesVersion) {
  $m2 = Join-Path $env:USERPROFILE ".m2\repository\io\zonky\test\postgres\embedded-postgres-binaries-windows-amd64"
  $local = @(Get-ChildItem $m2 -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "^$sourceMajor\.\d+\.\d+$" } |
    Sort-Object { [version]$_.Name } -Descending)
  if ($local.Count -gt 0) { $SourceBinariesVersion = $local[0].Name }
  elseif ($KnownVersions.ContainsKey($sourceMajor)) { $SourceBinariesVersion = $KnownVersions[$sourceMajor] }
  else { Fail "Version des binaires PostgreSQL $sourceMajor inconnue : precisez -SourceBinariesVersion (ex. $sourceMajor.0.0)." }
}
Write-Host "    Base : $DataDir"
Write-Host "    PostgreSQL $sourceMajor (binaires $SourceBinariesVersion) -> PostgreSQL $targetMajor (binaires $TargetVersion)"

# La base ne doit etre ouverte par aucun serveur.
if ($usesDefaultDir) {
  Write-Step 'Arret de FocusWithAkram s''il est lance'
  try { Stop-FfPreviousInstance } catch { Fail $_.Exception.Message }
}
$pidFile = Join-Path $DataDir 'postmaster.pid'
if (Test-Path $pidFile) {
  $owner = 0
  if ((Get-Content $pidFile -TotalCount 1) -match '^\s*(\d+)') { $owner = [int]$Matches[1] }
  if ($owner -gt 0 -and (Get-Process -Id $owner -ErrorAction SilentlyContinue)) {
    Fail "Un serveur PostgreSQL (PID $owner) utilise encore $DataDir : arretez-le puis relancez."
  }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$parent = Split-Path $DataDir -Parent
$Work = Join-Path $parent "migration-$stamp"
$Backup = Join-Path $parent ("{0}-{1}-sauvegarde-{2}" -f (Split-Path $DataDir -Leaf), $sourceMajor, $stamp)
$NewData = Join-Path $Work 'donnees'
New-Item -ItemType Directory -Force $Work | Out-Null

# ---- Outils -----------------------------------------------------------------------------------
# Lance une commande ; sortie et erreurs dans $Log (pas de tube : pg_ctl start laisse un serveur qui en heriterait).
function Invoke-Logged([string]$Exe, [string]$Arguments, [string]$Log) {
  $line = '/d /c ""' + $Exe + '" ' + $Arguments + ' > "' + $Log + '" 2>&1"'
  $psi = New-Object System.Diagnostics.ProcessStartInfo 'cmd.exe', $line
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = [System.Diagnostics.Process]::Start($psi)
  $p.WaitForExit()
  return $p.ExitCode
}

function Assert-Logged([string]$Exe, [string]$Arguments, [string]$Log, [string]$What) {
  if ((Invoke-Logged $Exe $Arguments $Log) -ne 0) {
    $detail = if (Test-Path $Log) { (Get-Content $Log -Tail 20) -join "`n" } else { '' }
    throw "$What a echoue (journal : $Log).`n$detail"
  }
}

$Mvn = (Get-Command mvn.cmd).Source
# Telecharge (depot Maven) puis extrait les binaires PostgreSQL de cette version ; rend le dossier bin.
function Get-PgBinaries([string]$Version) {
  $jars = Join-Path $Work 'jars'
  Assert-Logged $Mvn ('-q -f "' + (Join-Path $Backend 'pom.xml') + '" dependency:copy "-Dartifact=' + $Artifact + ':' + $Version + '" "-DoutputDirectory=' + $jars + '"') `
    (Join-Path $Work "maven-$Version.log") "La recuperation des binaires PostgreSQL $Version"
  $jar = Join-Path $jars "embedded-postgres-binaries-windows-amd64-$Version.jar"
  $dir = Join-Path $Work "pg-$Version"
  # Extraction en Java (commons-compress + xz du backend) : le tar.exe de Windows 10 ne lit pas le xz.
  Assert-Logged $Java ('"@' + $script:argFile + '" "' + (Join-Path $PSScriptRoot 'lib\ExtractPgBinaries.java') + '" "' + $jar + '" "' + $dir + '"') `
    (Join-Path $Work "extraction-$Version.log") "L'extraction des binaires PostgreSQL $Version"
  $bin = Join-Path $dir 'bin'
  if (-not (Test-Path (Join-Path $bin 'pg_ctl.exe'))) { throw "pg_ctl.exe absent des binaires PostgreSQL $Version." }
  return $bin
}

$running = @{}
function Start-Pg([string]$Bin, [string]$Data, [int]$Port, [string]$Name) {
  Assert-Logged (Join-Path $Bin 'pg_ctl.exe') ('start -D "' + $Data + '" -w -t 120 -l "' + (Join-Path $Work "serveur-$Name.log") + '" -o "-p ' + $Port + ' -c listen_addresses=localhost"') `
    (Join-Path $Work "pg_ctl-start-$Name.log") "Le demarrage de la base $Name"
  $script:running[$Data] = $Bin
}

function Stop-Pg([string]$Data) {
  if (-not $script:running.ContainsKey($Data)) { return }
  $bin = $script:running[$Data]
  $null = Invoke-Logged (Join-Path $bin 'pg_ctl.exe') ('stop -D "' + $Data + '" -m fast -w -t 60') (Join-Path $Work 'pg_ctl-stop.log')
  $script:running.Remove($Data)
}

# ---- Migration --------------------------------------------------------------------------------
$swapped = $false
try {
  Write-Step "Recuperation des bibliotheques du backend et des binaires PostgreSQL $SourceBinariesVersion et $TargetVersion (Maven)"
  $cpFile = Join-Path $Work 'classpath.txt'
  Assert-Logged $Mvn ('-q -f "' + (Join-Path $Backend 'pom.xml') + '" dependency:build-classpath -Dmdep.includeScope=runtime "-Dmdep.outputFile=' + $cpFile + '"') `
    (Join-Path $Work 'maven-classpath.log') 'Le calcul du classpath du backend'
  # Fichier d'arguments Java (classpath trop long pour une ligne de commande) ; barres obliques : pas d'echappement.
  $argFile = Join-Path $Work 'java-args.txt'
  Set-Content -Encoding ASCII $argFile ('--class-path "' + ((Get-Content $cpFile -Raw).Trim() -replace '\\', '/') + '"')
  $oldBin = Get-PgBinaries $SourceBinariesVersion
  $newBin = Get-PgBinaries $TargetVersion

  Write-Step "Creation de la base PostgreSQL $targetMajor"
  # Memes options que le PostgreSQL embarque du profil local (zonky) : superutilisateur postgres, acces local, UTF-8.
  Assert-Logged (Join-Path $newBin 'initdb.exe') ("-A trust -U postgres -E UTF-8 -D `"$NewData`"") (Join-Path $Work 'initdb.log') 'initdb'
  $oldPort = Select-FfPort -Preferred 15433 -Label 'ancienne base (migration)'
  $newPort = Select-FfPort -Preferred 15434 -Label 'nouvelle base (migration)' -Exclude @($oldPort)
  Start-Pg $oldBin $DataDir $oldPort 'ancienne'
  Start-Pg $newBin $NewData $newPort 'nouvelle'

  Write-Step 'Schema (migrations Flyway), copie des donnees et verification'
  $copyLog = Join-Path $Work 'copie.log'
  $code = Invoke-Logged $Java ('"@' + $argFile + '" "' + (Join-Path $PSScriptRoot 'lib\PgCopy.java') + '" ' +
    "jdbc:postgresql://localhost:$oldPort/postgres jdbc:postgresql://localhost:$newPort/postgres " +
    '"' + (Join-Path $Backend 'src\main\resources\db\migration') + '" "' + $Work + '"') $copyLog
  Get-Content $copyLog | Where-Object { $_ -match '^(Source|Schema|  |ATTENTION|ECART|IDENTIQUES)' } | ForEach-Object { Write-Host "    $_" }
  if ($code -ne 0) {
    throw "La copie a echoue ou la base copiee differe de l'originale (journal : $copyLog)."
  }
  Stop-Pg $NewData
  Stop-Pg $DataDir

  Write-Step 'Remplacement du dossier de la base'
  Rename-Item $DataDir $Backup
  try {
    Move-Item $NewData $DataDir
  } catch {
    Rename-Item $Backup $DataDir
    throw
  }
  $swapped = $true
  Remove-Item -Recurse -Force (Join-Path $Work 'jars'), (Join-Path $Work "pg-$SourceBinariesVersion"), (Join-Path $Work "pg-$TargetVersion") -ErrorAction SilentlyContinue
} catch {
  foreach ($d in @($script:running.Keys)) { Stop-Pg $d }
  Write-Host "ERREUR : $($_.Exception.Message)" -ForegroundColor Red
  if (-not $swapped) { Write-Host "    La base d'origine est intacte : $DataDir" -ForegroundColor Yellow }
  Write-Host "    Journaux de la migration : $Work"
  exit 1
}

Write-Host ''
Write-Host "  Base migree vers PostgreSQL $targetMajor" -ForegroundColor Green
Write-Host "    Base : $DataDir"
Write-Host "    Ancienne base (PostgreSQL $sourceMajor), conservee : $Backup"
Write-Host "    Releves et journaux : $Work"
Write-Host '    Retour arriere : arretez l''application, renommez la base actuelle, redonnez son nom a l''ancienne,'
Write-Host "    et revenez a une version de l'application qui utilise PostgreSQL $sourceMajor (pom.xml)."
