#!/bin/sh

# SMG Kafka Production Startup Script

set -e

echo "🚀 Starting SMG Kafka Application..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until nc -z postgres 5432; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "✅ Database is ready"

# Wait for Kafka to be ready
echo "⏳ Waiting for Kafka connection..."
until nc -z kafka 29092; do
  echo "Kafka not ready, waiting..."
  sleep 2
done
echo "✅ Kafka is ready"

# Run database migrations
echo "🔄 Running database migrations..."
pnpm prisma:migrate deploy

# Start the application based on service type
case "${SERVICE_TYPE:-api}" in
  "api")
    echo "🌐 Starting API server..."
    exec node dist/api/index.js
    ;;
  "producer")
    echo "📤 Starting Kafka producer..."
    exec node dist/producer/index.js
    ;;
  "consumer")
    echo "📥 Starting Kafka consumer..."
    exec node dist/consumer/index.js
    ;;
  *)
    echo "❌ Unknown service type: ${SERVICE_TYPE}"
    echo "Available types: api, producer, consumer"
    exit 1
    ;;
esac