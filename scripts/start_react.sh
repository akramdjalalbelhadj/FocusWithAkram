#!/usr/bin/env bash
# Lance FocusWithAkram en local (backend Spring Boot + frontend React) sans Docker.
#
#   ./scripts/start_react.sh                    # demarre tout
#   NODE_HOME=/chemin/node ./scripts/start_react.sh   # Node portable si celui du PATH est trop ancien
#   BACKEND_PORT=8081 FRONTEND_PORT=4300 ./scripts/start_react.sh
#
# Backend : profil "local" avec PostgreSQL embarque (donnees dans backend/data/postgres).
# Un lancement precedent de FocusWithAkram (backend, frontend, PostgreSQL embarque) est arrete. Un port tenu par une
# autre application n'est jamais libere de force : le premier port libre qui suit est utilise.
# Ctrl+C arrete proprement les deux processus et le PostgreSQL embarque demarre par ce lancement.
#   NO_BROWSER=1 ./scripts/start_react.sh       # sans ouvrir le navigateur
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs/react"
BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
mkdir -p "$LOG_DIR"

step() { printf '\033[36m==> %s\033[0m\n' "$*"; }
fail() { printf '\033[31mERREUR : %s\033[0m\n' "$*" >&2; exit 1; }
. "$ROOT/scripts/lib/launch.sh"

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

check_data_version

# Un lancement precedent (backend, frontend, PostgreSQL embarque qui verrouille le dossier de donnees) est arrete ;
# un port tenu par une autre application est remplace par le premier port libre qui suit. Le PostgreSQL embarque
# choisit lui-meme un autre port si le sien est indisponible (voir EmbeddedPostgresConfig).
step "Arret d'un lancement precedent et choix des ports"
stop_previous_instance
BACKEND_PORT="$(select_port "$BACKEND_PORT" backend)"
FRONTEND_PORT="$(select_port "$FRONTEND_PORT" frontend "$BACKEND_PORT")"
# Le frontend appelle l'API par son proxy : les requetes portent l'origine du frontend, a autoriser cote backend.
CORS_ORIGINS=""
for p in "$FRONTEND_PORT" 4200 5173; do
  case ",$CORS_ORIGINS," in *"//127.0.0.1:$p,"*) continue ;; esac
  CORS_ORIGINS="${CORS_ORIGINS:+$CORS_ORIGINS,}http://127.0.0.1:$p,http://localhost:$p"
done

# ---- Dependances frontend -----------------------------------------------------------------------
update_frontend_dependencies "$ROOT/frontend-react"

# ---- Demarrage ----------------------------------------------------------------------------------
pids=()
started=0
postmaster=""
cleanup() {
  trap - EXIT INT TERM
  step "Arret de FocusWithAkram"
  for pid in "${pids[@]:-}"; do
    [ -n "$pid" ] || continue
    # Tue l'arbre de processus (mvn lance une JVM fille, ng serve un processus node).
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  # Sous Windows, tuer les processus Bash ne tue pas la JVM ni node : le backend et le frontend de FocusWithAkram
  # sont aussi arretes par leurs ports, puis le PostgreSQL embarque (detache de la JVM) demarre par ce lancement.
  # Un PostgreSQL inconnu (arret pendant le demarrage) est laisse au lancement suivant, qui l'arretera.
  if [ "$started" -eq 1 ]; then
    stop_own_instance "$postmaster" "$FRONTEND_PORT" "$BACKEND_PORT" || true
  fi
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

started=1
step "Demarrage du backend (port $BACKEND_PORT) - le premier lancement telecharge PostgreSQL embarque"
(cd "$ROOT/backend" && PORT="$BACKEND_PORT" FOCUSFLOW_CORS_ORIGINS="$CORS_ORIGINS" \
  mvn -q spring-boot:run -Dspring-boot.run.profiles=local) >"$LOG_DIR/backend.log" 2>&1 &
backend_pid=$!
pids+=("$backend_pid")

up=0
for _ in $(seq 1 150); do
  kill -0 "$backend_pid" 2>/dev/null || fail "Le backend s'est arrete. Consultez $LOG_DIR/backend.log"
  if curl -fs "http://127.0.0.1:$BACKEND_PORT/actuator/health" 2>/dev/null | grep -q '"UP"'; then up=1; break; fi
  sleep 2
done
[ "$up" -eq 1 ] || fail "Le backend n'a pas demarre en 5 minutes. Consultez $LOG_DIR/backend.log"
postmaster="$(postmaster_pid)"
printf '    \033[32mBackend pret.\033[0m\n'

step "Demarrage du frontend (port $FRONTEND_PORT)"
(cd "$ROOT/frontend-react" && FOCUS_API_URL="http://127.0.0.1:$BACKEND_PORT" exec "$NODE_BIN" node_modules/vite/bin/vite.js --config "$ROOT/frontend-react/vite.config.ts" --host 127.0.0.1 --port "$FRONTEND_PORT") >"$LOG_DIR/frontend.log" 2>&1 &
frontend_pid=$!
pids+=("$frontend_pid")

ready=0
for _ in $(seq 1 90); do
  kill -0 "$frontend_pid" 2>/dev/null || fail "Le frontend s'est arrete. Consultez $LOG_DIR/frontend.log"
  if curl -fs -o /dev/null "http://127.0.0.1:$FRONTEND_PORT"; then ready=1; break; fi
  sleep 2
done
[ "$ready" -eq 1 ] || fail "Le frontend n'a pas demarre a temps. Consultez $LOG_DIR/frontend.log
$(tail -n 25 "$LOG_DIR/frontend.log" 2>/dev/null)"

printf '\n\033[32m  FocusWithAkram est pret\033[0m\n'
echo "    Application : http://127.0.0.1:$FRONTEND_PORT"
echo "    API / Swagger : http://localhost:$BACKEND_PORT/swagger-ui.html"
echo "    Journaux : $LOG_DIR"
echo "    Ctrl+C pour arreter."

# Ouvre le navigateur quand c'est possible (sans echec si absent), sauf avec NO_BROWSER=1.
if [ -z "${NO_BROWSER:-}" ]; then
  (command -v xdg-open >/dev/null && xdg-open "http://127.0.0.1:$FRONTEND_PORT") \
    || (command -v open >/dev/null && open "http://127.0.0.1:$FRONTEND_PORT") \
    || (command -v start >/dev/null && start "http://127.0.0.1:$FRONTEND_PORT") || true >/dev/null 2>&1
fi

# Surveille les deux processus : si l'un s'arrete, on arrete tout.
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do sleep 2; done
echo "Un des processus s'est arrete : consultez les journaux dans $LOG_DIR" >&2
