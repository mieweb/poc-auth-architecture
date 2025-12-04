#!/bin/bash

# Start all services for the PoC Auth Architecture

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Kill any existing services on our ports
echo -e "${YELLOW}🧹 Cleaning up any existing services...${NC}"
lsof -ti:4000,5001,3000,3001,3002 | xargs kill -9 2>/dev/null || true
sleep 1

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down all services...${NC}"
    kill $AUTH_PID $API_PID $BFF_PID $SPA_PID $WEB_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}🚀 Starting PoC Auth Architecture Services${NC}"
echo ""

# Start Auth Server (must be first)
echo -e "${GREEN}Starting auth-server on port 4000...${NC}"
cd "$ROOT_DIR/auth-server" && node src/index.js &
AUTH_PID=$!
sleep 2

# Start API Server
echo -e "${GREEN}Starting api-server on port 5001...${NC}"
cd "$ROOT_DIR/api-server" && node src/index.js &
API_PID=$!
sleep 1

# Start BFF App
echo -e "${GREEN}Starting app-bff on port 3000...${NC}"
cd "$ROOT_DIR/app-bff" && node server/index.js &
BFF_PID=$!
sleep 1

# Start SPA App
echo -e "${GREEN}Starting app-spa on port 3001...${NC}"
cd "$ROOT_DIR/app-spa" && npx vite --port 3001 &
SPA_PID=$!
sleep 1

# Start Web App
echo -e "${GREEN}Starting app-web on port 3002...${NC}"
cd "$ROOT_DIR/app-web" && node src/index.js &
WEB_PID=$!
sleep 1

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All services are running!${NC}"
echo ""
echo -e "  ${YELLOW}Auth Server:${NC}  http://localhost:4000"
echo -e "  ${YELLOW}API Server:${NC}   http://localhost:5001"
echo -e "  ${YELLOW}BFF App:${NC}      http://localhost:3000"
echo -e "  ${YELLOW}SPA App:${NC}      http://localhost:3001"
echo -e "  ${YELLOW}Web App:${NC}      http://localhost:3002"
echo ""
echo -e "  ${BLUE}Test Credentials:${NC} test@example.com / password123"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all processes
wait
