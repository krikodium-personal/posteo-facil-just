#!/bin/bash

# Exact token pasted by user
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1ETTVPVFF4UTBZeE5rSTFPVGcwTUVVeFFUUkJPREZDUlVFeE16TTBNRVJETVVNd04wUkNSZyJ9.eyJodHRwczovL2Fzc2V0cGxhdGZvcm0uaW8vcGVybWlzc2lvbnMiOnsiYWNjb3VudCI6ImZkODRhM2M4LTU5MGMtNGM4MC05OThkLTM1NTZhMTNiYzMwNyIsInN1YmRvbWFpbiI6Imp1c3QifSwiaHR0cHM6Ly9hc3NldHBsYXRmb3JtLmlvL2VtYWlsIjoiY2hyaXN0aWFuLmtyaWtvcmlhbkBzd2lzc2p1c3QubmV0IiwiaXNzIjoiaHR0cHM6Ly9sb2dpbi5kYXNoLmFwcC8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExODI0Njg4MzgwNzkyMDczNjY1MCIsImF1ZCI6WyJodHRwczovL2Fzc2V0cGxhdGZvcm0uaW8iLCJodHRwczovL2Fzc2V0LXBsYXRmb3JtLXByb2QuZXUuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTc2ODgyNzY2NSwiZXhwIjoxNzY4OTE0MDY1LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIGZkODRhM2M4LTU5MGMtNGM4MC05OThkLTM1NTZhMTNiYzMwNyIsImF6cCI6ImJ0Vm9pMXdVMlpYZ2tCeGRtMndQb0Q4aFU1SkFSeVNOIn0.CXzFiX6A4mgD0D1jNeWhvRRYb_yo9lqanMYFCCqUhhaqJoXfjaP8HXKF44KI1HiX7JDex5HKZ--OYTDqt9Av3dta8jDvllnfI5PP0BdCd7RvOKeeWLLprqU4BVxMkdDI8AyZ8eKC3EwXWlJTbD5nA7w7uzcnuw-vd3nXOCmgJ7sqqQ8jNpzwZBd2M2enyT_4wCFmmPUr6fIW-IfwUR4yfIuVJoaL0gCmIqOmWt2K8kZFnqTjJs0vhtL7-mf8PvKr_fpdAYJYp1qlF96OOsTCozZxdLTUW_5oAM8Dc4r9oIYF2Gw_QoowkMPPR6MCnBSn76Qim2gATeRoDlxix0e_sg"

echo "Probing GET /fields and other POST paths..."

# 1. GET /fields (Should work if GET /current-user works)
echo "------------------------------------------------"
echo "Testing GET /fields..."
curl -s -o /dev/null -w "%{http_code}" -X GET -H "Authorization: Bearer $TOKEN" "https://api-v2.dash.app/fields"
echo ""
curl -s -X GET -H "Authorization: Bearer $TOKEN" "https://api-v2.dash.app/fields" | head -c 200
echo ""

# 2. POST /asset-searches (Hypothetical)
echo "------------------------------------------------"
echo "Testing POST /asset-searches..."
curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "https://api-v2.dash.app/asset-searches"
echo ""

# 3. POST /searches
echo "------------------------------------------------"
echo "Testing POST /searches..."
curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "https://api-v2.dash.app/searches"
echo ""

# 4. POST /asset/search WITH Origin (Maybe POST enforces CORS/Origin?)
echo "------------------------------------------------"
echo "Testing POST /asset/search WITH Origin..."
curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Origin: https://dash.redoc.ly" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "https://api-v2.dash.app/asset/search"
echo ""
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Origin: https://dash.redoc.ly" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "https://api-v2.dash.app/asset/search" | head -c 200
echo ""
