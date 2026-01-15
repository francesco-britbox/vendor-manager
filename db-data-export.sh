#!/bin/bash
# Export database data only (no schema)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/prisma/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$OUTPUT_DIR/data_$TIMESTAMP.sql"

# Create backups directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Load DATABASE_URL from .env
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -E '^DATABASE_URL=' "$SCRIPT_DIR/.env" | xargs)
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*\/([^?]+).*|\1|')

echo "Exporting data from database: $DB_NAME"

# Export data only (no schema)
/opt/homebrew/opt/postgresql@15/bin/pg_dump \
  --data-only \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  "$DB_NAME" > "$OUTPUT_FILE"

echo "Data exported to: $OUTPUT_FILE"

# Also create a "latest" symlink
ln -sf "data_$TIMESTAMP.sql" "$OUTPUT_DIR/data_latest.sql"
echo "Latest symlink updated: $OUTPUT_DIR/data_latest.sql"
