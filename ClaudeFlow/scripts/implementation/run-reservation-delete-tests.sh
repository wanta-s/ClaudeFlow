#!/bin/bash

# Script to run reservation deletion unit tests

echo "Running Reservation Deletion Tests..."
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests with nice output
run_test_suite() {
    local test_type=$1
    local test_pattern=$2
    
    echo -e "\n${YELLOW}Running ${test_type} tests...${NC}"
    
    if npx jest ${test_pattern} --passWithNoTests; then
        echo -e "${GREEN}✓ ${test_type} tests passed${NC}"
    else
        echo -e "${RED}✗ ${test_type} tests failed${NC}"
        exit 1
    fi
}

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run different test suites
run_test_suite "MemoryStore unit" "__tests__/stores/memoryStore.test.ts"
run_test_suite "ReservationDeleteService unit" "__tests__/services/reservationDeleteService.test.ts"
run_test_suite "Reservation Delete integration" "__tests__/integration/reservationDelete.integration.test.ts"

# Run all reservation deletion tests with coverage
echo -e "\n${YELLOW}Running all reservation deletion tests with coverage...${NC}"
npx jest --coverage \
    --collectCoverageFrom="reservation-delete-*.ts" \
    --collectCoverageFrom="memory-store-rough.ts" \
    --testMatch="**/__tests__/**/*reservation*.test.ts" \
    --testMatch="**/__tests__/**/memory*.test.ts"

echo -e "\n${GREEN}All reservation deletion tests completed!${NC}"

# Optional: Open coverage report in browser
read -p "Open coverage report in browser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open coverage/lcov-report/index.html
    elif command -v open &> /dev/null; then
        open coverage/lcov-report/index.html
    else
        echo "Coverage report available at: coverage/lcov-report/index.html"
    fi
fi