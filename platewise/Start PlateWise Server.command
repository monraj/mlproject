#!/bin/bash
# Double-click in Finder to start the PlateWise server and open its console in your browser.
cd "$(dirname "$0")" || exit 1
bash start.sh --server-only
status=$?
if [ $status -ne 0 ]; then
  echo
  read -n 1 -s -r -p "Something went wrong (see above). Press any key to close this window."
fi
