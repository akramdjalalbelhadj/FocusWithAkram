#!/usr/bin/env bash
# Lance FocusWithAkram en local (backend Spring Boot + frontend React) sans Docker.
#
#   ./scripts/start_react.sh                    # demarre tout
#   NODE_HOME=/chemin/node ./scripts/start_react.sh   # Node portable si celui du PATH est trop ancien
#   BACKEND_PORT=8081 FRONTEND_PORT=4300 ./scripts/start_react.sh
#
# Backend : profil "local" avec PostgreSQL embarque (donnees dans backend/data/postgres).
# Ctrl+C arrete proprement les deux processus.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs/react"
BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
mkdir -p "$LOG_DIR"

step() { printf '\033[36m==> %s\033[0m\n' "$*"; }
fail() { printf '\033[31mERREUR : %s\033[0m\n' "$*" >&2; exit 1; }

# ---- Pre-requis ---------------------------------------------------------------------------------
step "Verification des pre-requis"

command -v java >/dev/null || fail "Java 25 est requis (commande 'java' introuvable)."
java_major="$(java -version 2>&1 | head -1 | sed -E 's/.*"([0-9]+).*/\1/')"
[ "${java_major:-0}" -ge 25 ] || fail "Java 25 ou superieur requis (detecte : ${java_major:-inconnu})."

command -v curl >/dev/null || fail "curl est requis pour verifier le demarrage."
command -v mvn >/dev/null || fail "Maven 3.9+ est requis (commande 'mvn' introuvable)."

# Node 24 portable par defaut (modifiable via NODE_HOME). S'il est absent, on utilise le Node du PATH.
NODE_HOME="${NODE_HOME:-${FOCUSFLOW_NODE_HOME:-$ROOT/.tools/node_modules/node/bin}}"
if [ -x "$NODE_HOME/bin/node" ]; then PATH="$NODE_HOME/bin:$PATH"
elif [ -x "$NODE_HOME/node.exe" ] || [ -x "$NODE_HOME/node" ]; then PATH="$NODE_HOME:$PATH"
fi
command -v node >/dev/null || fail "Node.js est requis (>= 22.22.3 ou >= 24.15)."
node_version="$(node -v | sed 's/^v//')"
IFS=. read -r n_major n_minor n_patch <<<"$node_version"
node_ok=0
if   [ "$n_major" -ge 26 ]; then node_ok=1
elif [ "$n_major" -eq 24 ] && [ "$n_minor" -ge 15 ]; then node_ok=1
elif [ "$n_major" -eq 25 ]; then node_ok=1
elif [ "$n_major" -eq 22 ] && { [ "$n_minor" -gt 22 ] || { [ "$n_minor" -eq 22 ] && [ "$n_patch" -ge 3 ]; }; }; then node_ok=1
fi
[ "$node_ok" -eq 1 ] || fail "Node $node_version est trop ancien pour les frontends. Definissez NODE_HOME vers un Node >= 22.22.3 / 24.15."

port_busy() {
  if command -v ss >/dev/null; then ss -ltn "( sport = :$1 )" 2>/dev/null | grep -q LISTEN
  elif command -v lsof >/dev/null; then lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  else (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
  fi
}
for p in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if port_busy "$p"; then fail "Le port $p est deja utilise. Changez BACKEND_PORT / FRONTEND_PORT."; fi
done

# ---- Dependances frontend -----------------------------------------------------------------------
if [ ! -d "$ROOT/frontend-react/node_modules" ]; then
  step "Installation des dependances frontend (premier lancement)"
  (cd "$ROOT/frontend-react" && npm install)
fi

# ---- Demarrage ----------------------------------------------------------------------------------
pids=()
cleanup() {
  trap - EXIT INT TERM
  step "Arret de FocusWithAkram"
  for pid in "${pids[@]:-}"; do
    [ -n "$pid" ] || continue
    # Tue l'arbre de processus (mvn lance une JVM fille, ng serve un processus node).
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

step "Demarrage du backend (port $BACKEND_PORT) - le premier lancement telecharge PostgreSQL embarque"
(cd "$ROOT/backend" && PORT="$BACKEND_PORT" mvn -q spring-boot:run -Dspring-boot.run.profiles=local) \
  >"$LOG_DIR/backend.log" 2>&1 &
backend_pid=$!
pids+=("$backend_pid")

up=0
for _ in $(seq 1 150); do
  kill -0 "$backend_pid" 2>/dev/null || fail "Le backend s'est arrete. Consultez $LOG_DIR/backend.log"
  if curl -fs "http://127.0.0.1:$BACKEND_PORT/actuator/health" 2>/dev/null | grep -q '"UP"'; then up=1; break; fi
  sleep 2
done
[ "$up" -eq 1 ] || fail "Le backend n'a pas demarre en 5 minutes. Consultez $LOG_DIR/backend.log"
printf '    \033[32mBackend pret.\033[0m\n'

step "Demarrage du frontend (port $FRONTEND_PORT)"
(cd "$ROOT/frontend-react" && FOCUS_API_URL="http://127.0.0.1:$BACKEND_PORT" exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port "$FRONTEND_PORT") >"$LOG_DIR/frontend.log" 2>&1 &
frontend_pid=$!
pids+=("$frontend_pid")

ready=0
for _ in $(seq 1 90); do
  kill -0 "$frontend_pid" 2>/dev/null || fail "Le frontend s'est arrete. Consultez $LOG_DIR/frontend.log"
  if curl -fs -o /dev/null "http://127.0.0.1:$FRONTEND_PORT"; then ready=1; break; fi
  sleep 2
done
[ "$ready" -eq 1 ] || fail "Le frontend n'a pas demarre a temps."

printf '\n\033[32m  FocusWithAkram est pret\033[0m\n'
echo "    Application : http://127.0.0.1:$FRONTEND_PORT"
echo "    API / Swagger : http://localhost:$BACKEND_PORT/swagger-ui.html"
echo "    Journaux : $LOG_DIR"
echo "    Ctrl+C pour arreter."

# Ouvre le navigateur quand c'est possible (sans echec si absent).
(command -v xdg-open >/dev/null && xdg-open "http://127.0.0.1:$FRONTEND_PORT") \
  || (command -v open >/dev/null && open "http://127.0.0.1:$FRONTEND_PORT") \
  || (command -v start >/dev/null && start "http://127.0.0.1:$FRONTEND_PORT") || true >/dev/null 2>&1

# Surveille les deux processus : si l'un s'arrete, on arrete tout.
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do sleep 2; done
echo "Un des processus s'est arrete : consultez les journaux dans $LOG_DIR" >&2
