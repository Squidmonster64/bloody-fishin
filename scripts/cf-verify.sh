#!/usr/bin/env bash
# Step 2: smoke-test a deployed base URL and time the forecast routes.
# Usage: ./scripts/cf-verify.sh https://bloody-fishin-staging.<subdomain>.workers.dev
set -uo pipefail
BASE="${1:?Usage: $0 <base-url>}"; BASE="${BASE%/}"
fail=0
check() { # path expected-status
  local code; code=$(curl -s -o /tmp/cf-verify.out -w "%{http_code} %{time_total}s" "$BASE$1")
  printf "%-46s %s\n" "$1" "$code"
  [[ "$code" == "$2"* ]] || { fail=1; head -c 200 /tmp/cf-verify.out; echo; }
}
check /livez 200
check /readyz 200
check /health 200
check "/locations?place=Broome" 200
check "/brief.json?spot=freo&days=1" 200
check "/brief.json?spot=freo&days=5&hours=all" 200
check "/brief?spot=freo&days=2" 200
check /robots.txt 200
check / 200
echo "--- repeat /brief.json x5 (cold vs cached)"
for i in 1 2 3 4 5; do curl -s -o /dev/null -D - -w "t=%{time_total}s\n" "$BASE/brief.json?spot=freo&days=5&place=t$i" | grep -iE "^(x-brief-cache|t=)" | tr '\n' ' '; echo; done
echo "--- mcp tools/list"
curl -s -X POST "$BASE/mcp" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | grep -o '"name":"[a-z_]*"' | head -5
echo
[[ $fail -eq 0 ]] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED"
exit $fail
