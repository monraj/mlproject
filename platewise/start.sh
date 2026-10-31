#!/usr/bin/env bash
# PlateWise: install everything, ask for an AI key once, then start the server and the app.
# Run from anywhere:  bash platewise/start.sh            (server + phone app)
#                     bash platewise/start.sh --server-only   (server + console in the browser)
# On a Mac you can double-click "Start PlateWise Server.command" instead.
set -e
cd "$(dirname "$0")"
MODE=all
[ "${1:-}" = "--server-only" ] && MODE=server

open_url() {
  if command -v open >/dev/null 2>&1; then open "$1" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1 || true
  fi
}

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Please install $2 first: $3"; exit 1; }
}
need python3 "Python 3.12 or newer" "https://www.python.org/downloads/"
if [ "$MODE" = all ]; then
  need node "Node.js 20 or newer" "https://nodejs.org"
  need npm "Node.js 20 or newer" "https://nodejs.org"
fi
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' || { echo "Python 3.12 or newer is needed (you have $(python3 --version))."; exit 1; }

ENV_FILE=backend/.env
[ -f "$ENV_FILE" ] || cp backend/.env.example "$ENV_FILE"

if ! grep -qE '^(GEMINI|OPENAI|ANTHROPIC)_API_KEY=.+' "$ENV_FILE"; then
  KEY=""
  if command -v osascript >/dev/null 2>&1; then
    # Mac: ask in a normal pop-up window.
    KEY=$(osascript -e 'try' \
      -e 'text returned of (display dialog "Paste your Gemini API key.\n\nIt is saved only on this Mac (platewise/backend/.env). Leave it empty to try demo mode." default answer "" with hidden answer with title "PlateWise" buttons {"Use demo mode", "Save key"} default button "Save key")' \
      -e 'on error' -e 'return ""' -e 'end try' 2>/dev/null || true)
  else
    echo
    echo "Paste your Gemini API key and press Enter."
    echo "(Nothing shows while you paste; that's normal. Press Enter with nothing to use demo mode.)"
    read -rs KEY || true
    echo
  fi
  if [ -n "$KEY" ]; then
    python3 - "$ENV_FILE" "$KEY" <<'PY'
import re, sys
path, key = sys.argv[1], sys.argv[2].strip()
text = open(path).read()
text = re.sub(r"^GEMINI_API_KEY=.*$", lambda _: "GEMINI_API_KEY=" + key, text, flags=re.M)
open(path, "w").write(text)
PY
    echo "Saved your key to platewise/$ENV_FILE (this file is never uploaded to GitHub)."
  else
    echo "No key: starting in demo mode. Run this script again to add one."
  fi
fi

echo
echo "Installing the server (first time takes a minute)…"
[ -x backend/.venv/bin/python ] || python3 -m venv backend/.venv
backend/.venv/bin/pip install -q --upgrade pip >/dev/null
backend/.venv/bin/pip install -q -r backend/requirements.txt

if [ "$MODE" = all ]; then
  echo "Installing the app (first time takes a few minutes)…"
  [ -d mobile/node_modules ] || (cd mobile && npm install --no-audit --no-fund)
fi

port_busy() { command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; }
plate_running() { curl -s -m 3 http://localhost:8000/health 2>/dev/null | grep -q '"status":"ok"'; }

start_server() {
  LOG="$PWD/backend/server.log"
  echo "Starting the server on port 8000 (the very first start can take a minute or two)…"
  (cd backend && exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000) >"$LOG" 2>&1 &
  SERVER_PID=$!
  trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM
  HEALTH=""
  for i in $(seq 1 180); do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo
      echo "The server stopped while starting. Here is what it said:"
      echo "------------------------------------------------------------"
      tail -n 30 "$LOG"
      echo "------------------------------------------------------------"
      echo "Copy the lines above and send them to Claude to get it fixed."
      exit 1
    fi
    HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null || true)
    [ -n "$HEALTH" ] && break
    [ $((i % 15)) -eq 0 ] && echo "  still starting… (${i}s)"
    sleep 1
  done
  case "$HEALTH" in
    *'"demo":true'*) echo "Server running in DEMO mode (no AI key found in backend/.env)." ;;
    *'"status":"ok"'*) echo "Server running with real AI." ;;
    *)
      echo "The server didn't answer after 3 minutes. Here is what it said:"
      tail -n 30 "$LOG"
      exit 1 ;;
  esac
  echo "Server console: http://localhost:8000/admin   (server messages are saved in platewise/backend/server.log)"
}

ALREADY=""
if port_busy || plate_running; then
  if plate_running; then
    ALREADY=1
    echo "PlateWise server is already running."
  else
    echo
    echo "Something else is using port 8000, so the PlateWise server can't start."
    echo "Close that program, or run:  kill \$(lsof -t -iTCP:8000 -sTCP:LISTEN)   and try again."
    exit 1
  fi
fi

if [ "$MODE" = server ]; then
  if [ -n "$ALREADY" ]; then
    echo "Opening the console…"
    open_url "http://localhost:8000/admin"
    exit 0
  fi
  start_server
  open_url "http://localhost:8000/admin"
  echo
  echo "The server is running. Leave this window open while you use PlateWise."
  echo "To stop it, close this window (or press Ctrl+C)."
  wait "$SERVER_PID"
  exit 0
fi

[ -n "$ALREADY" ] || start_server
echo
echo "Starting the app. Scan the QR code with Expo Go (Android) or the Camera app (iPhone)."
echo "Your phone must be on the same Wi-Fi as this computer. Press Ctrl+C (or close this window) to stop."
cd mobile
npx expo start
