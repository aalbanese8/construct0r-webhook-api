#!/bin/bash
# Test script for the webhook API
# Usage: ./test-webhook.sh [youtube|instagram|tiktok] [url]

# Default values
PLATFORM="${1:-youtube}"
URL="${2:-https://www.youtube.com/watch?v=dQw4w9WgXcQ}"
API_URL="${API_URL:-http://localhost:3001}"

echo "🧪 Testing Webhook API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Platform: $PLATFORM"
echo "URL: $URL"
echo "API: $API_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Make request
echo "📡 Sending POST request..."
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/webhook/analyze" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\", \"platform\": \"$PLATFORM\"}")

# Split response and status code
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

# Display results
if [ "$http_code" = "200" ]; then
    echo "✅ Success! (HTTP $http_code)"
    echo ""
    echo "Response:"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
else
    echo "❌ Error! (HTTP $http_code)"
    echo ""
    echo "Response:"
    echo "$body"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
