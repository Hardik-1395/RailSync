#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=== Syncing Prisma schemas with PostgreSQL across all services ==="

PRISMA_SERVICES=("user-service" "admin-service" "booking-service" "payment-service" "inventory-service")

for service in "${PRISMA_SERVICES[@]}"; do
    echo "----------------------------------------"
    echo "📦 Pushing schema for $service..."
    (cd "$service" && npx prisma db push && npx prisma generate)
done

echo "----------------------------------------"
echo "✅ All database schemas and Prisma clients are in sync!"
