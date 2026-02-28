#!/bin/bash

# Load token
TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)
URL="https://api-v2.dash.app/asset-searches"
TITLE_UUID="2d23cedb-9e16-41b3-aae5-d36abf1c26cf"

echo "Probing Minimal Payloads..."

test_payload() {
    local name="$1"
    local json="$2"
    
    echo "------------------------------------------------"
    echo "Testing: $name"
    response=$(curl -s -w "\n%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$json" "$URL")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    echo "Status: $status"
    if [[ "$status" != "400" ]]; then
       echo "!!! SUCCESS !!!"
       echo "Body Start: $(echo "$body" | head -c 300)"
    else
        echo "Error: $(echo "$body" | head -c 150)"
    fi
}

# 1. Sorts is null
test_payload "Sorts NULL" "{\"from\": 0, \"pageSize\": 10, \"sorts\": null}"

# 2. Sorts is missing
test_payload "Sorts MISSING" "{\"from\": 0, \"pageSize\": 10}"

# 3. Sorts only (valid single sort)
test_payload "Sorts Valid" "{\"from\": 0, \"pageSize\": 10, \"sorts\": [{\"field\": {\"type\": \"FIELD\", \"fieldId\": \"$TITLE_UUID\"}, \"ascending\": false}]}"

# 4. Include 'includes' array (seen in some Dash docs)
test_payload "Includes Array" "{\"from\": 0, \"pageSize\": 10, \"includes\": [\"response.items.originalFile\"]}"

# 5. Empty Criterion + Empty Sorts
test_payload "Empty Criterion Object" "{\"from\": 0, \"pageSize\": 10, \"sorts\": [], \"criterion\": {}}"
