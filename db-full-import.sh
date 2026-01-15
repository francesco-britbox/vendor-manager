#!/bin/bash
# Import full database (schema + data)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/prisma/backups"

# Load DATABASE_URL from .env
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -E '^DATABASE_URL=' "$SCRIPT_DIR/.env" | xargs)
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*\/([^?]+).*|\1|')

# Determine input file
if [ -n "$1" ]; then
  INPUT_FILE="$1"
else
  INPUT_FILE="$BACKUP_DIR/full_latest.sql"
fi

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: Backup file not found: $INPUT_FILE"
  echo "Usage: $0 [backup_file.sql]"
  exit 1
fi

echo "Importing full database: $DB_NAME"
echo "From file: $INPUT_FILE"

read -p "This will DROP and recreate all tables and data. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# Drop and recreate public schema
/opt/homebrew/opt/postgresql@15/bin/psql "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Import full backup
/opt/homebrew/opt/postgresql@15/bin/psql "$DB_NAME" < "$INPUT_FILE"

echo "Full database imported successfully."
