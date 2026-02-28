#!/bin/bash

TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)

# List of base URLs to test
hosts=(
    "https://api.dash.app"
    "https://api-v2.dash.app"
    "https://just.dash.app"
    "https://dash.app"
    "https://api.assetplatform.io"
)

# List of paths to test (GET)
paths=(
    "/current-user"
    "/v2/current-user"
    "/api/current-user"
    "/api/v2/current-user"
    "/fields"
    "/v2/fields"
    "/api/fields"
    "/api/v2/fields"
    "/asset/search"  # Testing GET on this just in case
    "/v2/asset/search"
)

echo "Probing GET endpoints with Token..."

for host in "${hosts[@]}"; do
    for path in "${paths[@]}"; do
        url="${host}${path}"
        echo "Testing: $url"
        # We use -L to follow redirects (helpful for dash.app -> www.dash.app)
        status=$(curl -o /dev/null -s -w "%{http_code}" -X GET -H "Authorization: Bearer $TOKEN" -L "$url")
        echo "Status: $status"
        
        if [[ "$status" == "200" ]]; then
            echo "!!! SUCCESS !!!"
            curl -s -X GET -H "Authorization: Bearer $TOKEN" -L "$url" | head -c 300
            echo ""
            echo "---------------------------------------------------"
        elif [[ "$status" == "401" || "$status" == "403" ]]; then
            echo "Auth Error ($status). Body:"
            curl -s -X GET -H "Authorization: Bearer $TOKEN" -L "$url" | head -c 200
            echo ""
        fi
    done
done
