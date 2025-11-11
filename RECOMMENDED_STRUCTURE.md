# 🏗️ البنية المقترحة للمشروع

## نظرة عامة

تحويل الملف الواحد (1000+ سطر) إلى بنية منظمة وقابلة للصيانة.

---

## 📁 هيكل المجلدات

```
crm-system/
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── assets/              # الصور والخطوط
│   │   ├── images/
│   │   └── fonts/
│   ├── components/          # المكونات
│   │   ├── auth/
│   │   │   ├── LoginScreen.jsx
│   │   │   └── LoginForm.jsx
│   │   ├── search/
│   │   │   ├── SearchScreen.jsx
│   │   │   ├── SearchForm.jsx
│   │   │   ├── SearchResults.jsx
│   │   │   └── ResultsTable.jsx
│   │   ├── details/
│   │   │   ├── DetailsScreen.jsx
│   │   │   ├── PersonalInfo.jsx
│   │   │   ├── ArrestOrders.jsx
│   │   │   ├── AbsentSentences.jsx
│   │   │   └── Attachments.jsx
│   │   ├── shared/
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── LanguageSelector.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── ConnectionBadge.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   └── Toast.jsx
│   │   └── modals/
│   │       └── FeedbackModal.jsx
│   ├── contexts/            # React Contexts
│   │   ├── LanguageContext.jsx
│   │   ├── ThemeContext.jsx
│   │   └── AuthContext.jsx
│   ├── hooks/               # Custom Hooks
│   │   ├── useAuth.js
│   │   ├── useLanguage.js
│   │   ├── useTheme.js
│   │   ├── useConnectivity.js
│   │   ├── useApiFetch.js
│   │   └── useSessionTimeout.js
│   ├── services/            # API Services
│   │   ├── api.js
│   │   ├── auth.service.js
│   │   ├── wanted.service.js
│   │   └── feedback.service.js
│   ├── store/               # State Management (Zustand)
│   │   ├── authStore.js
│   │   ├── searchStore.js
│   │   └── uiStore.js
│   ├── utils/               # Utilities
│   │   ├── translations.js
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   ├── cache.js
│   │   ├── encryption.js
│   │   ├── rateLimiter.js
│   │   └── sanitize.js
│   ├── styles/              # CSS/Tailwind
│   │   ├── index.css
│   │   └── tailwind.css
│   ├── types/               # TypeScript Types (إذا استخدمت TS)
│   │   ├── api.types.ts
│   │   └── models.types.ts
│   ├── App.jsx              # المكون الرئيسي
│   └── main.jsx             # نقطة الدخول
├── tests/                   # الاختبارات
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 📝 أمثلة التقسيم

### 1. الترجمات (Translations)

```javascript
// src/utils/translations.js
export const translations = {
  ar: {
    // عام
    appTitle: "نظام CRM",
    logout: "تسجيل الخروج",
    networkError: "لا يمكن الوصول إلى السيرفر",
    // ... باقي الترجمات
  },
  en: {
    appTitle: "CRM System",
    logout: "Logout",
    // ...
  },
  ku: {
    appTitle: "سیستەمی CRM",
    logout: "چوونەدەرەوە",
    // ...
  }
};
```

---

### 2. الثوابت (Constants)

```javascript
// src/utils/constants.js
export const USE_SIMULATION = import.meta.env.VITE_USE_SIMULATION === 'true';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const HEALTH_URL = import.meta.env.VITE_HEALTH_URL;

export const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
export const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 دقيقة

export const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 60000 },
  search: { maxRequests: 20, windowMs: 60000 },
  details: { maxRequests: 30, windowMs: 60000 },
};
```

---

### 3. Language Context

```javascript
// src/contexts/LanguageContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'ar';
  });

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('app_language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = ['ar', 'ku'].includes(language) ? 'rtl' : 'ltr';
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
```

---

### 4. Theme Context

```javascript
// src/contexts/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

### 5. Auth Context (مع Zustand بدلاً من Context)

```javascript
// src/store/authStore.js
import { create } from 'zustand';
import { tokenEncryption } from '../utils/encryption';

export const useAuthStore = create((set, get) => ({
  accessToken: (() => {
    const stored = sessionStorage.getItem('crm_token');
    if (stored) {
      const decrypted = tokenEncryption.decrypt(stored);
      return decrypted || null;
    }
    return null;
  })(),

  user: null,

  login: (token, user = null) => {
    set({ accessToken: token, user });
    const encrypted = tokenEncryption.encrypt(token);
    sessionStorage.setItem('crm_token', encrypted);
  },

  logout: () => {
    set({ accessToken: null, user: null });
    sessionStorage.removeItem('crm_token');
  },

  refreshToken: async () => {
    const { accessToken } = get();
    try {
      const response = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();

      if (data.success) {
        get().login(data.data.access_token);
        return data.data.access_token;
      }
      throw new Error('Token refresh failed');
    } catch (error) {
      get().logout();
      throw error;
    }
  }
}));
```

---

### 6. API Service Layer

```javascript
// src/services/api.js
import { API_BASE_URL } from '../utils/constants';
import { apiCache } from '../utils/cache';
import { rateLimiters } from '../utils/rateLimiter';

export class ApiService {
  constructor(getAccessToken) {
    this.getAccessToken = getAccessToken;
  }

  async request(endpoint, options = {}) {
    // Rate Limiting
    const limiterType = this.getLimiterType(endpoint);
    const limiter = rateLimiters[limiterType];
    const rateLimitCheck = limiter.canMakeRequest(endpoint);

    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`);
    }

    // Cache Check
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    if (!options.noCache) {
      const cached = apiCache.get(cacheKey);
      if (cached) return cached;
    }

    // Make Request
    limiter.recordRequest(endpoint);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache Success Response
    if (!options.noCache) {
      apiCache.set(cacheKey, data);
    }

    return data;
  }

  getLimiterType(endpoint) {
    if (endpoint.includes('login')) return 'login';
    if (endpoint.includes('search')) return 'search';
    if (endpoint.includes('feedback')) return 'feedback';
    return 'details';
  }
}
```

```javascript
// src/services/wanted.service.js
import { ApiService } from './api';

export class WantedService {
  constructor(apiService) {
    this.api = apiService;
  }

  async search(params) {
    return this.api.request('/wanted/search', {
      method: 'POST',
      body: JSON.stringify({
        '1_name': params.n1,
        '2_name': params.n2,
        '3_name': params.n3,
        '4_name': params.n4,
        's_name': params.sn,
        'mother': params.mom,
        'reason': 'جنائي'
      })
    });
  }

  async getDetails(sourceId) {
    return this.api.request('/wanted/details/', {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId })
    });
  }

  async getAttachments(filenames) {
    return this.api.request('/wanted/attachments', {
      method: 'POST',
      body: JSON.stringify({ attachments: filenames })
    });
  }

  async submitFeedback(sourceId, priority, feedback) {
    return this.api.request('/wanted/details/feedback', {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId, priority, feedback })
    });
  }
}
```

---

### 7. Custom Hooks

```javascript
// src/hooks/useApiFetch.js
import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { ApiService } from '../services/api';
import { WantedService } from '../services/wanted.service';

export function useApi() {
  const accessToken = useAuthStore(state => state.accessToken);

  const services = useMemo(() => {
    const api = new ApiService(() => accessToken);
    return {
      wanted: new WantedService(api),
      // يمكن إضافة خدمات أخرى هنا
    };
  }, [accessToken]);

  return services;
}
```

```javascript
// src/hooks/useConnectivity.js
import { useState, useEffect, useRef } from 'react';
import { HEALTH_URL } from '../utils/constants';

export function useConnectivity() {
  const [status, setStatus] = useState('offline');
  const timerRef = useRef(null);

  const pingServer = async () => {
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(HEALTH_URL, {
        signal: controller.signal
      });

      clearTimeout(timeout);
      setStatus(response.ok ? 'online' : 'net_only');
    } catch (error) {
      setStatus('net_only');
    }
  };

  useEffect(() => {
    pingServer();
    timerRef.current = setInterval(pingServer, 10000);

    const handleOnline = () => pingServer();
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
```

---

### 8. المكونات (Components)

```javascript
// src/components/shared/Header.jsx
import { useLanguage } from '../../hooks/useLanguage';
import { useAuthStore } from '../../store/authStore';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';
import ConnectionBadge from './ConnectionBadge';

export default function Header() {
  const { t } = useLanguage();
  const { accessToken, logout } = useAuthStore();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold text-blue-700 dark:text-blue-400">
            {t.appTitle}
          </h1>
          <ConnectionBadge />
        </div>

        <div className="flex items-center gap-2" dir="ltr">
          <LanguageSelector />
          <ThemeToggle />
          {accessToken && (
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
            >
              {t.logout}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
```

```javascript
// src/components/shared/LanguageSelector.jsx
import { useLanguage } from '../../hooks/useLanguage';

const languages = [
  { code: 'ar', name: 'العربية' },
  { code: 'en', name: 'English' },
  { code: 'ku', name: 'کوردی' }
];

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2" dir="ltr">
      {languages.map(({ code, name }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            language === code
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
```

```javascript
// src/components/auth/LoginScreen.jsx
import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuthStore } from '../../store/authStore';
import { API_BASE_URL } from '../../utils/constants';
import Header from '../shared/Header';

export default function LoginScreen() {
  const { t, language } = useLanguage();
  const login = useAuthStore(state => state.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const basic = btoa(`${username}:${password}`);
      const response = await fetch(`${API_BASE_URL}/crm-user-auth-v2`, {
        method: 'GET',
        headers: { Authorization: `Basic ${basic}` }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.data.access_token);
      } else {
        setError(data.message || { [language]: t.genericError });
      }
    } catch (err) {
      setError({ [language]: t.networkError });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {t.loginTitle}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-rose-100 text-rose-800 rounded-lg">
            {error[language] || t.genericError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">{t.username}</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">{t.password}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              required
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-bold text-white ${
              loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? t.loggingIn : t.login}
          </button>
        </form>
      </div>
    </div>
  );
}
```

```javascript
// src/components/search/SearchScreen.jsx
import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useApi } from '../../hooks/useApiFetch';
import Header from '../shared/Header';
import SearchForm from './SearchForm';
import SearchResults from './SearchResults';

export default function SearchScreen({ onNavigateToDetails }) {
  const { t } = useLanguage();
  const { wanted } = useApi();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (formData) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await wanted.search(formData);

      if (data.noContent) {
        setResults([]);
      } else if (data.success) {
        setResults(data.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto p-4 md:p-6">
        <SearchForm onSubmit={handleSearch} loading={loading} />
        <SearchResults
          results={results}
          loading={loading}
          error={error}
          onRowClick={onNavigateToDetails}
        />
      </main>
    </div>
  );
}
```

---

### 9. App.jsx الرئيسي

```javascript
// src/App.jsx
import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuthStore } from './store/authStore';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoadingSpinner from './components/shared/LoadingSpinner';
import ErrorBoundary from './components/shared/ErrorBoundary';

// Lazy Loading
const LoginScreen = lazy(() => import('./components/auth/LoginScreen'));
const SearchScreen = lazy(() => import('./components/search/SearchScreen'));
const DetailsScreen = lazy(() => import('./components/details/DetailsScreen'));

function AppCore() {
  const accessToken = useAuthStore(state => state.accessToken);
  const [view, setView] = useState('login');
  const [selectedSourceId, setSelectedSourceId] = useState(null);

  useEffect(() => {
    if (!accessToken) {
      setView('login');
    } else if (view === 'login') {
      setView('search');
    }
  }, [accessToken, view]);

  const handleNavigateToDetails = (sourceId) => {
    setSelectedSourceId(sourceId);
    setView('details');
  };

  const handleBackToSearch = () => {
    setSelectedSourceId(null);
    setView('search');
  };

  if (!accessToken) {
    return <LoginScreen />;
  }

  return (
    <>
      {view === 'search' && <SearchScreen onNavigateToDetails={handleNavigateToDetails} />}
      {view === 'details' && (
        <DetailsScreen
          sourceId={selectedSourceId}
          onBackToSearch={handleBackToSearch}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <div className="font-inter">
              <AppCore />
              <footer className="text-center text-xs text-gray-500 py-6">
                AI964 • CRM Unified Portal • v2.0.0
              </footer>
            </div>
          </Suspense>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
```

---

### 10. main.jsx (نقطة الدخول)

```javascript
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Performance Monitoring
if (import.meta.env.PROD) {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## 🔧 ملفات الإعداد

### package.json

```json
{
  "name": "crm-system",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext js,jsx",
    "format": "prettier --write \"src/**/*.{js,jsx}\""
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.1",
    "react-hot-toast": "^2.4.1",
    "react-window": "^1.8.9"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.3",
    "vite": "^4.4.5",
    "vite-plugin-compression": "^0.5.1",
    "rollup-plugin-visualizer": "^5.9.2"
  }
}
```

### .env.example

```env
VITE_API_BASE_URL=https://10.20.10.192/moi-search-engine
VITE_HEALTH_URL=https://10.20.10.192/healthz
VITE_USE_SIMULATION=false
VITE_ENABLE_ANALYTICS=false
```

---

## 📈 فوائد البنية الجديدة

### 1. قابلية الصيانة
- كل مكون في ملف منفصل
- سهولة إيجاد وتعديل الكود
- تقليل التعقيد

### 2. إمكانية الاختبار
```javascript
// tests/components/SearchForm.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import SearchForm from '../src/components/search/SearchForm';

test('should validate required fields', () => {
  const handleSubmit = jest.fn();
  render(<SearchForm onSubmit={handleSubmit} />);

  const submitButton = screen.getByRole('button', { name: /بحث/i });
  fireEvent.click(submitButton);

  expect(handleSubmit).not.toHaveBeenCalled();
});
```

### 3. إعادة الاستخدام
- مكونات مشتركة قابلة لإعادة الاستخدام
- Hooks مخصصة
- Services قابلة للاستبدال

### 4. التعاون الجماعي
- سهولة العمل على أجزاء مختلفة
- تقليل التعارضات في Git
- Code Review أسهل

---

## 🚀 خطوات التحويل

1. **إنشاء المشروع الجديد**
```bash
npm create vite@latest crm-system-v2 -- --template react
cd crm-system-v2
npm install
```

2. **إعداد Tailwind**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

3. **نقل الكود تدريجياً**
- ابدأ بـ Contexts
- ثم Utilities
- ثم Components
- أخيراً Services

4. **الاختبار**
```bash
npm run dev
```

5. **البناء للإنتاج**
```bash
npm run build
```

---

**آخر تحديث:** 2025-11-11
