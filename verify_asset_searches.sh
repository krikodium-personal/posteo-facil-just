#!/bin/bash

# Exact token pasted by user
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1ETTVPVFF4UTBZeE5rSTFPVGcwTUVVeFFUUkJPREZDUlVFeE16TTBNRVJETVVNd04wUkNSZyJ9.eyJodHRwczovL2Fzc2V0cGxhdGZvcm0uaW8vcGVybWlzc2lvbnMiOnsiYWNjb3VudCI6ImZkODRhM2M4LTU5MGMtNGM4MC05OThkLTM1NTZhMTNiYzMwNyIsInN1YmRvbWFpbiI6Imp1c3QifSwiaHR0cHM6Ly9hc3NldHBsYXRmb3JtLmlvL2VtYWlsIjoiY2hyaXN0aWFuLmtyaWtvcmlhbkBzd2lzc2p1c3QubmV0IiwiaXNzIjoiaHR0cHM6Ly9sb2dpbi5kYXNoLmFwcC8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExODI0Njg4MzgwNzkyMDczNjY1MCIsImF1ZCI6WyJodHRwczovL2Fzc2V0cGxhdGZvcm0uaW8iLCJodHRwczovL2Fzc2V0LXBsYXRmb3JtLXByb2QuZXUuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTc2ODgyNzY2NSwiZXhwIjoxNzY4OTE0MDY1LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIGZkODRhM2M4LTU5MGMtNGM4MC05OThkLTM1NTZhMTNiYzMwNyIsImF6cCI6ImJ0Vm9pMXdVMlpYZ2tCeGRtMndQb0Q4aFU1SkFSeVNOIn0.CXzFiX6A4mgD0D1jNeWhvRRYb_yo9lqanMYFCCqUhhaqJoXfjaP8HXKF44KI1HiX7JDex5HKZ--OYTDqt9Av3dta8jDvllnfI5PP0BdCd7RvOKeeWLLprqU4BVxMkdDI8AyZ8eKC3EwXWlJTbD5nA7w7uzcnuw-vd3nXOCmgJ7sqqQ8jNpzwZBd2M2enyT_4wCFmmPUr6fIW-IfwUR4yfIuVJoaL0gCmIqOmWt2K8kZFnqTjJs0vhtL7-mf8PvKr_fpdAYJYp1qlF96OOsTCozZxdLTUW_5oAM8Dc4r9oIYF2Gw_QoowkMPPR6MCnBSn76Qim2gATeRoDlxix0e_sg"

echo "Investigating /asset-searches..."

# 1. Get body of 400 error
echo "------------------------------------------------"
echo "Testing POST /asset-searches (Minimal Body)..."
curl -v -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1}' "https://api-v2.dash.app/asset-searches" 2>&1 | grep -v "Authorization"

# 2. Try with more complete body (from docs)
echo "------------------------------------------------"
echo "Testing POST /asset-searches (Full Body)..."
curl -v -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"from": 0, "pageSize": 1, "sorts": [], "criterion": {"type": "FIELD_EXISTS", "field": {"type": "FIELD", "fieldId": "title"}}}' "https://api-v2.dash.app/asset-searches" 2>&1 | grep -v "Authorization"
# Note: Fake criterion just to test structure, might return 400 validation error but body will tell us.
