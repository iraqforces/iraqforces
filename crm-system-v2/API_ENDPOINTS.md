# 🔗 بنية الـ API Endpoints

## عنوان السيرفر الأساسي:
```
https://10.20.10.192
```

---

## 📋 جميع الـ Endpoints:

### 1️⃣ تسجيل الدخول (Login)
```
GET https://10.20.10.192/moi-search-engine/crm-user-auth-v2
Authorization: Basic <base64(username:password)>
```

**في التطبيق:**
```javascript
fetch('/api/moi-search-engine/crm-user-auth-v2', {
  method: 'GET',
  headers: { Authorization: `Basic ${base64}` }
})
```

**عبر الـ Proxy:**
- `/api/moi-search-engine/crm-user-auth-v2`
- → `https://10.20.10.192/moi-search-engine/crm-user-auth-v2` ✅

---

### 2️⃣ تحديث التوكن (Refresh Token)
```
GET https://10.20.10.192/moi-search-engine/crm-refresh-token
Authorization: Bearer <access_token>
```

---

### 3️⃣ البحث (Search)
```
POST https://10.20.10.192/moi-search-engine/wanted/search
Authorization: Bearer <access_token>
Content-Type: application/json

Body: {
  "1_name": "...",
  "2_name": "...",
  "3_name": "...",
  "4_name": "...",
  "s_name": "...",
  "mother": "...",
  "reason": "جنائي"
}
```

---

### 4️⃣ التفاصيل (Details)
```
POST https://10.20.10.192/moi-search-engine/wanted/details/
Authorization: Bearer <access_token>
Content-Type: application/json

Body: {
  "source_id": "..."
}
```

---

### 5️⃣ المرفقات (Attachments)
```
POST https://10.20.10.192/moi-search-engine/wanted/attachments
Authorization: Bearer <access_token>
Content-Type: application/json

Body: {
  "attachments": ["filename.pdf"]
}
```

---

### 6️⃣ الملاحظات (Feedback)
```
POST https://10.20.10.192/moi-search-engine/wanted/details/feedback
Authorization: Bearer <access_token>
Content-Type: application/json

Body: {
  "source_id": "...",
  "priority": 1,
  "feedback": "..."
}
```

---

### 7️⃣ فحص الصحة (Health Check)
```
GET https://10.20.10.192/healthz
```

**في التطبيق:**
```javascript
fetch('/api/healthz')
```

**عبر الـ Proxy:**
- `/api/healthz`
- → `https://10.20.10.192/healthz` ✅

---

## 🔄 كيف يعمل الـ Proxy:

### الإعدادات في `vite.config.js`:
```javascript
proxy: {
  '/api': {
    target: 'https://10.20.10.192',
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

### مثال:
| الطلب من التطبيق | بعد الـ rewrite | الطلب النهائي للسيرفر |
|------------------|----------------|----------------------|
| `/api/healthz` | `/healthz` | `https://10.20.10.192/healthz` |
| `/api/moi-search-engine/crm-user-auth-v2` | `/moi-search-engine/crm-user-auth-v2` | `https://10.20.10.192/moi-search-engine/crm-user-auth-v2` |
| `/api/moi-search-engine/wanted/search` | `/moi-search-engine/wanted/search` | `https://10.20.10.192/moi-search-engine/wanted/search` |

---

## ✅ البنية الصحيحة في الكود:

```javascript
// ❌ خطأ
fetch('/api/crm-user-auth-v2')

// ✅ صحيح
fetch('/api/moi-search-engine/crm-user-auth-v2')
```

---

## 📝 ملاحظات:

1. **جميع الـ API endpoints** (ما عدا healthz) تبدأ بـ `/moi-search-engine/`
2. **healthz** فقط مباشرة بدون prefix
3. **تسجيل الدخول** يستخدم Basic Auth
4. **باقي الـ endpoints** تستخدم Bearer Token

---

## 🧪 اختبار سريع:

```bash
# تسجيل الدخول
curl -X GET https://10.20.10.192/moi-search-engine/crm-user-auth-v2 \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
  -k

# فحص الصحة
curl -X GET https://10.20.10.192/healthz -k
```
