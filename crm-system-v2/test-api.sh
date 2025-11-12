#!/bin/bash

echo "🧪 اختبار الاتصال بالسيرفر..."
echo "================================"
echo ""

# ألوان للتنسيق
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER="https://10.20.10.192"

echo "📡 اختبار 1: فحص الاتصال بالسيرفر..."
if curl -k -s --connect-timeout 5 "$SERVER" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ السيرفر يستجيب${NC}"
else
    echo -e "${RED}❌ لا يمكن الوصول للسيرفر${NC}"
    exit 1
fi

echo ""
echo "📡 اختبار 2: فحص endpoint الصحة..."
HEALTH_RESPONSE=$(curl -k -s -w "\n%{http_code}" "$SERVER/healthz" 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

echo "Status Code: $HTTP_CODE"
echo "Response: $BODY"

echo ""
echo "📡 اختبار 3: محاولة تسجيل الدخول مع /crm-user-auth-v2..."
echo "أدخل اسم المستخدم:"
read -r USERNAME
echo "أدخل كلمة المرور:"
read -rs PASSWORD
echo ""

BASIC_AUTH=$(echo -n "$USERNAME:$PASSWORD" | base64)

echo "Testing GET /crm-user-auth-v2..."
RESPONSE=$(curl -k -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Basic $BASIC_AUTH" \
  "$SERVER/crm-user-auth-v2" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Status Code: $HTTP_CODE"
echo "Response (first 500 chars):"
echo "$BODY" | head -c 500
echo ""
echo ""

# فحص إذا كان Response هو JSON
if echo "$BODY" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✅ الاستجابة JSON صحيحة!${NC}"
    echo ""
    echo "📦 البيانات الكاملة:"
    echo "$BODY" | jq .
else
    echo -e "${RED}❌ الاستجابة ليست JSON${NC}"

    # فحص إذا كان HTML
    if echo "$BODY" | grep -q "<!DOCTYPE\|<html"; then
        echo -e "${YELLOW}⚠️  الاستجابة هي HTML${NC}"
        echo ""
        echo "عنوان الصفحة:"
        echo "$BODY" | grep -oP '(?<=<title>).*?(?=</title>)' || echo "لا يوجد"
    fi
fi

echo ""
echo "================================"
echo "📡 اختبار 4: محاولة مسارات بديلة..."

for ENDPOINT in "/auth" "/login" "/api/auth" "/api/login" "/crm/auth"; do
    echo ""
    echo "Testing: $ENDPOINT"
    HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" \
      -X GET \
      -H "Authorization: Basic $BASIC_AUTH" \
      "$SERVER$ENDPOINT" 2>&1)

    if [ "$HTTP_CODE" != "404" ] && [ "$HTTP_CODE" != "000" ]; then
        echo -e "${YELLOW}⚠️  $ENDPOINT returned: $HTTP_CODE${NC}"
    fi
done

echo ""
echo "✅ الاختبار انتهى!"
