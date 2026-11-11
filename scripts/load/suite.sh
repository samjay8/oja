#!/bin/bash
# Local suite: every scenario at each concurrency. Usage:
#   scripts/load/suite.sh <base> <server-pid> <label> <out.jsonl> <sessions.txt> [duration] [scenarios]
# Needs DEMO_VENDOR_KEY (seller sign-in for the inbox scenario) and AUTOCANNON_DIR.
# Between runs it waits for the server to drain its backlog (one chat poll < 2 s), and
# stops escalating a scenario once more than half the requests fail.
set -u
BASE=$1; PID=$2; LABEL=$3; OUT=$4; SESS=$5; D=${6:-30}; ONLY=${7:-"home shop chat-new chat-seeded inbox"}
DIR=$(cd "$(dirname "$0")" && pwd)
drain() {
  for i in $(seq 1 60); do
    t=$(curl -s -o /dev/null -m 10 -w "%{time_total}" "$BASE/api/chat?shop=ife-textiles&session=drain-check-000000")
    awk -v t="$t" 'BEGIN{exit !(t>0 && t<2)}' && return
    sleep 3
  done
  echo "server did not drain" >&2
}
failed() { tail -1 "$OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.exit(JSON.parse(s).errorRate>50?0:1))'; }
run() { drain; node "$DIR/bench.mjs" --base "$BASE" --pid "$PID" --label "$LABEL" --out "$OUT" -d "$D" "$@"; }
COOKIE=$(curl -s -D - -o /dev/null -H 'content-type: application/json' \
  -d "{\"key\":\"$DEMO_VENDOR_KEY\"}" "$BASE/api/vendor/ife-textiles/login" | grep -i '^set-cookie' | head -1 | sed -E 's/^[Ss]et-[Cc]ookie: ([^;]*).*/\1/')
for s in $ONLY; do
  case $s in
    inbox) levels="10 50 100"; extra=(--cookie "$COOKIE") ;;
    chat-seeded) levels="50 200 500 1000"; extra=(--sessions "$SESS") ;;
    *) levels="50 200 500 1000"; extra=() ;;
  esac
  for c in $levels; do run --scenario $s -c $c "${extra[@]}"; failed && break; done
done
