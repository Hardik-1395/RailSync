#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PID_FILE="$DIR/.pids"

echo "=== Stopping IRCTC Services ==="

if [ -f "$PID_FILE" ]; then
    while IFS=":" read -r pid name; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo "Stopping $name (PID $pid)..."
            # Kill process and its child processes
            pkill -P "$pid" 2>/dev/null || true
            kill "$pid" 2>/dev/null || true
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
fi

# Fallback: kill any orphaned nodemon or vite processes started in this repo
echo "Cleaning up any remaining service processes on ports 3000, 4000-4007..."
for port in 3000 4000 4001 4002 4003 4004 4005 4006 4007; do
    fuser -k "${port}/tcp" 2>/dev/null || true
done

echo "✅ All services stopped."
