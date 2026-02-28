#!/bin/bash

# Load token safely
TOKEN=$(grep VITE_DASH_API_TOKEN .env | cut -d '=' -f2)
FOLDER_FIELD_ID="5d9e07a5-4696-42bb-b703-e17ad2c2c364"
URL="https://api-v2.dash.app/fields/$FOLDER_FIELD_ID/options"

echo "Fetching Folder Options from: $URL"

curl -s -X GET "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "dash-api-client: DASH_FRONTEND" \
  > folder_options.json

echo "Response head:"
head -c 500 folder_options.json
