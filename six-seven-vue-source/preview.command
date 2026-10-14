#!/bin/zsh
cd "$(dirname "$0")/dist" || exit 1
python3 -m http.server 8767 --bind 127.0.0.1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null' EXIT INT TERM
sleep 1
open http://127.0.0.1:8767/
wait "$server_pid"
