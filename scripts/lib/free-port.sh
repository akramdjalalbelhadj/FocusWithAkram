# Libere un port TCP en arretant le processus qui l'ecoute. A charger avec ". scripts/lib/free-port.sh" ;
# attend que l'appelant definisse ROOT et fail().
#
#   free_port 4200 "frontend"
#
# Sous Windows (Git Bash, MSYS, Cygwin), le travail est delegue a scripts/lib/free-port.ps1 (taskkill, et arret
# propre du PostgreSQL embarque par pg_ctl). Sous Linux et macOS : SIGINT (arret rapide propre) pour PostgreSQL,
# SIGTERM pour les autres processus, puis SIGKILL si le port n'est pas libere au bout de 15 secondes.

is_windows() {
  case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) return 0 ;; *) return 1 ;; esac
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

# Vrai si un processus ecoute sur le port $1.
port_busy() {
  if is_windows; then
    netstat -ano -p tcp 2>/dev/null | tr -d '\r' | awk -v p=":$1" '$1=="TCP" && $3 ~ /:0$/ && substr($2, length($2)-length(p)+1)==p {f=1} END {exit !f}'
  elif [ -n "$(listen_pids "$1")" ]; then
    return 0
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
  fi
}

free_port() {
  local port="$1" label="${2:-application}"
  if is_windows; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$ROOT/scripts/lib/free-port.ps1")" \
      -Port "$port" -Label "$label" | tr -d '\r' || fail "Impossible de liberer le port $port."
    return 0
  fi
  local pids pid name
  pids="$(listen_pids "$port")"
  if [ -z "$pids" ]; then
    port_busy "$port" && fail "Le port $port est occupe par un processus introuvable (droits insuffisants ?)."
    return 0
  fi
  for pid in $pids; do
    name="$(ps -p "$pid" -o comm= 2>/dev/null || echo inconnu)"
    printf '\033[33m    Port %s (%s) occupe par %s (PID %s) : arret.\033[0m\n' "$port" "$label" "$name" "$pid"
    case "$name" in
      *postgres*) kill -INT "$pid" 2>/dev/null || true ;;
      *) pkill -TERM -P "$pid" 2>/dev/null || true; kill -TERM "$pid" 2>/dev/null || true ;;
    esac
  done
  local i
  for i in $(seq 1 30); do
    [ -z "$(listen_pids "$port")" ] && return 0
    sleep 0.5
  done
  for pid in $(listen_pids "$port"); do kill -KILL "$pid" 2>/dev/null || true; done
  sleep 1
  [ -z "$(listen_pids "$port")" ] || fail "Le port $port est toujours occupe apres l'arret de son processus."
}
