#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root inside the Ubuntu WSL distro." >&2
  exit 1
fi

if ! command -v pg_ctlcluster >/dev/null 2>&1 || ! dpkg-query -W -f='${Status}' postgresql-16-pgvector 2>/dev/null | grep -q 'install ok installed'; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y postgresql-16 postgresql-16-pgvector
fi

if ! pg_isready -q; then
  pg_ctlcluster 16 main start
fi

runuser -u postgres -- psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent') THEN
    ALTER ROLE agent WITH LOGIN PASSWORD 'localdev';
  ELSE
    CREATE ROLE agent LOGIN PASSWORD 'localdev';
  END IF;
END
$$;
SQL

if runuser -u postgres -- psql -Atqc "SELECT 1 FROM pg_database WHERE datname = 'agent_memory'" | grep -qx '1'; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "ALTER DATABASE agent_memory OWNER TO agent"
else
  runuser -u postgres -- createdb -O agent agent_memory
fi

runuser -u postgres -- psql -d agent_memory -v ON_ERROR_STOP=1 -f "$(dirname "${BASH_SOURCE[0]}")/init-db.sql"
