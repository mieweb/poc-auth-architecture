#!/bin/bash
# Start all services in SSL mode with nginx reverse proxy
# Requires: nginx installed, SSL certs generated, /etc/hosts configured

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

cd "$PROJECT_DIR"

# Check prerequisites
if ! command -v nginx &> /dev/null; then
    echo "❌ nginx is not installed. Install with: brew install nginx"
    exit 1
fi

if [ ! -f "nginx/ssl/local.crt" ]; then
    echo "❌ SSL certificates not found. Run: ./scripts/generate-ssl.sh"
    exit 1
fi

# Check /etc/hosts
if ! grep -q "auth.local" /etc/hosts; then
    echo "❌ Hostnames not in /etc/hosts. Add this line:"
    echo "   127.0.0.1 auth.local api.local bff.local spa.local web.local"
    exit 1
fi

echo "🧹 Cleaning up any existing services..."
pkill -f "node.*auth-server" 2>/dev/null || true
pkill -f "node.*api-server" 2>/dev/null || true
pkill -f "node.*app-bff" 2>/dev/null || true
pkill -f "node.*app-spa" 2>/dev/null || true
pkill -f "node.*app-web" 2>/dev/null || true
sleep 1

echo "🚀 Starting PoC Auth Architecture Services (SSL Mode)"
echo ""

# Export SSL environment variables
export USE_SSL=true
export AUTH_SERVER=http://localhost:4000
export AUTH_SERVER_PUBLIC=https://auth.local
export API_SERVER=http://localhost:5001
export API_SERVER_PUBLIC=https://api.local
export BFF_URL=https://bff.local
export SPA_URL=https://spa.local
export WEB_URL=https://web.local

# Vite env vars for SPA (client-side)
export VITE_AUTH_SERVER=https://auth.local
export VITE_API_SERVER=https://api.local
export VITE_SPA_URL=https://spa.local

# Start auth-server
echo "Starting auth-server on port 4000..."
cd "$PROJECT_DIR/auth-server"
npm start &
sleep 2

# Start api-server
echo "Starting api-server on port 5001..."
cd "$PROJECT_DIR/api-server"
npm start &
sleep 1

# Start app-bff
echo "Starting app-bff on port 3000..."
cd "$PROJECT_DIR/app-bff"
npm start &
sleep 1

# Start app-spa
echo "Starting app-spa on port 3001..."
cd "$PROJECT_DIR/app-spa"
npm run dev &
sleep 1

# Start app-web
echo "Starting app-web on port 3002..."
cd "$PROJECT_DIR/app-web"
npm start &
sleep 2

# Copy nginx config and start/reload nginx
echo ""
echo "🔧 Configuring nginx..."
sudo mkdir -p /etc/nginx/ssl
sudo cp "$PROJECT_DIR/nginx/ssl/local.crt" /etc/nginx/ssl/
sudo cp "$PROJECT_DIR/nginx/ssl/local.key" /etc/nginx/ssl/

# Check if using Homebrew nginx or system nginx
if [ -d "/opt/homebrew/etc/nginx/servers" ]; then
    NGINX_CONF_DIR="/opt/homebrew/etc/nginx/servers"
elif [ -d "/usr/local/etc/nginx/servers" ]; then
    NGINX_CONF_DIR="/usr/local/etc/nginx/servers"
else
    NGINX_CONF_DIR="/etc/nginx/conf.d"
fi

sudo cp "$PROJECT_DIR/nginx/nginx.conf" "$NGINX_CONF_DIR/poc-auth.conf"

# Test and reload nginx
if nginx -t 2>/dev/null; then
    if pgrep nginx > /dev/null; then
        sudo nginx -s reload
        echo "✅ nginx reloaded"
    else
        sudo nginx
        echo "✅ nginx started"
    fi
else
    echo "❌ nginx configuration test failed"
    nginx -t
    exit 1
fi

cd "$PROJECT_DIR"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ All services are running in SSL mode!"
echo ""
echo "  Auth Server:  https://auth.local"
echo "  API Server:   https://api.local"
echo "  BFF App:      https://bff.local"
echo "  SPA App:      https://spa.local"
echo "  Web App:      https://web.local"
echo ""
echo "  Test Credentials: test@example.com / password123"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    pkill -f "node.*auth-server" 2>/dev/null || true
    pkill -f "node.*api-server" 2>/dev/null || true
    pkill -f "node.*app-bff" 2>/dev/null || true
    pkill -f "node.*app-spa" 2>/dev/null || true
    pkill -f "node.*app-web" 2>/dev/null || true
    echo "✅ All services stopped"
}

trap cleanup EXIT
wait
