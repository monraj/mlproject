#!/bin/bash
# Double-click in Finder to start the server and the phone app (scan the QR code with Expo Go).
cd "$(dirname "$0")" || exit 1
bash start.sh
status=$?
if [ $status -ne 0 ]; then
  echo
  read -n 1 -s -r -p "Something went wrong (see above). Press any key to close this window."
fi
