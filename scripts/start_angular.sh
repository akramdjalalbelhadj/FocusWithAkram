#!/usr/bin/env bash
# Lance FocusWithAkram en local (backend Spring Boot + frontend Angular) sans Docker.
#
#   ./scripts/start_angular.sh                    # demarre tout
#   NODE_HOME=/chemin/node ./scripts/start_angular.sh   # Node portable si celui du PATH est trop ancien
#   BACKEND_PORT=8081 FRONTEND_PORT=4300 ./scripts/start_angular.sh
#
# Backend : profil "local" avec PostgreSQL embarque (donnees dans backend/data/postgres).
# Un port deja occupe (lancement precedent, autre application) est libere : son processus est arrete.
# Ctrl+C arrete proprement les deux processus.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs/angular"
BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-4200}"
mkdir -p "$LOG_DIR"

step() { printf '\033[36m==> %s\033[0m\n' "$*"; }
fail() { printf '\033[31mERREUR : %s\033[0m\n' "$*" >&2; exit 1; }
. "$ROOT/scripts/lib/free-port.sh"

# ---- Pre-requis ---------------------------------------------------------------------------------
step "Verification des pre-requis"

command -v java >/dev/null || fail "Java 25 est requis (commande 'java' introuvable)."
java_major="$(java -version 2>&1 | head -1 | sed -E 's/.*"([0-9]+).*/\1/')"
[ "${java_major:-0}" -ge 25 ] || fail "Java 25 ou superieur requis (detecte : ${java_major:-inconnu})."

command -v curl >/dev/null || fail "curl est requis pour verifier le demarrage."
command -v mvn >/dev/null || fail "Maven 3.9+ est requis (commande 'mvn' introuvable)."

# Node 24 portable par defaut (modifiable via NODE_HOME). S'il est absent, on utilise le Node du PATH.
NODE_HOME="${NODE_HOME:-${FOCUSFLOW_NODE_HOME:-$ROOT/.tools/node_modules/node/bin}}"
# Chemin explicite du binaire : le Node portable contient un fichier vide nomme « node » a cote de node.exe, qui
# ferait ignorer ce dossier par Bash sous Windows et retomber sur le Node du PATH.
NODE_BIN=node
if [ -x "$NODE_HOME/bin/node" ]; then NODE_BIN="$NODE_HOME/bin/node"; PATH="$NODE_HOME/bin:$PATH"
elif [ -x "$NODE_HOME/node.exe" ]; then NODE_BIN="$NODE_HOME/node.exe"; PATH="$NODE_HOME:$PATH"
elif [ -s "$NODE_HOME/node" ] && [ -x "$NODE_HOME/node" ]; then NODE_BIN="$NODE_HOME/node"; PATH="$NODE_HOME:$PATH"
fi
command -v "$NODE_BIN" >/dev/null || fail "Node.js est requis (>= 22.22.3 ou >= 24.15)."
node_version="$("$NODE_BIN" -v | tr -d '\r' | sed 's/^v//')"
IFS=. read -r n_major n_minor n_patch <<<"$node_version"
node_ok=0
if   [ "$n_major" -ge 26 ]; then node_ok=1
elif [ "$n_major" -eq 24 ] && [ "$n_minor" -ge 15 ]; then node_ok=1
elif [ "$n_major" -eq 25 ]; then node_ok=1
elif [ "$n_major" -eq 22 ] && { [ "$n_minor" -gt 22 ] || { [ "$n_minor" -eq 22 ] && [ "$n_patch" -ge 3 ]; }; }; then node_ok=1
fi
[ "$node_ok" -eq 1 ] || fail "Node $node_version est trop ancien pour les frontends. Definissez NODE_HOME vers un Node >= 22.22.3 / 24.15."

# Ports occupes : l'application qui les tient (souvent un lancement precedent) est arretee, y compris le
# PostgreSQL embarque du profil local (port lu dans application-local.yml), qui verrouille le dossier de donnees.
PG_PORT="$(sed -nE 's/^[[:space:]]*port:[[:space:]]*([0-9]+).*/\1/p' "$ROOT/backend/src/main/resources/application-local.yml" 2>/dev/null | head -1)"
PG_PORT="${PG_PORT:-54329}"
step "Liberation des ports (une application deja lancee sur ces ports est arretee)"
free_port "$FRONTEND_PORT" "frontend"
free_port "$BACKEND_PORT" "backend"
free_port "$PG_PORT" "PostgreSQL embarque"

# ---- Dependances frontend -----------------------------------------------------------------------
if [ ! -d "$ROOT/frontend-angular/node_modules" ]; then
  step "Installation des dependances frontend (premier lancement)"
  (cd "$ROOT/frontend-angular" && npm install)
fi

# ---- Demarrage ----------------------------------------------------------------------------------
pids=()
started=0
cleanup() {
  trap - EXIT INT TERM
  step "Arret de FocusWithAkram"
  for pid in "${pids[@]:-}"; do
    [ -n "$pid" ] || continue
    # Tue l'arbre de processus (mvn lance une JVM fille, ng serve un processus node).
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  # Sous Windows, tuer les processus Bash ne tue pas la JVM ni node : on libere aussi les ports par leur numero,
  # et le PostgreSQL embarque (detache de la JVM) est arrete proprement.
  if [ "$started" -eq 1 ]; then
    for p in "$FRONTEND_PORT" "$BACKEND_PORT" "$PG_PORT"; do (free_port "$p" "arret") >/dev/null 2>&1 || true; done
  fi
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

started=1
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
printf '{"/api":{"target":"http://127.0.0.1:%s","secure":false,"changeOrigin":true}}\n' "$BACKEND_PORT" >"$LOG_DIR/proxy.conf.json"
(cd "$ROOT/frontend-angular" && exec "$NODE_BIN" node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port "$FRONTEND_PORT" --proxy-config "$LOG_DIR/proxy.conf.json") >"$LOG_DIR/frontend.log" 2>&1 &
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
