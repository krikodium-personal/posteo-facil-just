#!/bin/bash

# Load token and clean it (trim whitespace/quotes)
RAW_TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)
TOKEN=$(echo "$RAW_TOKEN" | sed "s/^['\"]//;s/['\"]$//" | tr -d '[:space:]')

URL="https://api-v2.dash.app/asset/search"

echo "Probing Auth on $URL"
echo "Token Length: ${#TOKEN}"
echo "Token Start: ${TOKEN:0:10}..."

# Function to test a specific curl command
test_auth() {
    local name="$1"
    local cmd="$2"
    
    echo "---------------------------------------------------"
    echo "Testing: $name"
    # Capture HTTP status and body
    response=$(eval "$cmd -s -w '\n%{http_code}'")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    echo "Status: $status"
    if [[ "$status" == "200" || "$status" == "201" ]]; then
       echo "!!! SUCCESS !!!"
       echo "Body: $(echo "$body" | head -c 100)..."
    else
       # Print first 200 chars of error body to diagnose
       echo "Error Body: $(echo "$body" | head -c 200)"
    fi
}

# 1. Standard Bearer
test_auth "Standard Bearer" "curl -X POST -H \"Authorization: Bearer $TOKEN\" -H \"Content-Type: application/json\" -d '{\"from\": 0, \"pageSize\": 1}' \"$URL\""

# 2. No Bearer Prefix (Raw Token)
test_auth "Raw Token (No Prefix)" "curl -X POST -H \"Authorization: $TOKEN\" -H \"Content-Type: application/json\" -d '{\"from\": 0, \"pageSize\": 1}' \"$URL\""

# 3. With Origin/Referer (Mimic Docs)
test_auth "Bearer + Origin Headers" "curl -X POST -H \"Authorization: Bearer $TOKEN\" -H \"Origin: https://dash.redoc.ly\" -H \"Referer: https://dash.redoc.ly/\" -H \"Content-Type: application/json\" -d '{\"from\": 0, \"pageSize\": 1}' \"$URL\""

# 4. access_token= (Query Param substitute in header?)
test_auth "Header 'Authorization: access_token=...'" "curl -X POST -H \"Authorization: access_token=$TOKEN\" -H \"Content-Type: application/json\" -d '{\"from\": 0, \"pageSize\": 1}' \"$URL\""

# 5. GET request to /current-user (Simple Check)
URL_GET="https://api-v2.dash.app/current-user"
test_auth "GET /current-user (Bearer)" "curl -X GET -H \"Authorization: Bearer $TOKEN\" -H \"Origin: https://dash.redoc.ly\" \"$URL_GET\""
