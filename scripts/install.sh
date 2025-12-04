#!/bin/bash

# Install all dependencies for the PoC Auth Architecture

set -e

echo "🔧 Installing dependencies for all services..."
echo ""

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "📦 Installing auth-server..."
cd "$ROOT_DIR/auth-server" && npm install

echo ""
echo "📦 Installing api-server..."
cd "$ROOT_DIR/api-server" && npm install

echo ""
echo "📦 Installing app-bff (server)..."
cd "$ROOT_DIR/app-bff" && npm install

echo ""
echo "📦 Installing app-bff (client)..."
cd "$ROOT_DIR/app-bff/client" && npm install

echo ""
echo "📦 Building app-bff client..."
cd "$ROOT_DIR/app-bff/client" && npm run build

echo ""
echo "📦 Installing app-spa..."
cd "$ROOT_DIR/app-spa" && npm install

echo ""
echo "📦 Installing app-web..."
cd "$ROOT_DIR/app-web" && npm install

echo ""
echo "✅ All dependencies installed successfully!"
echo ""
echo "Run './scripts/start.sh' to launch all services."
