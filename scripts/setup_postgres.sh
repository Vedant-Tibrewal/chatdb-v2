#!/usr/bin/env bash
set -euo pipefail

# ── Create 'vedant' user and 'chatdb' database in PostgreSQL ────
# Prerequisites: psql installed, PostgreSQL running on localhost:5432
#
# Uses the admin credentials provided by the network admin to
# create a dedicated 'vedant' role and 'chatdb' database.
#
# Usage:  chmod +x scripts/setup_postgres.sh && ./scripts/setup_postgres.sh
# ─────────────────────────────────────────────────────────────────

ADMIN_USER="postgres"
ADMIN_PASS="ReswapNumber1"
PG_HOST="localhost"
PG_PORT="5432"

NEW_USER="vedant"
NEW_PASS="ReswapNumber1"
TARGET_DB="chatdb"

export PGPASSWORD="${ADMIN_PASS}"

echo "==> Connecting to PostgreSQL as admin (${ADMIN_USER})..."

# Create role if it doesn't exist
psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${ADMIN_USER}" -d postgres -tc \
  "SELECT 1 FROM pg_roles WHERE rolname = '${NEW_USER}'" | grep -q 1 || \
  psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${ADMIN_USER}" -d postgres -c \
    "CREATE ROLE ${NEW_USER} WITH LOGIN PASSWORD '${NEW_PASS}';"

echo "==> Role '${NEW_USER}' ready."

# Create database if it doesn't exist
psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${ADMIN_USER}" -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = '${TARGET_DB}'" | grep -q 1 || \
  psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${ADMIN_USER}" -d postgres -c \
    "CREATE DATABASE ${TARGET_DB} OWNER ${NEW_USER};"

echo "==> Database '${TARGET_DB}' ready."

# Grant all privileges
psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${ADMIN_USER}" -d "${TARGET_DB}" -c \
  "GRANT ALL PRIVILEGES ON DATABASE ${TARGET_DB} TO ${NEW_USER};"
psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${ADMIN_USER}" -d "${TARGET_DB}" -c \
  "GRANT ALL ON SCHEMA public TO ${NEW_USER};"
psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${ADMIN_USER}" -d "${TARGET_DB}" -c \
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${NEW_USER};"

echo "==> Privileges granted."

# Verify connection as vedant
export PGPASSWORD="${NEW_PASS}"
psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${NEW_USER}" -d "${TARGET_DB}" -c \
  "SELECT current_user, current_database();"

echo ""
echo "✓ PostgreSQL setup complete."
echo "  User: ${NEW_USER}"
echo "  Database: ${TARGET_DB}"
echo "  Connection: postgresql://${NEW_USER}:***@${PG_HOST}:${PG_PORT}/${TARGET_DB}"

unset PGPASSWORD
