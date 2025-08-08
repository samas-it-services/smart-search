#!/bin/bash

# Quick script to stop services that might conflict with the showcase
# Use this if you want to free up standard ports (5432, 6379, 3002)

echo "🔍 Checking for conflicting services on standard ports..."

# Check what's using port 6379 (Redis)
if lsof -i :6379 >/dev/null 2>&1; then
    echo "⚠️  Port 6379 (Redis) is in use:"
    lsof -i :6379
    echo ""
    echo "🛑 To stop Redis service:"
    echo "   brew services stop redis    # If installed via Homebrew"
    echo "   sudo systemctl stop redis   # If on Linux"
    echo "   docker stop <redis-container>  # If running in Docker"
    echo ""
else
    echo "✅ Port 6379 (Redis) is free"
fi

# Check what's using port 5432 (PostgreSQL)
if lsof -i :5432 >/dev/null 2>&1; then
    echo "⚠️  Port 5432 (PostgreSQL) is in use:"
    lsof -i :5432
    echo ""
    echo "🛑 To stop PostgreSQL service:"
    echo "   brew services stop postgresql    # If installed via Homebrew"
    echo "   sudo systemctl stop postgresql   # If on Linux"
    echo "   docker stop <postgres-container>  # If running in Docker"
    echo ""
else
    echo "✅ Port 5432 (PostgreSQL) is free"
fi

# Check what's using port 3002 (Showcase)
if lsof -i :3002 >/dev/null 2>&1; then
    echo "⚠️  Port 3002 (Showcase App) is in use:"
    lsof -i :3002
    echo ""
else
    echo "✅ Port 3002 (Showcase App) is free"
fi

echo ""
echo "💡 Tips:"
echo "   • The showcase script automatically uses alternative ports if conflicts are detected"
echo "   • Alternative ports: PostgreSQL:15432, Redis:16379, Showcase:13002"
echo "   • Or stop the conflicting services above to use standard ports"