#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=== Checking Docker prerequisites ==="
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    exit 1
fi

COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "❌ Error: docker compose (or docker-compose) not found."
        exit 1
    fi
fi

# If current shell session has not reloaded docker group, use sg docker
RUN_COMPOSE="$COMPOSE_CMD"
if ! docker ps &>/dev/null; then
    if sg docker -c "docker ps" &>/dev/null; then
        echo "ℹ️ Using docker group context via sg..."
        RUN_COMPOSE="sg docker -c \"$COMPOSE_CMD"
    fi
fi

echo "🚀 Starting infrastructure stack..."
if [ "$RUN_COMPOSE" != "$COMPOSE_CMD" ]; then
    sg docker -c "$COMPOSE_CMD up -d"
else
    $COMPOSE_CMD up -d
fi

echo ""
echo "⏳ Waiting for core services to become ready..."

# Wait for Postgres
echo -n "Waiting for PostgreSQL (port 5432)..."
for i in {1..30}; do
    if nc -z localhost 5432 2>/dev/null || (exec 3<>/dev/tcp/localhost/5432) 2>/dev/null; then
        echo " Ready!"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for Redis
echo -n "Waiting for Redis (port 6379)..."
for i in {1..20}; do
    if nc -z localhost 6379 2>/dev/null || (exec 3<>/dev/tcp/localhost/6379) 2>/dev/null; then
        echo " Ready!"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for Kafka
echo -n "Waiting for Kafka (port 9093)..."
for i in {1..30}; do
    if nc -z localhost 9093 2>/dev/null || (exec 3<>/dev/tcp/localhost/9093) 2>/dev/null; then
        echo " Ready!"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for Elasticsearch
echo -n "Waiting for Elasticsearch (port 9200)..."
for i in {1..40}; do
    if curl -s http://localhost:9200 >/dev/null 2>&1; then
        echo " Ready!"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "✅ Infrastructure containers running:"
if [ "$RUN_COMPOSE" != "$COMPOSE_CMD" ]; then
    sg docker -c "$COMPOSE_CMD ps"
else
    $COMPOSE_CMD ps
fi
