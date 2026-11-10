# Outils communs aux lanceurs Bash. A charger avec ". scripts/lib/launch.sh" ; attend que l'appelant definisse ROOT
# et fail().
#
# Regle des lanceurs :
# - un processus reste d'un lancement precedent de FocusWithAkram est arrete : backend (classe principale
#   com.focusflow.FocusFlowApplication), serveur de developpement du frontend lance depuis ce depot, PostgreSQL embarque
#   de backend/data/postgres (arret rapide propre) ;
# - un port tenu par une autre application n'est jamais libere de force : le premier port libre qui suit est utilise.
#
# Sous Windows (Git Bash, MSYS, Cygwin), le travail est delegue a scripts/lib/launch.ps1.

DATA_DIR="$ROOT/backend/data/postgres"

is_windows() {
  case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) return 0 ;; *) return 1 ;; esac
}

launch_ps1() {
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$ROOT/scripts/lib/launch.ps1")" "$@" | tr -d '\r'
  return "${PIPESTATUS[0]}"
}

# PID des processus qui ecoutent sur le port $1 (Linux et macOS).
listen_pids() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -t -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | sort -u
  elif command -v ss >/dev/null 2>&1; then
    ss -ltnpH "( sport = :$1 )" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u
  elif command -v fuser >/dev/null 2>&1; then
    fuser -n tcp "$1" 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' | sort -u
  fi
}

# Vrai si un processus ecoute sur le port $1 (Linux et macOS).
port_busy() {
  if [ -n "$(listen_pids "$1")" ]; then return 0; fi
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

# PID du backend et du frontend de FocusWithAkram en cours d'execution, avec leur nature (Linux et macOS).
app_processes() {
  local pid args
  ps -eo pid=,args= 2>/dev/null | while read -r pid args; do
    [ "$pid" = "$$" ] && continue
    case "$args" in
      *com.focusflow.FocusFlowApplication*) echo "$pid backend" ;;
      *"$ROOT"*)
        case "$args" in *ng.js*serve*|*vite/bin/vite.js*) echo "$pid frontend" ;; esac ;;
    esac
  done
}

postmaster_pid() {
  head -n 1 "$DATA_DIR/postmaster.pid" 2>/dev/null | tr -dc '0-9'
}

wait_exit() { # $1 : PID ; $2 : secondes
  local i
  for i in $(seq 1 $(( ${2:-20} * 2 ))); do
    kill -0 "$1" 2>/dev/null || return 0
    sleep 0.5
  done
  return 1
}

# Arret rapide propre (SIGINT) du PostgreSQL de PID $1, puis SIGKILL s'il ne s'arrete pas.
stop_postmaster() {
  local pid="$1" reason="${2:-lancement precedent}"
  printf '\033[33m    PostgreSQL embarque (%s, PID %s) : arret propre.\033[0m\n' "$reason" "$pid"
  kill -INT "$pid" 2>/dev/null || true
  wait_exit "$pid" 30 && return 0
  kill -KILL "$pid" 2>/dev/null || true
  wait_exit "$pid" 5 || fail "PostgreSQL (PID $pid) ne s'arrete pas."
}

# Arrete un lancement precedent : backend, frontend, puis PostgreSQL embarque (qui verrouille le dossier de donnees).
stop_previous_instance() {
  if is_windows; then launch_ps1 -Action StopPrevious || fail "Impossible d'arreter le lancement precedent."; return 0; fi
  local pid kind pids=""
  while read -r pid kind; do
    [ -n "$pid" ] || continue
    printf '\033[33m    Lancement precedent : %s (PID %s) arrete.\033[0m\n' "$kind" "$pid"
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
    pids="$pids $pid"
  done < <(app_processes)
  for pid in $pids; do wait_exit "$pid" 20 || kill -KILL "$pid" 2>/dev/null || true; done
  pid="$(postmaster_pid)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && ps -p "$pid" -o comm= 2>/dev/null | grep -q postgres; then
    stop_postmaster "$pid"
  fi
}

# Port $1 s'il est libre, sinon le premier port libre qui suit (jamais $3). Ecrit le port retenu sur la sortie standard,
# les messages sur la sortie d'erreur.
select_port() {
  local preferred="$1" label="$2" exclude="${3:-0}" out p
  if is_windows; then
    out="$(launch_ps1 -Action SelectPort -Port "$preferred" -Label "$label" -Exclude "$exclude")" \
      || { printf '%s\n' "$out" >&2; fail "Aucun port disponible pour le $label."; }
    printf '%s\n' "$out" | sed '$d' >&2
    printf '%s\n' "$out" | tail -n 1
    return 0
  fi
  if [ "$preferred" != "$exclude" ] && ! port_busy "$preferred"; then echo "$preferred"; return 0; fi
  for p in $(seq $(( preferred + 1 )) $(( preferred + 200 ))); do
    [ "$p" = "$exclude" ] && continue
    if ! port_busy "$p"; then
      printf '\033[33m    Port %s (%s) occupe : le port %s est utilise a la place.\033[0m\n' "$preferred" "$label" "$p" >&2
      echo "$p"
      return 0
    fi
  done
  fail "Aucun port libre entre $preferred et $(( preferred + 200 )) pour le $label."
}

# Fin d'un lancement : arrete le backend et le frontend de FocusWithAkram qui ecoutent sur les ports donnes, puis le
# PostgreSQL demarre par ce lancement ($1 : PID du postmaster releve au demarrage, vide si inconnu).
stop_own_instance() {
  local own_pg="$1"; shift
  if is_windows; then
    launch_ps1 -Action StopOnPorts -Port "$*" >/dev/null 2>&1 || true
    [ -n "$own_pg" ] && { launch_ps1 -Action StopPostgres -PostmasterPid "$own_pg" || true; }
    return 0
  fi
  local port pid
  for port in "$@"; do
    for pid in $(listen_pids "$port"); do
      app_processes | grep -q "^$pid " && { pkill -TERM -P "$pid" 2>/dev/null || true; kill -TERM "$pid" 2>/dev/null || true; }
    done
  done
  if [ -n "$own_pg" ] && [ "$(postmaster_pid)" = "$own_pg" ] && kill -0 "$own_pg" 2>/dev/null; then
    stop_postmaster "$own_pg" "fin du lancement" || true
  fi
}

# Lance "npm install" si node_modules est absent ou ne correspond plus a package-lock.json (dependance ajoutee ou
# modifiee depuis la derniere installation). L'empreinte du fichier de verrouillage installe est notee dans
# node_modules/.focuswithakram-install apres chaque installation reussie. $1 : dossier du frontend.
update_frontend_dependencies() {
  local dir="$1" lock stamp sum why
  lock="$dir/package-lock.json"
  [ -f "$lock" ] || lock="$dir/package.json"
  stamp="$dir/node_modules/.focuswithakram-install"
  sum="$(cksum <"$lock")"
  [ -f "$stamp" ] && [ "$(head -n 1 "$stamp")" = "$sum" ] && return 0
  if [ -d "$dir/node_modules" ]; then why="dependances modifiees depuis la derniere installation"; else why="premier lancement"; fi
  printf '\033[36m==> Installation des dependances frontend (%s)\033[0m\n' "$why"
  (cd "$dir" && npm install) || fail "npm install a echoue dans $dir."
  # Empreinte relue apres coup : npm peut avoir mis a jour package-lock.json.
  cksum <"$lock" >"$stamp"
}

# Echoue avec un message explicite si la base locale n'a pas la version de PostgreSQL de l'application.
check_data_version() {
  local expected actual
  expected="$(sed -nE 's/.*<embedded-postgres-binaries\.version>([0-9]+)\..*/\1/p' "$ROOT/backend/pom.xml" | head -n 1)"
  actual="$(head -n 1 "$DATA_DIR/PG_VERSION" 2>/dev/null | tr -dc '0-9')"
  [ -n "$expected" ] && [ -n "$actual" ] && [ "$expected" != "$actual" ] || return 0
  if [ "$actual" -lt "$expected" ]; then
    fail "Votre base locale (backend/data/postgres) est au format PostgreSQL $actual ; l'application utilise PostgreSQL $expected. Migrez-la une fois (l'ancienne base est conservee) : sous Windows, powershell -File scripts/migrate_postgres.ps1 ; ailleurs, voir docs/technique/exploitation.md (migration de PostgreSQL)."
  fi
  fail "Votre base locale (backend/data/postgres) est au format PostgreSQL $actual, plus recent que celui de l'application (PostgreSQL $expected)."
}
