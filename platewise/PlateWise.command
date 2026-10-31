#!/bin/bash
# PlateWise launcher: double-click in Finder. Shows a small menu to start, open or stop PlateWise.
cd "$(dirname "$0")" || exit 1

PORT=$(cat backend/.server-port 2>/dev/null || echo 8000)
running() { curl -s -m 3 "http://localhost:$PORT/health" 2>/dev/null | grep -q '"prompt_version"'; }

ask() {  # $1 = message, rest = up to 3 buttons (last one is the default). Prints the choice.
  local msg="$1"; shift
  if command -v osascript >/dev/null 2>&1; then
    local buttons default="${!#}"
    buttons=$(printf '"%s", ' "$@"); buttons="{${buttons%, }}"
    osascript -e "try" \
      -e "button returned of (display dialog \"$msg\" with title \"PlateWise\" buttons $buttons default button \"$default\")" \
      -e "on error" -e "return \"\"" -e "end try" 2>/dev/null
  else
    echo "$msg" >&2
    local n=1
    for b in "$@"; do echo "  $n) $b" >&2; n=$((n + 1)); done
    read -r -p "Choose a number: " pick
    [ -n "$pick" ] && [ "$pick" -ge 1 ] 2>/dev/null && [ "$pick" -le $# ] && echo "${!pick}"
  fi
}

stop_server() {  # only ever stops PlateWise, never another program on the port
  stopped=""
  for pid in $(lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null); do
    if ps -o command= -p "$pid" 2>/dev/null | grep -q "app.main:app"; then kill "$pid" && stopped=1; fi
  done
  rm -f backend/.server-port
  if [ -n "$stopped" ]; then echo "PlateWise server stopped."; else echo "No PlateWise server was running."; fi
}

if running; then
  choice=$(ask "The PlateWise server is running." "Stop server" "Start phone app" "Open console")
else
  choice=$(ask "Start PlateWise?" "Cancel" "Server + phone app" "Start server")
fi

status=0
case "$choice" in
  "Start server") bash start.sh --server-only || status=$? ;;
  "Server + phone app" | "Start phone app") bash start.sh || status=$? ;;
  "Open console") open "http://localhost:$PORT/admin" 2>/dev/null || xdg-open "http://localhost:$PORT/admin" 2>/dev/null || echo "Open http://localhost:$PORT/admin in your browser." ;;
  "Stop server") stop_server; sleep 1 ;;
  *) exit 0 ;;
esac

if [ $status -ne 0 ]; then
  echo
  read -n 1 -s -r -p "Something went wrong (see above). Press any key to close this window."
fi
