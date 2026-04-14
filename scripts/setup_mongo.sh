#!/usr/bin/env bash
set -euo pipefail

# ── Create 'vedant' user in MongoDB for ChatDB ──────────────────
# Prerequisites: mongosh installed, MongoDB running on localhost:27017
#
# Uses the admin credentials provided by the network admin to
# create a dedicated 'vedant' user with readWrite access on 'chatdb' db.
#
# Usage:  chmod +x scripts/setup_mongo.sh && ./scripts/setup_mongo.sh
# ─────────────────────────────────────────────────────────────────

ADMIN_USER="reswapController"
ADMIN_PASS="ReswapNumber1"
ADMIN_DB="admin"

NEW_USER="vedant"
NEW_PASS="ReswapNumber1"
TARGET_DB="chatdb"

echo "==> Connecting to MongoDB as admin (${ADMIN_USER})..."

mongosh "mongodb://${ADMIN_USER}:${ADMIN_PASS}@localhost:27017/${ADMIN_DB}" --eval "
  // Switch to the target database
  db = db.getSiblingDB('${TARGET_DB}');

  // Drop existing user if present (idempotent)
  try { db.dropUser('${NEW_USER}'); } catch(e) {}

  // Create the vedant user with readWrite on chatdb
  db.createUser({
    user: '${NEW_USER}',
    pwd: '${NEW_PASS}',
    roles: [
      { role: 'readWrite', db: '${TARGET_DB}' }
    ]
  });

  print('✓ User \"${NEW_USER}\" created with readWrite on \"${TARGET_DB}\"');
"

echo "==> MongoDB user setup complete."
echo "    Connection string: mongodb://${NEW_USER}:***@localhost:27017/${TARGET_DB}?authSource=${TARGET_DB}"
