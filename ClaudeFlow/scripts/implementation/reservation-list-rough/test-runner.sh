#!/bin/bash

echo "=== Reservation List Rough Level - Unit Tests ==="
echo

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo
fi

# Run tests
echo "Running unit tests..."
npm test

# Run tests with coverage
echo
echo "Running tests with coverage..."
npm run test:coverage

echo
echo "=== Test execution completed ==="