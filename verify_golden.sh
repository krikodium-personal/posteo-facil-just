#!/bin/bash

# Load token
TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)
URL="https://api-v2.dash.app/asset-searches"

echo "Probing Golden Headers..."

# 1. Test: Just adding the 'dash-api-client' header to my previous "Title Exists" payload
# If this works, the header was the missing key.
echo "------------------------------------------------"
echo "Test 1: My Previous Payload + 'dash-api-client' Header"
curl -s -X POST "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "dash-api-client: DASH_FRONTEND" \
  -d '{"from": 0, "pageSize": 10, "sorts": [], "criterion": {"type": "FIELD_EXISTS", "field": {"type": "FIELD", "fieldId": "2d23cedb-9e16-41b3-aae5-d36abf1c26cf"}}}' \
  | head -c 300
echo ""

# 2. Test: The User's EXACT payload (with their collection IDs) + Headers
# If Test 1 fails, this verifies if the specific payload structure is also required.
echo "------------------------------------------------"
echo "Test 2: User's Exact Payload + Headers"
curl -s -X POST "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "dash-api-client: DASH_FRONTEND" \
  -H 'origin: https://just.dash.app' \
  -d '{"from":0,"pageSize":10,"sorts":[],"criterion":{"type":"FIELD_HAS_ANY_EQUAL","field":{"type":"FIXED","fieldName":"COLLECTIONS"},"values":["e0fdf36a-69d0-43b3-a8e0-6d26d51f9850","c68368dd-d45a-4db2-a3e8-6b00ccf25bf3"]},"aggregations":{"by_collection":{"type":"TERMS","field":{"type":"FIXED","fieldName":"COLLECTIONS"}}}}' \
  | head -c 300
echo ""
