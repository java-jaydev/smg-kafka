#!/bin/bash

# PostgreSQL Backup Script for SMG Kafka
# Usage: ./postgres-backup.sh [database_name]

set -e

# Configuration
DB_NAME=${1:-"smg_kafka"}
DB_USER=${POSTGRES_USER:-"smguser"}
DB_PASSWORD=${POSTGRES_PASSWORD:-"smgpassword"}
DB_HOST=${POSTGRES_HOST:-"localhost"}
DB_PORT=${POSTGRES_PORT:-"5432"}

# Backup directory
BACKUP_DIR="/var/backups/postgres"
mkdir -p "$BACKUP_DIR"

# Generate filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_${TIMESTAMP}.sql"

echo "🗂️  Starting PostgreSQL backup..."
echo "📊 Database: $DB_NAME"
echo "📁 Backup file: $BACKUP_FILE"

# Create backup
export PGPASSWORD="$DB_PASSWORD"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --format=plain \
    --file="$BACKUP_FILE"

# Compress backup
echo "🗜️  Compressing backup..."
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

echo "✅ Backup completed: $COMPRESSED_FILE"

# Remove old backups (keep last 7 days)
echo "🧹 Cleaning old backups..."
find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -mtime +7 -delete

echo "📊 Current backup files:"
ls -lh "$BACKUP_DIR"/${DB_NAME}_backup_*.sql.gz 2>/dev/null || echo "No backup files found"

echo "🎉 Backup process completed successfully!"