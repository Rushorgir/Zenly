#!/bin/bash

# Zenly Development Server Startup Script
# This script starts both backend and frontend servers

echo "🚀 Starting Zenly Development Servers..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Root dependencies not found. Installing...${NC}"
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Frontend dependencies not found. Installing...${NC}"
    cd frontend && npm install && cd ..
fi

echo ""
echo -e "${BLUE}� Checking MongoDB status...${NC}"

# Check if MongoDB is running
if brew services list | grep -q "mongodb-community.*started"; then
    echo -e "${GREEN}✅ MongoDB is already running${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB is not running. Starting it now...${NC}"
    brew services start mongodb-community
    echo -e "${YELLOW}   Waiting for MongoDB to initialize...${NC}"
    sleep 3
    echo -e "${GREEN}✅ MongoDB started${NC}"
fi

echo ""
echo -e "${BLUE}�📝 Starting Backend (Port 5001)...${NC}"
echo -e "${YELLOW}   Logs will appear below${NC}"
echo ""

# Start backend in background
npm run bdev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

echo ""
echo -e "${BLUE}🎨 Starting Frontend (Port 3000)...${NC}"
echo -e "${YELLOW}   Opening in a new process${NC}"
echo ""

# Start frontend
cd frontend && npm run dev &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 3

echo ""
echo -e "${GREEN}✅ Both servers are starting!${NC}"
echo ""
echo -e "${GREEN}📍 Backend:${NC}  http://localhost:5001"
echo -e "${GREEN}📍 Frontend:${NC} http://localhost:3000"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop both servers${NC}"
echo ""

# Trap Ctrl+C and kill both processes
trap "echo ''; echo '🛑 Shutting down servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait for both processes
wait
