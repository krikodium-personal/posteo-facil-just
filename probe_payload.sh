#!/bin/bash

# Load token
TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)
URL="https://api-v2.dash.app/asset-searches"

echo "Probing Payloads on $URL"

test_payload() {
    local name="$1"
    local json="$2"
    
    echo "------------------------------------------------"
    echo "Testing: $name"
    # echo "Payload: $json"
    
    response=$(curl -s -w "\n%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$json" "$URL")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "Status: $status"
    if [[ "$status" == "200" || "$status" == "201" ]]; then
       echo "!!! SUCCESS !!!"
       echo "Body Start: $(echo "$body" | head -c 100)"
    else
       echo "Error: $(echo "$body" | head -c 150)"
    fi
}

# 1. Minimal
test_payload "Minimal" '{"from": 0, "pageSize": 1}'

# 2. With empty sorts
test_payload "With empty sorts" '{"from": 0, "pageSize": 1, "sorts": []}'

# 3. With null sorts
test_payload "With null sorts" '{"from": 0, "pageSize": 1, "sorts": null}'

# 4. With Match All Criterion (Hypothetical)
test_payload "Match All Criterion" '{"from": 0, "pageSize": 1, "criterion": {"type": "MATCH_ALL"}}'

# 5. With Field Exists Criterion (Title)
test_payload "Field Exists Title" '{"from": 0, "pageSize": 1, "criterion": {"type": "FIELD_EXISTS", "field": {"type": "FIELD", "fieldId": "title"}}}'

# 6. With nested sorts structure? 
# Maybe sorts needs objects?
test_payload "Sorts with object" '{"from": 0, "pageSize": 1, "sorts": [{"field": {"type": "FIELD", "fieldId": "dateAdded"}, "ascending": false}]}'
