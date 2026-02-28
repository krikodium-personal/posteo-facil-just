#!/bin/bash

TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)

# List of endpoints to test
endpoints=(
    "https://api-v2.dash.app/asset/search"
    "https://api-v2.dash.app/v2/asset/search"
    "https://api.assetplatform.io/asset/search"
    "https://api-v2.assetplatform.io/asset/search" # Trying this guess
)

echo "Probing Header Formats with Token..."

for url in "${endpoints[@]}"; do
    echo "==================================================="
    echo "Testing URL: $url"
    
    # 1. No Header (Baseline)
    echo "  [No Auth Header]"
    status=$(curl -o /dev/null -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "$url")
    echo "  Status: $status"
    if [[ "$status" == "401" || "$status" == "200" ]]; then
       echo "  -> GOOD SIGNAL!"
    fi

    # 2. Authorization: <token>
    echo "  [Authorization: <token>]"
    response=$(curl -s -w "\n%{http_code}" -X POST -H "Authorization: $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "$url")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    echo "  Status: $status"
    if [[ "$status" != "403" && "$status" != "405" ]]; then
        echo "  Body: $(echo "$body" | head -c 200)"
    fi

    # 3. Authorization: Token <token>
    echo "  [Authorization: Token <token>]"
    response=$(curl -s -w "\n%{http_code}" -X POST -H "Authorization: Token $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "$url")
    status=$(echo "$response" | tail -n1)
    echo "  Status: $status"

    # 4. x-auth-token: <token>
    echo "  [x-auth-token: <token>]"
    response=$(curl -s -w "\n%{http_code}" -X POST -H "x-auth-token: $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "$url")
    status=$(echo "$response" | tail -n1)
    echo "  Status: $status"

    # 5. x-api-key: <token>
    echo "  [x-api-key: <token>]"
    response=$(curl -s -w "\n%{http_code}" -X POST -H "x-api-key: $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "$url")
    status=$(echo "$response" | tail -n1)
    echo "  Status: $status"

done
