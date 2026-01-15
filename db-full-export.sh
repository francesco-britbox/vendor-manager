#!/bin/bash
# Export full database (schema + data)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/prisma/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$OUTPUT_DIR/full_$TIMESTAMP.sql"

# Create backups directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Load DATABASE_URL from .env
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -E '^DATABASE_URL=' "$SCRIPT_DIR/.env" | xargs)
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*\/([^?]+).*|\1|')

echo "Exporting full database: $DB_NAME"

# Export full database
/opt/homebrew/opt/postgresql@15/bin/pg_dump \
  --no-owner \
  --no-privileges \
  "$DB_NAME" > "$OUTPUT_FILE"

echo "Full backup exported to: $OUTPUT_FILE"

# Also create a "latest" symlink
ln -sf "full_$TIMESTAMP.sql" "$OUTPUT_DIR/full_latest.sql"
echo "Latest symlink updated: $OUTPUT_DIR/full_latest.sql"
