#!/usr/bin/env bash
set -e

echo "=== Testing STRATEMARK Sentinel Live Service ==="

TOKEN=$(gcloud auth print-identity-token)
URL="https://sentinel-1033720799306.us-central1.run.app"

echo "1. Testing /health..."
curl -s -H "Authorization: Bearer $TOKEN" "$URL/health"
echo -e "\n"

echo "2. Testing User Login..."
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "founder@stratemark.io"}' \
  "$URL/api/auth/login"
echo -e "\n"

echo "3. Testing Stripe Checkout Creation (Pro $49/mo)..."
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "pro",
    "email": "test@stratemark.io",
    "userId": "user_demo"
  }' \
  "$URL/api/checkout"
echo -e "\n"

echo "=== Test Complete ==="
