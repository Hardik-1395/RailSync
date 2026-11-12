#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

mkdir -p logs
PID_FILE="$DIR/.pids"

if [ -f "$PID_FILE" ]; then
    echo "⚠️ Warning: $PID_FILE already exists. Running ./stop-services.sh first..."
    ./stop-services.sh
fi

touch "$PID_FILE"

SERVICES=(
    "admin-service:npm run dev:4003"
    "inventory-service:npm run dev:4007"
    "search-service:npm run dev:4002"
    "user-service:npm run dev:4001"
    "payment-service:npm run dev:4006"
    "booking-service:npm run dev:4005"
    "notification-service:npm run dev:4004"
    "api-gateway:npm run dev:4000"
    "frontend:npm run dev:3000"
)

echo "=== Starting IRCTC Services ==="

for item in "${SERVICES[@]}"; do
    IFS=":" read -r name cmd port <<< "$item"
    echo "▶ Starting $name on port $port..."
    (cd "$name" && nohup $cmd > "$DIR/logs/$name.log" 2>&1 & echo $! > "$DIR/logs/$name.pid")
    PID=$(cat "$DIR/logs/$name.pid" 2>/dev/null || echo "")
    echo "$PID:$name" >> "$PID_FILE"
    sleep 3
done

echo ""
echo "=========================================="
echo "🎉 All services launched in background!"
echo "PIDs saved to: .pids"
echo "Logs saved to: logs/<service>.log"
echo "=========================================="
echo "Access URLs:"
echo "  • Frontend:      http://localhost:3000"
echo "  • API Gateway:   http://localhost:4000"
echo "  • User Service:  http://localhost:4001"
echo "  • Search:        http://localhost:4002"
echo "  • Admin:         http://localhost:4003"
echo "  • Notification:  Port 4004 (Kafka consumer)"
echo "  • Booking:       http://localhost:4005"
echo "  • Payment:       http://localhost:4006"
echo "  • Inventory:     http://localhost:4007"
echo ""
echo "To view live logs: tail -f logs/api-gateway.log"
echo "To stop all services: ./stop-services.sh"
