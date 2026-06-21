#!/usr/bin/env bash
# Open psql against the DATABASE_URL declared in .env.local.
#
# Usage (from community-builder/):
#   npm run db:psql                         # interactive psql shell
#   npm run db:psql -- -c "SELECT now()"    # one-off query
#   npm run db:psql -- -f path/to/file.sql  # run a SQL file
#
# Everything after `--` is forwarded verbatim to psql.

set -euo pipefail

ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "db-psql: $ENV_FILE not found in $(pwd)" >&2
  exit 1
fi

DATABASE_URL="$(
  grep -E '^DATABASE_URL=' "$ENV_FILE" \
    | head -n1 \
    | cut -d= -f2- \
    | sed -E 's/^"(.*)"$/\1/; s/^'\''(.*)'\''$/\1/'
)"

if [[ -z "$DATABASE_URL" ]]; then
  echo "db-psql: DATABASE_URL not set in $ENV_FILE" >&2
  exit 1
fi

exec psql "$DATABASE_URL" "$@"
