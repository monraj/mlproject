#!/bin/bash
# Double-click in Finder to stop a PlateWise server running on this Mac.
pids=$(lsof -t -iTCP:8000 -sTCP:LISTEN 2>/dev/null)
if [ -n "$pids" ]; then
  kill $pids && echo "PlateWise server stopped."
else
  echo "No PlateWise server was running."
fi
sleep 2
