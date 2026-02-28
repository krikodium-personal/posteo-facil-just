#!/bin/bash

TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)

endpoints=(
    "https://api.dash.app/asset/search"
    "https://api.dash.app/v2/asset/search"
    "https://api.dash.app/assets/search"
    "https://api-v2.dash.app/asset/search"
    "https://api-v2.dash.app/v2/asset/search"
    "https://api.assetplatform.io/asset/search"
    "https://api.assetplatform.io/v2/asset/search"
    "https://just.dash.app/api/asset/search"
    "https://just.dash.app/api/v2/asset/search"
)

echo "Testing POST /.../asset/search with Token..."

for url in "${endpoints[@]}"; do
    echo "---------------------------------------------------"
    echo "Testing: $url"
    status=$(curl -o /dev/null -s -w "%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "$url")
    echo "Status: $status"
    if [[ "$status" != "403" && "$status" != "404" && "$status" != "405" && "$status" != "503" ]]; then
        echo "POSSIBLE MATCH! Response body:"
        curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "$url" | head -c 200
        echo ""
    fi
    # If it is 403, print the body to see if it's the AWS error or a Dash permission error
    if [[ "$status" == "403" ]]; then
         echo "403 Body:"
         curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "$url" | head -c 200
         echo ""
    fi
done

echo "---------------------------------------------------"
echo "Testing GET /current-user (or similar) to verify Token..."
# Try to find a working GET endpoint
get_endpoints=(
    "https://api.dash.app/current-user"
    "https://api.dash.app/v2/current-user"
    "https://api-v2.dash.app/current-user"
    "https://api-v2.dash.app/v2/current-user"
    "https://api.assetplatform.io/current-user"
)

for url in "${get_endpoints[@]}"; do
    echo "Testing: $url"
    status=$(curl -o /dev/null -s -w "%{http_code}" -X GET -H "Authorization: Bearer $TOKEN" "$url")
    echo "Status: $status"
    if [[ "$status" == "200" ]]; then
         echo "SUCCESS! Response:"
         curl -s -X GET -H "Authorization: Bearer $TOKEN" "$url" | head -c 200
         echo ""
    fi
done
