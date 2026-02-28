#!/bin/bash

# Load token
TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)
URL="https://api-v2.dash.app/asset-searches"
TITLE_UUID="2d23cedb-9e16-41b3-aae5-d36abf1c26cf"

echo "Probing Fixed Fields with dash-api-client Header..."

test_payload() {
    local name="$1"
    local json="$2"
    
    echo "------------------------------------------------"
    echo "Testing: $name"
    response=$(curl -s -X POST "$URL" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -H "dash-api-client: DASH_FRONTEND" \
      -d "$json")
    
    # Check for success
    if echo "$response" | grep -q "results"; then
       echo "!!! SUCCESS !!!"
       echo "Body Start: $(echo "$response" | head -c 200)..."
    else
       echo "Error/Fail: $(echo "$response" | head -c 150)..."
    fi
}

# 1. Match All (Simple)
test_payload "Match All" '{"from": 0, "pageSize": 10, "sorts": [], "criterion": {"type": "MATCH_ALL"}}'

# 2. Fixed Field: DATE_ADDED (Range? Exists?)
# Guessing FIELD_EXISTS works on FIXED fields too
test_payload "Fixed Field: DATE_ADDED Exists" '{"from": 0, "pageSize": 10, "sorts": [], "criterion": {"type": "FIELD_EXISTS", "field": {"type": "FIXED", "fieldName": "DATE_ADDED"}}}'

# 3. Fixed Field: TITLE Exists
test_payload "Fixed Field: TITLE Exists" '{"from": 0, "pageSize": 10, "sorts": [], "criterion": {"type": "FIELD_EXISTS", "field": {"type": "FIXED", "fieldName": "TITLE"}}}'

# 4. Filter by FILE_TYPE (Values usually IMAGE, VIDEO, etc.)
# Using empty values list might act as "matches any defined type" or fail.
test_payload "Fixed Field: FILE_TYPE Any" '{"from": 0, "pageSize": 10, "sorts": [], "criterion": {"type": "FIELD_HAS_ANY_EQUAL", "field": {"type": "FIXED", "fieldName": "FILE_TYPE"}, "values": ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"]}}'

# 5. Empty Criterion + Sorts
test_payload "No Criterion" '{"from": 0, "pageSize": 10, "sorts": []}'
