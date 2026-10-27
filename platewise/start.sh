#!/usr/bin/env bash
# PlateWise: install everything, ask for an AI key once, then start the server and the app.
# Run from anywhere:  bash platewise/start.sh
set -e
cd "$(dirname "$0")"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Please install $2 first: $3"; exit 1; }
}
need python3 "Python 3.12 or newer" "https://www.python.org/downloads/"
need node "Node.js 20 or newer" "https://nodejs.org"
need npm "Node.js 20 or newer" "https://nodejs.org"
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' || { echo "Python 3.12 or newer is needed (you have $(python3 --version))."; exit 1; }

ENV_FILE=backend/.env
[ -f "$ENV_FILE" ] || cp backend/.env.example "$ENV_FILE"

if ! grep -qE '^(GEMINI|OPENAI|ANTHROPIC)_API_KEY=.+' "$ENV_FILE"; then
  echo
  echo "Paste your Gemini API key and press Enter."
  echo "(Nothing shows while you paste; that's normal. Press Enter with nothing to use demo mode.)"
  read -rs KEY
  echo
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

echo "Installing the app (first time takes a few minutes)…"
[ -d mobile/node_modules ] || (cd mobile && npm install --no-audit --no-fund)

echo "Starting the server on port 8000…"
(cd backend && exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000) &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM

for _ in $(seq 1 30); do
  if HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null) && [ -n "$HEALTH" ]; then break; fi
  sleep 1
done
case "$HEALTH" in
  *'"demo":true'*) echo "Server running in DEMO mode (no AI key found)." ;;
  *'"status":"ok"'*) echo "Server running with real AI: $HEALTH" ;;
  *) echo "The server didn't start. Scroll up for the error."; exit 1 ;;
esac

echo
echo "Starting the app. Scan the QR code with Expo Go (Android) or the Camera app (iPhone)."
echo "Your phone must be on the same Wi-Fi as this computer. Press Ctrl+C to stop everything."
cd mobile
npx expo start
