#!/bin/bash
# Import database data from file

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
  INPUT_FILE="$BACKUP_DIR/data_latest.sql"
fi

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: Data file not found: $INPUT_FILE"
  echo "Usage: $0 [data_file.sql]"
  exit 1
fi

echo "Importing data into database: $DB_NAME"
echo "From file: $INPUT_FILE"

read -p "This will INSERT data (may fail if data exists). Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# Import data
/opt/homebrew/opt/postgresql@15/bin/psql "$DB_NAME" < "$INPUT_FILE"

echo "Data imported successfully."
