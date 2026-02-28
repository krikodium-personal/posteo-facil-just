#!/bin/bash

# Load token
TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)
URL="https://api-v2.dash.app/asset-searches"

echo "Fetching one asset to inspect structure..."

# Use the proven payload (dash-api-client + FILE_TYPE)
response=$(curl -s -X POST "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "dash-api-client: DASH_FRONTEND" \
  -d '{"from": 0, "pageSize": 1, "sorts": [], "criterion": {"type": "FIELD_HAS_ANY_EQUAL", "field": {"type": "FIXED", "fieldName": "FILE_TYPE"}, "values": ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"]}}')

echo "$response" > asset_debug.json
echo "Saved to asset_debug.json"

# Print keys of the first result's 'result' object to see clear top-level props
# (Using python for pretty print if available, or just cat)
cat asset_debug.json | head -c 1000
