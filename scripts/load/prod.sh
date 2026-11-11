#!/bin/bash
# Read-only bursts against the live demo (no model calls, no writes). Usage:
#   scripts/load/prod.sh https://oja-4586.onrender.com out.jsonl
# 20 s per burst at 50/200/500/1000; stops escalating a scenario when errors > 20% or p95 > 10 s.
set -u
BASE=$1; OUT=$2
DIR=$(cd "$(dirname "$0")" && pwd)
bad() { tail -1 "$OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s);process.exit(r.errorRate>20||r.p95>10000?0:1)})'; }
for s in home shop chat-new; do
  for c in 50 200 500 1000; do
    node "$DIR/bench.mjs" --base "$BASE" --scenario $s -c $c -d 20 --label prod --out "$OUT"
    sleep 10
    bad && break
  done
done
