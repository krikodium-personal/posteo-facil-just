#!/bin/bash
TOKEN=$(cat .env | grep VITE_DROPBOX_ACCESS_TOKEN | sed 's/VITE_DROPBOX_ACCESS_TOKEN=//' | tr -d '\n' | tr -d '\r')
echo "Token length: ${#TOKEN}"
echo "First 10 chars: ${TOKEN:0:10}"
echo "Last 10 chars: ${TOKEN: -10}"
curl -s -X POST https://api.dropboxapi.com/2/users/get_current_account \
    --header "Authorization: Bearer $TOKEN" \
    --header "Content-Type: application/json" | jq .
