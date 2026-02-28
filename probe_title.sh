#!/bin/bash

# Load token
TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)
URL="https://api-v2.dash.app/asset-searches"
TITLE_UUID="2d23cedb-9e16-41b3-aae5-d36abf1c26cf"

echo "Probing Payloads with Title UUID: $TITLE_UUID"

test_payload() {
    local name="$1"
    local json="$2"
    
    echo "------------------------------------------------"
    echo "Testing: $name"
    response=$(curl -s -w "\n%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$json" "$URL")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "Status: $status"
    if [[ "$status" == "200" || "$status" == "201" ]]; then
       echo "!!! SUCCESS !!!"
       echo "Body Start: $(echo "$body" | head -c 300)"
    else
       echo "Error: $(echo "$body" | head -c 200)"
    fi
}

# 1. FIELD_EXISTS (Retest with Title UUID just in case syntax was slightly off)
test_payload "FIELD_EXISTS Title" "{\"from\": 0, \"pageSize\": 10, \"sorts\": [], \"criterion\": {\"type\": \"FIELD_EXISTS\", \"field\": {\"type\": \"FIELD\", \"fieldId\": \"$TITLE_UUID\"}}}"

# 2. FIELD_NOT_EQUALS "impossible_value" (Should match everything)
test_payload "FIELD_NOT_EQUALS Title" "{\"from\": 0, \"pageSize\": 10, \"sorts\": [], \"criterion\": {\"type\": \"FIELD_NOT_EQUALS\", \"value\": \"impossible_value_xyz_123\", \"field\": {\"type\": \"FIELD\", \"fieldId\": \"$TITLE_UUID\"}}}"

# 3. FIELD_CONTAINS "" (Empty string usually matches all)
test_payload "FIELD_CONTAINS Empty String" "{\"from\": 0, \"pageSize\": 10, \"sorts\": [], \"criterion\": {\"type\": \"FIELD_CONTAINS\", \"value\": \"\", \"field\": {\"type\": \"FIELD\", \"fieldId\": \"$TITLE_UUID\"}}}"

# 4. Nested OR (Maybe top level criterion implies strict single match?)
test_payload "Complex OR" "{\"from\": 0, \"pageSize\": 10, \"sorts\": [], \"criterion\": {\"type\": \"OR\", \"children\": [{\"type\": \"FIELD_EXISTS\", \"field\": {\"type\": \"FIELD\", \"fieldId\": \"$TITLE_UUID\"}}]}}"
