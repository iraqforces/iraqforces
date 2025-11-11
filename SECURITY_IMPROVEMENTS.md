# 🔒 التحسينات الأمنية - دليل التطبيق

## 1. تخزين آمن للتوكن (Secure Token Storage)

### المشكلة الحالية
```javascript
// يُفقد التوكن عند إعادة تحميل الصفحة
const [accessToken, setAccessToken] = useState(null);
```

### الحل المقترح

#### الخطوة 1: إنشاء وحدة التشفير
```javascript
// src/utils/encryption.js
class TokenEncryption {
  constructor() {
    // مفتاح فريد لكل جهاز (يُخزن في localStorage عند أول زيارة)
    this.deviceKey = this.getOrCreateDeviceKey();
  }

  getOrCreateDeviceKey() {
    let key = localStorage.getItem('device_key');
    if (!key) {
      // إنشاء مفتاح عشوائي
      key = this.generateRandomKey();
      localStorage.setItem('device_key', key);
    }
    return key;
  }

  generateRandomKey() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // تشفير بسيط باستخدام XOR
  encrypt(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ this.deviceKey.charCodeAt(i % this.deviceKey.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result);
  }

  decrypt(encrypted) {
    try {
      const text = atob(encrypted);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ this.deviceKey.charCodeAt(i % this.deviceKey.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (e) {
      return null;
    }
  }
}

export const tokenEncryption = new TokenEncryption();
```

#### الخطوة 2: تحديث AuthProvider
```javascript
// src/contexts/AuthContext.jsx
function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => {
    // استعادة التوكن من sessionStorage عند التحميل
    const stored = sessionStorage.getItem('crm_token');
    if (stored) {
      const decrypted = tokenEncryption.decrypt(stored);
      // التحقق من صلاحية التوكن
      if (decrypted && !isTokenExpired(decrypted)) {
        return decrypted;
      }
      sessionStorage.removeItem('crm_token');
    }
    return null;
  });

  const login = (token) => {
    setAccessToken(token);
    // تشفير وحفظ التوكن
    const encrypted = tokenEncryption.encrypt(token);
    sessionStorage.setItem('crm_token', encrypted);

    // تسجيل عملية الدخول
    logSecurityEvent('LOGIN_SUCCESS');
  };

  const logout = () => {
    setAccessToken(null);
    sessionStorage.removeItem('crm_token');

    // تسجيل عملية الخروج
    logSecurityEvent('LOGOUT');

    // تنظيف البيانات الحساسة من الذاكرة
    if (window.gc) window.gc(); // Chrome only
  };

  // ...
}

// التحقق من صلاحية التوكن
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

// تسجيل الأحداث الأمنية
function logSecurityEvent(event) {
  const log = {
    event,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    ip: 'client-side' // يجب أن يأتي من الخادم
  };

  // إرسال للخادم أو تخزين محلي
  const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
  logs.push(log);
  // الاحتفاظ بآخر 50 سجل فقط
  if (logs.length > 50) logs.shift();
  localStorage.setItem('security_logs', JSON.stringify(logs));
}
```

---

## 2. Content Security Policy (CSP)

### إضافة CSP Headers
```html
<!-- في <head> -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdn.tailwindcss.com https://unpkg.com 'unsafe-inline' 'unsafe-eval';
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self' https://10.20.10.192;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

### للإنتاج (في Nginx/Apache)
```nginx
# nginx.conf
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://10.20.10.192; frame-ancestors 'none';" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

---

## 3. Rate Limiting من جانب العميل

```javascript
// src/utils/rateLimiter.js
export class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 10;
    this.windowMs = options.windowMs || 60000; // دقيقة واحدة
    this.requests = [];
    this.penalties = new Map(); // لتتبع المحاولات المشبوهة
  }

  canMakeRequest(endpoint = 'default') {
    const now = Date.now();
    const key = this.getEndpointKey(endpoint);

    // تنظيف الطلبات القديمة
    this.requests = this.requests.filter(req =>
      now - req.timestamp < this.windowMs && req.key === key
    );

    // التحقق من العقوبات
    const penalty = this.penalties.get(key);
    if (penalty && now < penalty.until) {
      return {
        allowed: false,
        retryAfter: Math.ceil((penalty.until - now) / 1000),
        reason: 'rate_limit_penalty'
      };
    }

    // التحقق من الحد الأقصى
    if (this.requests.length >= this.maxRequests) {
      // إضافة عقوبة
      this.penalties.set(key, {
        until: now + this.windowMs * 2,
        attempts: (penalty?.attempts || 0) + 1
      });

      return {
        allowed: false,
        retryAfter: Math.ceil(this.windowMs / 1000),
        reason: 'rate_limit_exceeded'
      };
    }

    return { allowed: true };
  }

  recordRequest(endpoint = 'default') {
    this.requests.push({
      key: this.getEndpointKey(endpoint),
      timestamp: Date.now()
    });
  }

  getEndpointKey(endpoint) {
    return endpoint.replace(/[^a-zA-Z0-9]/g, '_');
  }

  reset() {
    this.requests = [];
    this.penalties.clear();
  }
}

// استخدام مختلف لكل endpoint
export const rateLimiters = {
  login: new RateLimiter({ maxRequests: 5, windowMs: 60000 }), // 5 محاولات/دقيقة
  search: new RateLimiter({ maxRequests: 20, windowMs: 60000 }), // 20 بحث/دقيقة
  details: new RateLimiter({ maxRequests: 30, windowMs: 60000 }), // 30 طلب/دقيقة
  feedback: new RateLimiter({ maxRequests: 3, windowMs: 60000 }), // 3 ملاحظات/دقيقة
};
```

### دمجه مع apiFetch
```javascript
// في AuthContext
const apiFetch = async (endpoint, options = {}, isRetry = false) => {
  // تحديد نوع الطلب
  const limiterType = endpoint.includes('login') ? 'login' :
                     endpoint.includes('search') ? 'search' :
                     endpoint.includes('feedback') ? 'feedback' : 'details';

  // التحقق من Rate Limit
  const limiter = rateLimiters[limiterType];
  const rateLimitCheck = limiter.canMakeRequest(endpoint);

  if (!rateLimitCheck.allowed) {
    throw {
      ar: `تم تجاوز الحد المسموح من الطلبات. حاول مرة أخرى بعد ${rateLimitCheck.retryAfter} ثانية`,
      en: `Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter} seconds`,
      ku: `زۆرترین داواکاری تێپەڕاند. دووبارە هەوڵ بدەرەوە دوای ${rateLimitCheck.retryAfter} چرکە`
    };
  }

  // تسجيل الطلب
  limiter.recordRequest(endpoint);

  // متابعة الطلب العادي
  // ...
};
```

---

## 4. حماية من XSS (Cross-Site Scripting)

```javascript
// src/utils/sanitize.js
export class XSSProtection {
  // تنظيف HTML
  static sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  // تنظيف URL
  static sanitizeURL(url) {
    try {
      const parsed = new URL(url);
      // السماح فقط بـ http/https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '#';
      }
      return url;
    } catch {
      return '#';
    }
  }

  // تنظيف input
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .replace(/[<>]/g, '') // إزالة أقواس HTML
      .replace(/javascript:/gi, '') // إزالة javascript:
      .replace(/on\w+=/gi, '') // إزالة event handlers
      .trim();
  }

  // التحقق من البيانات المدخلة
  static validateInput(input, type = 'text') {
    const patterns = {
      text: /^[\u0600-\u06FFa-zA-Z0-9\s\-'.]+$/,
      number: /^\d+$/,
      year: /^(19|20)\d{2}$/,
    };

    return patterns[type]?.test(input) ?? false;
  }
}
```

### استخدامه في المكونات
```javascript
function SearchScreen() {
  const [form, setForm] = useState({...});

  const handleInputChange = (field, value) => {
    // تنظيف القيمة المدخلة
    const sanitized = XSSProtection.sanitizeInput(value);

    // التحقق من الصحة
    if (!XSSProtection.validateInput(sanitized, 'text')) {
      // عرض رسالة خطأ
      toast.error('يرجى إدخال بيانات صحيحة');
      return;
    }

    setForm(prev => ({ ...prev, [field]: sanitized }));
  };

  return (
    <input
      value={form.n1}
      onChange={e => handleInputChange('n1', e.target.value)}
      maxLength={50}
    />
  );
}
```

---

## 5. حماية من CSRF (Cross-Site Request Forgery)

```javascript
// src/utils/csrf.js
export class CSRFProtection {
  constructor() {
    this.token = this.generateToken();
    this.tokenRotationInterval = 30 * 60 * 1000; // 30 دقيقة
    this.startTokenRotation();
  }

  generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  getToken() {
    return this.token;
  }

  rotateToken() {
    this.token = this.generateToken();
    sessionStorage.setItem('csrf_token', this.token);
  }

  startTokenRotation() {
    setInterval(() => this.rotateToken(), this.tokenRotationInterval);
  }

  validateToken(token) {
    return token === this.token;
  }
}

export const csrfProtection = new CSRFProtection();
```

### إضافته للطلبات
```javascript
const apiFetch = async (endpoint, options = {}) => {
  const headers = {
    ...options.headers,
    'X-CSRF-Token': csrfProtection.getToken(),
    'X-Requested-With': 'XMLHttpRequest' // حماية إضافية
  };

  // ...
};
```

---

## 6. التحقق من صحة SSL/TLS

```javascript
// src/utils/securityChecks.js
export class SecurityChecks {
  static async verifySSL(url) {
    try {
      // التحقق من HTTPS
      if (!url.startsWith('https://')) {
        console.warn('⚠️ الاتصال غير آمن - استخدم HTTPS');
        return false;
      }

      // محاولة الاتصال
      const response = await fetch(url, { method: 'HEAD' });

      // التحقق من Certificate
      if (response.ok) {
        console.log('✓ اتصال SSL آمن');
        return true;
      }
    } catch (error) {
      console.error('✗ خطأ في التحقق من SSL:', error);
      return false;
    }
  }

  static checkSecurityHeaders(response) {
    const headers = response.headers;
    const securityHeaders = [
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection'
    ];

    const missing = securityHeaders.filter(h => !headers.get(h));

    if (missing.length > 0) {
      console.warn('⚠️ Security headers مفقودة:', missing);
    }

    return missing.length === 0;
  }
}
```

---

## 7. Session Timeout تلقائي

```javascript
// src/hooks/useSessionTimeout.js
export function useSessionTimeout(timeoutMs = 15 * 60 * 1000) {
  const { logout } = useAuth();
  const timerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      // تحذير قبل الخروج
      const shouldLogout = window.confirm(
        'ستنتهي صلاحية جلستك قريباً. هل تريد الاستمرار؟'
      );

      if (!shouldLogout) {
        resetTimer();
      } else {
        logout();
      }
    }, timeoutMs);
  }, [logout, timeoutMs]);

  useEffect(() => {
    // تتبع نشاط المستخدم
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  // عرض وقت الجلسة المتبقي
  const [remainingTime, setRemainingTime] = useState(timeoutMs);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      setRemainingTime(Math.max(0, timeoutMs - elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutMs]);

  return { remainingTime };
}
```

### استخدامه في App
```javascript
function App() {
  const { remainingTime } = useSessionTimeout();

  return (
    <>
      {/* عرض مؤشر الوقت المتبقي */}
      {remainingTime < 60000 && ( // آخر دقيقة
        <div className="session-warning">
          الجلسة ستنتهي خلال {Math.ceil(remainingTime / 1000)} ثانية
        </div>
      )}
      <AppCore />
    </>
  );
}
```

---

## 8. تسجيل الأنشطة المشبوهة (Audit Logging)

```javascript
// src/utils/auditLogger.js
export class AuditLogger {
  static events = [];
  static maxEvents = 100;

  static log(eventType, details = {}) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...details
    };

    this.events.push(event);

    // الاحتفاظ بآخر 100 حدث فقط
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // حفظ في localStorage
    localStorage.setItem('audit_log', JSON.stringify(this.events));

    // إرسال للخادم في حالة الأحداث الحرجة
    if (this.isCriticalEvent(eventType)) {
      this.sendToServer(event);
    }
  }

  static isCriticalEvent(type) {
    return [
      'MULTIPLE_LOGIN_FAILURES',
      'RATE_LIMIT_EXCEEDED',
      'SUSPICIOUS_ACTIVITY',
      'XSS_ATTEMPT',
      'CSRF_TOKEN_MISMATCH'
    ].includes(type);
  }

  static async sendToServer(event) {
    try {
      await fetch(`${API_BASE_URL}/audit-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (e) {
      console.error('Failed to send audit log:', e);
    }
  }

  static getEvents(filter = null) {
    if (!filter) return this.events;
    return this.events.filter(e => e.type === filter);
  }

  static exportLogs() {
    const data = JSON.stringify(this.events, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${Date.now()}.json`;
    a.click();
  }
}

// الاستخدام
AuditLogger.log('LOGIN_SUCCESS', { username: 'user123' });
AuditLogger.log('SEARCH_PERFORMED', { query: 'أحمد محمد' });
AuditLogger.log('DATA_EXPORT', { recordCount: 50 });
```

---

## 9. Secure Password Input

```javascript
// src/components/SecurePasswordInput.jsx
function SecurePasswordInput({ value, onChange, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0);

  const calculateStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setStrength(calculateStrength(newValue));
    onChange(e);
  };

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const strengthLabels = ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'قوي'];

  return (
    <div>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          autoComplete="new-password"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute left-3 top-1/2 -translate-y-1/2"
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>

      {/* مؤشر قوة كلمة المرور */}
      {value && (
        <div className="mt-2">
          <div className="flex gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${
                  i < strength ? strengthColors[strength - 1] : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-600">
            القوة: {strengthLabels[strength - 1] || 'لا شيء'}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 10. قائمة فحص الأمان (Security Checklist)

```markdown
### قبل الإطلاق (Pre-Production)

- [ ] جميع الاتصالات عبر HTTPS
- [ ] تشفير البيانات الحساسة
- [ ] Rate limiting مفعل
- [ ] CSRF protection مفعل
- [ ] XSS protection مفعل
- [ ] Content Security Policy مُعَد
- [ ] Session timeout مفعل
- [ ] Audit logging يعمل
- [ ] إزالة console.log من الإنتاج
- [ ] تحديث التبعيات (npm audit)
- [ ] اختبار الاختراق الأساسي

### الصيانة الدورية

- [ ] مراجعة security logs أسبوعياً
- [ ] تحديث التبعيات شهرياً
- [ ] مراجعة أذونات المستخدمين
- [ ] اختبار النسخ الاحتياطية
- [ ] مراجعة audit logs
```

---

## ملاحظات مهمة

1. **لا تعتمد على الحماية من جانب العميل فقط** - يجب أن يكون الخادم محمياً أيضاً
2. **استخدم HTTPS دائماً** في الإنتاج
3. **قم بتحديث التبعيات بانتظام** لإصلاح الثغرات الأمنية
4. **اختبر الأمان بانتظام** باستخدام أدوات مثل OWASP ZAP
5. **درّب المستخدمين** على الممارسات الأمنية الجيدة

---

**آخر تحديث:** 2025-11-11
