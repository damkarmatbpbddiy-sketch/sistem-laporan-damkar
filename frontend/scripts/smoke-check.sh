#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/smoke-check.sh [HOST] [EMAIL] [PASSWORD]
# Example: ./scripts/smoke-check.sh http://localhost:5000 admin@example.com password123

HOST="${1:-http://localhost:5000}"
EMAIL="${2:-admin@example.com}"
PASS="${3:-password123}"

echo "Using host: $HOST"
echo "Logging in as $EMAIL..."

RESP=$(curl -s -X POST "$HOST/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

echo "Login response: $RESP"

# Extract token: prefer jq if available, fallback to sed
if command -v jq >/dev/null 2>&1; then
  TOKEN=$(echo "$RESP" | jq -r '.token')
else
  TOKEN=$(echo "$RESP" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: token not found in login response" >&2
  exit 2
fi

echo "Token obtained (truncated): ${TOKEN:0:24}..."
echo "Calling /admin/stats..."

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X GET "$HOST/admin/stats" \
  -H "Authorization: Bearer $TOKEN"

exit 0
