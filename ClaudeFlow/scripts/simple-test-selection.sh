#\!/bin/bash
# Simple test for feature selection
mkdir -p test_select/src
cd test_select

cat > requirements.md << 'EOFREQ'
# Test App
- User registration
- User login  
EOFREQ

cat > design.md << 'EOFDES'
# Design
- Node.js
EOFDES

cat > src/features.json << 'EOFJSON'
{
  "features": [
    {"id": "feature_001", "name": "User Reg", "description": "Registration", "priority": 1},
    {"id": "feature_002", "name": "User Login", "description": "Login", "priority": 2}
  ]
}
EOFJSON

echo "Testing feature selection..."
echo -e "1\nC"  < /dev/null |  timeout 5 bash ../hybrid-implementation.sh requirements.md design.md 2>&1 | grep -A20 "検出された機能" | grep -E "(CORE|feature_|コア機能)" || echo "No core features found"

cd ..
rm -rf test_select
