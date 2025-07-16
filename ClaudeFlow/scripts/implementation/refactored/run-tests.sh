#!/bin/bash

# Run comprehensive test suite for refactored authentication API

set -e

echo "🧪 Running Comprehensive Test Suite"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Clean previous test results
echo -e "${YELLOW}Cleaning previous test results...${NC}"
rm -rf coverage
rm -rf test-results

# Create test results directory
mkdir -p test-results

# Run linting
echo -e "\n${YELLOW}Running linting...${NC}"
npm run lint || {
    echo -e "${RED}Linting failed! Fix issues before running tests.${NC}"
    exit 1
}

# Run type checking
echo -e "\n${YELLOW}Running type checking...${NC}"
npm run typecheck || {
    echo -e "${RED}Type checking failed!${NC}"
    exit 1
}

# Function to run test suite
run_test_suite() {
    local suite=$1
    local description=$2
    
    echo -e "\n${YELLOW}Running ${description}...${NC}"
    
    if npm run test:${suite} -- --json --outputFile=test-results/${suite}.json; then
        echo -e "${GREEN}✓ ${description} passed${NC}"
        return 0
    else
        echo -e "${RED}✗ ${description} failed${NC}"
        return 1
    fi
}

# Track test results
FAILED_SUITES=()

# Run each test suite
run_test_suite "unit" "Unit Tests" || FAILED_SUITES+=("unit")
run_test_suite "integration" "Integration Tests" || FAILED_SUITES+=("integration")
run_test_suite "performance" "Performance Tests" || FAILED_SUITES+=("performance")
run_test_suite "security" "Security Tests" || FAILED_SUITES+=("security")
run_test_suite "e2e" "End-to-End Tests" || FAILED_SUITES+=("e2e")

# Generate coverage report
echo -e "\n${YELLOW}Generating coverage report...${NC}"
npm run test:coverage -- --silent

# Display coverage summary
echo -e "\n${YELLOW}Coverage Summary:${NC}"
if [ -f "coverage/lcov-report/index.html" ]; then
    # Extract coverage percentages from lcov
    if [ -f "coverage/lcov.info" ]; then
        lines=$(lcov --summary coverage/lcov.info 2>&1 | grep -E "lines\.\.\.\.\.\.: [0-9]+\.[0-9]+%" | grep -oE "[0-9]+\.[0-9]+")
        functions=$(lcov --summary coverage/lcov.info 2>&1 | grep -E "functions\.\.\.\.: [0-9]+\.[0-9]+%" | grep -oE "[0-9]+\.[0-9]+")
        branches=$(lcov --summary coverage/lcov.info 2>&1 | grep -E "branches\.\.\.\.: [0-9]+\.[0-9]+%" | grep -oE "[0-9]+\.[0-9]+")
        
        echo "  Lines:     ${lines}%"
        echo "  Functions: ${functions}%"
        echo "  Branches:  ${branches}%"
    fi
    echo -e "  Full report: ${GREEN}coverage/lcov-report/index.html${NC}"
fi

# Generate test summary
echo -e "\n${YELLOW}Test Summary:${NC}"
echo "=================================="

# Count total tests
TOTAL_TESTS=0
PASSED_TESTS=0

for result_file in test-results/*.json; do
    if [ -f "$result_file" ]; then
        suite_tests=$(jq '.numTotalTests' "$result_file" 2>/dev/null || echo 0)
        suite_passed=$(jq '.numPassedTests' "$result_file" 2>/dev/null || echo 0)
        TOTAL_TESTS=$((TOTAL_TESTS + suite_tests))
        PASSED_TESTS=$((PASSED_TESTS + suite_passed))
    fi
done

echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS))"

# Final result
echo -e "\n=================================="
if [ ${#FAILED_SUITES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All test suites passed!${NC}"
    
    # Check coverage thresholds
    if [ -f "coverage/coverage-summary.json" ]; then
        lines=$(jq '.total.lines.pct' coverage/coverage-summary.json)
        if (( $(echo "$lines < 80" | bc -l) )); then
            echo -e "${YELLOW}⚠️  Warning: Code coverage is below 80% threshold${NC}"
        fi
    fi
    
    exit 0
else
    echo -e "${RED}❌ Failed test suites: ${FAILED_SUITES[*]}${NC}"
    echo -e "${RED}Please fix the failing tests before proceeding.${NC}"
    exit 1
fi